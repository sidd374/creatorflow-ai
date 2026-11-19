/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side BYOK Gemini Provider built on @google/genai.
 * Features:
 * - Separate connection/header vs response-generation timeouts via AbortController & httpOptions.fetch
 * - Disables hidden @google/genai 5-attempt/60s internal retries so timeouts & HTTP errors surface accurately
 * - Safe, secret-redacted diagnostic telemetry (timestamps, elapsedMs, model, httpStatus, googleErrorCode, googleRequestId, failurePhase)
 * - Strictly distinguishes 400 (BAD_REQUEST), 401/403 (INVALID_API_KEY), 404 (INVALID_MODEL), 429 (QUOTA/RATE_LIMIT), 500/503 (NETWORK_ERROR), and client TIMEOUT
 * - Bounded exponential backoff + jitter retries ONLY for transient 500/502/503/network errors
 * - Isolated minimal text-only connection test ("Reply with exactly: CREATORFLOW_CONNECTION_OK") with zero fake-success fallback
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  GeminiDiagnosticInfo,
  GeminiErrorCode,
  GeminiFailurePhase,
  GeminiModelId,
  WebResearchSource,
} from './types.ts';
import { DEFAULT_GEMINI_MODEL, isGemini4Model, isValidGeminiModel } from './models.ts';

export const CONNECTION_TEST_PROMPT = 'Reply with exactly: CREATORFLOW_CONNECTION_OK';
export const CONNECTION_TEST_TOKEN = 'CREATORFLOW_CONNECTION_OK';

export class GeminiProviderError extends Error {
  code: GeminiErrorCode;
  status: number;
  retryable: boolean;
  diagnostic?: GeminiDiagnosticInfo;

  constructor(
    code: GeminiErrorCode,
    message: string,
    status = 500,
    retryable = false,
    diagnostic?: GeminiDiagnosticInfo
  ) {
    super(message);
    this.name = 'GeminiProviderError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.diagnostic = diagnostic;
  }
}

export interface GeminiCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  sources: WebResearchSource[];
  diagnostic?: GeminiDiagnosticInfo;
}

export interface GeminiTransport {
  generate(params: {
    apiKey: string;
    model: GeminiModelId;
    contents: unknown;
    systemInstruction?: string;
    responseSchema?: unknown;
    responseMimeType?: string;
    useGoogleSearch?: boolean;
    maxOutputTokens?: number;
    connectTimeoutMs?: number;
    timeoutMs: number;
  }): Promise<GeminiCallResult>;
}

let customTestTransport: GeminiTransport | null = null;
let customFetchForTests: typeof fetch | null = null;

export function setGeminiTransportForTests(transport: GeminiTransport | null): void {
  customTestTransport = transport;
}

export function setGeminiFetchForTests(fetchFn: typeof fetch | null): void {
  customFetchForTests = fetchFn;
}

