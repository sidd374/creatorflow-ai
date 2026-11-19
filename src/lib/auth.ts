/**
 * CreatorFlow AI — Real Account Authentication & Identity Layer
 *
 * Uses Firebase Authentication + Server-Side Token Verification + Firestore Isolation:
 * 1. Real Google Sign-In (`signInWithPopup` via GoogleAuthProvider)
 * 2. Real Microsoft Sign-In (`signInWithPopup` via OAuthProvider('microsoft.com'))
 * 3. Canonical `currentAccount` and `isAuthenticated` state
 * 4. Stable `accountId` bound to verified Firebase Auth UID
 * 5. Server-verified Owner/Admin role
 * 6. Provider Linking (Google <-> Microsoft) via Firebase `linkWithPopup`
 * 7. Anonymous workspace migration on first login
 */

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  signOut as firebaseSignOut,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  microsoftProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { PlanId, setStoredPlan } from './planEntitlements';
import { getOrCreateDeviceInstallId } from './deviceSecurity';
import {
  migrateAnonymousDataToAccount,
  syncAccountWorkspaceFromCloud,
  clearAllAccountWorkspaceData,
} from './accountStorage';
import { UserRole } from '../types/ownerAnalytics';

export type AuthProvider = 'google' | 'microsoft';

export interface CreatorFlowUser {
  id: string; // Stable internal accountId (verified Firebase Auth UID)
  accountId: string; // Canonical alias for id
  providerId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  provider: AuthProvider;
  plan: PlanId;
  role: UserRole;
  linkedProviders: AuthProvider[];
  emailVerified?: boolean;
}

export interface KnownDeviceAccount {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: PlanId;
  role: UserRole;
  provider: AuthProvider;
  lastUsedAt: string;
}

const AUTH_SESSION_CACHE_KEY = 'creatorflow_verified_account_v3';
const DEVICE_KNOWN_ACCOUNTS_KEY = 'creatorflow_device_known_accounts_v2';
const DATA_MIGRATION_PROMPTED_KEY = 'creatorflow_migration_prompted_v3';

// In-memory canonical state (tamper-resistant against arbitrary localStorage edits)
let inMemoryCurrentAccount: CreatorFlowUser | null = null;
let inMemoryIdToken: string | null = null;
let isAuthListenerInitialized = false;
const serverConfirmedOwnerUids = new Set<string>();

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function getAuthStatus(): AuthStatus {
  if (!isAuthListenerInitialized) return 'loading';
  return isAuthenticated() ? 'authenticated' : 'unauthenticated';
}

export function isAuthInitialized(): boolean {
  return isAuthListenerInitialized;
}

/**
 * Normalize provider string from Firebase providerId
 */
function normalizeProviderId(providerId?: string): AuthProvider {
  if (providerId && providerId.includes('microsoft')) {
    return 'microsoft';
  }
  return 'google';
}

/**
 * Extract all linked providers from Firebase User providerData
 */
function extractLinkedProviders(fbUser: FirebaseUser, fallback: AuthProvider): AuthProvider[] {
  const set = new Set<AuthProvider>();
  if (Array.isArray(fbUser.providerData)) {
    fbUser.providerData.forEach((p) => {
      if (p?.providerId?.includes('microsoft')) set.add('microsoft');
      if (p?.providerId?.includes('google')) set.add('google');
    });
  }
  if (set.size === 0) set.add(fallback);
  return Array.from(set);
}

/**
 * Get current Firebase ID Token for authenticated server requests
 */
export async function getAuthIdToken(forceRefresh = false): Promise<string | null> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(forceRefresh);
      inMemoryIdToken = token;
      return token;
    }
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token:', err);
  }
  return inMemoryIdToken;
}

/**
 * Synchronous accessor for last verified ID token
 */
export function getCachedIdToken(): string | null {
  return inMemoryIdToken;
}

/**
 * Canonical authenticated account getter
 */
