/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

export type CashfreePlanId = 'pro' | 'creator' | 'max';
export type CashfreeCadence = 'monthly' | 'yearly';
export type CashfreeSubscriptionStatus =
  | 'INITIALIZED'
  | 'BANK_APPROVAL_PENDING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

export interface CashfreePlanConfig {
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  intervalType: 'MONTH' | 'YEAR';
  intervals: number;
}

/**
 * Server-Owned Authoritative Plan & Price Matrix (INR)
 * Prevents client-side price tampering by enforcing fixed backend amounts.
 */
export const SERVER_CASHFREE_PLANS: Record<CashfreePlanId, Record<CashfreeCadence, CashfreePlanConfig>> = {
  pro: {
    monthly: {
      planId: 'cf_plan_pro_monthly',
      planName: 'CreatorFlow PRO Monthly',
      amount: 249,
      currency: 'INR',
      intervalType: 'MONTH',
      intervals: 1,
    },
    yearly: {
      planId: 'cf_plan_pro_yearly',
      planName: 'CreatorFlow PRO Annual',
      amount: 2388, // ₹199/mo billed upfront annually
      currency: 'INR',
      intervalType: 'YEAR',
      intervals: 1,
    },
  },
  creator: {
    monthly: {
      planId: 'cf_plan_creator_monthly',
      planName: 'CreatorFlow CREATOR Monthly',
      amount: 499,
      currency: 'INR',
      intervalType: 'MONTH',
      intervals: 1,
    },
    yearly: {
      planId: 'cf_plan_creator_yearly',
      planName: 'CreatorFlow CREATOR Annual',
      amount: 4788, // ₹399/mo billed upfront annually
      currency: 'INR',
      intervalType: 'YEAR',
      intervals: 1,
    },
  },
  max: {
    monthly: {
      planId: 'cf_plan_max_monthly',
      planName: 'CreatorFlow MAX Monthly',
      amount: 999,
      currency: 'INR',
      intervalType: 'MONTH',
      intervals: 1,
    },
    yearly: {
      planId: 'cf_plan_max_yearly',
      planName: 'CreatorFlow MAX Annual',
      amount: 9588, // ₹799/mo billed upfront annually
      currency: 'INR',
      intervalType: 'YEAR',
      intervals: 1,
    },
  },
};

export interface StoredSubscriptionRecord {
  subscriptionId: string;
  accountId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName: string;
  planId: CashfreePlanId;
  cadence: CashfreeCadence;
  amount: number;
  currency: string;
  status: CashfreeSubscriptionStatus;
  authLink?: string;
  createdAt: string;
  updatedAt: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastPaymentId?: string;
  cancelReason?: string;
  failureReason?: string;
}

// In-memory subscription and processed webhook event cache (with Firestore persistence)
export const inMemorySubscriptions = new Map<string, StoredSubscriptionRecord>();
export const processedWebhookEventIds = new Set<string>();

/**
 * Check whether Cashfree credentials are configured and valid (not default placeholders).
 */
export function isCashfreeConfigured(): boolean {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secretKey) return false;
  if (appId.startsWith('YOUR_') || appId.includes('placeholder')) return false;
  if (secretKey.startsWith('YOUR_') || secretKey.includes('placeholder')) return false;
  return true;
}

/**
 * Return current Cashfree base URL (Sandbox or Production).
 */