export function sanitizeDiagnosticMessage(raw: unknown): string {
  const str = String(raw || '').trim();
  if (!str) return '';
  return str
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/(x-goog-api-key\s*[:=]\s*)[^\s"',;]+/gi, '$1[REDACTED]')
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"',;]+/gi, '$1[REDACTED]')
    .replace(/\bAIza[0-9A-Za-z\-_]{12,}\b/g, '[REDACTED_KEY]');
}

interface RequestDiagnosticTracker {
  requestStartedAt: string;
  startedMs: number;
  model: GeminiModelId;
  phase: GeminiFailurePhase;
  httpStatus: number | null;
  googleErrorCode: string | null;
  googleRequestId: string | null;
  timedOut: boolean;
  timeoutPhase: GeminiFailurePhase | null;
}

function finalizeDiagnostic(
  tracker: RequestDiagnosticTracker,
  safeErrorMessage: string | null
): GeminiDiagnosticInfo {
  const completedMs = Date.now();
  return {
    requestStartedAt: tracker.requestStartedAt,
    requestCompletedAt: new Date(completedMs).toISOString(),
    elapsedMs: Math.max(0, completedMs - tracker.startedMs),
    model: tracker.model,
    httpStatus: tracker.httpStatus,
    googleErrorCode: tracker.googleErrorCode,
    googleRequestId: tracker.googleRequestId,
    failurePhase: tracker.timedOut && tracker.timeoutPhase ? tracker.timeoutPhase : tracker.phase,
    safeErrorMessage: safeErrorMessage ? sanitizeDiagnosticMessage(safeErrorMessage) : null,
  };
}

function createDiagnosticFetch(params: {
  tracker: RequestDiagnosticTracker;
  connectTimeoutMs: number;
  responseTimeoutMs: number;
  outerController: AbortController;
}): { fetchFn: typeof fetch; cleanup: () => void } {
  const baseFetch = customFetchForTests || globalThis.fetch;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;
  let responseTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (responseTimer) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }
  };

  const fetchFn: typeof fetch = async (input, init) => {
    const { tracker, connectTimeoutMs, responseTimeoutMs, outerController } = params;
    tracker.phase = 'connection';

    const perCallController = new AbortController();
    const abortPerCall = () => {
      try {
        perCallController.abort();
      } catch {
        // ignore
      }
    };

    if (outerController.signal.aborted) {
      abortPerCall();
    } else {
      outerController.signal.addEventListener('abort', abortPerCall, { once: true });
    }
    if (init?.signal) {
      if (init.signal.aborted) {
        abortPerCall();
      } else {
        init.signal.addEventListener('abort', abortPerCall, { once: true });
      }
    }

    connectTimer = setTimeout(() => {
      tracker.timedOut = true;
      tracker.timeoutPhase = 'connection';
      abortPerCall();
      try {
        outerController.abort();
      } catch {
        // ignore
      }
    }, connectTimeoutMs);

    try {
      const response = await baseFetch(input, {
        ...init,
        signal: perCallController.signal,
      });

      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }

      tracker.httpStatus = response.status;
      tracker.googleRequestId =
        response.headers?.get('x-goog-request-id') ||
        response.headers?.get('x-request-id') ||
        response.headers?.get('x-guploader-uploadid') ||
        null;
      tracker.phase = response.ok ? 'response_generation' : 'response_headers';

      responseTimer = setTimeout(() => {
        tracker.timedOut = true;
        tracker.timeoutPhase = tracker.phase;
        abortPerCall();
        try {
          outerController.abort();
        } catch {
          // ignore
        }
      }, responseTimeoutMs);

      return response;
    } catch (err) {
      cleanup();
      throw err;
    }
  };

  return { fetchFn, cleanup };
}

function parseStructuredErrorDetails(err: any): {
  httpStatus: number | null;
  message: string;
  googleErrorCode: string | null;
  causeCode: string;
  googleRequestId: string | null;
} {
  let httpStatus: number | null =
    typeof err?.status === 'number' && err.status > 0
      ? err.status
      : typeof err?.statusCode === 'number' && err.statusCode > 0
      ? err.statusCode
      : typeof err?.error?.code === 'number' && err.error.code > 0
      ? err.error.code
      : null;

  let message = String(err?.message || err?.error?.message || 'Unknown Gemini provider error');
  let googleErrorCode: string | null =
    typeof err?.error?.status === 'string' && err.error.status
      ? err.error.status
      : typeof err?.apiStatus === 'string' && err.apiStatus
      ? err.apiStatus
      : null;
  const causeCode = String(err?.cause?.code || err?.code || '');
  const googleRequestId: string | null =
    typeof err?.googleRequestId === 'string' && err.googleRequestId ? err.googleRequestId : null;

  const trimmed = message.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart));
      if (parsed?.error) {
        if (!httpStatus && parsed.error.code) httpStatus = Number(parsed.error.code);
        if (parsed.error.message) message = String(parsed.error.message);
        if (parsed.error.status) googleErrorCode = String(parsed.error.status);
      }
    } catch {
      // keep raw message
    }
  }

  return {
    httpStatus,
    message: sanitizeDiagnosticMessage(message),
    googleErrorCode,
    causeCode,
    googleRequestId,
  };
}

