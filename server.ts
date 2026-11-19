import express, { Request, Response } from 'express';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import rateLimit from 'express-rate-limit';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

import {
  CashfreePlanId,
  CashfreeCadence,
  SERVER_CASHFREE_PLANS,
  isCashfreeConfigured,
  initiateCashfreeSubscription,
  verifyCashfreeWebhookSignature,
  processCashfreeWebhookEvent,
  inMemorySubscriptions,
} from './src/lib/cashfreeSubscriptionService.ts';
import {
  processPlanRequest,
  getDemandAnalytics,
  PlanRequestPayload,
} from './src/lib/planRequestService.ts';
import {
  ServerStateStore,
  ServerAccount,
  ServerPlanId,
  ServerRiskLevel,
  ServerUserRole,
  ServerSubscriptionStatus,
  ServerBillingCadence,
  ServerCustomEntitlement,
  ServerSubscription,
  ServerUsageState,
  ServerVideoReservation,
  PersistedTelemetryEvent,
  PersistedUpgradeRequest,
  PersistedDeviceInfo,
  PersistedUsageRecord,
  ROLLING_WEEK_MS,
  getWeeklyLimitForPlan,
  getEffectivePlan,
  getServerMonthKey,
  withAccountLock,
} from './src/lib/serverStateStore.ts';
import {
  DEFAULT_GEMINI_MODEL,
  QUOTA_PROJECT_SHARING_NOTICE,
  SUPPORTED_GEMINI_MODELS,
  isValidGeminiModel,
  normalizeGeminiModel,
} from './src/lib/intelligence/models.ts';
import {
  decryptByokKey,
  encryptByokKey,
  validateGeminiApiKeyFormat,
} from './src/lib/intelligence/byokCrypto.ts';
import {
  GeminiProviderError,
  generateTextWithByok,
  testByokApiKeyConnection,
} from './src/lib/intelligence/geminiProvider.ts';
import { runIntelligencePipeline } from './src/lib/intelligence/pipeline.ts';
import { clearUserIntelligenceCache } from './src/lib/intelligence/responseCache.ts';
import type {
  ByokKeyMetadata,
  EncryptedByokRecord,
  IntelligenceTaskType,
} from './src/lib/intelligence/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase client config so client & server Firebase projectId strictly match
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseClientConfig = fs.existsSync(firebaseConfigPath)
  ? JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'))
  : { projectId: process.env.FIREBASE_PROJECT_ID || 'shaped-obelisk-6xctm' };

const FIREBASE_PROJECT_ID: string =
  process.env.FIREBASE_PROJECT_ID || firebaseClientConfig.projectId || 'shaped-obelisk-6xctm';
const FIRESTORE_DATABASE_ID: string | undefined =
  process.env.FIRESTORE_DATABASE_ID || firebaseClientConfig.firestoreDatabaseId;

const adminApp =
  getAdminApps().length > 0
    ? getAdminApps()[0]!
    : initializeAdminApp({
        projectId: FIREBASE_PROJECT_ID,
      });

const adminAuth = getAdminAuth(adminApp);
let adminDb: ReturnType<typeof getAdminFirestore> | null = null;
try {
  adminDb = FIRESTORE_DATABASE_ID
    ? getAdminFirestore(adminApp, FIRESTORE_DATABASE_ID)
    : getAdminFirestore(adminApp);
} catch {
  adminDb = null;
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
export const serverStore = new ServerStateStore(adminDb);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Infrastructure & Persistence Readiness Probe (zero secrets / zero PII exposed)
app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  const health = await serverStore.checkFirestoreHealth();
  const diag = serverStore.getPersistenceDiagnostics();
  const statusCode = diag.requireFirestore && !health.healthy ? 503 : 200;

  res.status(statusCode).json({
    status: health.healthy ? 'ok' : diag.requireFirestore ? 'unhealthy' : 'degraded',
    environment: isProd ? 'production' : 'development',
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID || '(default)',
    persistence: diag,
    byokEnabled: true,
    cashfreeConfigured: isCashfreeConfigured(),
    timestamp: new Date().toISOString(),
  });
});

const VALID_INTELLIGENCE_TASKS = new Set<IntelligenceTaskType>([
  'topic_analysis',
  'idea_generation',
  'content_radar',
  'next_video',
  'content_pack',
  'script_generation',
  'title_seo',
  'thumbnail_intelligence',
  'analytics_intelligence',
  'creator_assistant',
  'guided_workflow_pack',
]);

function buildSafeByokMetadata(
  record: EncryptedByokRecord | null
): ByokKeyMetadata {
  if (!record) {
    return {
      hasKey: false,
      keyLast4: null,
      maskedHint: null,
      selectedModel: DEFAULT_GEMINI_MODEL,
      status: 'unconfigured',
      lastTestedAt: null,
      lastError: null,
      lastDiagnostic: null,
      updatedAt: null,
      quotaNotice: QUOTA_PROJECT_SHARING_NOTICE,
    };
  }
  return {
    hasKey: true,
    keyLast4: record.keyLast4,
    maskedHint: record.maskedHint,
    selectedModel: normalizeGeminiModel(record.selectedModel),
    status: record.status,
    lastTestedAt: record.lastTestedAt,
    lastError: record.lastError,
    lastDiagnostic: record.lastDiagnostic ?? null,
    updatedAt: record.updatedAt,
    quotaNotice: QUOTA_PROJECT_SHARING_NOTICE,
  };
}

async function authenticateCaller(req: Request, res: Response): Promise<{
  uid: string;
  harness: TestHarnessContext;
} | null> {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  const reqAccountId =
    (typeof req.body?.accountId === 'string' && req.body.accountId) ||
    (typeof req.query?.accountId === 'string' && req.query.accountId) ||
    (typeof req.headers['x-creatorflow-account-id'] === 'string' &&
      req.headers['x-creatorflow-account-id']) ||
    '';
  const harness = resolveTestHarnessContext(req, reqAccountId);

  if (!verified && !harness.isHarness) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in to access CreatorFlow AI.',
    });
    return null;
  }

  const uid = verified ? verified.uid : harness.accountId!;
  if (verified && reqAccountId && reqAccountId !== verified.uid) {
    res.status(403).json({
      success: false,
      error: 'forbidden_account_mismatch',
      message: 'Cannot access or modify credentials for another user account.',
    });
    return null;
  }

  return { uid, harness };
}

// -------------------------------------------------------------
// BYOK GEMINI API KEY MANAGEMENT ENDPOINTS (/api/ai/key*)
// -------------------------------------------------------------
app.get('/api/ai/key', async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    const [record, usage] = await Promise.all([
      serverStore.getByokCredential(auth.uid),
      serverStore.getAiUsageMetrics(auth.uid),
    ]);
    res.json({
      success: true,
      metadata: buildSafeByokMetadata(record),
      models: SUPPORTED_GEMINI_MODELS,
      usage,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'BYOK_STATUS_ERROR',
      message: err?.message || 'Unable to load Gemini BYOK status.',
    });
  }
});

app.post('/api/ai/key', async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    const { apiKey, selectedModel, verifyConnection = true } = req.body || {};
    const validation = validateGeminiApiKeyFormat(apiKey);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: validation.error || 'Invalid Gemini API key format.',
      });
      return;
    }

    const modelToUse = selectedModel
      ? isValidGeminiModel(selectedModel)
        ? selectedModel
        : null
      : DEFAULT_GEMINI_MODEL;

    if (!modelToUse) {
      res.status(400).json({
        success: false,
        error: 'INVALID_MODEL',
        message: `Unsupported Gemini model requested. Supported models: ${SUPPORTED_GEMINI_MODELS.map((m) => m.id).join(', ')}`,
      });
      return;
    }

    let testResult: Awaited<ReturnType<typeof testByokApiKeyConnection>> | null = null;
    let status: EncryptedByokRecord['status'] = 'connected';
    let lastError: string | null = null;
    let lastTestedAt: string | null = null;

    if (verifyConnection !== false) {
      testResult = await testByokApiKeyConnection(validation.cleaned, modelToUse);
      lastTestedAt = new Date().toISOString();
      if (!testResult.ok) {
        if (testResult.status === 'invalid') {
          res.status(400).json({
            success: false,
            error: 'INVALID_API_KEY',
            message: testResult.message,
            testResult,
            diagnostic: testResult.diagnostic,
          });
          return;
        }
        if (testResult.code === 'BAD_REQUEST' || testResult.code === 'INVALID_MODEL') {
          res.status(testResult.code === 'INVALID_MODEL' ? 404 : 400).json({
            success: false,
            error: testResult.code,
            message: testResult.message,
            testResult,
            diagnostic: testResult.diagnostic,
          });
          return;
        }
        status = testResult.status;
        lastError = testResult.message;
      }
    }

    const existing = await serverStore.getByokCredential(auth.uid);
    const encryptedRecord = encryptByokKey({
      uid: auth.uid,
      plainKey: validation.cleaned,
      selectedModel: modelToUse,
      status,
      lastTestedAt,
      lastError,
      lastDiagnostic: testResult?.diagnostic ?? null,
      existingCreatedAt: existing?.createdAt,
    });

    await serverStore.saveByokCredential(encryptedRecord);
    clearUserIntelligenceCache(auth.uid);

    res.status(200).json({
      success: true,
      metadata: buildSafeByokMetadata(encryptedRecord),
      testResult,
      diagnostic: testResult?.diagnostic ?? null,
      models: SUPPORTED_GEMINI_MODELS,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'BYOK_SAVE_FAILED',
      message: err?.message || 'Failed to encrypt and save your Gemini API key.',
    });
  }
});

app.post('/api/ai/key/test', async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    const { apiKey, modelId } = req.body || {};
    if (modelId !== undefined && !isValidGeminiModel(modelId)) {
      res.status(404).json({
        success: false,
        ok: false,
        error: 'INVALID_MODEL',
        code: 'INVALID_MODEL',
        message: `Unsupported Gemini model "${modelId}". Choose from: ${SUPPORTED_GEMINI_MODELS.map((m) => m.id).join(', ')}.`,
      });
      return;
    }

    let keyToTest: string;
    let testingStored = false;
    const existing = await serverStore.getByokCredential(auth.uid);

    if (typeof apiKey === 'string' && apiKey.trim()) {
      const check = validateGeminiApiKeyFormat(apiKey);
      if (!check.valid) {
        res.status(400).json({
          success: false,
          ok: false,
          error: 'INVALID_API_KEY',
          message: check.error || 'Invalid Gemini API key format.',
        });
        return;
      }
      keyToTest = check.cleaned;
    } else if (existing) {
      keyToTest = decryptByokKey(existing, auth.uid);
      testingStored = true;
    } else {
      res.status(428).json({
        success: false,
        ok: false,
        error: 'MISSING_API_KEY',
        requiresByok: true,
        message: 'No Gemini API key connected yet. Paste your key in Settings -> Gemini API first.',
      });
      return;
    }

    const chosenModel = isValidGeminiModel(modelId)
      ? modelId
      : existing
      ? normalizeGeminiModel(existing.selectedModel)
      : DEFAULT_GEMINI_MODEL;

    const testResult = await testByokApiKeyConnection(keyToTest, chosenModel);
    let updatedRecord = existing;
    if (testingStored && existing) {
      const testedActiveModel = chosenModel === normalizeGeminiModel(existing.selectedModel);
      const keyLevelFailure =
        testResult.status === 'invalid' ||
        testResult.status === 'quota_exceeded' ||
        testResult.status === 'rate_limited';
      updatedRecord = await serverStore.updateByokKeyStatus(auth.uid, {
        ...(testedActiveModel || keyLevelFailure
          ? {
              status: testResult.ok ? 'connected' : testResult.status,
              lastError: testResult.ok ? null : testResult.message,
            }
          : {}),
        lastTestedAt: new Date().toISOString(),
        lastDiagnostic: testResult.diagnostic,
      });
    }

    const httpStatusCode = testResult.ok
      ? 200
      : testResult.code === 'INVALID_API_KEY'
      ? 401
      : testResult.code === 'INVALID_MODEL'
      ? 404
      : testResult.code === 'BAD_REQUEST'
      ? 400
      : testResult.code === 'QUOTA_EXCEEDED' || testResult.code === 'RATE_LIMIT_EXCEEDED'
      ? 429
      : testResult.code === 'TIMEOUT'
      ? 504
      : 503;

    res.status(httpStatusCode).json({
      success: testResult.ok,
      ...testResult,
      metadata: buildSafeByokMetadata(updatedRecord),
      quotaNotice: QUOTA_PROJECT_SHARING_NOTICE,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      ok: false,
      error: 'BYOK_TEST_FAILED',
      message: err?.message || 'Unable to test Gemini API key connection.',
    });
  }
});

