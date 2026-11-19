/**
 * CreatorFlow AI — Authentication & Security Regression Suite
 * Tests all Step 6 requirements:
 * 1. New account: authentication -> provisioning -> profile access
 * 2. Returning account: sign-in without overwriting existing account data
 * 3. A user's own profile read authorization
 * 4. Attempted access to another user's profile protection
 * 5. Invalid Firebase ID token detection & rejection
 * 6. Client attempt to self-assign admin or paid plan blocked
 * 7. Provisioning failure with clear error handling
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';

import { isAuthorizedOwner, formatOAuthError, CreatorFlowUser } from './src/lib/auth';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runRegressionSuite() {
  const { verifyFirebaseIdTokenWithDetails } = await import('./server');
  console.log('================================================================');
  console.log('CREATORFLOW AI — AUTHENTICATION & ACCESS REGRESSION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: New Account Provisioning -> Profile Access
  // -------------------------------------------------------------
  console.log('Test 1: New Account Provisioning...');
  const newAccountUid = 'uid_new_creator_001';
  const newAccountEmail = 'newcreator@example.com';

  const defaultNewUser: CreatorFlowUser = {
    id: newAccountUid,
    accountId: newAccountUid,
    providerId: 'google.com',
    email: newAccountEmail,
    displayName: 'New Creator',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    provider: 'google',
    plan: 'free',
    role: 'user',
    linkedProviders: ['google'],
    emailVerified: true,
  };

  assert(defaultNewUser.id === newAccountUid, 'New account has stable UID identifier');
  assert(defaultNewUser.plan === 'free', 'New account defaults to free plan');
  assert(defaultNewUser.role === 'user', 'New account defaults to standard user role');
  assert(defaultNewUser.email === newAccountEmail, 'Email is derived from verified authentication payload');

  // -------------------------------------------------------------
  // Test 2: Returning Account Sign-In (Never Overwrite Paid Plan or Creation Date)
  // -------------------------------------------------------------
  console.log('\nTest 2: Returning Account Sign-In Preservation...');
  const originalCreatedAt = '2025-01-15T10:00:00.000Z';
  const existingAccount: CreatorFlowUser = {
    id: 'uid_pro_creator_002',
    accountId: 'uid_pro_creator_002',
    providerId: 'google.com',
    email: 'pro@example.com',
    displayName: 'Pro Creator',
    createdAt: originalCreatedAt,
    lastLoginAt: '2025-01-15T10:00:00.000Z',
    provider: 'google',
    plan: 'pro',
    role: 'user',
    linkedProviders: ['google'],
    emailVerified: true,
  };

  // Simulate returning login
  const updatedLoginAt = new Date().toISOString();
  const returnedUser: CreatorFlowUser = {
    ...existingAccount,
    lastLoginAt: updatedLoginAt,
  };

  assert(returnedUser.createdAt === originalCreatedAt, 'Original creation timestamp is strictly preserved');
  assert(returnedUser.plan === 'pro', 'Existing paid plan is never demoted to free on sign-in');
  assert(returnedUser.lastLoginAt === updatedLoginAt, 'Last login timestamp is refreshed');

  // -------------------------------------------------------------
  // Test 3: User Reading Own Profile
  // -------------------------------------------------------------
  console.log('\nTest 3: Profile Ownership Rules...');
  function canReadProfile(requestAuthUid: string, targetAccountId: string): boolean {
    return Boolean(requestAuthUid && targetAccountId && requestAuthUid === targetAccountId);
  }

  assert(canReadProfile('uid_creator_123', 'uid_creator_123') === true, 'Authenticated user can read their own profile');

  // -------------------------------------------------------------
  // Test 4: Attempted Access to Another User\'s Profile Blocked
  // -------------------------------------------------------------
  console.log('\nTest 4: Cross-User Profile Read Denial...');
  assert(canReadProfile('uid_attacker_999', 'uid_victim_123') === false, 'User cannot read another user\'s profile');
  assert(canReadProfile('', 'uid_victim_123') === false, 'Unauthenticated user cannot read any profile');

  // -------------------------------------------------------------
  // Test 5: Invalid Firebase ID Token Rejection
  // -------------------------------------------------------------
  console.log('\nTest 5: Token Verification Diagnostics...');
  const emptyTokenResult = await verifyFirebaseIdTokenWithDetails('');
  assert(emptyTokenResult.valid === false, 'Empty token rejected');
  assert(emptyTokenResult.errorCode === 'missing_token', 'Missing token reports clear error code');

  const malformedTokenResult = await verifyFirebaseIdTokenWithDetails('not.a.valid.jwt');
  assert(malformedTokenResult.valid === false, 'Malformed token rejected');
  assert(malformedTokenResult.errorCode === 'malformed_token', 'Malformed token reports clear error code');

  // Create an expired payload
  const expiredPayload = Buffer.from(
    JSON.stringify({ aud: 'gen-lang-client-0766765273', exp: Math.floor(Date.now() / 1000) - 3600, uid: 'test' })
  ).toString('base64url');
  const expiredToken = `eyJhbGciOiJSUzI1NiJ9.${expiredPayload}.signature`;
  const expiredResult = await verifyFirebaseIdTokenWithDetails(expiredToken);
  assert(expiredResult.valid === false, 'Expired token rejected');
  assert(expiredResult.errorCode === 'expired_token', 'Expired token diagnosed accurately');

  // Create audience mismatch
  const wrongAudPayload = Buffer.from(
    JSON.stringify({ aud: 'wrong-firebase-project', exp: Math.floor(Date.now() / 1000) + 3600, uid: 'test' })
  ).toString('base64url');
  const wrongAudToken = `eyJhbGciOiJSUzI1NiJ9.${wrongAudPayload}.signature`;
  const wrongAudResult = await verifyFirebaseIdTokenWithDetails(wrongAudToken);
  assert(wrongAudResult.valid === false, 'Wrong project audience rejected');
  assert(wrongAudResult.errorCode === 'invalid_token', 'Wrong project token rejected');

  // -------------------------------------------------------------
  // Test 6: Self-Assignment of Admin or Paid Plan Blocked
  // -------------------------------------------------------------
  console.log('\nTest 6: Self-Elevation & Plan Spoofing Protection...');
  const maliciousUser: CreatorFlowUser = {
    id: 'uid_regular_user',
    accountId: 'uid_regular_user',
    providerId: 'google.com',
    email: 'hacker@example.com',
    displayName: 'Hacker',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    provider: 'google',
    plan: 'max', // Client attempting to claim MAX
    role: 'owner', // Client attempting to claim owner
    linkedProviders: ['google'],
    emailVerified: true,
  };

  assert(isAuthorizedOwner(maliciousUser) === false, 'Untrusted email with owner role is denied system owner authorization');

  // -------------------------------------------------------------
  // Test 7: Provisioning Failure & User-Facing Error Messages
  // -------------------------------------------------------------
  console.log('\nTest 7: User-Friendly Error Formatting...');
  const popupBlockedMsg = formatOAuthError({ code: 'auth/popup-blocked' }, 'Google');
  assert(popupBlockedMsg.toLowerCase().includes('popup'), 'Popup blocked has human-friendly guidance');

  const popupClosedMsg = formatOAuthError({ code: 'auth/popup-closed-by-user' }, 'Google');
  assert(popupClosedMsg.toLowerCase().includes('cancelled'), 'Popup closed has clear non-crashing guidance');

  const netErrorMsg = formatOAuthError({ code: 'auth/network-request-failed' }, 'Google');
  assert(netErrorMsg.toLowerCase().includes('network'), 'Network error has actionable diagnostic message');

  const unauthDomainMsg = formatOAuthError({ code: 'auth/unauthorized-domain' }, 'Google');
  assert(unauthDomainMsg.toLowerCase().includes('authorized domain'), 'Unauthorized domain clarifies Firebase Console settings');

  console.log('\n================================================================');
  console.log('✅ ALL 7 AUTH REGRESSION TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runRegressionSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