function classifyGeminiError(
  err: any,
  tracker?: RequestDiagnosticTracker,
  fallbackModel: GeminiModelId = DEFAULT_GEMINI_MODEL
): GeminiProviderError {
  if (err instanceof GeminiProviderError) {
    if (!err.diagnostic && tracker) {
      err.diagnostic = finalizeDiagnostic(tracker, err.message);
    }
    return err;
  }

  const parsed = parseStructuredErrorDetails(err);
  const effectiveStatus = tracker?.httpStatus ?? parsed.httpStatus;
  if (tracker) {
    if (effectiveStatus && !tracker.httpStatus) tracker.httpStatus = effectiveStatus;
    if (parsed.googleErrorCode && !tracker.googleErrorCode) {
      tracker.googleErrorCode = parsed.googleErrorCode;
    }
    if (parsed.googleRequestId && !tracker.googleRequestId) {
      tracker.googleRequestId = parsed.googleRequestId;
    }
  }

  const rawMessage = parsed.message;
  const causeMsg = sanitizeDiagnosticMessage(err?.cause?.message || '');
  const msg = `${rawMessage} ${parsed.googleErrorCode || ''} ${parsed.causeCode} ${causeMsg}`.toLowerCase();

  const buildDiag = (msgForDiag: string): GeminiDiagnosticInfo =>
    tracker
      ? finalizeDiagnostic(tracker, msgForDiag)
      : {
          requestStartedAt: new Date().toISOString(),
          requestCompletedAt: new Date().toISOString(),
          elapsedMs: 0,
          model: fallbackModel,
          httpStatus: effectiveStatus,
          googleErrorCode: parsed.googleErrorCode,
          googleRequestId: parsed.googleRequestId,
          failurePhase: err?.failurePhase || (effectiveStatus ? 'response_headers' : 'connection'),
          safeErrorMessage: sanitizeDiagnosticMessage(msgForDiag),
        };

  // 1. Client timeout or AbortSignal expiration (distinct from HTTP provider responses)
  const isClientTimeout =
    tracker?.timedOut === true ||
    err?.code === 'TIMEOUT' ||
    err?.name === 'AbortError' ||
    parsed.causeCode === 'ETIMEDOUT' ||
    parsed.causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    parsed.causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
    parsed.causeCode === 'UND_ERR_BODY_TIMEOUT' ||
    effectiveStatus === 504 ||
    msg.includes('timed out') ||
    msg.includes('deadline exceeded') ||
    msg.includes('aborted');

  if (isClientTimeout) {
    const phase = tracker?.timeoutPhase || tracker?.phase || 'connection';
    const phaseHint =
      phase === 'connection'
        ? 'while connecting or waiting for response headers from Google Gemini'
        : phase === 'response_headers'
        ? 'while reading error headers from Google Gemini'
        : 'while waiting for the model to finish generating a response';
    const safeMsg = `Gemini request timed out ${phaseHint}. Please try again.`;
    return new GeminiProviderError('TIMEOUT', safeMsg, 504, false, buildDiag(safeMsg));
  }

  // 2. Authentication / Permission (401, 403, or Google 400 API_KEY_INVALID / expired)
  const isInvalidKey =
    effectiveStatus === 401 ||
    effectiveStatus === 403 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('api key expired') ||
    msg.includes('api_key_expired') ||
    msg.includes('invalid api key') ||
    msg.includes('permission denied') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated');

  if (isInvalidKey) {
    const safeMsg =
      'Your Gemini API key was rejected as invalid, expired, or unauthorized by Google Gemini. Verify your key in Google AI Studio and update it in Settings -> Gemini API.';
    return new GeminiProviderError(
      'INVALID_API_KEY',
      safeMsg,
      effectiveStatus === 403 ? 403 : 401,
      false,
      buildDiag(safeMsg)
    );
  }

  // 3. Model or endpoint not found (404)
  const isModelNotFound =
    effectiveStatus === 404 ||
    parsed.googleErrorCode === 'NOT_FOUND' ||
    (msg.includes('model') &&
      (msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('not supported for generatecontent')));

  if (isModelNotFound) {
    const safeMsg = `The requested Gemini model (${fallbackModel}) was not found or is unavailable for this API key (HTTP 404). Try Gemini 4 Hydrogen or Gemini 3.1 Flash Lite.`;
    return new GeminiProviderError('INVALID_MODEL', safeMsg, 404, false, buildDiag(safeMsg));
  }

  // 4. Rate limit or Quota exceeded (429) — NEVER retry on quota/rate limits
  if (
    effectiveStatus === 429 &&
    (msg.includes('quota') ||
      msg.includes('resource_exhausted') ||
      msg.includes('billing') ||
      msg.includes('exceeded your current quota'))
  ) {
    const safeMsg =
      'Your Gemini API key quota has been exceeded (HTTP 429). Remember: keys under the same Google Cloud project share project-level quotas. Try switching to Gemini 3.1 Flash Lite or check your billing/quota in Google AI Studio.';
    return new GeminiProviderError('QUOTA_EXCEEDED', safeMsg, 429, false, buildDiag(safeMsg));
  }

  if (
    effectiveStatus === 429 ||
    parsed.googleErrorCode === 'RESOURCE_EXHAUSTED' ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    const safeMsg =
      'Your Gemini API key hit a temporary rate limit (HTTP 429). Wait briefly and try again (keys in the same Google Cloud project share rate limits).';
    return new GeminiProviderError('RATE_LIMIT_EXCEEDED', safeMsg, 429, false, buildDiag(safeMsg));
  }

  // 5. Invalid request or unsupported configuration (400, non-auth)
  if (effectiveStatus === 400 || parsed.googleErrorCode === 'INVALID_ARGUMENT') {
    const safeMsg = `Gemini rejected the request configuration (HTTP 400): ${rawMessage || 'Unsupported parameter or invalid request.'}`;
    return new GeminiProviderError('BAD_REQUEST', safeMsg, 400, false, buildDiag(safeMsg));
  }

  // 6. Temporary provider-side failure (500, 502, 503) or transient transport error
  if (
    effectiveStatus === 500 ||
    effectiveStatus === 502 ||
    effectiveStatus === 503 ||
    parsed.googleErrorCode === 'UNAVAILABLE' ||
    parsed.googleErrorCode === 'INTERNAL' ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('eai_again') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up')
  ) {
    const codeStatus =
      effectiveStatus === 500 || effectiveStatus === 502 || effectiveStatus === 503
        ? effectiveStatus
        : 503;
    const safeMsg = `Gemini provider temporarily returned an error or network failure (HTTP ${codeStatus}). Please try again in a moment.`;
    return new GeminiProviderError('NETWORK_ERROR', safeMsg, codeStatus, true, buildDiag(safeMsg));
  }

  const fallbackStatus =
    effectiveStatus && effectiveStatus >= 400 && effectiveStatus < 600 ? effectiveStatus : 500;
  const fallbackMsg = rawMessage || 'Failed to generate content via your Gemini API key.';
  return new GeminiProviderError(
    'GENERATION_FAILED',
    fallbackMsg,
    fallbackStatus,
    false,
    buildDiag(fallbackMsg)
  );
}

