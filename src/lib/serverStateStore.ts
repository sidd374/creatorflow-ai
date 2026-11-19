/**
 * CreatorFlow AI — Authoritative Server State Store (Firestore + Transactional Mutex)
 *
 * Replaces volatile in-memory Maps with read-through & write-through persistence:
 * 1. Primary store: Firebase Admin Firestore (`accounts`, `server_usage`, `server_video_quotas`, `admins`,
 *    `telemetry`, `server_devices`, `server_upgrade_requests`, `plan_demand_stats`, `server_usage_records`)
 *    using Firestore transactions (`runTransaction`) for atomic quota consumption & slot reservations.
 * 2. Local fallback (dev/sandbox/CI without GCP ADC): Atomic file-backed persistence serialized with
 *    a per-account async mutex (`withAccountLock`). Disabled when `CREATORFLOW_REQUIRE_FIRESTORE=true`,
 *    which fails closed on BOTH reads and writes.
 */

import fs from 'fs';
import path from 'path';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  AiUsageMetricsRecord,
  ByokKeyStatus,
  EncryptedByokRecord,
  GeminiModelId,
  IntelligenceTaskType,
} from './intelligence/types.ts';
import { DEFAULT_GEMINI_MODEL } from './intelligence/models.ts';

export type ServerPlanId = 'free' | 'pro' | 'creator' | 'max' | 'custom_annual';
export type ServerRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
export type ServerUserRole = 'user' | 'admin' | 'owner';
export type ServerSubscriptionStatus = 'active' | 'trialing' | 'pending' | 'canceled' | 'expired';
export type ServerBillingCadence = 'monthly' | 'yearly';

export interface ServerCustomEntitlement {
  creationStyle?: string;
  channelsCount?: number;
  usageTier?: string;
  capabilities?: string[];
  annualPrice?: number;
  allowedFeatures?: string[];
  customLimits?: Partial<Record<string, number | 'unlimited'>>;
}

export interface ServerSubscription {
  status: ServerSubscriptionStatus;
  planId: ServerPlanId;
  cadence: ServerBillingCadence;
  startedAt: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  priceInRupees?: number;
  customConfig?: ServerCustomEntitlement;
}

export interface ServerAccount {
  id: string;
  providerId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: ServerPlanId;
  role: ServerUserRole;
  provider: 'google' | 'microsoft' | 'local';
  linkedProviders: string[];
  createdAt: string;
  lastLoginAt: string;
  isVerified: boolean;
  associatedDeviceIds: Set<string>;
  subscription: ServerSubscription;
}

export interface ServerUsageState {
  month: string;
  creationKitsUsed: number;
  assistantMessagesUsed: number;
  topicsAnalyzed: number;
  projectsCreated: number;
  analyticsRecordsUsed: number;
  lifetimeGenerations: number;
  cloudGenerationsUsed?: number;
}

export interface ServerVideoReservation {
  id: string;
  accountId: string;
  workflowId: string;
  topic: string;
  timestamp: number;
}

export interface ServerQuotaDoc {
  accountId: string;
  reservations: ServerVideoReservation[];
  idempotencyMap: Record<string, string>; // idempotencyKey -> workflowId
  generationIdempotencyKeys: string[];
  legacyTimestamps?: number[];
}

export interface PersistedTelemetryEvent {
  id: string;
  eventName: string;
  accountId: string;
  timestamp: string;
  plan: string;
  feature?: string;
  projectId?: string;
  workflowStep?: number;
  properties?: Record<string, any>;
  errorMessage?: string;
  errorType?: string;
}

export interface PersistedUpgradeRequest {
  id: string;
  accountId: string;
  targetPlan: ServerPlanId;
  cadence: ServerBillingCadence;
  priceInRupees: number;
  notes: string;
  timestamp: string;
  status: 'pending_verification' | 'processed' | 'declined';
}

export interface PersistedDeviceInfo {
  id: string;
  firstSeen: number;
  lastSeen: number;
  accountIds: string[];
  switches: number[];
  newAccountTimestamps: number[];
  riskLevel: ServerRiskLevel;
  riskReasons: string[];
}

export interface PersistedUsageRecord {
  id: string;
  accountId: string;
  deviceInstallId: string;
  feature: string;
  period: string;
  timestamp: string;
  success: boolean;
}

export interface PersistedDemandSummary {
  totalRequests: number;
  byPlan: Record<string, number>;
  byPlatform: Record<string, number>;
  byAudienceSize: Record<string, number>;
  byBillingPreference: Record<string, number>;
}

export interface PersistenceDiagnostics {
  mode: 'firestore' | 'local_fallback';
  firestoreConfigured: boolean;
  firestoreHealthy: boolean;
  requireFirestore: boolean;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastFallbackAt: string | null;
}

export const ROLLING_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getWeeklyLimitForPlan(plan: ServerPlanId, customConfig?: ServerCustomEntitlement): number {
  if (plan === 'free') return 2;
  if (plan === 'pro') return 25;
  if (plan === 'creator') return 75;
  if (plan === 'max') return 200;
  if (plan === 'custom_annual') {
    const custom = customConfig?.customLimits?.weeklyVideos;
    if (typeof custom === 'number' && custom > 0) return custom;
    return 100;
  }
  return 2;
}

export function getEffectivePlan(account: ServerAccount): ServerPlanId {
  if (account.plan === 'free') return 'free';
  const sub = account.subscription;
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
    return 'free';
  }
  if (sub.currentPeriodEnd) {
    const expiresAt = new Date(sub.currentPeriodEnd).getTime();
    if (!isNaN(expiresAt) && expiresAt < Date.now()) {
      sub.status = 'expired';
      return 'free';
    }
  }
  return account.plan;
}