export function getCurrentAccount(): CreatorFlowUser | null {
  if (inMemoryCurrentAccount) return inMemoryCurrentAccount;
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_CACHE_KEY) || localStorage.getItem(AUTH_SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreatorFlowUser;
    if (!parsed || !parsed.id || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Legacy alias for getCurrentAccount so existing components stay in sync
 */
export function getStoredUser(): CreatorFlowUser | null {
  return getCurrentAccount();
}

/**
 * Canonical boolean check for authenticated session
 */
export function isAuthenticated(): boolean {
  const acc = getCurrentAccount();
  return Boolean(acc && acc.id && acc.email);
}

/**
 * Save verified account state and broadcast change
 */
export function saveStoredUser(user: CreatorFlowUser | null): void {
  inMemoryCurrentAccount = user;
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      const serialized = JSON.stringify(user);
      sessionStorage.setItem(AUTH_SESSION_CACHE_KEY, serialized);
      localStorage.setItem(AUTH_SESSION_CACHE_KEY, serialized);
      addDeviceKnownAccount(user);
    } else {
      inMemoryIdToken = null;
      sessionStorage.removeItem(AUTH_SESSION_CACHE_KEY);
      localStorage.removeItem(AUTH_SESSION_CACHE_KEY);
      // Also clean up any legacy keys
      localStorage.removeItem('creatorflow_auth_user_v2');
      localStorage.removeItem('creatorflow_auth_session_v2');
    }
    window.dispatchEvent(new CustomEvent('creatorflow_auth_changed', { detail: { user } }));
  } catch (err) {
    console.error('Failed to save verified account state:', err);
  }
}

/**
 * Registers a UID as server-verified owner/admin only after verified backend /api/auth/signin,
 * /api/auth/me, or verified Firebase custom token claims. Never persisted to tamperable storage.
 */
function syncServerConfirmedOwner(uid: string, role?: UserRole): void {
  if (!uid) return;
  if (role === 'owner' || role === 'admin') {
    serverConfirmedOwnerUids.add(uid);
  } else {
    serverConfirmedOwnerUids.delete(uid);
  }
}

/**
 * Checks whether the current user has server-verified Owner or Admin authority.
 * Rejects tampered client/localStorage role overrides that were not confirmed by the server.
 */
export function isAuthorizedOwner(user: CreatorFlowUser | null = getCurrentAccount()): boolean {
  if (!user || !user.id) return false;
  if (user.role !== 'owner' && user.role !== 'admin') return false;
  return serverConfirmedOwnerUids.has(user.id);
}

// -------------------------------------------------------------
// KNOWN ACCOUNTS REGISTRY (FOR OWNER ANALYTICS & MULTI-ACCOUNT DIAGNOSTICS)
// -------------------------------------------------------------
export function getDeviceKnownAccounts(): KnownDeviceAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEVICE_KNOWN_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDeviceKnownAccount(user: CreatorFlowUser): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDeviceKnownAccounts();
    const existingIndex = list.findIndex((a) => a.id === user.id);
    const entry: KnownDeviceAccount = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      plan: user.plan || 'free',
      role: user.role || 'user',
      provider: user.provider || 'google',
      lastUsedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.push(entry);
    }
    localStorage.setItem(DEVICE_KNOWN_ACCOUNTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error recording known account:', err);
  }
}

export function removeDeviceKnownAccount(accountId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDeviceKnownAccounts().filter((a) => a.id !== accountId);
    localStorage.setItem(DEVICE_KNOWN_ACCOUNTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error removing known account:', err);
  }
}

// -------------------------------------------------------------
// SERVER & FIRESTORE VERIFICATION HANDSHAKE (DEDUPLICATED & IDEMPOTENT)
// -------------------------------------------------------------
const inFlightProvisioningByUid = new Map<
  string,
  Promise<{ user: CreatorFlowUser; isNewAccount: boolean }>
>();
const recentProvisionedCache = new Map<
  string,
  { timestamp: number; result: { user: CreatorFlowUser; isNewAccount: boolean } }
>();

export async function verifyAndProvisionAccount(
  fbUser: FirebaseUser,
  preferredProvider: AuthProvider,
  options?: { force?: boolean }
): Promise<{ user: CreatorFlowUser; isNewAccount: boolean }> {
  if (!fbUser || !fbUser.uid) {
    throw new Error('Firebase authentication state is not ready: missing authenticated user UID.');
  }

  const uid = fbUser.uid;

  // 1. Return existing in-flight provisioning promise if already running for this UID
  const existingInFlight = inFlightProvisioningByUid.get(uid);
  if (existingInFlight) {
    return existingInFlight;
  }

  // 2. Avoid duplicate back-to-back provisioning during initial render + onAuthStateChanged
  if (!options?.force) {
    const cached = recentProvisionedCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 8000 && inMemoryCurrentAccount?.id === uid) {
      return cached.result;
    }
  }

  const provisioningPromise = executeVerifyAndProvisionAccount(fbUser, preferredProvider)
    .then((result) => {
      recentProvisionedCache.set(uid, { timestamp: Date.now(), result });
      return result;
    })
    .finally(() => {
      inFlightProvisioningByUid.delete(uid);
    });

  inFlightProvisioningByUid.set(uid, provisioningPromise);
  return provisioningPromise;
}