function logSafeProviderDiagnostic(context: string, diagnostic: GeminiDiagnosticInfo): void {
  console.warn(`[GeminiProvider] ${context}`, {
    model: diagnostic.model,
    elapsedMs: diagnostic.elapsedMs,
    httpStatus: diagnostic.httpStatus,
    googleErrorCode: diagnostic.googleErrorCode,
    googleRequestId: diagnostic.googleRequestId,
    failurePhase: diagnostic.failurePhase,
    message: sanitizeDiagnosticMessage(diagnostic.safeErrorMessage || ''),
  });
}

function extractGroundingSources(response: any): WebResearchSource[] {
  const retrievedAt = new Date().toISOString();
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  if (!Array.isArray(chunks)) return [];

  const seenUrls = new Set<string>();
  const sources: WebResearchSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (typeof uri === 'string' && /^https?:\/\//i.test(uri) && !seenUrls.has(uri)) {
      seenUrls.add(uri);
      sources.push({
        title: typeof title === 'string' && title.trim() ? title.trim() : uri,
        url: uri,
        retrievedAt,
        sourceType: 'google_search_grounding',
      });
    }
  }
  return sources;
}

async function verifyModelAvailabilityLive(params: {
  apiKey: string;
  model: GeminiModelId;
  connectTimeoutMs?: number;
  responseTimeoutMs?: number;
}): Promise<{ ok: true; diagnostic: GeminiDiagnosticInfo }> {
  const tracker: RequestDiagnosticTracker = {
    requestStartedAt: new Date().toISOString(),
    startedMs: Date.now(),
    model: params.model,
    phase: 'connection',
    httpStatus: null,
    googleErrorCode: null,
    googleRequestId: null,
    timedOut: false,
    timeoutPhase: null,
  };

  const controller = new AbortController();
  const { fetchFn, cleanup } = createDiagnosticFetch({
    tracker,
    connectTimeoutMs: params.connectTimeoutMs || 6000,
    responseTimeoutMs: params.responseTimeoutMs || 8000,
    outerController: controller,
  });

  const ai = new GoogleGenAI({
    apiKey: params.apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
      retryOptions: { attempts: 1 },
      fetch: fetchFn,
    },
  });

  try {
    await ai.models.get({
      model: params.model,
      config: { abortSignal: controller.signal },
    });
    tracker.phase = 'completed';
    return {
      ok: true,
      diagnostic: finalizeDiagnostic(tracker, null),
    };
  } catch (err: any) {
    const classified = classifyGeminiError(err, tracker, params.model);
    if (classified.diagnostic) {
      logSafeProviderDiagnostic('models.get failed', classified.diagnostic);
    }
    throw classified;
  } finally {
    cleanup();
  }
}