export function getServerMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatTimeUntilReset(msRemaining: number): string {
  if (msRemaining <= 0) return 'Available now';
  const totalHours = Math.floor(msRemaining / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

// -------------------------------------------------------------
// PER-ACCOUNT ASYNC MUTEX (CONCURRENCY SAFETY)
// -------------------------------------------------------------
const accountMutexQueues = new Map<string, Promise<void>>();

export async function withAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
  const key = accountId || '__global__';
  const prev = accountMutexQueues.get(key) || Promise.resolve();
  let releaseCurrent!: () => void;
  const next = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const chained = prev.then(() => next);
  accountMutexQueues.set(key, chained);

  try {
    await prev;
    return await fn();
  } finally {
    releaseCurrent();
    if (accountMutexQueues.get(key) === chained) {
      accountMutexQueues.delete(key);
    }
  }
}

// -------------------------------------------------------------
// LOCAL ATOMIC FILE FALLBACK (FOR DEV/TEST SANDBOX WITHOUT ADC)
// -------------------------------------------------------------
interface PersistedAccountSerialized {
  id: string;
  providerId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: ServerPlanId;
  role: ServerUserRole;
  provider: 'google' | 'microsoft' | 'local';
  linkedProviders: string[];
  createdAt: string;
  lastLoginAt: string;
  isVerified: boolean;
  associatedDeviceIds: string[];
  subscription: ServerSubscription;
}

interface LocalSnapshotFile {
  accounts: Record<string, PersistedAccountSerialized>;
  usage: Record<string, ServerUsageState>;
  lifetimeGenerations: Record<string, number>;
  videoQuotas: Record<string, ServerQuotaDoc>;
  admins: Record<string, { uid: string; role: 'owner' | 'admin'; active?: boolean; grantedAt: string; updatedAt?: string }>;
  tourProgress: Record<string, any>;
  telemetryEvents: PersistedTelemetryEvent[];
  upgradeRequests: PersistedUpgradeRequest[];
  devices: Record<string, PersistedDeviceInfo>;
  usageRecords: PersistedUsageRecord[];
  demandAnalytics: PersistedDemandSummary;
  aiCredentials: Record<string, EncryptedByokRecord>;
  aiUsageMetrics: Record<string, AiUsageMetricsRecord>;
}

function getStateFilePath(): string {
  return process.env.CREATORFLOW_STATE_FILE
    ? path.resolve(process.env.CREATORFLOW_STATE_FILE)
    : path.resolve(process.cwd(), '.creatorflow-server-state.json');
}

function serializeAccount(acc: ServerAccount): PersistedAccountSerialized {
  return {
    id: acc.id,
    providerId: acc.providerId,
    email: acc.email,
    displayName: (acc.displayName || 'Creator').slice(0, 128),
    ...(acc.photoURL ? { photoURL: acc.photoURL } : {}),
    plan: acc.plan,
    role: acc.role,
    provider: acc.provider,
    linkedProviders: [...acc.linkedProviders],
    createdAt: acc.createdAt,
    lastLoginAt: acc.lastLoginAt,
    isVerified: acc.isVerified,
    associatedDeviceIds: Array.from(acc.associatedDeviceIds).slice(-50),
    subscription: acc.subscription,
  };
}

function deserializeAccount(raw: Partial<PersistedAccountSerialized>, accountId: string): ServerAccount {
  const nowIso = new Date().toISOString();
  const plan: ServerPlanId =
    raw.plan && ['free', 'pro', 'creator', 'max', 'custom_annual'].includes(raw.plan)
      ? raw.plan
      : 'free';
  const linked = Array.isArray(raw.linkedProviders)
    ? raw.linkedProviders
    : typeof (raw as any).linkedProviders === 'string'
    ? String((raw as any).linkedProviders).split(',').filter(Boolean)
    : [raw.provider || 'google'];

  return {
    id: raw.id || accountId,
    providerId: raw.providerId || raw.id || accountId,
    email: raw.email || '',
    displayName: raw.displayName || 'Creator',
    photoURL: raw.photoURL || undefined,
    plan,
    role: raw.role === 'owner' || raw.role === 'admin' ? raw.role : 'user',
    provider: raw.provider === 'microsoft' || raw.provider === 'local' ? raw.provider : 'google',
    linkedProviders: linked,
    createdAt: raw.createdAt || nowIso,
    lastLoginAt: raw.lastLoginAt || nowIso,
    isVerified: Boolean(raw.isVerified ?? true),
    associatedDeviceIds: new Set(Array.isArray(raw.associatedDeviceIds) ? raw.associatedDeviceIds : []),
    subscription: raw.subscription || {
      status: 'active',
      planId: plan,
      cadence: 'monthly',
      startedAt: raw.createdAt || nowIso,
      priceInRupees: 0,
    },
  };
}

export function isFirestorePermissionOrCredentialError(err: unknown): boolean {
  if (!err) return false;
  const code = (err as any)?.code;
  const msg = String((err as any)?.message || '').toLowerCase();
  return (
    code === 7 ||
    code === 16 ||
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    msg.includes('permission_denied') ||
    msg.includes('default credentials') ||
    msg.includes('could not refresh access token') ||
    msg.includes('unauthenticated')
  );
}

const DEFAULT_DEMAND_SUMMARY: PersistedDemandSummary = {
  totalRequests: 0,
  byPlan: {},
  byPlatform: {},
  byAudienceSize: {},
  byBillingPreference: {},
};

export class ServerStateStore {
  private adminDb: Firestore | null;
  private firestoreAvailable = true;
  private lastFirestoreErrorCode: string | null = null;
  private lastFirestoreErrorMessage: string | null = null;
  private lastFallbackAt: string | null = null;
  private hasLoggedFallbackWarning = false;

  // Read-through / write-through RAM mirrors (used for diagnostics and restart tests)
  public accounts = new Map<string, ServerAccount>();
  public usage = new Map<string, ServerUsageState>();
  public lifetimeGenerations = new Map<string, number>();
  public videoQuotas = new Map<string, ServerQuotaDoc>();
  public tourProgress = new Map<string, any>();
  public byokCredentials = new Map<string, EncryptedByokRecord>();
  public aiUsageMetrics = new Map<string, AiUsageMetricsRecord>();

  constructor(adminDb: Firestore | null) {
    this.adminDb = adminDb;
    if (!adminDb) {
      this.firestoreAvailable = false;
    }
  }

  public setAdminDb(adminDb: Firestore | null): void {
    this.adminDb = adminDb;
    this.firestoreAvailable = Boolean(adminDb);
    if (adminDb) {
      this.lastFirestoreErrorCode = null;
      this.lastFirestoreErrorMessage = null;
      this.hasLoggedFallbackWarning = false;
    }
  }

  public getPersistenceDiagnostics(): PersistenceDiagnostics {
    return {
      mode: this.canTryFirestore() ? 'firestore' : 'local_fallback',
      firestoreConfigured: Boolean(this.adminDb),
      firestoreHealthy: Boolean(this.adminDb && this.firestoreAvailable),
      requireFirestore: process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true',
      lastErrorCode: this.lastFirestoreErrorCode,
      lastErrorMessage: this.lastFirestoreErrorMessage,
      lastFallbackAt: this.lastFallbackAt,
    };
  }

  public async checkFirestoreHealth(): Promise<{
    healthy: boolean;
    errorCode?: string;
    errorMessage?: string;
  }> {
    if (!this.adminDb || process.env.CREATORFLOW_FORCE_LOCAL_STATE === 'true') {
      this.firestoreAvailable = false;
      return {
        healthy: false,
        errorCode: !this.adminDb ? 'NO_ADMIN_DB' : 'LOCAL_OVERRIDE',
        errorMessage: !this.adminDb
          ? 'Firebase Admin Firestore client is not initialized.'
          : 'CREATORFLOW_FORCE_LOCAL_STATE=true overrides Firestore.',
      };
    }

    try {
      await this.adminDb.collection('test').doc('connection').get();
      this.firestoreAvailable = true;
      this.lastFirestoreErrorCode = null;
      this.lastFirestoreErrorMessage = null;
      return { healthy: true };
    } catch (err: any) {
      const code = String(err?.code ?? 'unknown');
      const message = String(err?.message || 'Firestore health probe failed').slice(0, 300);
      this.firestoreAvailable = false;
      this.lastFirestoreErrorCode = code;
      this.lastFirestoreErrorMessage = message;
      this.lastFallbackAt = new Date().toISOString();
      return { healthy: false, errorCode: code, errorMessage: message };
    }
  }

  /**
   * Simulates server restart by clearing volatile RAM caches cleanly.
   * All persisted state remains on Firestore / disk and is reloaded on next access.
   */
  public clearMemoryCacheForRestartSimulation(): void {
    this.accounts.clear();
    this.usage.clear();
    this.lifetimeGenerations.clear();
    this.videoQuotas.clear();
    this.tourProgress.clear();
    this.byokCredentials.clear();
    this.aiUsageMetrics.clear();
  }

  private assertLocalFallbackAllowed(operation: string): void {
    if (process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true') {
      throw new Error(
        `Firestore persistence is required (CREATORFLOW_REQUIRE_FIRESTORE=true) and unavailable during "${operation}".` +
          (this.lastFirestoreErrorCode ? ` Last error: ${this.lastFirestoreErrorCode}` : '')
      );
    }
    if (!this.hasLoggedFallbackWarning) {
      this.hasLoggedFallbackWarning = true;
      console.error(
        `[ServerStateStore] CRITICAL WARNING: Firestore unavailable (${this.lastFirestoreErrorCode || 'unconfigured'}). Falling back to local file storage (${getStateFilePath()}) for ${operation}. Local file fallback is NOT durable across multiple instances.`
      );
    }
  }

  private handleFirestoreError(err: unknown, operation: string): void {
    const code = String((err as any)?.code ?? 'unknown');
    const message = String((err as any)?.message || err || 'Unknown Firestore error').slice(0, 300);
    this.lastFirestoreErrorCode = code;
    this.lastFirestoreErrorMessage = message;
    this.lastFallbackAt = new Date().toISOString();

    if (process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true') {
      this.firestoreAvailable = false;
      throw new Error(
        `Firestore persistence failed during "${operation}" while CREATORFLOW_REQUIRE_FIRESTORE=true (code=${code}): ${message}`
      );
    }

    if (!isFirestorePermissionOrCredentialError(err)) {
      throw err;
    }

    this.firestoreAvailable = false;
    this.assertLocalFallbackAllowed(operation);
  }

  private readLocalFile(): LocalSnapshotFile {
    const empty: LocalSnapshotFile = {
      accounts: {},
      usage: {},
      lifetimeGenerations: {},
      videoQuotas: {},
      admins: {},
      tourProgress: {},
      telemetryEvents: [],
      upgradeRequests: [],
      devices: {},
      usageRecords: [],
      demandAnalytics: {
        totalRequests: 0,
        byPlan: {},
        byPlatform: {},
        byAudienceSize: {},
        byBillingPreference: {},
      },
      aiCredentials: {},
      aiUsageMetrics: {},
    };
    const filePath = getStateFilePath();
    try {
      if (!fs.existsSync(filePath)) return empty;
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw.trim()) return empty;
      const parsed = JSON.parse(raw);
      return {
        accounts: parsed.accounts || {},
        usage: parsed.usage || {},
        lifetimeGenerations: parsed.lifetimeGenerations || {},
        videoQuotas: parsed.videoQuotas || {},
        admins: parsed.admins || {},
        tourProgress: parsed.tourProgress || {},
        telemetryEvents: Array.isArray(parsed.telemetryEvents) ? parsed.telemetryEvents : [],
        upgradeRequests: Array.isArray(parsed.upgradeRequests) ? parsed.upgradeRequests : [],
        devices: parsed.devices || {},
        usageRecords: Array.isArray(parsed.usageRecords) ? parsed.usageRecords : [],
        demandAnalytics: parsed.demandAnalytics || empty.demandAnalytics,
        aiCredentials: parsed.aiCredentials || {},
        aiUsageMetrics: parsed.aiUsageMetrics || {},
      };
    } catch {
      return empty;
    }
  }

  private writeLocalFile(snapshot: LocalSnapshotFile): void {
    this.assertLocalFallbackAllowed('writeLocalFile');
    const filePath = getStateFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  }

  private canTryFirestore(): boolean {
    return Boolean(this.adminDb && this.firestoreAvailable && process.env.CREATORFLOW_FORCE_LOCAL_STATE !== 'true');
  }

  // -------------------------------------------------------------
  // ACCOUNTS READ-THROUGH / WRITE-THROUGH (NO STALE MULTI-INSTANCE CACHE)
  // -------------------------------------------------------------
  public async getAccount(accountId: string): Promise<ServerAccount | null> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('accounts').doc(accountId).get();
        if (snap.exists) {
          const acc = deserializeAccount(snap.data() as any, accountId);
          this.accounts.set(accountId, acc);
          return acc;
        }
        this.accounts.delete(accountId);
        return null;
      } catch (err) {
        this.handleFirestoreError(err, `getAccount(${accountId})`);
      }
    }

    this.assertLocalFallbackAllowed(`getAccount(${accountId})`);
    const local = this.readLocalFile();
    const raw = local.accounts[accountId];
    if (!raw) {
      this.accounts.delete(accountId);
      return null;
    }
    const acc = deserializeAccount(raw, accountId);
    this.accounts.set(accountId, acc);
    return acc;
  }

  public async saveAccount(account: ServerAccount): Promise<void> {
    const serialized = serializeAccount(account);

    if (this.canTryFirestore()) {
      try {
        const firestoreDoc: Record<string, any> = {
          ...serialized,
          uid: account.id,
          linkedProviders: account.linkedProviders.join(','),
        };
        if (!account.photoURL) {
          delete firestoreDoc.photoURL;
        }
        await this.adminDb!.collection('accounts').doc(account.id).set(firestoreDoc, { merge: true });
        this.accounts.set(account.id, account);
        return;
      } catch (err) {
        this.handleFirestoreError(err, `saveAccount(${account.id})`);
      }
    }

    this.assertLocalFallbackAllowed(`saveAccount(${account.id})`);
    const local = this.readLocalFile();
    local.accounts[account.id] = serialized;
    this.writeLocalFile(local);
    this.accounts.set(account.id, account);
  }

  public async getOrCreateAccount(
    accountId: string,
    userMetadata?: {
      email?: string;
      displayName?: string;
      photoURL?: string;
      providerId?: string;
      provider?: 'google' | 'microsoft' | 'local';
      resolvedRole?: ServerUserRole;
    }
  ): Promise<{ account: ServerAccount; isNewAccount: boolean }> {
    const existing = await this.getAccount(accountId);
    const nowIso = new Date().toISOString();
    const provider = userMetadata?.provider || 'google';

    if (!existing) {
      const role = userMetadata?.resolvedRole || 'user';
      const created: ServerAccount = {
        id: accountId,
        providerId: userMetadata?.providerId || accountId,
        email: userMetadata?.email || '',
        displayName: userMetadata?.displayName || 'YouTube Creator',
        photoURL: userMetadata?.photoURL,
        plan: 'free',
        role,
        provider,
        linkedProviders: [provider],
        createdAt: nowIso,
        lastLoginAt: nowIso,
        isVerified: true,
        associatedDeviceIds: new Set<string>(),
        subscription: {
          status: 'active',
          planId: 'free',
          cadence: 'monthly',
          startedAt: nowIso,
          priceInRupees: 0,
        },
      };
      await this.saveAccount(created);
      return { account: created, isNewAccount: true };
    }

    // Returning user: strictly preserve plan, subscription, and createdAt!
    existing.lastLoginAt = nowIso;
    if (userMetadata?.email) existing.email = userMetadata.email;
    if (userMetadata?.displayName) existing.displayName = userMetadata.displayName;
    if (userMetadata?.photoURL) existing.photoURL = userMetadata.photoURL;
    if (userMetadata?.resolvedRole === 'owner') {
      existing.role = 'owner';
    }
    if (provider && !existing.linkedProviders.includes(provider)) {
      existing.linkedProviders.push(provider);
    }
    await this.saveAccount(existing);
    return { account: existing, isNewAccount: false };
  }

  public async listAllAccounts(): Promise<ServerAccount[]> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('accounts').get();
        const result: ServerAccount[] = [];
        snap.forEach((docSnap) => {
          const acc = deserializeAccount(docSnap.data() as any, docSnap.id);
          this.accounts.set(acc.id, acc);
          result.push(acc);
        });
        return result;
      } catch (err) {
        this.handleFirestoreError(err, 'listAllAccounts');
      }
    }

    this.assertLocalFallbackAllowed('listAllAccounts');
    const local = this.readLocalFile();
    const result: ServerAccount[] = [];
    for (const [id, raw] of Object.entries(local.accounts)) {
      const acc = deserializeAccount(raw, id);
      this.accounts.set(id, acc);
      result.push(acc);
    }
    return result;
  }

  // -------------------------------------------------------------
  // ADMIN RECORDS (/admins/{uid}) WITH ACTIVE REVOCATION SUPPORT
  // -------------------------------------------------------------
  public async isUidStoredAsAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('admins').doc(uid).get();
        if (snap.exists) {
          const data = snap.data();
          const role = data?.role;
          return (role === 'owner' || role === 'admin') && data?.active !== false;
        }
        return false;
      } catch (err) {
        this.handleFirestoreError(err, `isUidStoredAsAdmin(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`isUidStoredAsAdmin(${uid})`);
    const local = this.readLocalFile();
    const rec = local.admins[uid];
    return Boolean(rec && (rec.role === 'owner' || rec.role === 'admin') && rec.active !== false);
  }

  public async upsertAdminRecord(uid: string, role: 'owner' | 'admin', active: boolean = true): Promise<void> {
    if (!uid) return;
    const nowIso = new Date().toISOString();
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('admins').doc(uid).set(
          { uid, role, active, grantedAt: nowIso, updatedAt: nowIso },
          { merge: true }
        );
        return;
      } catch (err) {
        this.handleFirestoreError(err, `upsertAdminRecord(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`upsertAdminRecord(${uid})`);
    const local = this.readLocalFile();
    local.admins[uid] = { uid, role, active, grantedAt: nowIso, updatedAt: nowIso };
    this.writeLocalFile(local);
  }

  // -------------------------------------------------------------
  // USAGE STATE (MONTHLY + LIFETIME GENERATIONS, TRANSACTIONAL)
  // -------------------------------------------------------------
  public async getOrCreateUsage(accountId: string): Promise<ServerUsageState> {
    const period = getServerMonthKey();
    const key = `${accountId}:${period}`;

    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('server_usage').doc(key).get();
        if (snap.exists) {
          const data = snap.data() as ServerUsageState;
          this.usage.set(key, data);
          if (typeof data.lifetimeGenerations === 'number') {
            this.lifetimeGenerations.set(accountId, data.lifetimeGenerations);
          }
          return data;
        }
        const fresh: ServerUsageState = {
          month: period,
          creationKitsUsed: 0,
          assistantMessagesUsed: 0,
          topicsAnalyzed: 0,
          projectsCreated: 0,
          analyticsRecordsUsed: 0,
          lifetimeGenerations: this.lifetimeGenerations.get(accountId) || 0,
          cloudGenerationsUsed: 0,
        };
        this.usage.set(key, fresh);
        return fresh;
      } catch (err) {
        this.handleFirestoreError(err, `getOrCreateUsage(${accountId})`);
      }
    }

    this.assertLocalFallbackAllowed(`getOrCreateUsage(${accountId})`);
    const local = this.readLocalFile();
    const lifetime = local.lifetimeGenerations[accountId] ?? 0;
    this.lifetimeGenerations.set(accountId, lifetime);

    if (local.usage[key]) {
      const u = { ...local.usage[key], lifetimeGenerations: lifetime };
      this.usage.set(key, u);
      return u;
    }

    const fresh: ServerUsageState = {
      month: period,
      creationKitsUsed: 0,
      assistantMessagesUsed: 0,
      topicsAnalyzed: 0,
      projectsCreated: 0,
      analyticsRecordsUsed: 0,
      lifetimeGenerations: lifetime,
      cloudGenerationsUsed: 0,
    };
    this.usage.set(key, fresh);
    return fresh;
  }

  public async saveUsage(accountId: string, usage: ServerUsageState): Promise<void> {
    const key = `${accountId}:${usage.month || getServerMonthKey()}`;

    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('server_usage').doc(key).set(usage, { merge: true });
        this.usage.set(key, usage);
        this.lifetimeGenerations.set(accountId, usage.lifetimeGenerations || 0);
        return;
      } catch (err) {
        this.handleFirestoreError(err, `saveUsage(${accountId})`);
      }
    }

    this.assertLocalFallbackAllowed(`saveUsage(${accountId})`);
    const local = this.readLocalFile();
    local.usage[key] = usage;
    local.lifetimeGenerations[accountId] = usage.lifetimeGenerations || 0;
    this.writeLocalFile(local);
    this.usage.set(key, usage);
    this.lifetimeGenerations.set(accountId, usage.lifetimeGenerations || 0);
  }

  /**
   * Atomically verifies quota & increments one metered monthly usage counter under
   * Firestore transaction + per-account mutex so multi-instance concurrent requests cannot overspend.
   */
  public async consumeUsageAtomic(params: {
    accountId: string;
    counter:
      | 'creationKitsUsed'
      | 'assistantMessagesUsed'
      | 'topicsAnalyzed'
      | 'projectsCreated'
      | 'analyticsRecordsUsed'
      | 'cloudGenerationsUsed';
    limit: number | 'unlimited';
    increment?: number;
    record?: PersistedUsageRecord;
  }): Promise<{ allowed: boolean; usage: ServerUsageState; newValue: number }> {
    const delta = params.increment ?? 1;
    const period = getServerMonthKey();
    const key = `${params.accountId}:${period}`;

    return withAccountLock(params.accountId, async () => {
      if (this.canTryFirestore()) {
        try {
          const ref = this.adminDb!.collection('server_usage').doc(key);
          const result = await this.adminDb!.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const current: ServerUsageState = snap.exists
              ? ({
                  month: period,
                  creationKitsUsed: 0,
                  assistantMessagesUsed: 0,
                  topicsAnalyzed: 0,
                  projectsCreated: 0,
                  analyticsRecordsUsed: 0,
                  lifetimeGenerations: 0,
                  cloudGenerationsUsed: 0,
                  ...(snap.data() as Partial<ServerUsageState>),
                } as ServerUsageState)
              : {
                  month: period,
                  creationKitsUsed: 0,
                  assistantMessagesUsed: 0,
                  topicsAnalyzed: 0,
                  projectsCreated: 0,
                  analyticsRecordsUsed: 0,
                  lifetimeGenerations: 0,
                  cloudGenerationsUsed: 0,
                };

            const existingVal = Number(current[params.counter] || 0);
            if (params.limit !== 'unlimited' && existingVal + delta > params.limit) {
              return { allowed: false, usage: current, newValue: existingVal };
            }

            const updatedVal = existingVal + delta;
            current[params.counter] = updatedVal;
            tx.set(ref, current, { merge: true });

            if (params.record) {
              const recRef = this.adminDb!.collection('server_usage_records').doc(params.record.id);
              tx.set(recRef, params.record);
            }

            return { allowed: true, usage: current, newValue: updatedVal };
          });

          this.usage.set(key, result.usage);
          this.lifetimeGenerations.set(params.accountId, result.usage.lifetimeGenerations || 0);
          return result;
        } catch (err) {
          this.handleFirestoreError(err, `consumeUsageAtomic(${params.accountId})`);
        }
      }

      this.assertLocalFallbackAllowed(`consumeUsageAtomic(${params.accountId})`);
      const current = await this.getOrCreateUsage(params.accountId);
      const existingVal = Number(current[params.counter] || 0);
      if (params.limit !== 'unlimited' && existingVal + delta > params.limit) {
        return { allowed: false, usage: current, newValue: existingVal };
      }

      const updatedVal = existingVal + delta;
      current[params.counter] = updatedVal;
      await this.saveUsage(params.accountId, current);
      if (params.record) {
        await this.appendUsageRecord(params.record);
      }
      return { allowed: true, usage: current, newValue: updatedVal };
    });
  }

  // -------------------------------------------------------------
  // VIDEO QUOTAS & ATOMIC RESERVATIONS (ROLLING 7-DAY WINDOW)
  // -------------------------------------------------------------
  public async getQuotaDoc(accountId: string): Promise<ServerQuotaDoc> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('server_video_quotas').doc(accountId).get();
        if (snap.exists) {
          const d = snap.data() as ServerQuotaDoc;
          const normalized: ServerQuotaDoc = {
            accountId,
            reservations: Array.isArray(d.reservations) ? d.reservations : [],
            idempotencyMap: d.idempotencyMap || {},
            generationIdempotencyKeys: Array.isArray(d.generationIdempotencyKeys) ? d.generationIdempotencyKeys : [],
            legacyTimestamps: Array.isArray(d.legacyTimestamps) ? d.legacyTimestamps : [],
          };
          this.videoQuotas.set(accountId, normalized);
          return normalized;
        }
        const fresh: ServerQuotaDoc = {
          accountId,
          reservations: [],
          idempotencyMap: {},
          generationIdempotencyKeys: [],
          legacyTimestamps: [],
        };
        this.videoQuotas.set(accountId, fresh);
        return fresh;
      } catch (err) {
        this.handleFirestoreError(err, `getQuotaDoc(${accountId})`);
      }
    }

    this.assertLocalFallbackAllowed(`getQuotaDoc(${accountId})`);
    const local = this.readLocalFile();
    const existing = local.videoQuotas[accountId];
    if (existing) {
      const normalized: ServerQuotaDoc = {
        accountId,
        reservations: Array.isArray(existing.reservations) ? existing.reservations : [],
        idempotencyMap: existing.idempotencyMap || {},
        generationIdempotencyKeys: Array.isArray(existing.generationIdempotencyKeys)
          ? existing.generationIdempotencyKeys
          : [],
        legacyTimestamps: Array.isArray(existing.legacyTimestamps) ? existing.legacyTimestamps : [],
      };
      this.videoQuotas.set(accountId, normalized);
      return normalized;
    }

    const fresh: ServerQuotaDoc = {
      accountId,
      reservations: [],
      idempotencyMap: {},
      generationIdempotencyKeys: [],
      legacyTimestamps: [],
    };
    this.videoQuotas.set(accountId, fresh);
    return fresh;
  }

  public async saveQuotaDoc(docData: ServerQuotaDoc): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('server_video_quotas').doc(docData.accountId).set(docData);
        this.videoQuotas.set(docData.accountId, docData);
        return;
      } catch (err) {
        this.handleFirestoreError(err, `saveQuotaDoc(${docData.accountId})`);
      }
    }

    this.assertLocalFallbackAllowed(`saveQuotaDoc(${docData.accountId})`);
    const local = this.readLocalFile();
    local.videoQuotas[docData.accountId] = docData;
    this.writeLocalFile(local);
    this.videoQuotas.set(docData.accountId, docData);
  }

  public computeActiveReservations(
    docData: ServerQuotaDoc,
    nowMs: number = Date.now()
  ): {
    active: ServerVideoReservation[];
    count: number;
    oldestExpiryMs: number | null;
    resetsInFormatted: string | null;
  } {
    const cutoff = nowMs - ROLLING_WEEK_MS;
    const activeRes = (docData.reservations || []).filter((r) => r.timestamp > cutoff);
    docData.reservations = activeRes;

    const activeLegacy = (docData.legacyTimestamps || []).filter((t) => t > cutoff);
    docData.legacyTimestamps = activeLegacy;

    const allTimestamps = Array.from(new Set([...activeRes.map((r) => r.timestamp), ...activeLegacy])).sort(
      (a, b) => a - b
    );

    const count = Math.max(activeRes.length, activeLegacy.length, allTimestamps.length);
    if (allTimestamps.length === 0) {
      return { active: activeRes, count: 0, oldestExpiryMs: null, resetsInFormatted: null };
    }

    const oldestExpiryMs = allTimestamps[0] + ROLLING_WEEK_MS;
    const msUntilExpiry = Math.max(0, oldestExpiryMs - nowMs);
    return {
      active: activeRes,
      count,
      oldestExpiryMs,
      resetsInFormatted: formatTimeUntilReset(msUntilExpiry),
    };
  }

  /**
   * Atomically reserves a rolling 7-day video slot under both per-account mutex
   * AND Firestore transaction (when Firestore is active) so concurrent requests cannot overspend.
   */
  public async reserveVideoSlotAtomic(params: {
    accountId: string;
    workflowId: string;
    topic: string;
    weeklyLimit: number;
    effectivePlan: ServerPlanId;
    idempotencyKey?: string;
    nowMs: number;
  }): Promise<{
    allowed: boolean;
    alreadyReserved: boolean;
    reservation?: ServerVideoReservation;
    weeklyUsed: number;
    weeklyLimit: number;
    weeklyRemaining: number;
    resetsAtMs: number | null;
    resetsInFormatted: string | null;
  }> {
    return withAccountLock(params.accountId, async () => {
      if (this.canTryFirestore()) {
        try {
          const ref = this.adminDb!.collection('server_video_quotas').doc(params.accountId);
          let committedDoc: ServerQuotaDoc | null = null;
          const result = await this.adminDb!.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const docData: ServerQuotaDoc = snap.exists
              ? {
                  accountId: params.accountId,
                  reservations: Array.isArray((snap.data() as any)?.reservations)
                    ? (snap.data() as any).reservations
                    : [],
                  idempotencyMap: (snap.data() as any)?.idempotencyMap || {},
                  generationIdempotencyKeys: Array.isArray((snap.data() as any)?.generationIdempotencyKeys)
                    ? (snap.data() as any).generationIdempotencyKeys
                    : [],
                  legacyTimestamps: Array.isArray((snap.data() as any)?.legacyTimestamps)
                    ? (snap.data() as any).legacyTimestamps
                    : [],
                }
              : {
                  accountId: params.accountId,
                  reservations: [],
                  idempotencyMap: {},
                  generationIdempotencyKeys: [],
                  legacyTimestamps: [],
                };

            const existingWf = docData.reservations.find((r) => r.workflowId === params.workflowId);
            if (existingWf) {
              const active = this.computeActiveReservations(docData, params.nowMs);
              committedDoc = docData;
              return {
                allowed: true,
                alreadyReserved: true,
                reservation: existingWf,
                weeklyUsed: active.count,
                weeklyLimit: params.weeklyLimit,
                weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
                resetsAtMs: active.oldestExpiryMs,
                resetsInFormatted: active.resetsInFormatted,
              };
            }

            if (params.idempotencyKey && docData.idempotencyMap[params.idempotencyKey]) {
              const matchedWfId = docData.idempotencyMap[params.idempotencyKey];
              const existingIdemp = docData.reservations.find((r) => r.workflowId === matchedWfId);
              if (existingIdemp) {
                const active = this.computeActiveReservations(docData, params.nowMs);
                committedDoc = docData;
                return {
                  allowed: true,
                  alreadyReserved: true,
                  reservation: existingIdemp,
                  weeklyUsed: active.count,
                  weeklyLimit: params.weeklyLimit,
                  weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
                  resetsAtMs: active.oldestExpiryMs,
                  resetsInFormatted: active.resetsInFormatted,
                };
              }
            }

            const activeBefore = this.computeActiveReservations(docData, params.nowMs);
            if (activeBefore.count >= params.weeklyLimit) {
              return {
                allowed: false,
                alreadyReserved: false,
                weeklyUsed: activeBefore.count,
                weeklyLimit: params.weeklyLimit,
                weeklyRemaining: 0,
                resetsAtMs: activeBefore.oldestExpiryMs,
                resetsInFormatted: activeBefore.resetsInFormatted,
              };
            }

            const reservation: ServerVideoReservation = {
              id: `res_${params.nowMs}_${Math.random().toString(36).slice(2, 7)}`,
              accountId: params.accountId,
              workflowId: params.workflowId,
              topic: params.topic,
              timestamp: params.nowMs,
            };

            docData.reservations.push(reservation);
            docData.legacyTimestamps = [...(docData.legacyTimestamps || []), params.nowMs];
            if (params.idempotencyKey) {
              docData.idempotencyMap[params.idempotencyKey] = params.workflowId;
            }
            tx.set(ref, docData);
            committedDoc = docData;

            const activeAfter = this.computeActiveReservations(docData, params.nowMs);
            return {
              allowed: true,
              alreadyReserved: false,
              reservation,
              weeklyUsed: activeAfter.count,
              weeklyLimit: params.weeklyLimit,
              weeklyRemaining: Math.max(0, params.weeklyLimit - activeAfter.count),
              resetsAtMs: activeAfter.oldestExpiryMs,
              resetsInFormatted: activeAfter.resetsInFormatted,
            };
          });
          if (committedDoc) {
            this.videoQuotas.set(params.accountId, committedDoc);
          }
          return result;
        } catch (err) {
          this.handleFirestoreError(err, `reserveVideoSlotAtomic(${params.accountId})`);
        }
      }

      // Local fallback serialized under per-account mutex
      this.assertLocalFallbackAllowed(`reserveVideoSlotAtomic(${params.accountId})`);
      const docData = await this.getQuotaDoc(params.accountId);
      const existingWf = docData.reservations.find((r) => r.workflowId === params.workflowId);
      if (existingWf) {
        const active = this.computeActiveReservations(docData, params.nowMs);
        return {
          allowed: true,
          alreadyReserved: true,
          reservation: existingWf,
          weeklyUsed: active.count,
          weeklyLimit: params.weeklyLimit,
          weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
          resetsAtMs: active.oldestExpiryMs,
          resetsInFormatted: active.resetsInFormatted,
        };
      }

      if (params.idempotencyKey && docData.idempotencyMap[params.idempotencyKey]) {
        const matchedWfId = docData.idempotencyMap[params.idempotencyKey];
        const existingIdemp = docData.reservations.find((r) => r.workflowId === matchedWfId);
        if (existingIdemp) {
          const active = this.computeActiveReservations(docData, params.nowMs);
          return {
            allowed: true,
            alreadyReserved: true,
            reservation: existingIdemp,
            weeklyUsed: active.count,
            weeklyLimit: params.weeklyLimit,
            weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
            resetsAtMs: active.oldestExpiryMs,
            resetsInFormatted: active.resetsInFormatted,
          };
        }
      }

      const activeBefore = this.computeActiveReservations(docData, params.nowMs);
      if (activeBefore.count >= params.weeklyLimit) {
        return {
          allowed: false,
          alreadyReserved: false,
          weeklyUsed: activeBefore.count,
          weeklyLimit: params.weeklyLimit,
          weeklyRemaining: 0,
          resetsAtMs: activeBefore.oldestExpiryMs,
          resetsInFormatted: activeBefore.resetsInFormatted,
        };
      }

      const reservation: ServerVideoReservation = {
        id: `res_${params.nowMs}_${Math.random().toString(36).slice(2, 7)}`,
        accountId: params.accountId,
        workflowId: params.workflowId,
        topic: params.topic,
        timestamp: params.nowMs,
      };
      docData.reservations.push(reservation);
      docData.legacyTimestamps = [...(docData.legacyTimestamps || []), params.nowMs];
      if (params.idempotencyKey) {
        docData.idempotencyMap[params.idempotencyKey] = params.workflowId;
      }
      await this.saveQuotaDoc(docData);

      const activeAfter = this.computeActiveReservations(docData, params.nowMs);
      return {
        allowed: true,
        alreadyReserved: false,
        reservation,
        weeklyUsed: activeAfter.count,
        weeklyLimit: params.weeklyLimit,
        weeklyRemaining: Math.max(0, params.weeklyLimit - activeAfter.count),
        resetsAtMs: activeAfter.oldestExpiryMs,
        resetsInFormatted: activeAfter.resetsInFormatted,
      };
    });
  }

  public async releaseVideoSlotAtomic(params: {
    accountId: string;
    workflowId: string;
    weeklyLimit: number;
    nowMs?: number;
  }): Promise<{
    released: boolean;
    weeklyUsed: number;
    weeklyLimit: number;
    weeklyRemaining: number;
  }> {
    const nowMs = params.nowMs || Date.now();
    return withAccountLock(params.accountId, async () => {
      if (this.canTryFirestore()) {
        try {
          const ref = this.adminDb!.collection('server_video_quotas').doc(params.accountId);
          let committedDoc: ServerQuotaDoc | null = null;
          const result = await this.adminDb!.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const docData: ServerQuotaDoc = snap.exists
              ? {
                  accountId: params.accountId,
                  reservations: Array.isArray((snap.data() as any)?.reservations)
                    ? (snap.data() as any).reservations
                    : [],
                  idempotencyMap: (snap.data() as any)?.idempotencyMap || {},
                  generationIdempotencyKeys: Array.isArray((snap.data() as any)?.generationIdempotencyKeys)
                    ? (snap.data() as any).generationIdempotencyKeys
                    : [],
                  legacyTimestamps: Array.isArray((snap.data() as any)?.legacyTimestamps)
                    ? (snap.data() as any).legacyTimestamps
                    : [],
                }
              : {
                  accountId: params.accountId,
                  reservations: [],
                  idempotencyMap: {},
                  generationIdempotencyKeys: [],
                  legacyTimestamps: [],
                };

            const targetIdx = docData.reservations.findIndex((r) => r.workflowId === params.workflowId);
            if (targetIdx < 0) {
              const active = this.computeActiveReservations(docData, nowMs);
              committedDoc = docData;
              return {
                released: false,
                weeklyUsed: active.count,
                weeklyLimit: params.weeklyLimit,
                weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
              };
            }

            const [removed] = docData.reservations.splice(targetIdx, 1);
            if (docData.legacyTimestamps && removed) {
              const tsIdx = docData.legacyTimestamps.indexOf(removed.timestamp);
              if (tsIdx >= 0) docData.legacyTimestamps.splice(tsIdx, 1);
            }
            for (const [k, wf] of Object.entries(docData.idempotencyMap || {})) {
              if (wf === params.workflowId) delete docData.idempotencyMap[k];
            }

            tx.set(ref, docData);
            committedDoc = docData;

            const activeAfter = this.computeActiveReservations(docData, nowMs);
            return {
              released: true,
              weeklyUsed: activeAfter.count,
              weeklyLimit: params.weeklyLimit,
              weeklyRemaining: Math.max(0, params.weeklyLimit - activeAfter.count),
            };
          });
          if (committedDoc) {
            this.videoQuotas.set(params.accountId, committedDoc);
          }
          return result;
        } catch (err) {
          this.handleFirestoreError(err, `releaseVideoSlotAtomic(${params.accountId})`);
        }
      }

      this.assertLocalFallbackAllowed(`releaseVideoSlotAtomic(${params.accountId})`);
      const docData = await this.getQuotaDoc(params.accountId);
      const targetIdx = docData.reservations.findIndex((r) => r.workflowId === params.workflowId);
      if (targetIdx < 0) {
        const active = this.computeActiveReservations(docData, nowMs);
        return {
          released: false,
          weeklyUsed: active.count,
          weeklyLimit: params.weeklyLimit,
          weeklyRemaining: Math.max(0, params.weeklyLimit - active.count),
        };
      }

      const [removed] = docData.reservations.splice(targetIdx, 1);
      if (docData.legacyTimestamps && removed) {
        const tsIdx = docData.legacyTimestamps.indexOf(removed.timestamp);
        if (tsIdx >= 0) docData.legacyTimestamps.splice(tsIdx, 1);
      }
      for (const [k, wf] of Object.entries(docData.idempotencyMap || {})) {
        if (wf === params.workflowId) delete docData.idempotencyMap[k];
      }
      await this.saveQuotaDoc(docData);

      const activeAfter = this.computeActiveReservations(docData, nowMs);
      return {
        released: true,
        weeklyUsed: activeAfter.count,
        weeklyLimit: params.weeklyLimit,
        weeklyRemaining: Math.max(0, params.weeklyLimit - activeAfter.count),
      };
    });
  }

  /**
   * Atomically updates both rolling weekly video timestamps (`server_video_quotas/{accountId}`)
   * and lifetime/monthly generation counters (`server_usage/{accountId:YYYY-MM}`) inside
   * a single Firestore transaction + per-account mutex.
   */
  public async recordGenerationAtomic(params: {
    accountId: string;
    weeklyLimit: number;
    idempotencyKey?: string;
    nowMs: number;
  }): Promise<{
    allowed: boolean;
    isRetry: boolean;
    count: number;
    weeklyUsed: number;
    weeklyLimit: number;
    weeklyRemaining: number;
    resetsAtMs: number | null;
  }> {
    const period = getServerMonthKey();
    const usageKey = `${params.accountId}:${period}`;

    return withAccountLock(params.accountId, async () => {
      if (this.canTryFirestore()) {
        try {
          const quotaRef = this.adminDb!.collection('server_video_quotas').doc(params.accountId);
          const usageRef = this.adminDb!.collection('server_usage').doc(usageKey);
          let committedQuota: ServerQuotaDoc | null = null;
          let committedUsage: ServerUsageState | null = null;

          const result = await this.adminDb!.runTransaction(async (tx) => {
            const [quotaSnap, usageSnap] = await Promise.all([tx.get(quotaRef), tx.get(usageRef)]);
            const quotaDoc: ServerQuotaDoc = quotaSnap.exists
              ? {
                  accountId: params.accountId,
                  reservations: Array.isArray((quotaSnap.data() as any)?.reservations)
                    ? (quotaSnap.data() as any).reservations
                    : [],
                  idempotencyMap: (quotaSnap.data() as any)?.idempotencyMap || {},
                  generationIdempotencyKeys: Array.isArray((quotaSnap.data() as any)?.generationIdempotencyKeys)
                    ? (quotaSnap.data() as any).generationIdempotencyKeys
                    : [],
                  legacyTimestamps: Array.isArray((quotaSnap.data() as any)?.legacyTimestamps)
                    ? (quotaSnap.data() as any).legacyTimestamps
                    : [],
                }
              : {
                  accountId: params.accountId,
                  reservations: [],
                  idempotencyMap: {},
                  generationIdempotencyKeys: [],
                  legacyTimestamps: [],
                };

            const usageDoc: ServerUsageState = usageSnap.exists
              ? ({
                  month: period,
                  creationKitsUsed: 0,
                  assistantMessagesUsed: 0,
                  topicsAnalyzed: 0,
                  projectsCreated: 0,
                  analyticsRecordsUsed: 0,
                  lifetimeGenerations: 0,
                  cloudGenerationsUsed: 0,
                  ...(usageSnap.data() as Partial<ServerUsageState>),
                } as ServerUsageState)
              : {
                  month: period,
                  creationKitsUsed: 0,
                  assistantMessagesUsed: 0,
                  topicsAnalyzed: 0,
                  projectsCreated: 0,
                  analyticsRecordsUsed: 0,
                  lifetimeGenerations: 0,
                  cloudGenerationsUsed: 0,
                };

            if (params.idempotencyKey && quotaDoc.generationIdempotencyKeys.includes(params.idempotencyKey)) {
              const weeklyData = this.computeActiveReservations(quotaDoc, params.nowMs);
              const currentLifetime = usageDoc.lifetimeGenerations || 1;
              return {
                allowed: true,
                isRetry: true,
                count: currentLifetime,
                weeklyUsed: weeklyData.count,
                weeklyLimit: params.weeklyLimit,
                weeklyRemaining: Math.max(0, params.weeklyLimit - weeklyData.count),
                resetsAtMs: weeklyData.oldestExpiryMs,
              };
            }

            const weeklyBefore = this.computeActiveReservations(quotaDoc, params.nowMs);
            if (weeklyBefore.count >= params.weeklyLimit) {
              return {
                allowed: false,
                isRetry: false,
                count: usageDoc.lifetimeGenerations || 0,
                weeklyUsed: weeklyBefore.count,
                weeklyLimit: params.weeklyLimit,
                weeklyRemaining: 0,
                resetsAtMs: weeklyBefore.oldestExpiryMs,
              };
            }

            quotaDoc.legacyTimestamps = [...(quotaDoc.legacyTimestamps || []), params.nowMs];
            if (params.idempotencyKey) {
              quotaDoc.generationIdempotencyKeys.push(params.idempotencyKey);
            }
            const nextCount = (usageDoc.lifetimeGenerations || 0) + 1;
            usageDoc.lifetimeGenerations = nextCount;

            tx.set(quotaRef, quotaDoc);
            tx.set(usageRef, usageDoc, { merge: true });
            committedQuota = quotaDoc;
            committedUsage = usageDoc;

            const weeklyAfter = this.computeActiveReservations(quotaDoc, params.nowMs);
            return {
              allowed: true,
              isRetry: false,
              count: nextCount,
              weeklyUsed: weeklyAfter.count,
              weeklyLimit: params.weeklyLimit,
              weeklyRemaining: Math.max(0, params.weeklyLimit - weeklyAfter.count),
              resetsAtMs: weeklyAfter.oldestExpiryMs,
            };
          });

          if (committedQuota) this.videoQuotas.set(params.accountId, committedQuota);
          if (committedUsage) {
            this.usage.set(usageKey, committedUsage);
            this.lifetimeGenerations.set(params.accountId, (committedUsage as ServerUsageState).lifetimeGenerations || 0);
          }
          return result;
        } catch (err) {
          this.handleFirestoreError(err, `recordGenerationAtomic(${params.accountId})`);
        }
      }

      this.assertLocalFallbackAllowed(`recordGenerationAtomic(${params.accountId})`);
      const quotaDoc = await this.getQuotaDoc(params.accountId);
      const usage = await this.getOrCreateUsage(params.accountId);

      if (params.idempotencyKey && quotaDoc.generationIdempotencyKeys.includes(params.idempotencyKey)) {
        const weeklyData = this.computeActiveReservations(quotaDoc, params.nowMs);
        const currentLifetime = usage.lifetimeGenerations || 1;
        return {
          allowed: true,
          isRetry: true,
          count: currentLifetime,
          weeklyUsed: weeklyData.count,
          weeklyLimit: params.weeklyLimit,
          weeklyRemaining: Math.max(0, params.weeklyLimit - weeklyData.count),
          resetsAtMs: weeklyData.oldestExpiryMs,
        };
      }

      const weeklyData = this.computeActiveReservations(quotaDoc, params.nowMs);
      if (weeklyData.count >= params.weeklyLimit) {
        return {
          allowed: false,
          isRetry: false,
          count: usage.lifetimeGenerations || 0,
          weeklyUsed: weeklyData.count,
          weeklyLimit: params.weeklyLimit,
          weeklyRemaining: 0,
          resetsAtMs: weeklyData.oldestExpiryMs,
        };
      }

      quotaDoc.legacyTimestamps = [...(quotaDoc.legacyTimestamps || []), params.nowMs];
      if (params.idempotencyKey) {
        quotaDoc.generationIdempotencyKeys.push(params.idempotencyKey);
      }
      await this.saveQuotaDoc(quotaDoc);

      const current = (usage.lifetimeGenerations || 0) + 1;
      usage.lifetimeGenerations = current;
      await this.saveUsage(params.accountId, usage);

      const updatedWeekly = this.computeActiveReservations(quotaDoc, params.nowMs);
      return {
        allowed: true,
        isRetry: false,
        count: current,
        weeklyUsed: updatedWeekly.count,
        weeklyLimit: params.weeklyLimit,
        weeklyRemaining: Math.max(0, params.weeklyLimit - updatedWeekly.count),
        resetsAtMs: updatedWeekly.oldestExpiryMs,
      };
    });
  }

  // -------------------------------------------------------------
  // TOUR PROGRESS PERSISTENCE
  // -------------------------------------------------------------
  public async getTourProgress(uid: string): Promise<any> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!
          .collection('workspaces')
          .doc(uid)
          .collection('resources')
          .doc('onboarding_tour')
          .get();
        if (snap.exists && snap.data()?.payloadJson) {
          const parsed = JSON.parse(snap.data()!.payloadJson);
          this.tourProgress.set(uid, parsed);
          return parsed;
        }
        return {
          completed: false,
          tourVersion: 1,
          lastCompletedStep: 0,
          dismissedWelcomeModal: false,
          updatedAt: new Date().toISOString(),
        };
      } catch (err) {
        this.handleFirestoreError(err, `getTourProgress(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`getTourProgress(${uid})`);
    const local = this.readLocalFile();
    if (local.tourProgress[uid]) {
      this.tourProgress.set(uid, local.tourProgress[uid]);
      return local.tourProgress[uid];
    }

    return {
      completed: false,
      tourVersion: 1,
      lastCompletedStep: 0,
      dismissedWelcomeModal: false,
      updatedAt: new Date().toISOString(),
    };
  }

  public async saveTourProgress(uid: string, progress: any): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        const serialized = JSON.stringify(progress).slice(0, 490000);
        await this.adminDb!
          .collection('workspaces')
          .doc(uid)
          .collection('resources')
          .doc('onboarding_tour')
          .set(
            {
              accountId: uid,
              resource: 'onboarding_tour',
              payloadJson: serialized,
              updatedAt: progress.updatedAt || new Date().toISOString(),
            },
            { merge: true }
          );
        this.tourProgress.set(uid, progress);
        return;
      } catch (err) {
        this.handleFirestoreError(err, `saveTourProgress(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`saveTourProgress(${uid})`);
    const local = this.readLocalFile();
    local.tourProgress[uid] = progress;
    this.writeLocalFile(local);
    this.tourProgress.set(uid, progress);
  }

  // -------------------------------------------------------------
  // TELEMETRY, DEVICES, UPGRADE REQUESTS & USAGE RECORDS
  // -------------------------------------------------------------
  public async addTelemetryEvent(event: PersistedTelemetryEvent): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('telemetry').doc(event.id).set({
          id: event.id,
          accountId: event.accountId,
          eventName: String(event.eventName).slice(0, 64),
          plan: String(event.plan || 'free').slice(0, 32),
          ...(event.feature ? { feature: String(event.feature).slice(0, 64) } : {}),
          timestamp: event.timestamp,
        });
        return;
      } catch (err) {
        this.handleFirestoreError(err, 'addTelemetryEvent');
      }
    }

    this.assertLocalFallbackAllowed('addTelemetryEvent');
    const local = this.readLocalFile();
    local.telemetryEvents.push(event);
    if (local.telemetryEvents.length > 5000) {
      local.telemetryEvents.splice(0, local.telemetryEvents.length - 5000);
    }
    this.writeLocalFile(local);
  }

  public async listTelemetryEvents(): Promise<PersistedTelemetryEvent[]> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!
          .collection('telemetry')
          .orderBy('timestamp', 'desc')
          .limit(5000)
          .get();
        const result: PersistedTelemetryEvent[] = [];
        snap.forEach((d) => result.push(d.data() as PersistedTelemetryEvent));
        return result.reverse();
      } catch (err) {
        this.handleFirestoreError(err, 'listTelemetryEvents');
      }
    }

    this.assertLocalFallbackAllowed('listTelemetryEvents');
    return this.readLocalFile().telemetryEvents;
  }

  public async clearTelemetryEvents(): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('telemetry').limit(500).get();
        if (!snap.empty) {
          const batch = this.adminDb!.batch();
          snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
        return;
      } catch (err) {
        this.handleFirestoreError(err, 'clearTelemetryEvents');
      }
    }

    this.assertLocalFallbackAllowed('clearTelemetryEvents');
    const local = this.readLocalFile();
    local.telemetryEvents = [];
    this.writeLocalFile(local);
  }

  public async saveUpgradeRequest(req: PersistedUpgradeRequest): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('server_upgrade_requests').doc(req.id).set(req, { merge: true });
        return;
      } catch (err) {
        this.handleFirestoreError(err, 'saveUpgradeRequest');
      }
    }

    this.assertLocalFallbackAllowed('saveUpgradeRequest');
    const local = this.readLocalFile();
    local.upgradeRequests.push(req);
    if (local.upgradeRequests.length > 1000) {
      local.upgradeRequests.splice(0, local.upgradeRequests.length - 1000);
    }
    this.writeLocalFile(local);
  }

  public async getOrCreateDevice(deviceId: string): Promise<PersistedDeviceInfo> {
    const now = Date.now();
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('server_devices').doc(deviceId).get();
        if (snap.exists) {
          const d = snap.data() as PersistedDeviceInfo;
          return {
            id: deviceId,
            firstSeen: d.firstSeen || now,
            lastSeen: now,
            accountIds: Array.isArray(d.accountIds) ? d.accountIds : [],
            switches: Array.isArray(d.switches) ? d.switches : [],
            newAccountTimestamps: Array.isArray(d.newAccountTimestamps) ? d.newAccountTimestamps : [],
            riskLevel: d.riskLevel || 'LOW_RISK',
            riskReasons: Array.isArray(d.riskReasons) ? d.riskReasons : [],
          };
        }
        return {
          id: deviceId,
          firstSeen: now,
          lastSeen: now,
          accountIds: [],
          switches: [],
          newAccountTimestamps: [],
          riskLevel: 'LOW_RISK',
          riskReasons: [],
        };
      } catch (err) {
        this.handleFirestoreError(err, `getOrCreateDevice(${deviceId})`);
      }
    }

    this.assertLocalFallbackAllowed(`getOrCreateDevice(${deviceId})`);
    const local = this.readLocalFile();
    const existing = local.devices[deviceId];
    if (existing) {
      return { ...existing, lastSeen: now };
    }
    return {
      id: deviceId,
      firstSeen: now,
      lastSeen: now,
      accountIds: [],
      switches: [],
      newAccountTimestamps: [],
      riskLevel: 'LOW_RISK',
      riskReasons: [],
    };
  }

  public async saveDevice(device: PersistedDeviceInfo): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('server_devices').doc(device.id).set(device, { merge: true });
        return;
      } catch (err) {
        this.handleFirestoreError(err, `saveDevice(${device.id})`);
      }
    }

    this.assertLocalFallbackAllowed(`saveDevice(${device.id})`);
    const local = this.readLocalFile();
    local.devices[device.id] = device;
    this.writeLocalFile(local);
  }

  public async appendUsageRecord(record: PersistedUsageRecord): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        await this.adminDb!.collection('server_usage_records').doc(record.id).set(record);
        return;
      } catch (err) {
        this.handleFirestoreError(err, 'appendUsageRecord');
      }
    }

    this.assertLocalFallbackAllowed('appendUsageRecord');
    const local = this.readLocalFile();
    local.usageRecords.push(record);
    if (local.usageRecords.length > 2000) {
      local.usageRecords.splice(0, local.usageRecords.length - 2000);
    }
    this.writeLocalFile(local);
  }

  public async getTotalUsageRecordsCount(): Promise<number> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('server_usage_records').count().get();
        return snap.data().count;
      } catch (err) {
        this.handleFirestoreError(err, 'getTotalUsageRecordsCount');
      }
    }

    this.assertLocalFallbackAllowed('getTotalUsageRecordsCount');
    return this.readLocalFile().usageRecords.length;
  }

  public async recordPlanDemandStats(payload: {
    selectedPlan?: string;
    creatorPlatform?: string;
    audienceSize?: string;
    preferredBilling?: string;
  }): Promise<void> {
    if (this.canTryFirestore()) {
      try {
        const ref = this.adminDb!.collection('plan_demand_stats').doc('global');
        await this.adminDb!.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const current: PersistedDemandSummary = snap.exists
            ? ({ ...DEFAULT_DEMAND_SUMMARY, ...(snap.data() as any) })
            : {
                totalRequests: 0,
                byPlan: {},
                byPlatform: {},
                byAudienceSize: {},
                byBillingPreference: {},
              };
          current.totalRequests += 1;
          const planKey = payload.selectedPlan || 'Unknown';
          current.byPlan[planKey] = (current.byPlan[planKey] || 0) + 1;
          const platformKey = payload.creatorPlatform || 'Other';
          current.byPlatform[platformKey] = (current.byPlatform[platformKey] || 0) + 1;
          if (payload.audienceSize) {
            current.byAudienceSize[payload.audienceSize] = (current.byAudienceSize[payload.audienceSize] || 0) + 1;
          }
          if (payload.preferredBilling) {
            current.byBillingPreference[payload.preferredBilling] =
              (current.byBillingPreference[payload.preferredBilling] || 0) + 1;
          }
          tx.set(ref, current, { merge: true });
        });
        return;
      } catch (err) {
        this.handleFirestoreError(err, 'recordPlanDemandStats');
      }
    }

    this.assertLocalFallbackAllowed('recordPlanDemandStats');
    const local = this.readLocalFile();
    const current = local.demandAnalytics || { ...DEFAULT_DEMAND_SUMMARY };
    current.totalRequests += 1;
    const planKey = payload.selectedPlan || 'Unknown';
    current.byPlan[planKey] = (current.byPlan[planKey] || 0) + 1;
    const platformKey = payload.creatorPlatform || 'Other';
    current.byPlatform[platformKey] = (current.byPlatform[platformKey] || 0) + 1;
    if (payload.audienceSize) {
      current.byAudienceSize[payload.audienceSize] = (current.byAudienceSize[payload.audienceSize] || 0) + 1;
    }
    if (payload.preferredBilling) {
      current.byBillingPreference[payload.preferredBilling] =
        (current.byBillingPreference[payload.preferredBilling] || 0) + 1;
    }
    local.demandAnalytics = current;
    this.writeLocalFile(local);
  }

  public async getPlanDemandStats(): Promise<PersistedDemandSummary> {
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('plan_demand_stats').doc('global').get();
        if (snap.exists) {
          return { ...DEFAULT_DEMAND_SUMMARY, ...(snap.data() as any) };
        }
        return { ...DEFAULT_DEMAND_SUMMARY, byPlan: {}, byPlatform: {}, byAudienceSize: {}, byBillingPreference: {} };
      } catch (err) {
        this.handleFirestoreError(err, 'getPlanDemandStats');
      }
    }

    this.assertLocalFallbackAllowed('getPlanDemandStats');
    return this.readLocalFile().demandAnalytics;
  }

  // -------------------------------------------------------------
  // COMPLETE SERVER-SIDE ACCOUNT DELETION & DATA PURGE
  // -------------------------------------------------------------
  public async deleteAccountPersistence(uid: string): Promise<void> {
    if (!uid) return;

    await withAccountLock(uid, async () => {
      if (this.canTryFirestore()) {
        try {
          const batch = this.adminDb!.batch();
          batch.delete(this.adminDb!.collection('accounts').doc(uid));
          batch.delete(this.adminDb!.collection('admins').doc(uid));
          batch.delete(this.adminDb!.collection('server_video_quotas').doc(uid));
          batch.delete(this.adminDb!.collection('user_ai_credentials').doc(uid));
          batch.delete(this.adminDb!.collection('ai_usage_metrics').doc(uid));

          // Workspace resources subcollection
          const resourcesSnap = await this.adminDb!
            .collection('workspaces')
            .doc(uid)
            .collection('resources')
            .get();
          resourcesSnap.forEach((docSnap) => batch.delete(docSnap.ref));

          // Server usage docs for this UID across months (prefix query by documentId range)
          const usageSnap = await this.adminDb!
            .collection('server_usage')
            .where('__name__', '>=', `${uid}:`)
            .where('__name__', '<=', `${uid}:\uf8ff`)
            .get();
          usageSnap.forEach((docSnap) => batch.delete(docSnap.ref));

          // Account telemetry events
          const telemetrySnap = await this.adminDb!
            .collection('telemetry')
            .where('accountId', '==', uid)
            .limit(400)
            .get();
          telemetrySnap.forEach((docSnap) => batch.delete(docSnap.ref));

          // Subscriptions & upgrade requests
          const subsSnap = await this.adminDb!
            .collection('subscriptions')
            .where('accountId', '==', uid)
            .get();
          subsSnap.forEach((docSnap) => batch.delete(docSnap.ref));

          const upgSnap = await this.adminDb!
            .collection('server_upgrade_requests')
            .where('accountId', '==', uid)
            .get();
          upgSnap.forEach((docSnap) => batch.delete(docSnap.ref));

          await batch.commit();

          this.accounts.delete(uid);
          this.lifetimeGenerations.delete(uid);
          this.videoQuotas.delete(uid);
          this.tourProgress.delete(uid);
          this.byokCredentials.delete(uid);
          this.aiUsageMetrics.delete(uid);
          for (const key of Array.from(this.usage.keys())) {
            if (key.startsWith(`${uid}:`)) this.usage.delete(key);
          }
          return;
        } catch (err) {
          this.handleFirestoreError(err, `deleteAccountPersistence(${uid})`);
        }
      }

      this.assertLocalFallbackAllowed(`deleteAccountPersistence(${uid})`);
      const local = this.readLocalFile();
      delete local.accounts[uid];
      delete local.admins[uid];
      delete local.videoQuotas[uid];
      delete local.tourProgress[uid];
      delete local.lifetimeGenerations[uid];
      delete local.aiCredentials[uid];
      delete local.aiUsageMetrics[uid];

      for (const key of Object.keys(local.usage)) {
        if (key.startsWith(`${uid}:`)) {
          delete local.usage[key];
        }
      }
      local.telemetryEvents = local.telemetryEvents.filter((e) => e.accountId !== uid);
      local.upgradeRequests = local.upgradeRequests.filter((r) => r.accountId !== uid);
      local.usageRecords = local.usageRecords.filter((r) => r.accountId !== uid);
      for (const dev of Object.values(local.devices)) {
        if (Array.isArray(dev.accountIds)) {
          dev.accountIds = dev.accountIds.filter((id) => id !== uid);
        }
      }

      this.writeLocalFile(local);

      this.accounts.delete(uid);
      this.lifetimeGenerations.delete(uid);
      this.videoQuotas.delete(uid);
      this.tourProgress.delete(uid);
      this.byokCredentials.delete(uid);
      this.aiUsageMetrics.delete(uid);
      for (const key of Array.from(this.usage.keys())) {
        if (key.startsWith(`${uid}:`)) this.usage.delete(key);
      }
    });
  }

  // -------------------------------------------------------------
  // BYOK ENCRYPTED CREDENTIALS & AI USAGE METRICS (STRICT PER-UID)
  // -------------------------------------------------------------
  public async getByokCredential(uid: string): Promise<EncryptedByokRecord | null> {
    if (!uid) return null;
    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('user_ai_credentials').doc(uid).get();
        if (snap.exists) {
          const rec = snap.data() as EncryptedByokRecord;
          this.byokCredentials.set(uid, rec);
          return rec;
        }
        this.byokCredentials.delete(uid);
        return null;
      } catch (err) {
        this.handleFirestoreError(err, `getByokCredential(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`getByokCredential(${uid})`);
    const local = this.readLocalFile();
    const rec = local.aiCredentials[uid] || null;
    if (rec) this.byokCredentials.set(uid, rec);
    else this.byokCredentials.delete(uid);
    return rec;
  }

  public async saveByokCredential(record: EncryptedByokRecord): Promise<void> {
    await withAccountLock(`byok:${record.uid}`, async () => {
      if (this.canTryFirestore()) {
        try {
          await this.adminDb!
            .collection('user_ai_credentials')
            .doc(record.uid)
            .set(record);
          this.byokCredentials.set(record.uid, record);
          return;
        } catch (err) {
          this.handleFirestoreError(err, `saveByokCredential(${record.uid})`);
        }
      }

      this.assertLocalFallbackAllowed(`saveByokCredential(${record.uid})`);
      const local = this.readLocalFile();
      local.aiCredentials[record.uid] = record;
      this.writeLocalFile(local);
      this.byokCredentials.set(record.uid, record);
    });
  }

  public async updateByokKeyStatus(
    uid: string,
    patch: {
      status?: ByokKeyStatus;
      lastError?: string | null;
      lastTestedAt?: string | null;
      lastDiagnostic?: import('./intelligence/types.ts').GeminiDiagnosticInfo | null;
      selectedModel?: GeminiModelId;
    }
  ): Promise<EncryptedByokRecord | null> {
    return withAccountLock(`byok:${uid}`, async () => {
      const existing = await this.getByokCredential(uid);
      if (!existing) return null;

      const updated: EncryptedByokRecord = {
        ...existing,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
        ...(patch.lastTestedAt !== undefined ? { lastTestedAt: patch.lastTestedAt } : {}),
        ...(patch.lastDiagnostic !== undefined ? { lastDiagnostic: patch.lastDiagnostic } : {}),
        ...(patch.selectedModel !== undefined ? { selectedModel: patch.selectedModel } : {}),
        updatedAt: new Date().toISOString(),
      };

      if (this.canTryFirestore()) {
        try {
          await this.adminDb!.collection('user_ai_credentials').doc(uid).set(updated);
          this.byokCredentials.set(uid, updated);
          return updated;
        } catch (err) {
          this.handleFirestoreError(err, `updateByokKeyStatus(${uid})`);
        }
      }

      this.assertLocalFallbackAllowed(`updateByokKeyStatus(${uid})`);
      const local = this.readLocalFile();
      local.aiCredentials[uid] = updated;
      this.writeLocalFile(local);
      this.byokCredentials.set(uid, updated);
      return updated;
    });
  }

  public async deleteByokCredential(uid: string): Promise<void> {
    await withAccountLock(`byok:${uid}`, async () => {
      if (this.canTryFirestore()) {
        try {
          await this.adminDb!.collection('user_ai_credentials').doc(uid).delete();
          this.byokCredentials.delete(uid);
          return;
        } catch (err) {
          this.handleFirestoreError(err, `deleteByokCredential(${uid})`);
        }
      }

      this.assertLocalFallbackAllowed(`deleteByokCredential(${uid})`);
      const local = this.readLocalFile();
      delete local.aiCredentials[uid];
      this.writeLocalFile(local);
      this.byokCredentials.delete(uid);
    });
  }

  public async getAiUsageMetrics(uid: string): Promise<AiUsageMetricsRecord> {
    const empty: AiUsageMetricsRecord = {
      uid,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cacheHits: 0,
      validationRepairs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastModelUsed: null,
      lastTaskExecuted: null,
      lastExecutedAt: null,
      byTask: {},
    };
    if (!uid) return empty;

    if (this.canTryFirestore()) {
      try {
        const snap = await this.adminDb!.collection('ai_usage_metrics').doc(uid).get();
        if (snap.exists) {
          const rec = { ...empty, ...(snap.data() as any), uid };
          this.aiUsageMetrics.set(uid, rec);
          return rec;
        }
        return empty;
      } catch (err) {
        this.handleFirestoreError(err, `getAiUsageMetrics(${uid})`);
      }
    }

    this.assertLocalFallbackAllowed(`getAiUsageMetrics(${uid})`);
    const local = this.readLocalFile();
    const rec = local.aiUsageMetrics[uid] ? { ...empty, ...local.aiUsageMetrics[uid], uid } : empty;
    this.aiUsageMetrics.set(uid, rec);
    return rec;
  }

  public async recordAiUsageMetrics(
    uid: string,
    delta: {
      success: boolean;
      cacheHit: boolean;
      repairs: number;
      inputTokens: number;
      outputTokens: number;
      model: GeminiModelId;
      task: IntelligenceTaskType;
    }
  ): Promise<AiUsageMetricsRecord> {
    return withAccountLock(`ai_metrics:${uid}`, async () => {
      const current = await this.getAiUsageMetrics(uid);
      const next: AiUsageMetricsRecord = {
        uid,
        totalCalls: current.totalCalls + 1,
        successfulCalls: current.successfulCalls + (delta.success ? 1 : 0),
        failedCalls: current.failedCalls + (delta.success ? 0 : 1),
        cacheHits: current.cacheHits + (delta.cacheHit ? 1 : 0),
        validationRepairs: current.validationRepairs + (delta.repairs || 0),
        totalInputTokens: current.totalInputTokens + (delta.inputTokens || 0),
        totalOutputTokens: current.totalOutputTokens + (delta.outputTokens || 0),
        lastModelUsed: delta.model || DEFAULT_GEMINI_MODEL,
        lastTaskExecuted: delta.task,
        lastExecutedAt: new Date().toISOString(),
        byTask: {
          ...current.byTask,
          [delta.task]: (current.byTask[delta.task] || 0) + 1,
        },
      };

      if (this.canTryFirestore()) {
        try {
          await this.adminDb!.collection('ai_usage_metrics').doc(uid).set(next);
          this.aiUsageMetrics.set(uid, next);
          return next;
        } catch (err) {
          this.handleFirestoreError(err, `recordAiUsageMetrics(${uid})`);
        }
      }

      this.assertLocalFallbackAllowed(`recordAiUsageMetrics(${uid})`);
      const local = this.readLocalFile();
      local.aiUsageMetrics[uid] = next;
      this.writeLocalFile(local);
      this.aiUsageMetrics.set(uid, next);
      return next;
    });
  }
}