app.patch('/api/ai/key/model', async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    const { selectedModel } = req.body || {};
    if (!isValidGeminiModel(selectedModel)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_MODEL',
        message: `Unsupported Gemini model "${selectedModel}". Choose from: ${SUPPORTED_GEMINI_MODELS.map((m) => m.id).join(', ')}.`,
      });
      return;
    }

    const existing = await serverStore.getByokCredential(auth.uid);
    if (!existing) {
      res.status(428).json({
        success: false,
        error: 'MISSING_API_KEY',
        requiresByok: true,
        message: 'Connect your Gemini API key first before switching your active Gemini model.',
      });
      return;
    }

    const updated = await serverStore.updateByokKeyStatus(auth.uid, {
      selectedModel,
    });
    clearUserIntelligenceCache(auth.uid);

    res.json({
      success: true,
      metadata: buildSafeByokMetadata(updated),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'MODEL_UPDATE_FAILED',
      message: err?.message || 'Unable to update selected Gemini model.',
    });
  }
});

app.delete('/api/ai/key', async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    await serverStore.deleteByokCredential(auth.uid);
    clearUserIntelligenceCache(auth.uid);
    res.json({
      success: true,
      metadata: buildSafeByokMetadata(null),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'BYOK_DELETE_FAILED',
      message: err?.message || 'Failed to delete your stored Gemini API key.',
    });
  }
});

// -------------------------------------------------------------
// CENTRAL CREATORFLOW INTELLIGENCE EXECUTION ENDPOINT
// -------------------------------------------------------------
const generateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60, // generous hourly limit for authenticated workspace orchestrations
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'You have reached your hourly request rate limit. Please try again shortly.',
    });
  },
});

app.post('/api/intelligence/execute', generateRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateCaller(req, res);
  if (!auth) return;

  try {
    const {
      task,
      feature,
      input = {},
      creatorProfile,
      recentProjects,
      recentIdeas,
      recentPacks,
      analyticsList,
      preferredModel,
      bypassCache,
      enableWebResearch,
    } = req.body || {};

    if (!task || !VALID_INTELLIGENCE_TASKS.has(task)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_TASK',
        message: 'A valid Intelligence Engine task type is required.',
      });
      return;
    }

    if (preferredModel !== undefined && !isValidGeminiModel(preferredModel)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_MODEL',
        message: `Unsupported Gemini model "${preferredModel}".`,
      });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(auth.uid);
    const effectivePlan =
      auth.harness.isHarness && auth.harness.planOverride
        ? auth.harness.planOverride
        : getEffectivePlan(account);

    if (feature && typeof feature === 'string' && SERVER_FEATURE_MAP[feature]) {
      const allowedPlans = SERVER_FEATURE_MAP[feature] || [];
      let isEntitled = allowedPlans.includes(effectivePlan);
      if (effectivePlan === 'custom_annual' && account.subscription.customConfig?.allowedFeatures) {
        isEntitled = account.subscription.customConfig.allowedFeatures.includes(feature);
      }
      if (!isEntitled) {
        const requiredPlan: ServerPlanId = allowedPlans.includes('pro')
          ? 'pro'
          : allowedPlans.includes('creator')
          ? 'creator'
          : 'max';
        res.status(403).json({
          success: false,
          error: 'FEATURE_LOCKED',
          feature,
          effectivePlan,
          requiredPlan,
          upgradeUrl: '/pricing',
          message: `This capability (${feature.replace(/_/g, ' ')}) requires the ${requiredPlan.toUpperCase()} plan or higher.`,
        });
        return;
      }
    }

    const result = await runIntelligencePipeline({
      store: serverStore,
      request: {
        uid: auth.uid,
        task,
        input,
        creatorProfile,
        recentProjects,
        recentIdeas,
        recentPacks,
        analyticsList,
        preferredModel,
        bypassCache: Boolean(bypassCache),
        enableWebResearch,
      },
    });

    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof GeminiProviderError) {
      res.status(err.status).json({
        success: false,
        error: err.code,
        message: err.message,
        requiresByok: err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY',
        quotaNotice: QUOTA_PROJECT_SHARING_NOTICE,
        ...(err.diagnostic ? { diagnostic: err.diagnostic } : {}),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'GENERATION_FAILED',
      message: err?.message || 'Intelligence execution failed unexpectedly.',
    });
  }
});

// -------------------------------------------------------------
// SECURE GEMINI AI GENERATION ENDPOINT (/api/generate — Strictly BYOK)
// -------------------------------------------------------------
const legacyGenerateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 10, // 10 generation requests per 60 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'You have reached your hourly generation limit. Please try again later.',
    });
  },
});

app.post('/api/generate', legacyGenerateRateLimiter, async (req: Request, res: Response): Promise<void> => {
  let activeAccountId: string | null = null;
  let activeModel: import('./src/lib/intelligence/types.ts').GeminiModelId = DEFAULT_GEMINI_MODEL;

  try {
    const auth = await authenticateCaller(req, res);
    if (!auth) return;
    const accountId = auth.uid;
    activeAccountId = accountId;

    const { prompt, feature } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({
        success: false,
        error: 'INVALID_PROMPT',
        message: 'A non-empty prompt string is required.',
      });
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length > 2000) {
      res.status(400).json({
        success: false,
        error: 'PROMPT_TOO_LONG',
        message: 'Prompt exceeds maximum length of 2,000 characters.',
      });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const usage = await serverStore.getOrCreateUsage(accountId);
    const effectivePlan =
      auth.harness.isHarness && auth.harness.planOverride
        ? auth.harness.planOverride
        : getEffectivePlan(account);

    if (feature && typeof feature === 'string' && SERVER_FEATURE_MAP[feature]) {
      const allowedPlans = SERVER_FEATURE_MAP[feature] || [];
      let isEntitled = allowedPlans.includes(effectivePlan);
      if (effectivePlan === 'custom_annual' && account.subscription.customConfig?.allowedFeatures) {
        isEntitled = account.subscription.customConfig.allowedFeatures.includes(feature);
      }
      if (!isEntitled) {
        const requiredPlan: ServerPlanId = allowedPlans.includes('pro')
          ? 'pro'
          : allowedPlans.includes('creator')
          ? 'creator'
          : 'max';
        res.status(403).json({
          success: false,
          error: 'FEATURE_LOCKED',
          feature,
          effectivePlan,
          requiredPlan,
          upgradeUrl: '/pricing',
          message: `This feature (${feature.replace(/_/g, ' ')}) requires the ${requiredPlan.toUpperCase()} plan or higher.`,
        });
        return;
      }
    }

    const cloudLimit = SERVER_LIMITS[effectivePlan].cloudGenerations;
    if ((usage.cloudGenerationsUsed || 0) >= cloudLimit) {
      res.status(403).json({
        success: false,
        error: 'CLOUD_QUOTA_EXCEEDED',
        effectivePlan,
        used: usage.cloudGenerationsUsed || 0,
        limit: cloudLimit,
        upgradeUrl: '/pricing',
        message: `You have used all ${cloudLimit} monthly cloud AI generations on the ${effectivePlan.toUpperCase()} plan. Connect or switch models or upgrade your plan.`,
      });
      return;
    }

    const byokRecord = await serverStore.getByokCredential(accountId);
    if (!byokRecord) {
      res.status(428).json({
        success: false,
        error: 'MISSING_API_KEY',
        requiresByok: true,
        message: 'Connect your Gemini API key in Settings -> Gemini API to run AI generation.',
      });
      return;
    }

    const userApiKey = decryptByokKey(byokRecord, accountId);
    const selectedModel = normalizeGeminiModel(byokRecord.selectedModel);
    activeModel = selectedModel;
    const genRes = await generateTextWithByok({
      apiKey: userApiKey,
      model: selectedModel,
      contents: trimmedPrompt,
      connectTimeoutMs: 7000,
      timeoutMs: 22000,
    });

    const consumeRes = await serverStore.consumeUsageAtomic({
      accountId,
      counter: 'cloudGenerationsUsed',
      limit: cloudLimit,
    });
    if (!consumeRes.allowed) {
      res.status(403).json({
        success: false,
        error: 'CLOUD_QUOTA_EXCEEDED',
        effectivePlan,
        used: consumeRes.newValue,
        limit: cloudLimit,
        upgradeUrl: '/pricing',
        message: `You have used all ${cloudLimit} monthly cloud AI generations on the ${effectivePlan.toUpperCase()} plan.`,
      });
      return;
    }

    await serverStore.recordAiUsageMetrics(accountId, {
      success: true,
      cacheHit: false,
      repairs: 0,
      inputTokens: genRes.inputTokens,
      outputTokens: genRes.outputTokens,
      model: selectedModel,
      task: 'topic_analysis',
    });

    res.status(200).json({
      success: true,
      data: genRes.text,
      model: selectedModel,
      effectivePlan,
      cloudRemaining: Math.max(0, cloudLimit - consumeRes.newValue),
      ...(genRes.diagnostic ? { diagnostic: genRes.diagnostic } : {}),
    });
  } catch (error: any) {
    if (activeAccountId) {
      await serverStore.recordAiUsageMetrics(activeAccountId, {
        success: false,
        cacheHit: false,
        repairs: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: activeModel,
        task: 'topic_analysis',
      });
      if (error instanceof GeminiProviderError) {
        const nextStatus =
          error.code === 'INVALID_API_KEY'
            ? 'invalid'
            : error.code === 'QUOTA_EXCEEDED'
            ? 'quota_exceeded'
            : error.code === 'RATE_LIMIT_EXCEEDED'
            ? 'rate_limited'
            : 'error';
        await serverStore.updateByokKeyStatus(activeAccountId, {
          status: nextStatus,
          lastError: error.message,
          lastDiagnostic: error.diagnostic || null,
        });
      }
    }

    if (error instanceof GeminiProviderError) {
      res.status(error.status).json({
        success: false,
        error: error.code,
        requiresByok: error.code === 'MISSING_API_KEY' || error.code === 'INVALID_API_KEY',
        message: error.message,
        ...(error.diagnostic ? { diagnostic: error.diagnostic } : {}),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'GENERATION_FAILED',
      message: error?.message || 'Failed to generate content. Your quota was not consumed.',
    });
  }
});

// -------------------------------------------------------------
// AI ASSISTANT BACKEND ENDPOINT (Strictly User BYOK)
// -------------------------------------------------------------
app.post('/api/assistant', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'invalid_request', message: 'Messages array is required.' });
      return;
    }

    const auth = await authenticateCaller(req, res);
    if (!auth) return;
    const accountId = auth.uid;

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const usage = await serverStore.getOrCreateUsage(accountId);
    const effectivePlan =
      auth.harness.isHarness && auth.harness.planOverride
        ? auth.harness.planOverride
        : getEffectivePlan(account);
    const limits = SERVER_LIMITS[effectivePlan];

    const requestedFeature = (req.body?.feature as string) || (context?.requestedFeature as string);
    if (requestedFeature && SERVER_FEATURE_MAP[requestedFeature]) {
      const allowedPlans = SERVER_FEATURE_MAP[requestedFeature] || [];
      let isEntitled = allowedPlans.includes(effectivePlan);
      if (effectivePlan === 'custom_annual' && account.subscription.customConfig?.allowedFeatures) {
        isEntitled = account.subscription.customConfig.allowedFeatures.includes(requestedFeature);
      }
      if (!isEntitled) {
        res.status(403).json({
          error: 'FEATURE_LOCKED',
          message: 'This assistant capability requires a higher CreatorFlow plan.',
        });
        return;
      }
    }

    if (limits.assistant !== 'unlimited' && usage.assistantMessagesUsed >= limits.assistant) {
      res.status(403).json({
        error: 'LIMIT_REACHED',
        message: `You've reached your monthly AI Assistant quota (${limits.assistant} messages) for the ${effectivePlan.toUpperCase()} plan. Upgrade to unlock more messages.`,
      });
      return;
    }

    const result = await runIntelligencePipeline({
      store: serverStore,
      request: {
        uid: accountId,
        task: 'creator_assistant',
        input: {
          messages,
          contextSnapshot: context || {},
        },
        creatorProfile: context?.creatorProfile || undefined,
        bypassCache: true,
        enableWebResearch: false,
      },
    });

    const consumeRes = await serverStore.consumeUsageAtomic({
      accountId,
      counter: 'assistantMessagesUsed',
      limit: limits.assistant,
    });
    if (!consumeRes.allowed) {
      res.status(403).json({
        error: 'LIMIT_REACHED',
        message: `You've reached your monthly AI Assistant quota (${limits.assistant} messages) for the ${effectivePlan.toUpperCase()} plan. Upgrade to unlock more messages.`,
      });
      return;
    }

    res.json({
      text: String(result.data),
      model: result.model,
      qualityReport: result.qualityReport,
    });
  } catch (error: any) {
    if (error instanceof GeminiProviderError) {
      res.status(error.status).json({
        error: error.code,
        requiresByok: error.code === 'MISSING_API_KEY' || error.code === 'INVALID_API_KEY',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      error: 'server_error',
      message: 'CreatorFlow AI Assistant failed unexpectedly. Your quota was not consumed.',
    });
  }
});