async function callLiveSdk(params: {
  apiKey: string;
  model: GeminiModelId;
  contents: unknown;
  systemInstruction?: string;
  responseSchema?: unknown;
  responseMimeType?: string;
  useGoogleSearch?: boolean;
  thinkingLevel?: ThinkingLevel;
  maxOutputTokens?: number;
  connectTimeoutMs?: number;
  timeoutMs: number;
}): Promise<GeminiCallResult> {
  const tracker: RequestDiagnosticTracker = {
    requestStartedAt: new Date().toISOString(),
    startedMs: Date.now(),
    model: params.model,
    phase: 'connection',
    httpStatus: null,
    googleErrorCode: null,
    googleRequestId: null,
    timedOut: false,
    timeoutPhase: null,
  };

  const controller = new AbortController();
  const connectTimeoutMs = params.connectTimeoutMs || Math.min(7000, params.timeoutMs);
  const responseTimeoutMs = params.timeoutMs;

  const { fetchFn, cleanup } = createDiagnosticFetch({
    tracker,
    connectTimeoutMs,
    responseTimeoutMs,
    outerController: controller,
  });

  const ai = new GoogleGenAI({
    apiKey: params.apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      // Disable hidden SDK 5-retry/60s backoff so CreatorFlow controls retries & exposes accurate errors
      retryOptions: { attempts: 1 },
      fetch: fetchFn,
    },
  });

  const config: Record<string, unknown> = {
    abortSignal: controller.signal,
  };
  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }
  if (typeof params.maxOutputTokens === 'number' && params.maxOutputTokens > 0) {
    config.maxOutputTokens = params.maxOutputTokens;
  }
  if (params.useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
  } else if (params.responseMimeType) {
    config.responseMimeType = params.responseMimeType;
    if (params.responseSchema) {
      config.responseSchema = params.responseSchema;
    }
  }

  // Strictly obey Gemini 4 configuration constraint: do not pass temperature, topP, topK, candidateCount, or thinkingBudget.
  // Use ThinkingLevel enum when specified for Gemini 4 models (never MINIMAL on Gemini 4, never XHIGH outside hydrogen).
  if (isGemini4Model(params.model) && params.thinkingLevel && params.thinkingLevel !== ThinkingLevel.MINIMAL) {
    if (params.thinkingLevel !== ThinkingLevel.XHIGH || params.model === 'gemini-4-hydrogen') {
      config.thinkingConfig = { thinkingLevel: params.thinkingLevel };
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: params.model,
      contents: params.contents as any,
      config: config as any,
    });

    const text = (response?.text || '').trim();
    if (!text) {
      tracker.phase = 'response_generation';
      throw new GeminiProviderError(
        'EMPTY_RESPONSE',
        'Gemini returned an empty response for this request. Please retry.',
        502,
        false,
        finalizeDiagnostic(tracker, 'Empty response body from Gemini.')
      );
    }

    tracker.phase = 'completed';
    const usageMeta = (response as any)?.usageMetadata || {};
    return {
      text,
      inputTokens: Number(usageMeta.promptTokenCount || 0),
      outputTokens: Number(usageMeta.candidatesTokenCount || 0),
      sources: extractGroundingSources(response),
      diagnostic: finalizeDiagnostic(tracker, null),
    };
  } catch (err: any) {
    const classified = classifyGeminiError(err, tracker, params.model);
    if (classified.diagnostic) {
      logSafeProviderDiagnostic('generateContent failed', classified.diagnostic);
    }
    throw classified;
  } finally {
    cleanup();
  }
}