export function getCashfreeBaseUrl(): string {
  const env = (process.env.CASHFREE_ENV || 'TEST').trim().toUpperCase();
  return env === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

/**
 * Return standard Cashfree API headers without exposing secrets in logs.
 */
export function getCashfreeApiHeaders(): Record<string, string> {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2023-08-01').trim();
  return {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': apiVersion,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Cryptographically verifies a Cashfree Webhook signature using HMAC-SHA256.
 * Cashfree computes: Base64(HMAC-SHA256(timestamp + rawBody, secretKey))
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  timestamp?: string,
  signature?: string,
  overrideSecret?: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const secret = overrideSecret || (process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!secret) {
    return false;
  }

  try {
    const rawBodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const signatureData = timestamp + rawBodyString;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureData)
      .digest('base64');

    const signatureBuf = Buffer.from(signature, 'utf8');
    const computedBuf = Buffer.from(computedSignature, 'utf8');

    if (signatureBuf.length !== computedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuf, computedBuf);
  } catch (err) {
    console.error('[Cashfree] Signature verification error:', (err as any)?.message);
    return false;
  }
}

/**
 * Calculate the next period expiration ISO timestamp based on cadence.
 */
export function calculatePeriodEnd(cadence: CashfreeCadence, startMs: number = Date.now()): string {
  const date = new Date(startMs);
  if (cadence === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
}

/**
 * Initiates a recurring subscription with Cashfree Subscriptions API.
 * Validates plan parameters, enforces server-side prices, and writes initial pending state.
 */
export async function initiateCashfreeSubscription(params: {
  accountId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  planId: CashfreePlanId;
  cadence: CashfreeCadence;
  appUrl?: string;
  adminDb?: Firestore | null;
}): Promise<{
  success: boolean;
  configured: boolean;
  subscriptionId?: string;
  authLink?: string;
  status?: CashfreeSubscriptionStatus;
  error?: string;
  message: string;
  record?: StoredSubscriptionRecord;
}> {
  const { accountId, customerEmail, customerName, customerPhone, planId, cadence, appUrl, adminDb } = params;

  // 1. Strict validation of plan and cadence
  if (!SERVER_CASHFREE_PLANS[planId]) {
    return {
      success: false,
      configured: isCashfreeConfigured(),
      error: 'INVALID_PLAN',
      message: `Invalid subscription plan "${planId}". Supported plans: pro, creator, max.`,
    };
  }

  if (cadence !== 'monthly' && cadence !== 'yearly') {
    return {
      success: false,
      configured: isCashfreeConfigured(),
      error: 'INVALID_CADENCE',
      message: `Invalid billing cadence "${cadence}". Supported cadences: monthly, yearly.`,
    };
  }

  const planConfig = SERVER_CASHFREE_PLANS[planId][cadence];

  // 2. Check configuration state (Requirement 7: Keep payment processing disabled if unconfigured)
  if (!isCashfreeConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'PAYMENTS_NOT_CONFIGURED',
      message: 'Cashfree Payments is not yet configured with sandbox or production credentials. Paid upgrades are currently in preview mode.',
    };
  }

  // 3. Generate unique deterministic subscription ID
  const subscriptionId = `cf_sub_${Date.now()}_${accountId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
  const nowIso = new Date().toISOString();
  const baseUrl = getCashfreeBaseUrl();
  const returnUrl = `${appUrl || 'https://creatorflow.local'}/?view=pricing&sub_id=${subscriptionId}`;

  // 4. Construct Cashfree Subscriptions API Payload
  const payload = {
    subscription_id: subscriptionId,
    customer_details: {
      customer_id: accountId,
      customer_email: customerEmail || 'creator@creatorflow.local',
      customer_phone: customerPhone || '9999999999',
      customer_name: customerName || 'YouTube Creator',
    },
    plan_details: {
      plan_id: planConfig.planId,
      plan_name: planConfig.planName,
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_amount: planConfig.amount,
      plan_max_amount: planConfig.amount,
      plan_interval_type: planConfig.intervalType,
      plan_intervals: planConfig.intervals,
    },
    authorization_details: {
      authorization_amount: 1, // Standard ₹1 mandate verification amount in Indian banking
      payment_methods: ['upi', 'card', 'enach'],
    },
    subscription_meta: {
      return_url: returnUrl,
      notification_channel: ['EMAIL'],
    },
  };

  try {
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: getCashfreeApiHeaders(),
      body: JSON.stringify(payload),
    });

    const responseData = (await response.json().catch(() => ({}))) as any;

    if (!response.ok) {
      console.error('[Cashfree] Subscriptions API request failed:', {
        status: response.status,
        code: responseData?.code,
        message: responseData?.message,
      });
      return {
        success: false,
        configured: true,
        error: responseData?.code || 'CASHFREE_API_ERROR',
        message: responseData?.message || 'Failed to initialize recurring subscription with Cashfree.',
      };
    }

    const authLink = responseData?.auth_link || responseData?.authorization_details?.auth_link;
    const initialStatus: CashfreeSubscriptionStatus = responseData?.status || 'INITIALIZED';

    const record: StoredSubscriptionRecord = {
      subscriptionId,
      accountId,
      customerEmail,
      customerPhone,
      customerName,
      planId,
      cadence,
      amount: planConfig.amount,
      currency: 'INR',
      status: initialStatus,
      authLink,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    inMemorySubscriptions.set(subscriptionId, record);

    // Save to Firestore via Admin SDK
    if (adminDb) {
      try {
        await adminDb
          .collection('subscriptions')
          .doc(subscriptionId)
          .set(record, { merge: true });
      } catch (err: any) {
        if (process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true') {
          throw err;
        }
        console.warn('[Cashfree] Failed to persist subscription to Firestore:', err?.message);
      }
    }

    return {
      success: true,
      configured: true,
      subscriptionId,
      authLink,
      status: initialStatus,
      message: 'Cashfree recurring subscription initialized successfully.',
      record,
    };
  } catch (err: any) {
    if (process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true' && err?.code) {
      throw err;
    }
    console.error('[Cashfree] Network error contacting Cashfree API:', err?.message);
    return {
      success: false,
      configured: true,
      error: 'NETWORK_ERROR',
      message: 'Failed to communicate with Cashfree Payments API. Please try again later.',
    };
  }
}

/**
 * Processes incoming Cashfree Webhook event idempotently.
 * Uses Firestore runTransaction when adminDb is configured so multi-instance
 * duplicate deliveries cannot double-activate plans.
 */
export async function processCashfreeWebhookEvent(params: {
  eventId: string;
  eventType: string;
  eventTime: string;
  data: any;
  adminDb?: Firestore | null;
  onPlanActivated?: (accountId: string, planId: CashfreePlanId, cadence: CashfreeCadence, periodEnd: string) => void | Promise<void>;
  onPlanReverted?: (accountId: string, reason: string) => void | Promise<void>;
}): Promise<{
  success: boolean;
  duplicate: boolean;
  actionTaken: string;
  subscriptionId?: string;
}> {
  const { eventId, eventType, data, adminDb, onPlanActivated, onPlanReverted } = params;

  // 1. Fast same-instance idempotency check
  if (processedWebhookEventIds.has(eventId)) {
    return {
      success: true,
      duplicate: true,
      actionTaken: 'IGNORED_DUPLICATE_EVENT',
    };
  }

  // 2. Extract subscription identifiers from webhook data
  const subData = data?.subscription || data;
  const subscriptionId = subData?.subscription_id || data?.subscription_id || data?.order?.order_id;
  const accountId = subData?.customer_details?.customer_id || data?.customer_details?.customer_id;
  const nowIso = new Date().toISOString();

  let existingRecord = subscriptionId ? inMemorySubscriptions.get(subscriptionId) : undefined;
  let actionTaken = 'EVENT_RECORDED';
  let callbackPlanToActivate: { accountId: string; planId: CashfreePlanId; cadence: CashfreeCadence; periodEnd: string } | null = null;
  let callbackToRevert: { accountId: string; reason: string } | null = null;

  const computeLifecycleUpdate = (baseRecord?: StoredSubscriptionRecord) => {
    const rec = baseRecord ? { ...baseRecord } : undefined;
    let computedAction = 'EVENT_RECORDED';
    let activatePayload: { accountId: string; planId: CashfreePlanId; cadence: CashfreeCadence; periodEnd: string } | null = null;
    let revertPayload: { accountId: string; reason: string } | null = null;

    if (
      eventType === 'SUBSCRIPTION_ACTIVATED' ||
      eventType === 'SUBSCRIPTION_CHARGED' ||
      eventType === 'SUBSCRIPTION_PAYMENT_SUCCESS'
    ) {
      const targetAccountId = accountId || rec?.accountId;
      const planId: CashfreePlanId = rec?.planId || 'pro';
      const cadence: CashfreeCadence = rec?.cadence || 'monthly';
      const periodEnd = calculatePeriodEnd(cadence);

      if (rec) {
        rec.status = 'ACTIVE';
        rec.currentPeriodStart = nowIso;
        rec.currentPeriodEnd = periodEnd;
        rec.lastPaymentId = data?.payment?.payment_id || data?.payment_id || `pay_${Date.now()}`;
        rec.updatedAt = nowIso;
      }

      if (targetAccountId) {
        activatePayload = { accountId: targetAccountId, planId, cadence, periodEnd };
      }
      computedAction = `SUBSCRIPTION_ACTIVATED_${planId.toUpperCase()}`;
    } else if (eventType === 'SUBSCRIPTION_PAYMENT_FAILED') {
      if (rec) {
        rec.status = 'PAST_DUE';
        rec.updatedAt = nowIso;
        rec.failureReason = data?.payment?.payment_message || 'Recurring debit failed';
      }
      computedAction = 'PAYMENT_FAILURE_RECORDED';
    } else if (eventType === 'SUBSCRIPTION_CANCELLED') {
      const targetAccountId = accountId || rec?.accountId;
      if (rec) {
        rec.status = 'CANCELLED';
        rec.updatedAt = nowIso;
        rec.cancelReason = data?.reason || 'User cancelled subscription';
      }
      if (targetAccountId) {
        revertPayload = { accountId: targetAccountId, reason: 'SUBSCRIPTION_CANCELLED' };
      }
      computedAction = 'SUBSCRIPTION_CANCELLED';
    } else if (eventType === 'SUBSCRIPTION_EXPIRED') {
      const targetAccountId = accountId || rec?.accountId;
      if (rec) {
        rec.status = 'EXPIRED';
        rec.updatedAt = nowIso;
      }
      if (targetAccountId) {
        revertPayload = { accountId: targetAccountId, reason: 'SUBSCRIPTION_EXPIRED' };
      }
      computedAction = 'SUBSCRIPTION_EXPIRED';
    }

    return { rec, computedAction, activatePayload, revertPayload };
  };

  // 3. Atomic Firestore Transaction for multi-instance idempotency
  let handledByFirestore = false;
  if (adminDb && process.env.CREATORFLOW_FORCE_LOCAL_STATE !== 'true') {
    try {
      const txResult = await adminDb.runTransaction(async (tx) => {
        const eventRef = adminDb.collection('payment_events').doc(eventId);
        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) {
          return { duplicate: true as const };
        }

        let loadedSub = existingRecord;
        if (!loadedSub && subscriptionId) {
          const subSnap = await tx.get(adminDb.collection('subscriptions').doc(subscriptionId));
          if (subSnap.exists) {
            loadedSub = subSnap.data() as StoredSubscriptionRecord;
          }
        }

        const lifecycle = computeLifecycleUpdate(loadedSub);

        tx.set(eventRef, {
          eventId,
          eventType,
          subscriptionId: subscriptionId || null,
          accountId: accountId || lifecycle.rec?.accountId || null,
          timestamp: nowIso,
          payloadSnippet: JSON.stringify(data).slice(0, 1000),
          actionTaken: lifecycle.computedAction,
        });

        if (subscriptionId && lifecycle.rec) {
          const subRef = adminDb.collection('subscriptions').doc(subscriptionId);
          tx.set(subRef, lifecycle.rec, { merge: true });
        }

        return {
          duplicate: false as const,
          ...lifecycle,
        };
      });

      if (txResult.duplicate) {
        processedWebhookEventIds.add(eventId);
        return {
          success: true,
          duplicate: true,
          actionTaken: 'IGNORED_DUPLICATE_EVENT_FIRESTORE',
        };
      }

      if (txResult.rec && subscriptionId) {
        existingRecord = txResult.rec;
        inMemorySubscriptions.set(subscriptionId, txResult.rec);
      }
      actionTaken = txResult.computedAction;
      callbackPlanToActivate = txResult.activatePayload;
      callbackToRevert = txResult.revertPayload;
      handledByFirestore = true;
    } catch (err: any) {
      if (process.env.CREATORFLOW_REQUIRE_FIRESTORE === 'true') {
        throw err;
      }
      console.warn('[Cashfree] Webhook Firestore transaction unavailable, using local fallback:', err?.message);
    }
  }

  if (!handledByFirestore) {
    const lifecycle = computeLifecycleUpdate(existingRecord);
    if (lifecycle.rec && subscriptionId) {
      inMemorySubscriptions.set(subscriptionId, lifecycle.rec);
    }
    actionTaken = lifecycle.computedAction;
    callbackPlanToActivate = lifecycle.activatePayload;
    callbackToRevert = lifecycle.revertPayload;
  }

  // 4. Execute account callbacks only after transactional dedup succeeded
  if (callbackPlanToActivate && onPlanActivated) {
    await onPlanActivated(
      callbackPlanToActivate.accountId,
      callbackPlanToActivate.planId,
      callbackPlanToActivate.cadence,
      callbackPlanToActivate.periodEnd
    );
  }
  if (callbackToRevert && onPlanReverted) {
    await onPlanReverted(callbackToRevert.accountId, callbackToRevert.reason);
  }

  // 5. Mark event ID processed after transaction + side-effects complete
  processedWebhookEventIds.add(eventId);

  return {
    success: true,
    duplicate: false,
    actionTaken,
    subscriptionId,
  };
}