// -------------------------------------------------------------
// SERVER-SIDE SECURITY, HARNESS & ENTITLEMENT HELPERS
// -------------------------------------------------------------
function isLocalRequest(req: Request): boolean {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const cleanIp = ip.replace(/^::ffff:/, '');
  return cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost';
}

interface TestHarnessContext {
  isHarness: boolean;
  accountId?: string;
  planOverride?: ServerPlanId;
  customClockMs?: number;
}

function resolveTestHarnessContext(req: Request, candidateAccountId?: string): TestHarnessContext {
  if (isProd) return { isHarness: false };
  if (process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS !== 'true') return { isHarness: false };
  if (process.env.CREATORFLOW_SKIP_SERVER_LISTEN !== 'true') return { isHarness: false };

  const expectedSecret = process.env.CREATORFLOW_TEST_SECRET;
  if (!expectedSecret || expectedSecret.length < 16) return { isHarness: false };

  const providedSecret = req.headers['x-creatorflow-test-secret'];
  if (typeof providedSecret !== 'string' || providedSecret !== expectedSecret) {
    return { isHarness: false };
  }

  const rawAcc =
    (typeof candidateAccountId === 'string' && candidateAccountId) ||
    (typeof req.headers['x-creatorflow-account-id'] === 'string' ? req.headers['x-creatorflow-account-id'] : '');
  if (!rawAcc || !rawAcc.startsWith('test_')) {
    return { isHarness: false };
  }

  const planHeader = typeof req.headers['x-creatorflow-test-plan'] === 'string'
    ? (req.headers['x-creatorflow-test-plan'] as ServerPlanId)
    : undefined;
  const validPlan = planHeader && SERVER_LIMITS[planHeader] ? planHeader : undefined;
  const clockRaw = req.headers['x-test-clock-ms'] || req.body?.customTimestampMs;
  const customClockMs = clockRaw !== undefined && !isNaN(Number(clockRaw)) ? Number(clockRaw) : undefined;

  return {
    isHarness: true,
    accountId: rawAcc,
    planOverride: validPlan,
    customClockMs,
  };
}

// Server-side Feature Entitlement Matrix (Matches product specifications)
const SERVER_FEATURE_MAP: Record<string, ServerPlanId[]> = {
  // Strategy
  basic_topic_analysis: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  advanced_topic_analysis: ['pro', 'creator', 'max', 'custom_annual'],
  max_topic_analysis: ['max', 'custom_annual'],
  audience_aware_recommendations: ['pro', 'creator', 'max', 'custom_annual'],
  personalized_content_strategy: ['creator', 'max', 'custom_annual'],
  long_term_channel_planning: ['creator', 'max', 'custom_annual'],
  content_series_planning: ['creator', 'max', 'custom_annual'],
  series_continuation: ['creator', 'max', 'custom_annual'],
  topic_opportunity_scoring: ['creator', 'max', 'custom_annual'],
  content_gap_analysis: ['creator', 'max', 'custom_annual'],
  format_opportunity_analysis: ['creator', 'max', 'custom_annual'],
  what_should_i_make_next: ['creator', 'max', 'custom_annual'],
  creator_intelligence_engine: ['max', 'custom_annual'],

  // Daily Content Radar
  daily_content_radar_basic: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  daily_content_radar_advanced: ['creator', 'max', 'custom_annual'],
  daily_content_radar_max: ['max', 'custom_annual'],

  // Trend Radar
  trend_radar_basic: ['pro', 'creator', 'max', 'custom_annual'],
  trend_radar_advanced: ['creator', 'max', 'custom_annual'],
  trend_radar_max: ['max', 'custom_annual'],

  // Next Video Intelligence
  next_video_intelligence: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  next_video_intelligence_max: ['max', 'custom_annual'],

  // Creator Progress Tracking
  creator_progress: ['free', 'pro', 'creator', 'max', 'custom_annual'],

  // Content Gap Finder
  content_gap_finder: ['creator', 'max', 'custom_annual'],
  content_gap_finder_max: ['max', 'custom_annual'],

  // 30-Day and 90-Day Planning
  content_planning_30_day: ['creator', 'max', 'custom_annual'],
  channel_architecture_90_day: ['max', 'custom_annual'],

  // Series Planner
  series_planner: ['creator', 'max', 'custom_annual'],
  series_planner_max: ['max', 'custom_annual'],

  // Performance Growth Loop
  performance_growth_loop: ['creator', 'max', 'custom_annual'],

  // Ideas & Ranking
  basic_idea_generation: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  advanced_idea_ranking: ['pro', 'creator', 'max', 'custom_annual'],
  idea_intelligence_scoring: ['creator', 'max', 'custom_annual'],
  idea_prioritization_max: ['max', 'custom_annual'],

  // Production & Creation Kit
  basic_script_generation: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  advanced_scripts: ['pro', 'creator', 'max', 'custom_annual'],
  basic_visual_plan: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  advanced_visual_plan: ['pro', 'creator', 'max', 'custom_annual'],
  multi_scene_planning: ['creator', 'max', 'custom_annual'],
  scene_dependencies: ['max', 'custom_annual'],
  character_bible: ['pro', 'creator', 'max', 'custom_annual'],
  style_bible: ['pro', 'creator', 'max', 'custom_annual'],
  character_consistency: ['pro', 'creator', 'max', 'custom_annual'],
  multi_character_planning: ['max', 'custom_annual'],
  voice_direction: ['pro', 'creator', 'max', 'custom_annual'],
  music_sfx_planning: ['creator', 'max', 'custom_annual'],
  asset_dependency_tracking: ['creator', 'max', 'custom_annual'],
  tool_aware_creation_kits: ['creator', 'max', 'custom_annual'],
  maximum_creation_kit_depth: ['max', 'custom_annual'],

  // Production Output Actions (Free vs Pro/Creator/MAX)
  copy_generated_prompts: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  copy_all_clips: ['pro', 'creator', 'max', 'custom_annual'],
  export_creation_kit: ['pro', 'creator', 'max', 'custom_annual'],
  save_creation_kit_to_project: ['pro', 'creator', 'max', 'custom_annual'],
  regenerate_production_outputs: ['pro', 'creator', 'max', 'custom_annual'],

  // AI Workflows
  ai_animation_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  ai_image_to_video_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  text_to_video_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  ai_voice_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  faceless_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  whiteboard_workflow: ['pro', 'creator', 'max', 'custom_annual'],
  screen_recording_workflow: ['pro', 'creator', 'max', 'custom_annual'],

  // Publishing
  basic_publishing_metadata: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  advanced_publishing_package: ['pro', 'creator', 'max', 'custom_annual'],
  advanced_thumbnail_strategy: ['creator', 'max', 'custom_annual'],
  advanced_publishing_checklist: ['pro', 'creator', 'max', 'custom_annual'],

  // Multilingual
  core_languages: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  expanded_languages: ['pro', 'creator', 'max', 'custom_annual'],
  translation_workflows: ['creator', 'max', 'custom_annual'],
  bilingual_workflows: ['creator', 'max', 'custom_annual'],
  language_aware_metadata: ['creator', 'max', 'custom_annual'],

  // Analytics
  basic_manual_analytics: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  performance_comparison: ['pro', 'creator', 'max', 'custom_annual'],
  analytics_intelligence: ['creator', 'max', 'custom_annual'],
  analytics_max: ['max', 'custom_annual'],

  // Channel Management
  single_channel: ['free', 'pro', 'creator', 'max', 'custom_annual'],
  dual_channels: ['pro', 'creator', 'max', 'custom_annual'],
  multi_channels_creator: ['creator', 'max', 'custom_annual'],
  studio_channels_max: ['max', 'custom_annual'],
};

type ServerUpgradeRequest = PersistedUpgradeRequest;
type ServerTelemetryEvent = PersistedTelemetryEvent;

function getConfiguredOwnerEmails(): string[] {
  return (process.env.OWNER_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function resolveServerRole(verified: {
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  claimsRole?: string;
  claimsOwner?: boolean;
}): Promise<ServerUserRole> {
  if (verified.claimsOwner === true || verified.claimsRole === 'owner') {
    return 'owner';
  }
  if (verified.claimsRole === 'admin') {
    return 'admin';
  }
  if (verified.uid) {
    const storedAdmin = await serverStore.isUidStoredAsAdmin(verified.uid);
    if (storedAdmin) {
      return 'owner';
    }
  }
  if (verified.emailVerified && verified.email) {
    const normalized = verified.email.trim().toLowerCase();
    if (getConfiguredOwnerEmails().includes(normalized)) {
      return 'owner';
    }
  }
  return 'user';
}

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  signInProvider?: string;
  claimsRole?: string;
  claimsOwner?: boolean;
}

export interface TokenVerificationResult {
  valid: boolean;
  token: VerifiedFirebaseToken | null;
  errorCode?: 'missing_token' | 'malformed_token' | 'expired_token' | 'invalid_token';
  errorMessage?: string;
}

/**
 * Cryptographically verifies a Firebase Auth ID token using the official Firebase Admin SDK (`adminAuth.verifyIdToken`)
 * against the configured Firebase project.
 */
export async function verifyFirebaseIdTokenWithDetails(idToken?: string): Promise<TokenVerificationResult> {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    return {
      valid: false,
      token: null,
      errorCode: 'missing_token',
      errorMessage: 'Authentication token is missing. Please sign in again.',
    };
  }

  const trimmed = idToken.trim();
  const segments = trimmed.split('.');
  if (segments.length !== 3 || segments.some((s) => !s)) {
    return {
      valid: false,
      token: null,
      errorCode: 'malformed_token',
      errorMessage: 'Malformed authentication token format. Expected a valid Firebase JWT ID token.',
    };
  }

  // Quick pre-check on decoded payload for clear expired/project diagnostics before cryptographic verification
  try {
    const payloadJson = Buffer.from(segments[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);

    if (typeof payload.exp === 'number' && payload.exp < nowSec - 10) {
      return {
        valid: false,
        token: null,
        errorCode: 'expired_token',
        errorMessage: 'Your authentication session has expired. Please sign in again.',
      };
    }

    if (payload.aud && payload.aud !== FIREBASE_PROJECT_ID) {
      return {
        valid: false,
        token: null,
        errorCode: 'invalid_token',
        errorMessage: `Token audience (${payload.aud}) does not match configured Firebase project (${FIREBASE_PROJECT_ID}).`,
      };
    }
  } catch {
    return {
      valid: false,
      token: null,
      errorCode: 'malformed_token',
      errorMessage: 'Malformed JWT payload in authentication token.',
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(trimmed);
    if (!decoded || !decoded.uid) {
      return {
        valid: false,
        token: null,
        errorCode: 'invalid_token',
        errorMessage: 'Token verification failed: missing subject UID.',
      };
    }

    return {
      valid: true,
      token: {
        uid: String(decoded.uid),
        email: String(decoded.email || '').trim().toLowerCase(),
        emailVerified: Boolean(decoded.email_verified),
        displayName: decoded.name ? String(decoded.name) : undefined,
        photoURL: decoded.picture ? String(decoded.picture) : undefined,
        signInProvider: decoded.firebase?.sign_in_provider ? String(decoded.firebase.sign_in_provider) : undefined,
        claimsRole: typeof (decoded as any).role === 'string' ? (decoded as any).role : undefined,
        claimsOwner: (decoded as any).owner === true,
      },
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');
    if (code === 'auth/id-token-expired') {
      return {
        valid: false,
        token: null,
        errorCode: 'expired_token',
        errorMessage: 'Your Firebase authentication token has expired. Please sign in again.',
      };
    }
    if (msg.includes('Decoding Firebase ID token failed') || msg.includes('no "kid" claim')) {
      return {
        valid: false,
        token: null,
        errorCode: 'malformed_token',
        errorMessage: 'Malformed Firebase ID token.',
      };
    }
    return {
      valid: false,
      token: null,
      errorCode: 'invalid_token',
      errorMessage: 'Invalid or unverified Firebase Authentication token.',
    };
  }
}

async function verifyFirebaseIdToken(idToken?: string): Promise<VerifiedFirebaseToken | null> {
  const result = await verifyFirebaseIdTokenWithDetails(idToken);
  return result.valid ? result.token : null;
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.body && typeof req.body.idToken === 'string') {
    return req.body.idToken;
  }
  return undefined;
}

type ServerDeviceInfo = PersistedDeviceInfo;
type ServerUsageRecord = PersistedUsageRecord;

const SERVER_LIMITS: Record<ServerPlanId, {
  creationKits: number;
  assistant: number | 'unlimited';
  projects: number;
  channels: number;
  analyticsRecords: number;
  ideasPerGeneration: number;
  radarOpportunitiesDaily: number;
  nextVideoDailyRefreshes: number | 'unlimited';
  cloudGenerations: number;
}> = {
  free: {
    creationKits: 3,
    assistant: 50,
    projects: 1,
    channels: 1,
    analyticsRecords: 3,
    ideasPerGeneration: 3,
    radarOpportunitiesDaily: 3,
    nextVideoDailyRefreshes: 1,
    cloudGenerations: 5,
  },
  pro: {
    creationKits: 25,
    assistant: 500,
    projects: 10,
    channels: 2,
    analyticsRecords: 15,
    ideasPerGeneration: 6,
    radarOpportunitiesDaily: 15,
    nextVideoDailyRefreshes: 3,
    cloudGenerations: 50,
  },
  creator: {
    creationKits: 75,
    assistant: 2000,
    projects: 30,
    channels: 3,
    analyticsRecords: 50,
    ideasPerGeneration: 10,
    radarOpportunitiesDaily: 30,
    nextVideoDailyRefreshes: 5,
    cloudGenerations: 150,
  },
  max: {
    creationKits: 200,
    assistant: 'unlimited',
    projects: 100,
    channels: 10,
    analyticsRecords: 200,
    ideasPerGeneration: 15,
    radarOpportunitiesDaily: 50,
    nextVideoDailyRefreshes: 'unlimited',
    cloudGenerations: 500,
  },
  custom_annual: {
    creationKits: 100,
    assistant: 3000,
    projects: 50,
    channels: 5,
    analyticsRecords: 100,
    ideasPerGeneration: 12,
    radarOpportunitiesDaily: 30,
    nextVideoDailyRefreshes: 5,
    cloudGenerations: 150,
  },
};

export type { ServerVideoReservation };
export { ROLLING_WEEK_MS };

function evaluateDeviceRisk(device: ServerDeviceInfo): void {
  const now = Date.now();
  // Filter out switches older than 10 mins
  device.switches = (device.switches || []).filter((t) => now - t < 10 * 60 * 1000);
  // Filter out new account timestamps older than 2 hours
  device.newAccountTimestamps = (device.newAccountTimestamps || []).filter((t) => now - t < 2 * 60 * 60 * 1000);

  const reasons: string[] = [];

  if (device.newAccountTimestamps.length >= 5) {
    device.riskLevel = 'HIGH_RISK';
    reasons.push('Excessive new account creation velocity from single installation environment');
  } else if (device.newAccountTimestamps.length >= 3 || device.switches.length >= 5) {
    device.riskLevel = 'MEDIUM_RISK';
    reasons.push('Frequent account switching detected; account identity verification requested');
  } else {
    device.riskLevel = 'LOW_RISK';
  }

  device.riskReasons = reasons;
}

// Persisted account/usage/quota helpers live in serverStore (src/lib/serverStateStore.ts)

// -------------------------------------------------------------
// ENDPOINTS: AUTH, USAGE, RISK & ENTITLEMENTS
// -------------------------------------------------------------

// 1. Google OAuth Authorize URL Generator
app.get('/api/auth/google/url', (req: Request, res: Response): void => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || 'creatorflow-google-auth-client';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// 2. Microsoft OAuth Authorize URL Generator
app.get('/api/auth/microsoft/url', (req: Request, res: Response): void => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/microsoft/callback`;
  const clientId = process.env.MICROSOFT_CLIENT_ID || 'creatorflow-ms-auth-client';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    prompt: 'select_account',
  });
  res.json({ url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}` });
});