function computeExponentialBackoffWithJitterMs(attempt: number, baseMs = 350, maxMs = 2400): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.max(80, Math.floor(exp * 0.4)));
  return Math.min(maxMs, exp + jitter);
}

async function executeWithBoundedRetry(params: {
  apiKey: string;
  model: GeminiModelId;
  contents: unknown;
  systemInstruction?: string;
  responseSchema?: unknown;
  responseMimeType?: string;
  useGoogleSearch?: boolean;
  thinkingLevel?: ThinkingLevel;
  maxOutputTokens?: number;
  connectTimeoutMs?: number;
  timeoutMs?: number;
  maxTransientRetries?: number;
}): Promise<GeminiCallResult> {
  if (!params.apiKey || !params.apiKey.trim()) {
    throw new GeminiProviderError(
      'MISSING_API_KEY',
      'Connect your Gemini API key in Settings -> Gemini API to run AI generation.',
      428,
      false
    );
  }

  // Strictly respect selected model — NEVER silently switch from free-tier models to paid models
  const model: GeminiModelId = isValidGeminiModel(params.model)
    ? params.model
    : DEFAULT_GEMINI_MODEL;
  const timeoutMs = params.timeoutMs || 28000;
  const connectTimeoutMs = params.connectTimeoutMs || Math.min(7000, timeoutMs);
  const maxRetries = typeof params.maxTransientRetries === 'number' ? params.maxTransientRetries : 1;

  let lastError: GeminiProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStart = Date.now();
    try {
      const transport = customTestTransport;
      const callParams = {
        apiKey: params.apiKey,
        model,
        contents: params.contents,
        systemInstruction: params.systemInstruction,
        responseSchema: params.responseSchema,
        responseMimeType: params.responseMimeType,
        useGoogleSearch: params.useGoogleSearch,
        thinkingLevel: params.thinkingLevel,
        maxOutputTokens: params.maxOutputTokens,
        connectTimeoutMs,
        timeoutMs,
      };
      if (transport) {
        const res = await transport.generate(callParams);
        if (!res.diagnostic) {
          res.diagnostic = {
            requestStartedAt: new Date(attemptStart).toISOString(),
            requestCompletedAt: new Date().toISOString(),
            elapsedMs: Math.max(0, Date.now() - attemptStart),
            model,
            httpStatus: 200,
            googleErrorCode: null,
            googleRequestId: null,
            failurePhase: 'completed',
            safeErrorMessage: null,
          };
        }
        return res;
      }
      return await callLiveSdk(callParams);
    } catch (rawErr: any) {
      const classified = classifyGeminiError(rawErr, undefined, model);
      if (!classified.diagnostic) {
        classified.diagnostic = {
          requestStartedAt: new Date(attemptStart).toISOString(),
          requestCompletedAt: new Date().toISOString(),
          elapsedMs: Math.max(0, Date.now() - attemptStart),
          model,
          httpStatus: classified.status,
          googleErrorCode: classified.code,
          googleRequestId: null,
          failurePhase: classified.code === 'TIMEOUT' ? 'connection' : 'response_headers',
          safeErrorMessage: classified.message,
        };
      }
      lastError = classified;
      if (!classified.retryable || attempt >= maxRetries) {
        throw classified;
      }
      await new Promise((r) => setTimeout(r, computeExponentialBackoffWithJitterMs(attempt)));
    }
  }

  throw (
    lastError ||
    new GeminiProviderError('GENERATION_FAILED', 'Gemini generation failed unexpectedly.', 500, false)
  );
}