async function executeVerifyAndProvisionAccount(
  fbUser: FirebaseUser,
  preferredProvider: AuthProvider
): Promise<{ user: CreatorFlowUser; isNewAccount: boolean }> {
  // Obtain a fresh Firebase ID token from the authenticated Firebase user
  const idToken = await fbUser.getIdToken();
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Failed to obtain a valid Firebase ID token from the authenticated session.');
  }
  inMemoryIdToken = idToken;

  const accountId = fbUser.uid;
  const rawEmail = (fbUser.email || '').trim().toLowerCase();
  const safeEmail = rawEmail.length >= 3 ? rawEmail.slice(0, 256) : `${accountId}@users.creatorflow.local`;
  const rawDisplayName = (fbUser.displayName || safeEmail.split('@')[0] || 'Creator').trim();
  const safeDisplayName = (rawDisplayName.length >= 1 ? rawDisplayName : 'Creator').slice(0, 120);
  const photoURL = fbUser.photoURL ? fbUser.photoURL.slice(0, 1000) : undefined;
  const linkedProviders = extractLinkedProviders(fbUser, preferredProvider);
  const nowIso = new Date().toISOString();

  const deviceInstallId = getOrCreateDeviceInstallId();
  let signInResponse: Response;
  try {
    signInResponse = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        idToken,
        provider: preferredProvider,
        deviceInstallId,
      }),
    });
  } catch (networkErr: any) {
    console.error('[CreatorFlow Auth] Network error contacting /api/auth/signin:', networkErr);
    throw new Error('Network error while verifying your authentication session with the server. Please check your connection and try again.');
  }

  if (!signInResponse.ok) {
    const errBody = await signInResponse.json().catch(() => ({}));
    const serverMsg =
      errBody.message ||
      'A valid, cryptographically verified Firebase Authentication token is required to sign in.';
    console.error('[CreatorFlow Auth] Server rejected Firebase ID token:', signInResponse.status, errBody);
    throw new Error(serverMsg);
  }

  const signInData = await signInResponse.json();
  const serverAccount = signInData.account || {};
  const serverRole: UserRole = serverAccount.role || 'user';
  const serverPlan: PlanId = serverAccount.plan || 'free';
  const createdAt = serverAccount.createdAt || nowIso;
  const isNewAccount = Boolean(signInData.isNewAccount);
  const resolvedDisplayName = serverAccount.displayName || safeDisplayName;
  const resolvedPhotoURL = serverAccount.photoURL || photoURL;

  // 2. Synchronize authoritative plan locally for this account
  setStoredPlan(serverPlan);

  // 3. Pull account-isolated workspace data from Firestore into local account cache (non-blocking)
  await syncAccountWorkspaceFromCloud(accountId).catch((err) => {
    console.warn('[CreatorFlow Auth] Non-blocking workspace sync skipped:', err);
  });

  const verifiedUser: CreatorFlowUser = {
    id: accountId,
    accountId,
    providerId: fbUser.providerData[0]?.uid || accountId,
    email: safeEmail,
    displayName: resolvedDisplayName,
    photoURL: resolvedPhotoURL,
    createdAt,
    lastLoginAt: nowIso,
    provider: preferredProvider,
    plan: serverPlan,
    role: serverRole,
    linkedProviders,
    emailVerified: Boolean(fbUser.emailVerified),
  };

  syncServerConfirmedOwner(accountId, serverRole);
  saveStoredUser(verifiedUser);
  return { user: verifiedUser, isNewAccount };
}

/**
 * Explicit client Firestore account reader for authorized security audit checks.
 */
export async function getAccountProfileFromFirestore(accountId: string): Promise<Record<string, any> | null> {
  try {
    const accountRef = doc(db, 'accounts', accountId);
    const snap = await getDoc(accountRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, `accounts/${accountId}`);
    }
    throw err;
  }
}

