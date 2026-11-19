/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side API wrapper for CreatorFlow AI BYOK & Central Intelligence Engine.
 * NEVER handles or caches raw API keys in localStorage/state across sessions —
 * sends user key once to `/api/ai/key` over HTTPS for server-side AES-256-GCM encryption.
 */

import { getAuthIdToken } from './auth';
import {
  getCreatorProfile,
  getSavedIdeas,
  getVideoAnalyticsList,
  getVideoProjects,
} from './creatorStorage';
import { getIsolatedContentPacks } from './accountStorage';
import type {
  AiUsageMetricsRecord,
  ByokKeyMetadata,
  GeminiDiagnosticInfo,
  GeminiErrorCode,
  GeminiFailurePhase,
  GeminiModelId,
  IntelligenceExecutionInput,
  IntelligenceExecutionResponse,
  IntelligenceTaskType,
  SupportedGeminiModel,
} from './intelligence/types';

export type {
  AiUsageMetricsRecord,
  ByokKeyMetadata,
  GeminiDiagnosticInfo,
  GeminiErrorCode,
  GeminiFailurePhase,
  GeminiModelId,
  IntelligenceExecutionInput,
  IntelligenceExecutionResponse,
  IntelligenceTaskType,
  SupportedGeminiModel,
};

export const CLIENT_SUPPORTED_GEMINI_MODELS: SupportedGeminiModel[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Default)',
    tier: 'free_and_paid',
    badge: 'Free & Paid Keys',
    description:
      'Fast, high-intelligence general model balanced for creator strategy, scripts, metadata, and Google Search grounding.',
    recommendedFor: 'Everyday creator workflows, scripts, ideas, and web-grounded research',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    tier: 'free_and_paid',
    badge: 'High Efficiency',
    description:
      'Lightweight, ultra-fast model ideal for rapid title variations, tags, descriptions, and stretching free-tier daily quota.',
    recommendedFor: 'Fast titles, hooks, SEO metadata, and lighter quota usage',
  },
  {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon (Pro Reasoning)',
    tier: 'paid_required',
    badge: 'Paid API Key',
    description:
      'Advanced reasoning model for deeper narrative documentaries, complex channel strategy, and high-nuance content audits.',
    recommendedFor: 'Deep documentary scripts & strategic multi-step synthesis (billing-enabled key)',
  },
  {
    id: 'gemini-4-carbon',
    label: 'Gemini 4 Carbon (Deep Reasoning)',
    tier: 'paid_required',
    badge: 'Paid API Key',
    description:
      'Maximum reasoning depth for demanding analytical synthesis and multi-angle editorial planning.',
    recommendedFor: 'Heavy editorial & multi-source strategy (billing-enabled key)',
  },
];

export class IntelligenceClientError extends Error {
  code: GeminiErrorCode | string;
  status: number;
  requiresByok: boolean;
  isQuotaExceeded: boolean;
  quotaNotice?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requiresByok?: boolean;
    quotaNotice?: string;
  }) {
    super(params.message);
    this.name = 'IntelligenceClientError';
    this.code = params.code;
    this.status = params.status;
    this.requiresByok = Boolean(params.requiresByok);
    this.isQuotaExceeded =
      params.code === 'QUOTA_EXCEEDED' || params.code === 'RATE_LIMIT_EXCEEDED';
    this.quotaNotice = params.quotaNotice;
  }
}

let pendingSettingsAiTabOpen = false;

export function consumePendingByokSettingsTab(): boolean {
  const val = pendingSettingsAiTabOpen;
  pendingSettingsAiTabOpen = false;
  return val;
}

export function navigateToByokSettings(): void {
  pendingSettingsAiTabOpen = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'settings' } }));
    window.dispatchEvent(new CustomEvent('creatorflow_open_byok_settings'));
  }
}

export function emitByokStatusUpdated(metadata?: ByokKeyMetadata | null): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('creatorflow_byok_updated', { detail: { metadata: metadata || null } })
    );
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeFetchJson(
  url: string,
  init: RequestInit,
  fallbackErrorMsg: string
): Promise<{ res: Response; json: any }> {
  try {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } catch {
    throw new IntelligenceClientError({
      code: 'NETWORK_ERROR',
      message: `${fallbackErrorMsg} Unable to reach the CreatorFlow server right now—please wait a moment and try again.`,
      status: 503,
    });
  }
}

export async function fetchByokStatus(): Promise<{
  metadata: ByokKeyMetadata;
  models: SupportedGeminiModel[];
  usage: AiUsageMetricsRecord;
}> {
  const { res, json } = await safeFetchJson(
    '/api/ai/key',
    {
      method: 'GET',
      headers: await authHeaders(),
    },
    'Unable to load Gemini BYOK configuration.'
  );
  if (!res.ok || !json.metadata) {
    throw new IntelligenceClientError({
      code: json.error || 'BYOK_STATUS_ERROR',
      message: json.message || 'Unable to load Gemini BYOK configuration.',
      status: res.status,
      requiresByok: res.status === 428 || json.requiresByok,
      quotaNotice: json.quotaNotice,
    });
  }
  return {
    metadata: json.metadata,
    models: json.models || CLIENT_SUPPORTED_GEMINI_MODELS,
    usage: json.usage,
  };
}