export async function generateTextWithByok(params: {
  apiKey: string;
  model: GeminiModelId;
  contents: unknown;
  systemInstruction?: string;
  thinkingLevel?: ThinkingLevel;
  maxOutputTokens?: number;
  connectTimeoutMs?: number;
  timeoutMs?: number;
  maxTransientRetries?: number;
}): Promise<GeminiCallResult> {
  return executeWithBoundedRetry({
    ...params,
    connectTimeoutMs: params.connectTimeoutMs || 7000,
    timeoutMs: params.timeoutMs || 26000,
    maxTransientRetries: typeof params.maxTransientRetries === 'number' ? params.maxTransientRetries : 1,
  });
}

export async function generateStructuredJsonWithByok<T = any>(params: {
  apiKey: string;
  model: GeminiModelId;
  prompt: string;
  systemInstruction?: string;
  responseSchema?: unknown;
  thinkingLevel?: ThinkingLevel;
  maxOutputTokens?: number;
  connectTimeoutMs?: number;
  timeoutMs?: number;
  maxTransientRetries?: number;
}): Promise<{
  data: T;
  rawText: string;
  inputTokens: number;
  outputTokens: number;
  diagnostic?: GeminiDiagnosticInfo;
}> {
  const res = await executeWithBoundedRetry({
    apiKey: params.apiKey,
    model: params.model,
    contents: params.prompt,
    systemInstruction: params.systemInstruction,
    responseSchema: params.responseSchema,
    responseMimeType: 'application/json',
    thinkingLevel: params.thinkingLevel,
    maxOutputTokens: params.maxOutputTokens,
    connectTimeoutMs: params.connectTimeoutMs || 7000,
    timeoutMs: params.timeoutMs || 28000,
    maxTransientRetries: typeof params.maxTransientRetries === 'number' ? params.maxTransientRetries : 1,
  });

  const cleanedText = res.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanedText) as T;
    return {
      data: parsed,
      rawText: cleanedText,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      diagnostic: res.diagnostic,
    };
  } catch {
    throw new GeminiProviderError(
      'EMPTY_RESPONSE',
      'Gemini returned malformed JSON that could not be parsed cleanly.',
      502,
      false,
      res.diagnostic
    );
  }
}

export async function researchWithGoogleSearchByok(params: {
  apiKey: string;
  model: GeminiModelId;
  query: string;
  systemInstruction?: string;
  connectTimeoutMs?: number;
  timeoutMs?: number;
}): Promise<GeminiCallResult> {
  return executeWithBoundedRetry({
    apiKey: params.apiKey,
    model: params.model,
    contents: params.query,
    systemInstruction: params.systemInstruction,
    useGoogleSearch: true,
    thinkingLevel: ThinkingLevel.LOW,
    connectTimeoutMs: params.connectTimeoutMs || 6000,
    timeoutMs: params.timeoutMs || 16000,
    maxTransientRetries: 1,
  });
}