// 3. Centralized Sign-In (Google & Microsoft) & Device Association
async function handleSignIn(req: Request, res: Response): Promise<void> {
  try {
    const token = extractBearerToken(req);
    const verification = await verifyFirebaseIdTokenWithDetails(token);

    if (!verification.valid || !verification.token || !verification.token.uid) {
      res.status(401).json({
        error: verification.errorCode || 'unauthorized_token',
        message:
          verification.errorMessage ||
          'A valid, cryptographically verified Firebase Authentication token is required to sign in.',
      });
      return;
    }

    const verified = verification.token;
    const { provider = 'google', deviceInstallId } = req.body;
    const resolvedProvider: 'google' | 'microsoft' =
      provider === 'microsoft' || verified.signInProvider?.includes('microsoft') ? 'microsoft' : 'google';

    const deviceId = deviceInstallId || 'cf_dev_unknown';
    const device = await serverStore.getOrCreateDevice(deviceId);

    const fallbackEmail = verified.email || `${verified.uid}@users.creatorflow.local`;
    const resolvedRole = await resolveServerRole(verified);

    const { account, isNewAccount } = await withAccountLock(verified.uid, async () => {
      const resAcc = await serverStore.getOrCreateAccount(verified.uid, {
        email: fallbackEmail,
        displayName: verified.displayName || fallbackEmail.split('@')[0] || 'Creator',
        photoURL: verified.photoURL,
        providerId: verified.uid,
        provider: resolvedProvider,
        resolvedRole,
      });

      resAcc.account.role = resolvedRole;
      resAcc.account.isVerified = verified.emailVerified;
      resAcc.account.associatedDeviceIds.add(deviceId);
      await serverStore.saveAccount(resAcc.account);
      return resAcc;
    });

    if (resolvedRole === 'owner') {
      await serverStore.upsertAdminRecord(verified.uid, 'owner', true);
      adminAuth
        .setCustomUserClaims(verified.uid, { role: 'owner', owner: true })
        .catch((err) => {
          console.warn('[Auth] Could not sync owner custom claims in handleSignIn:', err?.code || err?.message);
        });
    }

    if (!device.accountIds.includes(verified.uid)) {
      device.accountIds.push(verified.uid);
    }
    device.switches.push(Date.now());
    if (isNewAccount) {
      device.newAccountTimestamps.push(Date.now());
    }

    evaluateDeviceRisk(device);
    await serverStore.saveDevice(device);

    const usage = await serverStore.getOrCreateUsage(account.id);
    const effectivePlan = getEffectivePlan(account);
    const limits = SERVER_LIMITS[effectivePlan];

    res.json({
      success: true,
      isNewAccount,
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        photoURL: account.photoURL,
        plan: account.plan,
        role: account.role,
        provider: account.provider,
        linkedProviders: account.linkedProviders,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
      riskStatus: device.riskLevel,
      riskReasons: device.riskReasons,
      usage: {
        month: usage.month,
        creationKitsUsed: usage.creationKitsUsed,
        creationKitsLimit: limits.creationKits,
        assistantMessagesUsed: usage.assistantMessagesUsed,
        assistantMessagesLimit: limits.assistant,
        projectsCreated: usage.projectsCreated,
        projectsLimit: limits.projects,
        topicsAnalyzed: usage.topicsAnalyzed,
      },
    });
  } catch (err: any) {
    console.error('Error in signin:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
}

app.post('/api/auth/signin', handleSignIn);

// Backward compatibility with legacy endpoint
app.post('/api/auth/google-signin', async (req: Request, res: Response): Promise<void> => {
  req.body = { ...(req.body || {}), provider: 'google' };
  await handleSignIn(req, res);
});

// 4. Link Account Provider (Google <-> Microsoft Identity Linking)
app.post('/api/auth/link-provider', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    if (!verified) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const { provider } = req.body;
    const account = await withAccountLock(verified.uid, async () => {
      const { account: acc } = await serverStore.getOrCreateAccount(verified.uid, {
        email: verified.email,
        displayName: verified.displayName,
        photoURL: verified.photoURL,
      });
      if (provider && !acc.linkedProviders.includes(provider)) {
        acc.linkedProviders.push(provider);
        await serverStore.saveAccount(acc);
      }
      return acc;
    });

    res.json({
      success: true,
      linkedProviders: account.linkedProviders,
      message: `Successfully linked ${provider} identity.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 5. Account Sign Out Session Invalidation (Requires Verified Firebase Token & Account Ownership)
app.post('/api/auth/logout', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  if (!verified || !verified.uid) {
    res.status(401).json({ error: 'unauthorized', message: 'Verified authentication token required to log out.' });
    return;
  }

  const requestedAccountId = (req.body?.accountId as string) || '';
  if (requestedAccountId && requestedAccountId !== verified.uid) {
    res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot log out another user account.' });
    return;
  }

  await withAccountLock(verified.uid, async () => {
    const acc = await serverStore.getAccount(verified.uid);
    if (acc) {
      acc.lastLoginAt = new Date().toISOString();
      await serverStore.saveAccount(acc);
    }
  });

  res.json({ success: true, message: 'Session logged out' });
});

// 6. Current Session Info Endpoint (Requires Verified Bearer Token)
app.get('/api/auth/me', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  if (!verified || !verified.uid) {
    res.status(401).json({ authenticated: false, message: 'Not authenticated' });
    return;
  }

  const resolvedRole = await resolveServerRole(verified);
  const account = await withAccountLock(verified.uid, async () => {
    const { account: acc } = await serverStore.getOrCreateAccount(verified.uid, {
      email: verified.email,
      displayName: verified.displayName,
      photoURL: verified.photoURL,
      resolvedRole,
    });
    acc.role = resolvedRole;
    await serverStore.saveAccount(acc);
    return acc;
  });

  if (resolvedRole === 'owner') {
    await serverStore.upsertAdminRecord(verified.uid, 'owner', true);
    adminAuth
      .setCustomUserClaims(verified.uid, { role: 'owner', owner: true })
      .catch((err) => {
        console.warn('[Auth] Could not sync owner custom claims in /api/auth/me:', err?.code || err?.message);
      });
  }

  res.json({
    authenticated: true,
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      photoURL: account.photoURL,
      plan: account.plan,
      role: account.role,
      provider: account.provider,
      linkedProviders: account.linkedProviders,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    },
  });
});

// 6b. Permanent Account & Workspace Deletion Endpoint (Self or Owner)
app.delete('/api/account', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const reqAccountId =
      (req.body?.accountId as string) ||
      (req.query.accountId as string) ||
      '';
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required to permanently delete an account.',
      });
      return;
    }

    const targetUid = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({
        success: false,
        error: 'forbidden_account_mismatch',
        message: 'Cannot delete another user account.',
      });
      return;
    }

    await serverStore.deleteAccountPersistence(targetUid);
    clearUserIntelligenceCache(targetUid);

    for (const [subId, sub] of inMemorySubscriptions.entries()) {
      if (sub.accountId === targetUid) {
        inMemorySubscriptions.delete(subId);
      }
    }

    let authUserDeleted = false;
    if (verified && !harness.isHarness) {
      try {
        await adminAuth.deleteUser(targetUid);
        authUserDeleted = true;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/user-not-found') {
          authUserDeleted = true;
        } else {
          console.warn('[Account Delete] Admin Auth deleteUser warning (client fallback will complete):', authErr?.code || authErr?.message);
        }
      }
    } else {
      authUserDeleted = true;
    }

    res.json({
      success: true,
      accountId: targetUid,
      authUserDeleted,
      message: 'Your account and all server-stored workspace data have been permanently deleted.',
    });
  } catch (err: any) {
    console.error('[Account Delete] Error deleting account:', err?.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: err?.message || 'Failed to delete account data.',
    });
  }
});

// 7. Guided Tour Progress Persistence (Authoritative per Account)
app.get('/api/user/tour-progress', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  if (!verified || !verified.uid) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return;
  }

  const progress = await serverStore.getTourProgress(verified.uid);
  res.json({ success: true, progress });
});

app.post('/api/user/tour-progress', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  if (!verified || !verified.uid) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return;
  }

  const current = await serverStore.getTourProgress(verified.uid);
  const incoming = req.body || {};
  const updated = {
    ...current,
    ...incoming,
    updatedAt: new Date().toISOString(),
  };

  await serverStore.saveTourProgress(verified.uid, updated);
  res.json({ success: true, progress: updated });
});

// 2. Authoritative Usage Check
app.post('/api/usage/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: requestedAccountId, deviceInstallId, feature } = req.body || {};

    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required: Sign in to check your workspace usage.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot check usage for another user account.' });
      return;
    }

    const deviceId = deviceInstallId || 'cf_dev_unknown';
    const device = await serverStore.getOrCreateDevice(deviceId);
    evaluateDeviceRisk(device);

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const usage = await serverStore.getOrCreateUsage(accountId);
    const effectivePlan = getEffectivePlan(account);
    const limits = SERVER_LIMITS[effectivePlan];

    // High risk restriction check for metered actions
    if (device.riskLevel === 'HIGH_RISK' && (feature === 'creation_kit' || feature === 'ai_assistant')) {
      res.json({
        allowed: false,
        remaining: 0,
        limit: limits.creationKits,
        plan: account.plan,
        effectivePlan,
        reason: 'HIGH_RISK_RESTRICTION',
        riskStatus: device.riskLevel,
        message: 'To protect CreatorFlow\'s usage limits, this action is temporarily unavailable. Please continue with your verified account or try again later.',
        usage: {
          month: usage.month,
          creationKitsUsed: usage.creationKitsUsed,
          creationKitsLimit: limits.creationKits,
          assistantMessagesUsed: usage.assistantMessagesUsed,
          assistantMessagesLimit: limits.assistant,
          projectsCreated: usage.projectsCreated,
          projectsLimit: limits.projects,
          topicsAnalyzed: usage.topicsAnalyzed,
          analyticsRecordsUsed: usage.analyticsRecordsUsed,
          lifetimeGenerations: usage.lifetimeGenerations,
        },
      });
      return;
    }

    // Medium risk soft verification check
    if (device.riskLevel === 'MEDIUM_RISK' && !account.isVerified && feature === 'creation_kit') {
      res.json({
        allowed: false,
        remaining: Math.max(0, limits.creationKits - usage.creationKitsUsed),
        limit: limits.creationKits,
        plan: account.plan,
        effectivePlan,
        reason: 'VERIFICATION_REQUIRED',
        riskStatus: device.riskLevel,
        message: 'Before continuing, please verify your account.',
      });
      return;
    }

    // Check specific feature limit
    let allowed = true;
    let remaining: number = 0;
    let limitVal: number | 'unlimited' = limits.creationKits;
    let reason: 'OK' | 'LIMIT_REACHED' = 'OK';

    if (feature === 'creation_kit') {
      limitVal = limits.creationKits;
      remaining = Math.max(0, limitVal - usage.creationKitsUsed);
      if (usage.creationKitsUsed >= limitVal) {
        allowed = false;
        reason = 'LIMIT_REACHED';
      }
    } else if (feature === 'ai_assistant') {
      limitVal = limits.assistant;
      if (limitVal === 'unlimited') {
        remaining = 9999;
        allowed = true;
      } else {
        remaining = Math.max(0, limitVal - usage.assistantMessagesUsed);
        if (usage.assistantMessagesUsed >= limitVal) {
          allowed = false;
          reason = 'LIMIT_REACHED';
        }
      }
    } else if (feature === 'project_creation') {
      limitVal = limits.projects;
      remaining = Math.max(0, limitVal - usage.projectsCreated);
      if (usage.projectsCreated >= limitVal) {
        allowed = false;
        reason = 'LIMIT_REACHED';
      }
    } else if (feature === 'analytics_record') {
      limitVal = limits.analyticsRecords;
      remaining = Math.max(0, limitVal - usage.analyticsRecordsUsed);
      if (usage.analyticsRecordsUsed >= limitVal) {
        allowed = false;
        reason = 'LIMIT_REACHED';
      }
    }

    res.json({
      allowed,
      remaining,
      limit: limitVal,
      plan: account.plan,
      effectivePlan,
      reason,
      riskStatus: device.riskLevel,
      message: allowed ? undefined : `You've reached your ${effectivePlan.toUpperCase()} ${feature.replace('_', ' ')} limit for this period. Upgrade to unlock higher capacity.`,
      usage: {
        month: usage.month,
        creationKitsUsed: usage.creationKitsUsed,
        creationKitsLimit: limits.creationKits,
        assistantMessagesUsed: usage.assistantMessagesUsed,
        assistantMessagesLimit: limits.assistant,
        projectsCreated: usage.projectsCreated,
        projectsLimit: limits.projects,
        topicsAnalyzed: usage.topicsAnalyzed,
        analyticsRecordsUsed: usage.analyticsRecordsUsed,
        lifetimeGenerations: usage.lifetimeGenerations,
      },
    });
  } catch (err: any) {
    console.error('Error in usage check:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 3. Authoritative Usage Record (Consumption)
app.post('/api/usage/record', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: requestedAccountId, deviceInstallId, feature } = req.body || {};

    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required: Sign in to record usage in your workspace.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot record usage for another user account.' });
      return;
    }

    const deviceId = deviceInstallId || 'cf_dev_unknown';
    const device = await serverStore.getOrCreateDevice(deviceId);
    evaluateDeviceRisk(device);

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = getEffectivePlan(account);
    const limits = SERVER_LIMITS[effectivePlan];

    if (device.riskLevel === 'HIGH_RISK' && (feature === 'creation_kit' || feature === 'ai_assistant')) {
      res.status(403).json({
        success: false,
        error: 'HIGH_RISK_RESTRICTION',
        message: 'To protect CreatorFlow\'s usage limits, this action is temporarily unavailable. Please continue with your verified account or try again later.',
      });
      return;
    }

    const counterMap: Record<
      string,
      {
        counter: 'creationKitsUsed' | 'assistantMessagesUsed' | 'topicsAnalyzed' | 'projectsCreated' | 'analyticsRecordsUsed';
        limit: number | 'unlimited';
        errorMessage: (used: number) => string;
      }
    > = {
      creation_kit: {
        counter: 'creationKitsUsed',
        limit: limits.creationKits,
        errorMessage: () =>
          `You've reached your ${effectivePlan.toUpperCase()} Creation Kit limit (${limits.creationKits}/month). Upgrade to expand your production capacity.`,
      },
      ai_assistant: {
        counter: 'assistantMessagesUsed',
        limit: limits.assistant,
        errorMessage: () =>
          `You've reached your Assistant message limit (${limits.assistant}/month) for the ${effectivePlan.toUpperCase()} plan.`,
      },
      topic_analysis: {
        counter: 'topicsAnalyzed',
        limit: 'unlimited',
        errorMessage: () => '',
      },
      project_creation: {
        counter: 'projectsCreated',
        limit: limits.projects,
        errorMessage: () =>
          `You've reached your active project limit (${limits.projects}) for the ${effectivePlan.toUpperCase()} tier.`,
      },
      analytics_record: {
        counter: 'analyticsRecordsUsed',
        limit: limits.analyticsRecords,
        errorMessage: (used) =>
          `You've recorded ${used}/${limits.analyticsRecords} analytics records on the ${effectivePlan.toUpperCase()} tier. Upgrade for expanded tracking.`,
      },
    };

    const featureConfig = counterMap[feature || 'creation_kit'] || counterMap.creation_kit;
    const record: ServerUsageRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      accountId,
      deviceInstallId: deviceId,
      feature: feature || 'creation_kit',
      period: getServerMonthKey(),
      timestamp: new Date().toISOString(),
      success: true,
    };

    const atomicConsume = await serverStore.consumeUsageAtomic({
      accountId,
      counter: featureConfig.counter,
      limit: featureConfig.limit,
      record,
    });

    if (!atomicConsume.allowed) {
      res.status(403).json({
        success: false,
        error: 'LIMIT_REACHED',
        message: featureConfig.errorMessage(atomicConsume.newValue),
        currentUsage: atomicConsume.newValue,
        limit: featureConfig.limit,
        effectivePlan,
      });
      return;
    }

    const usage = atomicConsume.usage;
    res.status(200).json({
      success: true,
      recordId: record.id,
      allowed: true,
      remaining: feature === 'creation_kit' ? limits.creationKits - usage.creationKitsUsed : 9999,
      limit: feature === 'creation_kit' ? limits.creationKits : limits.assistant,
      plan: account.plan,
      effectivePlan,
      reason: 'OK',
      riskStatus: device.riskLevel,
      usage: {
        month: usage.month,
        creationKitsUsed: usage.creationKitsUsed,
        creationKitsLimit: limits.creationKits,
        assistantMessagesUsed: usage.assistantMessagesUsed,
        assistantMessagesLimit: limits.assistant,
        projectsCreated: usage.projectsCreated,
        projectsLimit: limits.projects,
        topicsAnalyzed: usage.topicsAnalyzed,
        analyticsRecordsUsed: usage.analyticsRecordsUsed,
        lifetimeGenerations: usage.lifetimeGenerations,
      },
    });
  } catch (err: any) {
    console.error('Error in usage record:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 4. Usage Summary Endpoint
app.get('/api/usage/summary', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  const requestedAccountId = (req.query.accountId as string) || '';
  const harness = resolveTestHarnessContext(req, requestedAccountId);

  if (!verified && !harness.isHarness) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required to view workspace usage summary.' });
    return;
  }

  const accountId = verified ? verified.uid : harness.accountId!;
  if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
    res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot view usage summary for another account.' });
    return;
  }

  const { account } = await serverStore.getOrCreateAccount(accountId);
  const usage = await serverStore.getOrCreateUsage(accountId);
  const effectivePlan = getEffectivePlan(account);
  const limits = SERVER_LIMITS[effectivePlan];

  res.json({
    accountId,
    plan: account.plan,
    effectivePlan,
    subscriptionStatus: account.subscription.status,
    usage: {
      month: usage.month,
      creationKitsUsed: usage.creationKitsUsed,
      creationKitsLimit: limits.creationKits,
      assistantMessagesUsed: usage.assistantMessagesUsed,
      assistantMessagesLimit: limits.assistant,
      projectsCreated: usage.projectsCreated,
      projectsLimit: limits.projects,
      topicsAnalyzed: usage.topicsAnalyzed,
      analyticsRecordsUsed: usage.analyticsRecordsUsed,
      lifetimeGenerations: usage.lifetimeGenerations,
    },
  });
});