export async function saveByokKey(params: {
  apiKey: string;
  selectedModel?: GeminiModelId;
  verifyConnection?: boolean;
}): Promise<{
  metadata: ByokKeyMetadata;
  testResult: {
    ok: boolean;
    status: string;
    code?: string;
    message: string;
    latencyMs: number;
    diagnostic?: GeminiDiagnosticInfo | null;
  } | null;
}> {
  const { res, json } = await safeFetchJson(
    '/api/ai/key',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    },
    'Could not validate and save Gemini API key.'
  );
  if (!res.ok) {
    throw new IntelligenceClientError({
      code: json.error || 'BYOK_SAVE_FAILED',
      message: json.message || 'Could not validate and save Gemini API key.',
      status: res.status,
      requiresByok: json.error === 'INVALID_API_KEY',
      quotaNotice: json.quotaNotice,
    });
  }
  emitByokStatusUpdated(json.metadata);
  return {
    metadata: json.metadata,
    testResult: json.testResult || null,
  };
}

export async function testByokKey(params?: {
  apiKey?: string;
  modelId?: GeminiModelId;
}): Promise<{
  ok: boolean;
  status: string;
  code?: string;
  message: string;
  model: GeminiModelId;
  latencyMs: number;
  echoMatched?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  diagnostic?: GeminiDiagnosticInfo | null;
  metadata?: ByokKeyMetadata;
}> {
  const { res, json } = await safeFetchJson(
    '/api/ai/key/test',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params || {}),
    },
    'Connection test failed.'
  );
  if (json.metadata) {
    emitByokStatusUpdated(json.metadata);
  }
  return {
    ok: Boolean(json.ok && res.ok),
    status: json.status || (res.ok ? 'connected' : 'error'),
    code: json.code || json.error,
    message: json.message || 'Connection test failed.',
    model: json.model || 'gemini-4-hydrogen',
    latencyMs: Number(json.latencyMs || 0),
    echoMatched: typeof json.echoMatched === 'boolean' ? json.echoMatched : undefined,
    inputTokens: typeof json.inputTokens === 'number' ? json.inputTokens : undefined,
    outputTokens: typeof json.outputTokens === 'number' ? json.outputTokens : undefined,
    diagnostic: json.diagnostic || null,
    metadata: json.metadata,
  };
}

export async function updateByokModel(selectedModel: GeminiModelId): Promise<ByokKeyMetadata> {
  const { res, json } = await safeFetchJson(
    '/api/ai/key/model',
    {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ selectedModel }),
    },
    'Unable to update selected Gemini model.'
  );
  if (!res.ok) {
    throw new IntelligenceClientError({
      code: json.error || 'MODEL_UPDATE_FAILED',
      message: json.message || 'Unable to update selected Gemini model.',
      status: res.status,
      requiresByok: res.status === 428 || json.requiresByok,
    });
  }
  emitByokStatusUpdated(json.metadata);
  return json.metadata;
}

export async function deleteByokKey(): Promise<ByokKeyMetadata> {
  const { res, json } = await safeFetchJson(
    '/api/ai/key',
    {
      method: 'DELETE',
      headers: await authHeaders(),
    },
    'Failed to delete your stored Gemini API key.'
  );
  if (!res.ok) {
    throw new IntelligenceClientError({
      code: json.error || 'BYOK_DELETE_FAILED',
      message: json.message || 'Failed to delete your stored Gemini API key.',
      status: res.status,
    });
  }
  emitByokStatusUpdated(json.metadata);
  return json.metadata;
}

export async function executeIntelligence<T = any>(params: {
  task: IntelligenceTaskType;
  input: IntelligenceExecutionInput;
  feature?: string;
  preferredModel?: GeminiModelId;
  bypassCache?: boolean;
  enableWebResearch?: boolean;
  creatorProfileOverride?: Record<string, any>;
}): Promise<IntelligenceExecutionResponse<T>> {
  const creatorProfile = params.creatorProfileOverride || getCreatorProfile();
  const recentProjects = getVideoProjects().slice(0, 10).map((p) => ({
    id: p.id,
    topic: p.topic,
    selectedTitle: p.selectedTitle,
    format: p.format,
    status: p.status,
    createdAt: p.createdAt,
  }));
  const recentIdeas = (getSavedIdeas() || []).slice(0, 12).map((i) => ({
    id: i.id,
    title: i.title,
    format: i.format,
    status: i.status,
  }));
  const recentPacks = getIsolatedContentPacks().slice(0, 8).map((pk) => ({
    id: pk.id,
    topic: pk.topic,
    titles: pk.titles?.slice(0, 3),
    createdAt: pk.createdAt,
  }));
  const analyticsList = getVideoAnalyticsList().slice(0, 20);

  const { res, json } = await safeFetchJson(
    '/api/intelligence/execute',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        task: params.task,
        feature: params.feature,
        input: params.input,
        creatorProfile,
        recentProjects,
        recentIdeas,
        recentPacks,
        analyticsList,
        preferredModel: params.preferredModel,
        bypassCache: Boolean(params.bypassCache),
        enableWebResearch: params.enableWebResearch,
      }),
    },
    'AI execution failed.'
  );
  if (!res.ok || !json.success) {
    throw new IntelligenceClientError({
      code: json.error || 'GENERATION_FAILED',
      message:
        json.message || 'AI execution failed. Check your Gemini API key status in Settings.',
      status: res.status,
      requiresByok:
        res.status === 428 ||
        json.requiresByok ||
        json.error === 'MISSING_API_KEY' ||
        json.error === 'INVALID_API_KEY',
      quotaNotice: json.quotaNotice,
    });
  }

  return json as IntelligenceExecutionResponse<T>;
}