export async function testByokApiKeyConnection(
  apiKey: string,
  model: GeminiModelId = DEFAULT_GEMINI_MODEL
): Promise<{
  ok: boolean;
  model: GeminiModelId;
  status: 'connected' | 'invalid' | 'quota_exceeded' | 'rate_limited' | 'error';
  code: GeminiErrorCode | 'OK';
  message: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  echoMatched: boolean;
  diagnostic: GeminiDiagnosticInfo;
}> {
  const testStartIso = new Date().toISOString();
  const startMs = Date.now();
  const chosenModel: GeminiModelId = isValidGeminiModel(model) ? model : DEFAULT_GEMINI_MODEL;

  const mapErrorToResult = (classified: GeminiProviderError) => {
    let status: 'invalid' | 'quota_exceeded' | 'rate_limited' | 'error' = 'error';
    if (classified.code === 'INVALID_API_KEY') status = 'invalid';
    else if (classified.code === 'QUOTA_EXCEEDED') status = 'quota_exceeded';
    else if (classified.code === 'RATE_LIMIT_EXCEEDED') status = 'rate_limited';

    const elapsedMs = Date.now() - startMs;
    const diagnostic: GeminiDiagnosticInfo = classified.diagnostic
      ? {
          ...classified.diagnostic,
          requestStartedAt: classified.diagnostic.requestStartedAt || testStartIso,
          requestCompletedAt: new Date().toISOString(),
          elapsedMs,
        }
      : {
          requestStartedAt: testStartIso,
          requestCompletedAt: new Date().toISOString(),
          elapsedMs,
          model: chosenModel,
          httpStatus: classified.status,
          googleErrorCode: classified.code,
          googleRequestId: null,
          failurePhase: classified.code === 'TIMEOUT' ? 'connection' : 'response_headers',
          safeErrorMessage: sanitizeDiagnosticMessage(classified.message),
        };

    return {
      ok: false as const,
      model: chosenModel,
      status,
      code: classified.code,
      message: classified.message,
      latencyMs: elapsedMs,
      inputTokens: 0,
      outputTokens: 0,
      echoMatched: false,
      diagnostic,
    };
  };

  try {
    // Step 1 (live SDK only): verify model availability/access cleanly before text-only test
    if (!customTestTransport) {
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          await verifyModelAvailabilityLive({
            apiKey,
            model: chosenModel,
            connectTimeoutMs: 6000,
            responseTimeoutMs: 8000,
          });
          break;
        } catch (probeErr: any) {
          const classified = classifyGeminiError(probeErr, undefined, chosenModel);
          if (!classified.retryable || attempt >= 1) {
            return mapErrorToResult(classified);
          }
          await new Promise((r) => setTimeout(r, computeExponentialBackoffWithJitterMs(attempt, 300, 1200)));
        }
      }
    }

    // Step 2: Single minimal text-only test request (NO profile, NO system prompt, NO search, NO history)
    const testResult = await executeWithBoundedRetry({
      apiKey,
      model: chosenModel,
      contents: CONNECTION_TEST_PROMPT,
      thinkingLevel: isGemini4Model(chosenModel) ? ThinkingLevel.LOW : undefined,
      maxOutputTokens: isGemini4Model(chosenModel) ? 128 : 64,
      connectTimeoutMs: 7000,
      timeoutMs: 16000,
      // Only retries on transient 500/502/503/network; never on 400/401/403/404/429/timeout
      maxTransientRetries: 1,
    });

    const elapsedMs = Date.now() - startMs;
    const echoMatched = testResult.text.includes(CONNECTION_TEST_TOKEN);
    const diagnostic: GeminiDiagnosticInfo = testResult.diagnostic
      ? {
          ...testResult.diagnostic,
          requestStartedAt: testStartIso,
          requestCompletedAt: new Date().toISOString(),
          elapsedMs,
          failurePhase: 'completed',
          safeErrorMessage: null,
        }
      : {
          requestStartedAt: testStartIso,
          requestCompletedAt: new Date().toISOString(),
          elapsedMs,
          model: chosenModel,
          httpStatus: 200,
          googleErrorCode: null,
          googleRequestId: null,
          failurePhase: 'completed',
          safeErrorMessage: null,
        };

    return {
      ok: true,
      model: chosenModel,
      status: 'connected',
      code: 'OK',
      message: `Connected successfully using ${chosenModel}.`,
      latencyMs: elapsedMs,
      inputTokens: testResult.inputTokens,
      outputTokens: testResult.outputTokens,
      echoMatched,
      diagnostic,
    };
  } catch (err: any) {
    // NEVER claim ok: true if live generation test failed or timed out
    const classified = classifyGeminiError(err, undefined, chosenModel);
    return mapErrorToResult(classified);
  }
}