// 5. Server-Side Entitlement Check Endpoint (Requires Verified Auth & Account Ownership)
app.post('/api/entitlements/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { feature, accountId: reqAccountId } = req.body || {};
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required to check account feature entitlements.',
      });
      return;
    }

    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({
        error: 'forbidden_account_mismatch',
        message: 'Cannot check entitlements for another user account.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;

    if (!feature || typeof feature !== 'string') {
      res.status(400).json({ error: 'missing_feature', message: 'feature key is required' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = getEffectivePlan(account);

    const allowedPlans = SERVER_FEATURE_MAP[feature] || [];
    let allowed = allowedPlans.includes(effectivePlan);

    if (effectivePlan === 'custom_annual' && account.subscription.customConfig?.allowedFeatures) {
      allowed = account.subscription.customConfig.allowedFeatures.includes(feature);
    }

    const targetPlan: ServerPlanId = allowedPlans.includes('pro')
      ? 'pro'
      : allowedPlans.includes('creator')
      ? 'creator'
      : 'max';

    res.json({
      allowed,
      feature,
      plan: account.plan,
      effectivePlan,
      targetPlan,
      upgradeMessage: allowed
        ? ''
        : `This feature is available on ${targetPlan.toUpperCase()} and above. Upgrade to unlock it.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 6. Server-Side Generation Tracking & Free Plan Conversion Policy
app.post('/api/generation/record', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: reqAccountId, idempotencyKey, failed } = req.body || {};
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Sign-in required: You must be signed in with your account to generate videos.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot record generation for another user account.' });
      return;
    }

    if (failed) {
      res.status(200).json({
        success: false,
        error: 'OPERATION_FAILED',
        message: 'Failed creation operation did not consume a quota slot.',
        consumed: false,
      });
      return;
    }

    const nowMs = harness.isHarness && harness.customClockMs ? harness.customClockMs : Date.now();

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = (harness.isHarness && harness.planOverride)
      ? harness.planOverride
      : getEffectivePlan(account);
    const weeklyLimit = getWeeklyLimitForPlan(effectivePlan, account.subscription.customConfig);

    const atomicResult = await serverStore.recordGenerationAtomic({
      accountId,
      weeklyLimit,
      idempotencyKey,
      nowMs,
    });

    if (atomicResult.isRetry) {
      res.status(200).json({
        success: true,
        count: atomicResult.count,
        weeklyUsed: atomicResult.weeklyUsed,
        weeklyLimit: atomicResult.weeklyLimit,
        weeklyRemaining: atomicResult.weeklyRemaining,
        isCopyAllowed: effectivePlan !== 'free' || atomicResult.count <= 1,
        isGenerationTwoLock: effectivePlan === 'free' && atomicResult.count >= 2,
        plan: account.plan,
        effectivePlan,
        isRetry: true,
        message: 'Operation was already recorded.',
      });
      return;
    }

    if (!atomicResult.allowed) {
      const msUntilRelease = Math.max(0, (atomicResult.resetsAtMs || nowMs) - nowMs);
      const hoursUntilRelease = Math.ceil(msUntilRelease / (1000 * 60 * 60));
      res.status(403).json({
        success: false,
        error: 'WEEKLY_LIMIT_REACHED',
        message: `You have reached your ${effectivePlan.toUpperCase()} quota limit of ${weeklyLimit} videos per rolling 7-day period. Quota releases in ~${hoursUntilRelease} hour(s). Upgrade to Pro for 25 videos.`,
        weeklyUsed: atomicResult.weeklyUsed,
        weeklyLimit,
        resetsAtMs: atomicResult.resetsAtMs,
        effectivePlan,
      });
      return;
    }

    const isCopyAllowed = effectivePlan !== 'free' || atomicResult.count <= 1;
    const isGenerationTwoLock = effectivePlan === 'free' && atomicResult.count >= 2;

    res.status(200).json({
      success: true,
      count: atomicResult.count,
      weeklyUsed: atomicResult.weeklyUsed,
      weeklyLimit: atomicResult.weeklyLimit,
      weeklyRemaining: atomicResult.weeklyRemaining,
      isCopyAllowed,
      isGenerationTwoLock,
      plan: account.plan,
      effectivePlan,
      resetsAtMs: atomicResult.resetsAtMs,
      message: isGenerationTwoLock
        ? 'Ready to use. Upgrade to Pro to copy this result instantly.'
        : 'Generation recorded successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

app.get('/api/generation/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const requestedAccountId = (req.query.accountId as string) || '';
    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required to inspect quota and generation status.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot check status for another account.' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const usage = await serverStore.getOrCreateUsage(accountId);
    const effectivePlan = getEffectivePlan(account);
    const nowMs = harness.isHarness && harness.customClockMs ? harness.customClockMs : Date.now();

    const count = usage.lifetimeGenerations || 0;
    const isCopyAllowed = effectivePlan !== 'free' || count <= 1;
    const isGenerationTwoLock = effectivePlan === 'free' && count >= 2;

    const quotaDoc = await serverStore.getQuotaDoc(accountId);
    const weeklyData = serverStore.computeActiveReservations(quotaDoc, nowMs);
    const weeklyLimit = getWeeklyLimitForPlan(effectivePlan, account.subscription.customConfig);

    res.json({
      count,
      weeklyUsed: weeklyData.count,
      weeklyLimit,
      weeklyRemaining: Math.max(0, weeklyLimit - weeklyData.count),
      isCopyAllowed,
      isGenerationTwoLock,
      plan: account.plan,
      effectivePlan,
      resetsAtMs: weeklyData.oldestExpiryMs,
      message: isGenerationTwoLock
        ? 'Ready to use. Upgrade to Pro to copy this result instantly.'
        : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// -------------------------------------------------------------
// AUTHORITATIVE VIDEO QUOTA RESERVATION ENDPOINTS
// -------------------------------------------------------------
app.post('/api/video/reserve-slot', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const reqAccountId = (req.body?.accountId as string) || (req.headers['x-creatorflow-account-id'] as string) || '';
    const { workflowId: requestedWorkflowId, topic, idempotencyKey } = req.body || {};

    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Sign-in required: You must be signed in with your account to start a video workflow.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ success: false, error: 'forbidden_account_mismatch', message: 'Cannot reserve video quota for another account.' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = (harness.isHarness && harness.planOverride)
      ? harness.planOverride
      : getEffectivePlan(account);
    const weeklyLimit = getWeeklyLimitForPlan(effectivePlan, account.subscription.customConfig);

    const nowMs = harness.isHarness && harness.customClockMs ? harness.customClockMs : Date.now();
    const workflowId = String(requestedWorkflowId || `wf_${nowMs}_${Math.random().toString(36).slice(2, 7)}`);
    const cleanTopic = String(topic || 'Untitled Video').trim().slice(0, 200);

    const atomicResult = await serverStore.reserveVideoSlotAtomic({
      accountId,
      workflowId,
      topic: cleanTopic,
      weeklyLimit,
      effectivePlan,
      idempotencyKey,
      nowMs,
    });

    if (!atomicResult.allowed) {
      res.status(403).json({
        success: false,
        error: 'WEEKLY_LIMIT_REACHED',
        message: effectivePlan === 'free'
          ? 'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'
          : `You’ve reached your ${effectivePlan.toUpperCase()} quota limit of ${weeklyLimit} video starts per rolling 7-day period. Next slot resets in ${atomicResult.resetsInFormatted || 'a few days'}.`,
        weeklyUsed: atomicResult.weeklyUsed,
        weeklyLimit: atomicResult.weeklyLimit,
        weeklyRemaining: 0,
        resetsAtMs: atomicResult.resetsAtMs,
        resetsInFormatted: atomicResult.resetsInFormatted,
        effectivePlan,
        upgradeUrl: '/pricing',
      });
      return;
    }

    res.json({
      success: true,
      alreadyReserved: atomicResult.alreadyReserved,
      reservationId: atomicResult.reservation?.id,
      workflowId: atomicResult.reservation?.workflowId || workflowId,
      weeklyUsed: atomicResult.weeklyUsed,
      weeklyLimit: atomicResult.weeklyLimit,
      weeklyRemaining: atomicResult.weeklyRemaining,
      resetsAtMs: atomicResult.resetsAtMs,
      resetsInFormatted: atomicResult.resetsInFormatted,
      effectivePlan,
      message: atomicResult.alreadyReserved
        ? 'Existing video workflow reservation reused.'
        : 'Video slot reserved successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

// Rollback a video slot reservation if the immediate generation request failed before producing output
app.post('/api/video/release-slot', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const reqAccountId = (req.body?.accountId as string) || (req.headers['x-creatorflow-account-id'] as string) || '';
    const workflowId = String(req.body?.workflowId || '').trim();

    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ success: false, error: 'forbidden_account_mismatch' });
      return;
    }

    if (!workflowId) {
      res.status(400).json({ success: false, error: 'MISSING_WORKFLOW_ID' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = (harness.isHarness && harness.planOverride)
      ? harness.planOverride
      : getEffectivePlan(account);
    const weeklyLimit = getWeeklyLimitForPlan(effectivePlan, account.subscription.customConfig);
    const nowMs = harness.isHarness && harness.customClockMs ? harness.customClockMs : Date.now();

    const releaseRes = await serverStore.releaseVideoSlotAtomic({
      accountId,
      workflowId,
      weeklyLimit,
      nowMs,
    });

    res.json({
      success: true,
      released: releaseRes.released,
      weeklyUsed: releaseRes.weeklyUsed,
      weeklyLimit: releaseRes.weeklyLimit,
      weeklyRemaining: releaseRes.weeklyRemaining,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

app.get('/api/video/quota', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const requestedAccountId = (req.query.accountId as string) || (req.headers['x-creatorflow-account-id'] as string) || '';
    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required to inspect video quota.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({ success: false, error: 'forbidden_account_mismatch', message: 'Cannot check quota for another account.' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = (harness.isHarness && harness.planOverride)
      ? harness.planOverride
      : getEffectivePlan(account);
    const weeklyLimit = getWeeklyLimitForPlan(effectivePlan, account.subscription.customConfig);
    const nowMs = harness.isHarness && harness.customClockMs ? harness.customClockMs : Date.now();

    const quotaDoc = await serverStore.getQuotaDoc(accountId);
    const activeData = serverStore.computeActiveReservations(quotaDoc, nowMs);

    res.json({
      success: true,
      weeklyUsed: activeData.count,
      weeklyLimit,
      weeklyRemaining: Math.max(0, weeklyLimit - activeData.count),
      allowed: activeData.count < weeklyLimit,
      resetsAtMs: activeData.oldestExpiryMs,
      resetsInFormatted: activeData.resetsInFormatted,
      effectivePlan,
      plan: account.plan,
      reservations: activeData.active.map((r) => ({
        id: r.id,
        workflowId: r.workflowId,
        topic: r.topic,
        timestamp: r.timestamp,
        expiresAtMs: r.timestamp + ROLLING_WEEK_MS,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'server_error', message: err.message });
  }
});

// 7. Authoritative Subscription Status & Upgrade Lifecycle
app.get('/api/subscription/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const requestedAccountId = (req.query.accountId as string) || '';
    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required to check subscription status.' });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot check subscription status for another account.' });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = getEffectivePlan(account);
    const usage = await serverStore.getOrCreateUsage(accountId);
    const limits = SERVER_LIMITS[effectivePlan];
    const count = usage.lifetimeGenerations || 0;

    res.json({
      success: true,
      accountId,
      plan: account.plan,
      effectivePlan,
      subscription: account.subscription,
      isCopyAllowed: effectivePlan !== 'free' || count <= 1,
      generationCount: count,
      limits,
      usage: {
        month: usage.month,
        creationKitsUsed: usage.creationKitsUsed,
        creationKitsLimit: limits.creationKits,
        assistantMessagesUsed: usage.assistantMessagesUsed,
        assistantMessagesLimit: limits.assistant,
        projectsCreated: usage.projectsCreated,
        projectsLimit: limits.projects,
        topicsAnalyzed: usage.topicsAnalyzed,
        analyticsRecordsUsed: usage.analyticsRecordsUsed,
        lifetimeGenerations: count,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// Upgrade Request Endpoint (Keep in safe pending state until verified)
app.post('/api/subscription/upgrade-request', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: reqAccountId, targetPlan, isAnnual, notes, customConfig } = req.body || {};
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required to request plan upgrade.' });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot request upgrade for another user account.' });
      return;
    }

    if (!targetPlan || !SERVER_LIMITS[targetPlan as ServerPlanId] || targetPlan === 'free') {
      res.status(400).json({ error: 'invalid_target_plan', message: 'Valid paid plan tier is required.' });
      return;
    }

    const { account, requestRecord } = await withAccountLock(accountId, async () => {
      const { account: acc } = await serverStore.getOrCreateAccount(accountId);
      const nowIso = new Date().toISOString();

      const prices: Record<ServerPlanId, { monthly: number; yearly: number }> = {
        free: { monthly: 0, yearly: 0 },
        pro: { monthly: 249, yearly: 2388 },
        creator: { monthly: 499, yearly: 4788 },
        max: { monthly: 999, yearly: 9588 },
        custom_annual: { monthly: 150, yearly: 1800 },
      };

      const planPricing = prices[targetPlan as ServerPlanId] || { monthly: 249, yearly: 2388 };
      const priceInRupees = isAnnual ? planPricing.yearly : planPricing.monthly;

      acc.subscription = {
        status: 'pending',
        planId: targetPlan as ServerPlanId,
        cadence: isAnnual ? 'yearly' : 'monthly',
        startedAt: nowIso,
        priceInRupees,
        customConfig: targetPlan === 'custom_annual' ? customConfig : undefined,
      };
      await serverStore.saveAccount(acc);

      const rec: ServerUpgradeRequest = {
        id: `upg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        accountId,
        targetPlan: targetPlan as ServerPlanId,
        cadence: isAnnual ? 'yearly' : 'monthly',
        priceInRupees,
        notes: notes || '',
        timestamp: nowIso,
        status: 'pending_verification',
      };
      await serverStore.saveUpgradeRequest(rec);
      return { account: acc, requestRecord: rec };
    });

    res.json({
      success: true,
      status: 'pending',
      effectivePlan: getEffectivePlan(account),
      message: `Your request for ${targetPlan.toUpperCase()} (${isAnnual ? 'Annual' : 'Monthly'}) has been saved. Automatic paid plan activation without verified billing is disabled.`,
      requestId: requestRecord.id,
      subscription: account.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// Subscription Cancellation Endpoint
app.post('/api/subscription/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: reqAccountId } = req.body || {};
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required to cancel subscription.' });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot cancel subscription for another user account.' });
      return;
    }

    const account = await withAccountLock(accountId, async () => {
      const { account: acc } = await serverStore.getOrCreateAccount(accountId);
      const nowIso = new Date().toISOString();
      acc.subscription.status = 'canceled';
      acc.subscription.canceledAt = nowIso;
      acc.plan = 'free';
      acc.subscription.planId = 'free';
      await serverStore.saveAccount(acc);
      return acc;
    });

    res.json({
      success: true,
      status: 'canceled',
      effectivePlan: 'free',
      message: 'Subscription canceled. Switched to Free tier.',
      subscription: account.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// -------------------------------------------------------------
// CASHFREE PAYMENTS (SUBSCRIPTIONS API) SCAFFOLDING
// -------------------------------------------------------------
app.get('/api/subscriptions/cashfree/config', (_req: Request, res: Response): void => {
  res.json({
    configured: isCashfreeConfigured(),
    environment: (process.env.CASHFREE_ENV || 'TEST').trim().toUpperCase(),
    currency: 'INR',
    plans: SERVER_CASHFREE_PLANS,
    billingModes: ['monthly', 'yearly'],
  });
});

app.post('/api/subscriptions/cashfree/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId: reqAccountId, planId, cadence, customerPhone } = req.body || {};
    const harness = resolveTestHarnessContext(req, reqAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required: Sign in to initiate a subscription.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({
        error: 'forbidden_account_mismatch',
        message: 'Cannot initiate subscription for another account.',
      });
      return;
    }

    if (!planId || !SERVER_CASHFREE_PLANS[planId as CashfreePlanId]) {
      res.status(400).json({
        error: 'INVALID_PLAN',
        message: 'Valid paid plan tier (pro, creator, max) is required.',
      });
      return;
    }

    if (cadence !== 'monthly' && cadence !== 'yearly') {
      res.status(400).json({
        error: 'INVALID_CADENCE',
        message: 'Valid billing cadence (monthly or yearly) is required.',
      });
      return;
    }

    if ('amount' in (req.body || {}) || 'price' in (req.body || {})) {
      const clientAmount = Number(req.body.amount || req.body.price);
      const expectedAmount = SERVER_CASHFREE_PLANS[planId as CashfreePlanId][cadence as CashfreeCadence].amount;
      if (clientAmount !== expectedAmount) {
        res.status(400).json({
          error: 'PRICE_TAMPERING_DETECTED',
          message: 'Client-supplied prices are strictly rejected. Subscription pricing is managed server-side.',
        });
        return;
      }
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);

    const result = await initiateCashfreeSubscription({
      accountId,
      customerEmail: account.email,
      customerName: account.displayName,
      customerPhone,
      planId: planId as CashfreePlanId,
      cadence: cadence as CashfreeCadence,
      appUrl: process.env.APP_URL,
      adminDb,
    });

    if (!result.configured) {
      res.status(503).json({
        success: false,
        configured: false,
        error: result.error || 'PAYMENTS_NOT_CONFIGURED',
        message: result.message,
      });
      return;
    }

    if (!result.success) {
      res.status(400).json({
        success: false,
        configured: true,
        error: result.error,
        message: result.message,
      });
      return;
    }

    res.json({
      success: true,
      configured: true,
      subscriptionId: result.subscriptionId,
      authLink: result.authLink,
      status: result.status,
      planId,
      cadence,
      amount: SERVER_CASHFREE_PLANS[planId as CashfreePlanId][cadence as CashfreeCadence].amount,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Cashfree] Subscription initiation failed:', err?.message);
    res.status(500).json({ error: 'server_error', message: err?.message || 'Server error initializing subscription.' });
  }
});

app.get('/api/subscriptions/cashfree/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const requestedAccountId = (req.query.accountId as string) || '';
    const subscriptionId = (req.query.subscriptionId as string) || '';
    const harness = resolveTestHarnessContext(req, requestedAccountId);

    if (!verified && !harness.isHarness) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required to inspect subscription status.',
      });
      return;
    }

    const accountId = verified ? verified.uid : harness.accountId!;
    if (verified && requestedAccountId && requestedAccountId !== verified.uid) {
      res.status(403).json({
        error: 'forbidden_account_mismatch',
        message: 'Cannot view subscription status for another account.',
      });
      return;
    }

    const { account } = await serverStore.getOrCreateAccount(accountId);
    const effectivePlan = getEffectivePlan(account);

    // Look up specific subscription if requested
    let subscriptionRecord = subscriptionId ? inMemorySubscriptions.get(subscriptionId) : undefined;
    if (!subscriptionRecord && subscriptionId && adminDb) {
      const snap = await adminDb.collection('subscriptions').doc(subscriptionId).get().catch(() => null);
      if (snap && snap.exists) {
        subscriptionRecord = snap.data() as any;
      }
    }

    res.json({
      success: true,
      configured: isCashfreeConfigured(),
      accountId,
      accountPlan: account.plan,
      effectivePlan,
      subscription: account.subscription,
      cashfreeRecord: subscriptionRecord || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err?.message });
  }
});