/**
 * Format Firebase OAuth & provisioning errors into clear, human-friendly messages while logging technical details in dev
 */
export function formatOAuthError(error: any, providerName: 'Google' | 'Microsoft'): string {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');

  console.error(`[CreatorFlow ${providerName} Auth Error]`, { code, message: msg, error });

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return `${providerName} sign-in was cancelled before completion. Click Continue with ${providerName} when you're ready.`;
  }
  if (code === 'auth/popup-blocked') {
    return `Your browser blocked the ${providerName} sign-in popup. Please allow popups for this site and try again.`;
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return `An account already exists with the same email address under a different sign-in provider. Sign in with your original provider first, then link ${providerName} from Account Settings.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return `${providerName} Sign-In is not enabled in the Firebase Authentication console for this project. Enable ${providerName} in Firebase Console → Authentication → Sign-in method.`;
  }
  if (code === 'auth/network-request-failed' || msg.toLowerCase().includes('network error')) {
    return `Network connection error while completing ${providerName} sign-in. Please check your internet connection and try again.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return `This domain is not yet authorized in Firebase Authentication settings. Please add this domain in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/id-token-expired' || code === 'auth/user-token-expired' || msg.includes('expired')) {
    return `Your ${providerName} session token expired. Please try signing in again.`;
  }
  if (msg.includes('invalid-credential') || code === 'auth/invalid-credential') {
    return `${providerName} authentication credentials could not be verified. Please try signing in again.`;
  }
  if (msg.includes('Missing or insufficient permissions') || msg.includes('operationType')) {
    return `Account profile permissions error while provisioning your CreatorFlow workspace. Please try signing in again.`;
  }
  if (msg && !msg.startsWith('Firebase:')) {
    return msg;
  }
  return `Unable to complete ${providerName} sign-in right now. Please try again.`;
}

let redirectPromise: Promise<{ user: CreatorFlowUser; isNewAccount: boolean } | null> | null = null;

export async function processRedirectResult(): Promise<{ user: CreatorFlowUser; isNewAccount: boolean } | null> {
  if (typeof window === 'undefined') return null;
  if (redirectPromise) return redirectPromise;

  redirectPromise = (async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        const provider = normalizeProviderId(result.user.providerData[0]?.providerId);
        return await verifyAndProvisionAccount(result.user, provider);
      }
    } catch (error: any) {
      console.error('[CreatorFlow Auth] Error processing redirect result:', error);
      throw new Error(formatOAuthError(error, 'Google'));
    }
    return null;
  })();

  return redirectPromise;
}

// -------------------------------------------------------------
// 1. REAL GOOGLE SIGN-IN
// -------------------------------------------------------------
export async function signInWithGoogle(): Promise<{ user: CreatorFlowUser; isNewAccount: boolean }> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return await verifyAndProvisionAccount(credential.user, 'google');
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.warn('[CreatorFlow Auth] Popup blocked by browser. Falling back to signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      return new Promise(() => {}); // Wait for page navigation to Google
    }
    throw new Error(formatOAuthError(error, 'Google'));
  }
}

// -------------------------------------------------------------
// 2. REAL MICROSOFT SIGN-IN
// -------------------------------------------------------------
export async function signInWithMicrosoft(): Promise<{ user: CreatorFlowUser; isNewAccount: boolean }> {
  try {
    const credential = await signInWithPopup(auth, microsoftProvider);
    return await verifyAndProvisionAccount(credential.user, 'microsoft');
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.warn('[CreatorFlow Auth] Popup blocked by browser. Falling back to signInWithRedirect...');
      await signInWithRedirect(auth, microsoftProvider);
      return new Promise(() => {}); // Wait for page navigation to Microsoft
    }
    throw new Error(formatOAuthError(error, 'Microsoft'));
  }
}

// -------------------------------------------------------------
// 3. PROVIDER LINKING (GOOGLE <-> MICROSOFT)
// -------------------------------------------------------------
export async function linkAccountProvider(targetProvider: AuthProvider): Promise<CreatorFlowUser> {
  if (!auth.currentUser) {
    throw new Error('You must be signed in to link another authentication provider.');
  }

  try {
    const providerObj = targetProvider === 'microsoft' ? microsoftProvider : googleProvider;
    const result = await linkWithPopup(auth.currentUser, providerObj);
    const current = getCurrentAccount();
    const primaryProvider = current?.provider || normalizeProviderId(result.user.providerData[0]?.providerId);
    const { user } = await verifyAndProvisionAccount(result.user, primaryProvider);

    // Notify backend of linked provider
    const idToken = await getAuthIdToken();
    await fetch('/api/auth/link-provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        accountId: user.id,
        provider: targetProvider,
      }),
    }).catch(() => {});

    return user;
  } catch (error: any) {
    if (error?.code === 'auth/credential-already-in-use') {
      throw new Error(`This ${targetProvider === 'microsoft' ? 'Microsoft' : 'Google'} account is already linked to a different CreatorFlow account.`);
    }
    throw new Error(formatOAuthError(error, targetProvider === 'microsoft' ? 'Microsoft' : 'Google'));
  }
}

// -------------------------------------------------------------
// 4. REAL LOGOUT & SESSION INVALIDATION
// -------------------------------------------------------------
export async function signOutUser(): Promise<void> {
  const current = getCurrentAccount();
  let idToken: string | null = inMemoryIdToken;
  try {
    const freshToken = await getAuthIdToken();
    if (freshToken) idToken = freshToken;
  } catch {
    // fallback to inMemoryIdToken
  }

  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }

  if (current) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ accountId: current.id }),
      });
    } catch {
      // ignore network error during logout
    }
  }

  serverConfirmedOwnerUids.clear();
  inFlightProvisioningByUid.clear();
  recentProvisionedCache.clear();
  saveStoredUser(null);
  setStoredPlan('free');
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('cf_owner_telemetry_events_v2');
      localStorage.removeItem('cf_admin_telemetry_events_v1');
    } catch {
      // ignore
    }
  }
}

/**
 * Permanently deletes the currently authenticated user's account, workspace data,
 * Firestore account document, and Firebase Auth user record.
 */
export async function deleteCurrentAccount(): Promise<{ success: boolean; message: string }> {
  const fbUser = auth.currentUser;
  const current = getCurrentAccount();
  const uid = fbUser?.uid || current?.id;
  if (!uid) {
    throw new Error('You must be signed in to delete your account.');
  }

  const idToken = await getAuthIdToken(true);
  if (!idToken) {
    throw new Error('Authentication session expired. Please sign in again before deleting your account.');
  }

  const res = await fetch('/api/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ accountId: uid }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete server account data.');
  }

  // Delete client-accessible Firestore docs (works even if Admin SDK lacked container SA permissions)
  clearAllAccountWorkspaceData(uid, { includeProfileAndTour: true });
  try {
    await deleteDoc(doc(db, 'accounts', uid));
  } catch {
    // May already be deleted by backend Admin SDK or denied if Auth user already removed
  }

  if (fbUser && !data.authUserDeleted) {
    try {
      await deleteUser(fbUser);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        throw new Error('For security, please sign out and sign back in right before permanently deleting your Firebase login.');
      }
      if (err?.code !== 'auth/user-not-found') {
        console.warn('[CreatorFlow Auth] Client Firebase deleteUser fallback warning:', err?.code || err?.message);
      }
    }
  }

  removeDeviceKnownAccount(uid);
  serverConfirmedOwnerUids.clear();
  inFlightProvisioningByUid.clear();
  recentProvisionedCache.clear();
  saveStoredUser(null);
  setStoredPlan('free');
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('cf_owner_telemetry_events_v2');
      localStorage.removeItem('cf_admin_telemetry_events_v1');
      localStorage.removeItem('creatorflow_migration_prompted_v3');
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    message: data.message || 'Your account and workspace data have been permanently deleted.',
  };
}

// -------------------------------------------------------------
// 5. SESSION PERSISTENCE & AUTHORITATIVE SERVER VALIDATION
// -------------------------------------------------------------
let activeAuthUnsubscribe: (() => void) | null = null;

export function initializeAuthSessionListener(
  onUserChanged?: (user: CreatorFlowUser | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (activeAuthUnsubscribe) {
    activeAuthUnsubscribe();
    activeAuthUnsubscribe = null;
  }

  // Handle redirect completion when returning from popup-blocked redirect
  processRedirectResult()
    .then((result) => {
      if (result) {
        onUserChanged?.(result.user);
      }
    })
    .catch((err) => {
      console.warn('[CreatorFlow Auth] Non-fatal redirect result handling:', err);
    });

  const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
    isAuthListenerInitialized = true;
    window.dispatchEvent(new CustomEvent('creatorflow_auth_initialized', { detail: { fbUser: !!fbUser } }));

    if (!fbUser) {
      recentProvisionedCache.clear();
      saveStoredUser(null);
      onUserChanged?.(null);
      return;
    }

    try {
      const existing = getCurrentAccount();
      const provider = existing?.provider || normalizeProviderId(fbUser.providerData[0]?.providerId);
      const { user } = await verifyAndProvisionAccount(fbUser, provider);
      onUserChanged?.(user);
    } catch (err) {
      console.error('Session verification failed:', err);
      saveStoredUser(null);
      onUserChanged?.(null);
    }
  });

  activeAuthUnsubscribe = unsubscribe;
  return () => {
    unsubscribe();
    if (activeAuthUnsubscribe === unsubscribe) {
      activeAuthUnsubscribe = null;
    }
  };
}

/**
 * Verify current session directly against backend `/api/auth/me` using Bearer token.
 * Prevents localStorage tampering of role or plan.
 */
export async function verifySessionWithServer(): Promise<CreatorFlowUser | null> {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    const cached = getCurrentAccount();
    if (!cached) return null;
  }

  try {
    const token = await getAuthIdToken();
    if (!token) return getCurrentAccount();

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await signOutUser();
        return null;
      }
      return getCurrentAccount();
    }

    const data = await res.json();
    if (data.authenticated && data.account) {
      const current = getCurrentAccount();
      const verified: CreatorFlowUser = {
        id: data.account.id,
        accountId: data.account.id,
        providerId: data.account.id,
        email: data.account.email,
        displayName: data.account.displayName,
        photoURL: data.account.photoURL || current?.photoURL,
        createdAt: data.account.createdAt,
        lastLoginAt: data.account.lastLoginAt,
        provider: data.account.provider || current?.provider || 'google',
        plan: data.account.plan || 'free',
        role: data.account.role || 'user',
        linkedProviders: data.account.linkedProviders || [data.account.provider || 'google'],
        emailVerified: Boolean(fbUser?.emailVerified ?? true),
      };
      syncServerConfirmedOwner(verified.id, verified.role);
      setStoredPlan(verified.plan);
      saveStoredUser(verified);
      return verified;
    }
  } catch {
    // fallback to current verified state if offline
  }
  return getCurrentAccount();
}

// -------------------------------------------------------------
// 6. ANONYMOUS LOCAL DATA MIGRATION DETECTION
// -------------------------------------------------------------
export function hasExistingLocalData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const anonProfile = localStorage.getItem('cf_acc_anonymous_workspace_profile_v1') || localStorage.getItem('creatorflow_creator_profile_v3');
    const anonProjects = localStorage.getItem('cf_acc_anonymous_workspace_projects_v1') || localStorage.getItem('creatorflow_video_projects_v3');
    const anonAnalytics = localStorage.getItem('cf_acc_anonymous_workspace_analytics_v1') || localStorage.getItem('creatorflow_video_analytics_v1');

    let hasCompletedProfile = false;
    if (anonProfile) {
      try {
        const p = JSON.parse(anonProfile);
        if (p && p.onboardingCompleted) hasCompletedProfile = true;
      } catch {
        // ignore
      }
    }

    const hasProjects = Boolean(anonProjects && anonProjects !== '[]' && anonProjects !== 'null');
    const hasAnalytics = Boolean(anonAnalytics && anonAnalytics !== '[]' && anonAnalytics !== 'null');

    return hasCompletedProfile || hasProjects || hasAnalytics;
  } catch {
    return false;
  }
}

export function hasPromptedMigration(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DATA_MIGRATION_PROMPTED_KEY) === 'true';
}

export function setMigrationPrompted(val: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATA_MIGRATION_PROMPTED_KEY, val ? 'true' : 'false');
}

export function handleLocalDataMigrationChoice(
  choice: 'keep' | 'fresh'
): { migratedItems: string[]; conflictsResolved: number } {
  setMigrationPrompted(true);
  const activeUser = getCurrentAccount();
  if (activeUser && activeUser.id) {
    return migrateAnonymousDataToAccount(activeUser.id, choice);
  }
  return { migratedItems: [], conflictsResolved: 0 };
}