// 4. Cashfree Webhook Handler with Raw-Body Signature Verification and Idempotent Processing
app.post('/api/subscriptions/cashfree/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

    if (!signature || !timestamp) {
      res.status(400).json({
        error: 'MISSING_SIGNATURE_HEADERS',
        message: 'Missing x-webhook-signature or x-webhook-timestamp headers.',
      });
      return;
    }

    // Cryptographic signature check
    const isValid = verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.warn('[Cashfree Webhook] Rejected webhook with invalid signature');
      res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: 'Cashfree webhook signature verification failed.',
      });
      return;
    }

    const body = req.body || {};
    const eventType = body.type || body.event || body.event_type || 'UNKNOWN';
    const eventId =
      body.event_id ||
      body.eventId ||
      (req.headers['x-webhook-event-id'] as string) ||
      `evt_${timestamp}_${body.subscription?.subscription_id || body.data?.subscription_id || 'sub'}`;

    const result = await processCashfreeWebhookEvent({
      eventId,
      eventType,
      eventTime: timestamp,
      data: body.data || body,
      adminDb,
      onPlanActivated: async (targetAccountId, planId, cadence, periodEnd) => {
        await withAccountLock(targetAccountId, async () => {
          const { account: acc } = await serverStore.getOrCreateAccount(targetAccountId);
          acc.plan = planId;
          acc.subscription = {
            status: 'active',
            planId,
            cadence,
            startedAt: new Date().toISOString(),
            currentPeriodEnd: periodEnd,
            priceInRupees: SERVER_CASHFREE_PLANS[planId][cadence].amount,
          };
          await serverStore.saveAccount(acc);
        });
        console.log(`[Cashfree Webhook] Activated ${planId.toUpperCase()} (${cadence}) for account ${targetAccountId}`);
      },
      onPlanReverted: async (targetAccountId, reason) => {
        await withAccountLock(targetAccountId, async () => {
          const { account: acc } = await serverStore.getOrCreateAccount(targetAccountId);
          acc.plan = 'free';
          acc.subscription = {
            status: reason === 'SUBSCRIPTION_EXPIRED' ? 'expired' : 'canceled',
            planId: 'free',
            cadence: 'monthly',
            startedAt: acc.subscription.startedAt || new Date().toISOString(),
            priceInRupees: 0,
          };
          await serverStore.saveAccount(acc);
        });
        console.log(`[Cashfree Webhook] Reverted account ${targetAccountId} to Free tier (${reason})`);
      },
    });

    res.status(200).json({
      success: true,
      duplicate: result.duplicate,
      action: result.actionTaken,
      subscriptionId: result.subscriptionId,
    });
  } catch (err: any) {
    console.error('[Cashfree Webhook] Processing error:', err?.message);
    res.status(500).json({ error: 'server_error', message: err?.message || 'Error processing webhook event.' });
  }
});

// Dev / Test Subscription Controller (Strictly disabled in production; requires local environment + Owner auth or isolated test secret)
app.post('/api/dev/set-subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    if (isProd) {
      res.status(403).json({
        error: 'disabled_in_production',
        message: 'Developer subscription override endpoints are disabled in production.',
      });
      return;
    }

    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    const { accountId, planId, status = 'active', cadence = 'monthly', currentPeriodEnd, customConfig } = req.body || {};

    const harness = resolveTestHarnessContext(req, accountId);

    if (!harness.isHarness) {
      if (!isLocalRequest(req) && process.env.CREATORFLOW_ENABLE_DEV_ENDPOINTS !== 'true') {
        res.status(403).json({
          error: 'forbidden_non_local',
          message: 'Developer endpoints are restricted to local development environments.',
        });
        return;
      }
      if (!verified || !verified.uid) {
        res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required to invoke developer subscription controller.',
        });
        return;
      }
      const callerRole = await resolveServerRole(verified);
      if (callerRole !== 'owner') {
        res.status(403).json({
          error: 'forbidden_owner_required',
          message: 'Owner authorization is required for developer subscription control.',
        });
        return;
      }
    }

    if (!accountId || !planId || !SERVER_LIMITS[planId as ServerPlanId]) {
      res.status(400).json({ error: 'invalid_request', message: 'Valid accountId and planId required.' });
      return;
    }

    const updatedAccount = await withAccountLock(accountId, async () => {
      const { account } = await serverStore.getOrCreateAccount(accountId);
      account.plan = planId as ServerPlanId;
      const nowIso = new Date().toISOString();

      account.subscription = {
        status,
        planId: planId as ServerPlanId,
        cadence,
        startedAt: nowIso,
        currentPeriodEnd,
        customConfig,
      };
      await serverStore.saveAccount(account);
      return account;
    });

    const effectivePlan = getEffectivePlan(updatedAccount);
    res.json({
      success: true,
      accountId,
      plan: updatedAccount.plan,
      effectivePlan,
      subscription: updatedAccount.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 8. Account Plan Update (Strictly requires Verified Auth, Account Ownership, and Owner authorization for paid plans)
app.post('/api/account/plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required: A verified session token is required.',
      });
      return;
    }

    const { accountId: reqAccountId, plan } = req.body || {};
    if (!plan || !SERVER_LIMITS[plan as ServerPlanId]) {
      res.status(400).json({ error: 'invalid_plan_request' });
      return;
    }

    const callerRole = await resolveServerRole(verified);
    const isOwner = callerRole === 'owner';

    const targetId = reqAccountId ? String(reqAccountId) : verified.uid;
    if (targetId !== verified.uid && !isOwner) {
      res.status(403).json({
        error: 'forbidden_account_mismatch',
        message: 'Cannot modify plan for another user account.',
      });
      return;
    }

    // Never allow non-owners (or production self-grants) to set paid plans via this endpoint
    if (plan !== 'free' && (isProd || !isOwner)) {
      res.status(403).json({
        error: 'forbidden_plan_mutation',
        message: 'Direct paid plan activation is disabled. Subscriptions require verified payment or Owner authorization.',
      });
      return;
    }

    const updated = await withAccountLock(targetId, async () => {
      const { account } = await serverStore.getOrCreateAccount(targetId);
      account.plan = plan as ServerPlanId;
      account.subscription.planId = plan as ServerPlanId;
      account.subscription.status = plan === 'free' ? 'canceled' : 'active';
      await serverStore.saveAccount(account);
      return account;
    });

    res.json({
      success: true,
      accountId: targetId,
      plan: updated.plan,
      effectivePlan: getEffectivePlan(updated),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 6. Account Re-Authentication (Requires Verified Firebase Token & Account Ownership)
app.post('/api/auth/reauthenticate', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      res.status(401).json({ error: 'unauthorized', message: 'Verified authentication token required to reauthenticate.' });
      return;
    }

    const { accountId: reqAccountId, deviceInstallId } = req.body || {};
    if (reqAccountId && reqAccountId !== verified.uid) {
      res.status(403).json({ error: 'forbidden_account_mismatch', message: 'Cannot reauthenticate another user account.' });
      return;
    }

    await withAccountLock(verified.uid, async () => {
      const { account } = await serverStore.getOrCreateAccount(verified.uid, {
        email: verified.email,
        displayName: verified.displayName,
        photoURL: verified.photoURL,
      });
      account.isVerified = Boolean(verified.emailVerified ?? true);
      account.lastLoginAt = new Date().toISOString();
      await serverStore.saveAccount(account);
    });

    if (deviceInstallId) {
      const dev = await serverStore.getOrCreateDevice(deviceInstallId);
      dev.riskLevel = 'LOW_RISK';
      dev.riskReasons = [];
      dev.switches = [];
      await serverStore.saveDevice(dev);
    }

    res.json({ success: true, riskLevel: 'LOW_RISK', message: 'Account verified successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// 7. Security Diagnostics (Authenticated Own Account or Authorized Owner)
app.get('/api/device/diagnostics', async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);
  if (!verified || !verified.uid) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required to inspect device and account diagnostics.',
    });
    return;
  }

  const deviceId = (req.query.deviceId as string) || 'cf_dev_unknown';
  const requestedAccountId = (req.query.accountId as string) || verified.uid;
  const isOwner = (await resolveServerRole(verified)) === 'owner';

  if (requestedAccountId !== verified.uid && !isOwner) {
    res.status(403).json({
      error: 'forbidden',
      message: 'You can only inspect diagnostics for your own account.',
    });
    return;
  }

  const device = await serverStore.getOrCreateDevice(deviceId);
  evaluateDeviceRisk(device);

  const { account } = await serverStore.getOrCreateAccount(requestedAccountId);
  const usage = await serverStore.getOrCreateUsage(requestedAccountId);
  const totalServerRecords = await serverStore.getTotalUsageRecordsCount();

  res.json({
    deviceInstallId: device.id,
    firstSeen: new Date(device.firstSeen).toISOString(),
    lastSeen: new Date(device.lastSeen).toISOString(),
    associatedAccountIds: device.accountIds,
    recentSwitchesCount: device.switches.length,
    newAccountCountRecent: device.newAccountTimestamps.length,
    riskLevel: device.riskLevel,
    riskReasons: device.riskReasons,
    activeAccountId: requestedAccountId,
    accountPlan: account.plan,
    accountUsage: usage,
    totalServerRecords,
    serverTimestamp: new Date().toISOString(),
  });
});

// 8. Developer Simulation Tool (Disabled in production; requires local environment + Owner auth or isolated test secret)
app.post('/api/dev/simulate', async (req: Request, res: Response): Promise<void> => {
  if (isProd) {
    res.status(403).json({ error: 'disabled_in_production', message: 'Developer simulation endpoints are disabled in production.' });
    return;
  }

  const { action, accountId, deviceInstallId } = req.body || {};
  const harness = resolveTestHarnessContext(req, accountId);

  if (!harness.isHarness) {
    if (!isLocalRequest(req) && process.env.CREATORFLOW_ENABLE_DEV_ENDPOINTS !== 'true') {
      res.status(403).json({ error: 'forbidden_non_local', message: 'Developer simulation endpoints require a local environment.' });
      return;
    }
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required to invoke developer simulation endpoints.' });
      return;
    }
    const callerRole = await resolveServerRole(verified);
    if (callerRole !== 'owner') {
      res.status(403).json({ error: 'forbidden_owner_required', message: 'Owner authorization is required for developer simulation.' });
      return;
    }
  }

  const deviceId = deviceInstallId || 'cf_dev_unknown';
  const device = await serverStore.getOrCreateDevice(deviceId);

  if (action === 'exhaust_creation_kits' && accountId) {
    const usage = await withAccountLock(accountId, async () => {
      const u = await serverStore.getOrCreateUsage(accountId);
      const { account } = await serverStore.getOrCreateAccount(accountId);
      const limit = SERVER_LIMITS[account.plan].creationKits;
      u.creationKitsUsed = limit;
      await serverStore.saveUsage(accountId, u);
      return u;
    });
    res.json({ success: true, message: `Account ${accountId} usage set to ${usage.creationKitsUsed}`, usage });
    return;
  }

  if (action === 'reset_account_usage' && accountId) {
    const usage = await withAccountLock(accountId, async () => {
      const u = await serverStore.getOrCreateUsage(accountId);
      u.creationKitsUsed = 0;
      u.assistantMessagesUsed = 0;
      await serverStore.saveUsage(accountId, u);
      return u;
    });
    res.json({ success: true, message: `Account ${accountId} usage reset to 0`, usage });
    return;
  }

  if (action === 'simulate_rapid_switching') {
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      device.switches.push(now - i * 1000);
      device.newAccountTimestamps.push(now - i * 1000);
      const simId = `sim_acc_${i}_${Math.random().toString(36).substring(2, 6)}`;
      if (!device.accountIds.includes(simId)) device.accountIds.push(simId);
    }
    evaluateDeviceRisk(device);
    await serverStore.saveDevice(device);
    res.json({ success: true, riskLevel: device.riskLevel, riskReasons: device.riskReasons });
    return;
  }

  if (action === 'reset_device_risk') {
    device.riskLevel = 'LOW_RISK';
    device.riskReasons = [];
    device.switches = [];
    device.newAccountTimestamps = [];
    await serverStore.saveDevice(device);
    res.json({ success: true, riskLevel: 'LOW_RISK' });
    return;
  }

  res.status(400).json({ error: 'unknown_action' });
});

// -------------------------------------------------------------
// 9. OWNER ANALYTICS & PRODUCT INTELLIGENCE ENDPOINTS (SERVER AUTHORIZED)
// -------------------------------------------------------------
async function checkOwnerAuth(req: Request, res: Response): Promise<{ isAuthorized: boolean; requesterAccount: ServerAccount | null }> {
  const token = extractBearerToken(req);
  const verified = await verifyFirebaseIdToken(token);

  if (!verified || !verified.uid) {
    res.status(401).json({
      error: 'unauthorized_no_token',
      message: 'Authentication required: A verified Owner session token is required.',
    });
    return { isAuthorized: false, requesterAccount: null };
  }

  const resolvedRole = await resolveServerRole(verified);
  const { account } = await serverStore.getOrCreateAccount(verified.uid, {
    email: verified.email,
    displayName: verified.displayName,
    photoURL: verified.photoURL,
    resolvedRole,
  });
  account.role = resolvedRole;

  const isOwner = account.role === 'owner' || account.role === 'admin';
  if (!isOwner) {
    res.status(403).json({
      error: 'forbidden_not_owner',
      message: 'Access denied: Owner or Administrator authorization is required.',
    });
    return { isAuthorized: false, requesterAccount: null };
  }

  return { isAuthorized: true, requesterAccount: account };
}

// Ingest product telemetry event (Authenticated Firebase ID token required; accountId derived server-side)
app.post('/api/analytics/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid) {
      res.status(401).json({ error: 'unauthorized', message: 'Verified session required to ingest telemetry events.' });
      return;
    }

    const { eventName, plan, feature, projectId, workflowStep, properties, errorMessage, errorType } = req.body || {};
    if (!eventName) {
      res.status(400).json({ error: 'invalid_event', message: 'eventName is required' });
      return;
    }

    const accountId = verified.uid;
    const { account } = await serverStore.getOrCreateAccount(accountId, {
      email: verified.email,
      displayName: verified.displayName,
      photoURL: verified.photoURL,
    });
    account.lastLoginAt = new Date().toISOString();
    await serverStore.saveAccount(account);

    const event: ServerTelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventName,
      accountId,
      timestamp: new Date().toISOString(),
      plan: plan || account.plan,
      feature,
      projectId,
      workflowStep,
      properties: properties || {},
      errorMessage,
      errorType,
    };

    await serverStore.addTelemetryEvent(event);

    res.json({ success: true, eventId: event.id });
  } catch (err: any) {
    console.error('Error ingesting telemetry event:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// Authorized Owner Analytics Query
app.get('/api/admin/owner-analytics', async (req: Request, res: Response): Promise<void> => {
  const { isAuthorized } = await checkOwnerAuth(req, res);
  if (!isAuthorized) return;

  const range = (req.query.range as string) || '30d';
  const [accounts, persistedEvents, persistedDemand] = await Promise.all([
    serverStore.listAllAccounts(),
    serverStore.listTelemetryEvents(),
    serverStore.getPlanDemandStats(),
  ]);

  const now = Date.now();
  let startTime = 0;
  if (range === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startTime = today.getTime();
  } else if (range === '7d') {
    startTime = now - 7 * 24 * 60 * 60 * 1000;
  } else if (range === '30d') {
    startTime = now - 30 * 24 * 60 * 60 * 1000;
  } else if (range === '90d') {
    startTime = now - 90 * 24 * 60 * 60 * 1000;
  }

  const filteredEvents = startTime > 0
    ? persistedEvents.filter((e) => new Date(e.timestamp).getTime() >= startTime)
    : [...persistedEvents];

  const demandAnalytics = persistedDemand.totalRequests > 0 ? persistedDemand : getDemandAnalytics();

  res.json({
    success: true,
    serverTimestamp: new Date().toISOString(),
    totalServerEvents: persistedEvents.length,
    filteredEventsCount: filteredEvents.length,
    totalAccounts: accounts.length,
    demandAnalytics,
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      plan: a.plan,
      role: a.role,
      createdAt: a.createdAt,
      lastLoginAt: a.lastLoginAt,
      isVerified: a.isVerified,
    })),
    events: filteredEvents,
  });
});

// Reset server events (Authorized Owner only)
app.post('/api/admin/clear-events', async (req: Request, res: Response): Promise<void> => {
  const { isAuthorized } = await checkOwnerAuth(req, res);
  if (!isAuthorized) return;

  await serverStore.clearTelemetryEvents();
  res.json({ success: true, message: 'All server telemetry events cleared' });
});

// -------------------------------------------------------------
// 10. PRE-LAUNCH EARLY ACCESS PAID PLAN REQUESTS (/api/plan-requests)
// -------------------------------------------------------------
const planRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      delivered: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many early-access requests submitted. Please try again in a few minutes.',
    });
  },
});

app.post('/api/plan-requests', planRequestRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp = (req.ip || req.socket.remoteAddress || 'unknown') as string;
    const result = await processPlanRequest(req.body as PlanRequestPayload, clientIp);

    if (result.success) {
      await serverStore.recordPlanDemandStats({
        selectedPlan: req.body?.selectedPlan,
        creatorPlatform: req.body?.creatorPlatform,
        audienceSize: req.body?.audienceSize,
        preferredBilling: req.body?.preferredBilling,
      });
    }

    await serverStore.addTelemetryEvent({
      id: `evt_early_access_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventName: 'early_access_requested',
      accountId: 'visitor',
      timestamp: new Date().toISOString(),
      plan: req.body?.selectedPlan || 'unknown',
      properties: {
        platform: req.body?.creatorPlatform,
        audienceSize: req.body?.audienceSize,
        billingPreference: req.body?.preferredBilling,
        delivered: result.delivered,
      },
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    console.error('Error handling /api/plan-requests:', err);
    res.status(500).json({
      success: false,
      delivered: false,
      error: 'SERVER_ERROR',
      message: 'An internal error occurred while processing your early-access request.',
    });
  }
});

// Protected: Requires Verified Owner/Admin Authorization
app.get('/api/plan-requests/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { isAuthorized } = await checkOwnerAuth(req, res);
    if (!isAuthorized) return;

    const persistedStats = await serverStore.getPlanDemandStats();
    const stats = persistedStats.totalRequests > 0 ? persistedStats : getDemandAnalytics();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// -------------------------------------------------------------
// FULL-STACK VITE INTEGRATION & STATIC SEO ROUTES
// -------------------------------------------------------------
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const publicSitemap = path.resolve(__dirname, 'public', 'sitemap.xml');
  const distSitemap = path.resolve(__dirname, 'dist', 'sitemap.xml');
  const targetPath = fs.existsSync(publicSitemap) ? publicSitemap : distSitemap;

  if (fs.existsSync(targetPath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.sendFile(targetPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

app.get('/robots.txt', (_req: Request, res: Response) => {
  const publicRobots = path.resolve(__dirname, 'public', 'robots.txt');
  const distRobots = path.resolve(__dirname, 'dist', 'robots.txt');
  const targetPath = fs.existsSync(publicRobots) ? publicRobots : distRobots;

  if (fs.existsSync(targetPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(targetPath);
  } else {
    res.status(404).send('Robots.txt not found');
  }
});

const PUBLIC_PAGE_META: Record<string, { title: string; description: string; canonicalPath: string }> = {
  '/pricing': {
    title: 'CreatorFlow AI Pricing | Plans for YouTube Creators',
    description: 'Explore CreatorFlow AI plans and pricing. Start for free with 2 video workflow slots every 7 days or upgrade for expanded creation kits and analytics.',
    canonicalPath: '/pricing',
  },
  '/privacy': {
    title: 'Privacy Policy | CreatorFlow AI',
    description: 'Read how CreatorFlow AI collects, stores, and protects creator profile, workflow, and authentication data.',
    canonicalPath: '/privacy',
  },
  '/terms': {
    title: 'Terms of Service | CreatorFlow AI',
    description: 'Review the CreatorFlow AI Terms of Service governing account usage, quotas, and AI-assisted creator workflows.',
    canonicalPath: '/terms',
  },
  '/refund-policy': {
    title: 'Refund & Cancellation Policy | CreatorFlow AI',
    description: 'Understand CreatorFlow AI subscription cancellation, pre-launch early access, and refund terms.',
    canonicalPath: '/refund-policy',
  },
  '/contact': {
    title: 'Contact & Support | CreatorFlow AI',
    description: 'Reach CreatorFlow AI support for account, privacy, technical, or early-access assistance.',
    canonicalPath: '/contact',
  },
};

app.get(
  ['/pricing', '/pricing/', '/privacy', '/privacy/', '/terms', '/terms/', '/refund-policy', '/refund-policy/', '/contact', '/contact/'],
  (req: Request, res: Response) => {
    const distHtml = path.resolve(__dirname, 'dist', 'index.html');
    const srcHtml = path.resolve(__dirname, 'index.html');
    const targetHtmlPath = fs.existsSync(distHtml) ? distHtml : srcHtml;
    const normalizedPath = req.path.replace(/\/$/, '') || '/';
    const meta = PUBLIC_PAGE_META[normalizedPath];

    if (fs.existsSync(targetHtmlPath) && meta) {
      let html = fs.readFileSync(targetHtmlPath, 'utf8');
      html = html
        .replace(
          '<title>CreatorFlow AI | Content Creation Tools for Creators</title>',
          `<title>${meta.title}</title>`
        )
        .replace(
          'content="Plan YouTube videos, discover content ideas, generate high-retention titles and hooks, and structure production workflows with CreatorFlow AI."',
          `content="${meta.description}"`
        )
        .replace(
          '<link rel="canonical" href="https://creatorflowai.ai.studio/" />',
          `<link rel="canonical" href="https://creatorflowai.ai.studio${meta.canonicalPath}" />`
        )
        .replace(
          '<meta property="og:url" content="https://creatorflowai.ai.studio/" />',
          `<meta property="og:url" content="https://creatorflowai.ai.studio${meta.canonicalPath}" />`
        )
        .replace(
          '<meta property="og:title" content="CreatorFlow AI | Content Creation Tools for Creators" />',
          `<meta property="og:title" content="${meta.title}" />`
        )
        .replace(
          '<meta name="twitter:title" content="CreatorFlow AI | Content Creation Tools for Creators" />',
          `<meta name="twitter:title" content="${meta.title}" />`
        );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      res.status(404).send('Page not found');
    }
  }
);

async function startServer() {
  if (!isProd) {
    // In development mode, mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production mode, serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CreatorFlow server running at http://localhost:${PORT} (Mode: ${isProd ? 'production' : 'development'})`);
  });
}

export { app };

if (process.env.CREATORFLOW_SKIP_SERVER_LISTEN !== 'true') {
  startServer();
}
