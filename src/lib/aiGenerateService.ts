/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Generation Service (Autonomous Engine & Optional Cloud API)
 * Zero client-side API key exposure.
 *
 * Default: Autonomous Content Intelligence Engine (100% API-free, local, instant).
 * Optional: Secure Gemini Flash API via backend route `POST /api/generate`.
 */

import {
  AutonomousGenerationRequest,
  AutonomousGenerationResult,
  executeAutonomousGeneration,
} from './autonomousEngine';
import { getAuthIdToken } from './auth';

export type GenerationEngineType = 'autonomous' | 'gemini_flash';

export type CloudErrorCategory =
  | 'unauthorized'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'feature_locked'
  | 'rate_limited'
  | 'timeout'
  | 'network_error'
  | 'invalid_model'
  | 'invalid_input'
  | 'empty_response'
  | 'server_error';

export const GENERATION_PROVIDER_LABELS: Record<GenerationEngineType, string> = {
  autonomous: 'CreatorFlow Local Engine',
  gemini_flash: 'Gemini Cloud',
};

export function getGenerationProviderLabel(engine: GenerationEngineType): string {
  return GENERATION_PROVIDER_LABELS[engine] || 'CreatorFlow Local Engine';
}

export interface GenerateApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  errorCategory?: CloudErrorCategory;
  message?: string;
  engineUsed?: GenerationEngineType;
  providerLabel?: string;
  autonomousResult?: AutonomousGenerationResult;
}

export interface SecureGenerateOptions {
  timeoutMs?: number;
}

/**
 * Invokes the secure server-side `/api/generate` endpoint.
 * Enforces prompt length validation, AbortController timeout, and explicit error classification.
 */
export async function callSecureGenerateApi(
  prompt: string,
  feature?: string,
  options?: SecureGenerateOptions
): Promise<GenerateApiResponse> {
  const trimmed = (prompt || '').trim();

  if (!trimmed) {
    return {
      success: false,
      error: 'INVALID_PROMPT',
      errorCategory: 'invalid_input',
      message: 'Please enter a prompt before generating.',
      engineUsed: 'gemini_flash',
      providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
    };
  }

  if (trimmed.length > 2000) {
    return {
      success: false,
      error: 'PROMPT_TOO_LONG',
      errorCategory: 'invalid_input',
      message: 'Your prompt exceeds the maximum allowed length of 2,000 characters.',
      engineUsed: 'gemini_flash',
      providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
    };
  }

  const timeoutMs = options?.timeoutMs ?? 20000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timerId = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const token = await getAuthIdToken();
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt: trimmed, ...(feature ? { feature } : {}) }),
      ...(controller ? { signal: controller.signal } : {}),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          errorCategory: 'unauthorized',
          message:
            json.message ||
            'Please sign in with your CreatorFlow account to use Gemini Cloud.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 403) {
        const errCode = String(json.error || 'FEATURE_LOCKED');
        const category: CloudErrorCategory =
          errCode === 'CLOUD_QUOTA_EXCEEDED' ? 'quota_exceeded' : 'feature_locked';
        return {
          success: false,
          error: errCode,
          errorCategory: category,
          message:
            json.message ||
            (category === 'quota_exceeded'
              ? 'Your monthly Gemini Cloud allowance is reached. Upgrade your plan or switch to CreatorFlow Local Engine.'
              : 'This Gemini Cloud capability requires a higher CreatorFlow plan.'),
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          errorCategory: 'rate_limited',
          message:
            json.message ||
            'Gemini Cloud hourly rate limit reached. Your CreatorFlow quota was not consumed.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 504 || json.error === 'TIMEOUT') {
        return {
          success: false,
          error: 'TIMEOUT',
          errorCategory: 'timeout',
          message:
            json.message ||
            'Gemini Cloud took too long to respond and timed out. Your quota was not consumed.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 428 || json.error === 'MISSING_API_KEY' || (response.status === 503 && (json.error === 'INVALID_API_KEY' || json.error === 'API_KEY_UNAVAILABLE'))) {
        return {
          success: false,
          error: json.error || 'MISSING_API_KEY',
          errorCategory: 'invalid_key',
          message:
            json.message ||
            'Connect your personal Gemini API key in Settings -> Gemini API to use Gemini Cloud.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 502 && json.error === 'INVALID_MODEL') {
        return {
          success: false,
          error: 'INVALID_MODEL',
          errorCategory: 'invalid_model',
          message:
            json.message ||
            'Configured Gemini Cloud model could not be reached. Your quota was not consumed.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      if (response.status === 502 && json.error === 'EMPTY_RESPONSE') {
        return {
          success: false,
          error: 'EMPTY_RESPONSE',
          errorCategory: 'empty_response',
          message:
            json.message ||
            'Gemini Cloud returned an empty response. Your quota was not consumed.',
          engineUsed: 'gemini_flash',
          providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
        };
      }

      return {
        success: false,
        error: json.error || 'SERVER_ERROR',
        errorCategory: 'server_error',
        message:
          json.message ||
          'Gemini Cloud failed to generate content. Your quota was not consumed.',
        engineUsed: 'gemini_flash',
        providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
      };
    }

    return {
      success: true,
      data: json.data || '',
      engineUsed: 'gemini_flash',
      providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
    };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted');
    if (isAbort) {
      return {
        success: false,
        error: 'TIMEOUT',
        errorCategory: 'timeout',
        message: 'Gemini Cloud request timed out. You can retry cloud or switch to CreatorFlow Local Engine.',
        engineUsed: 'gemini_flash',
        providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
      };
    }

    return {
      success: false,
      error: 'NETWORK_ERROR',
      errorCategory: 'network_error',
      message:
        err?.message ||
        'Network error contacting Gemini Cloud. Please check your connection or switch to CreatorFlow Local Engine.',
      engineUsed: 'gemini_flash',
      providerLabel: GENERATION_PROVIDER_LABELS.gemini_flash,
    };
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

/**
 * Executes content generation using the 100% API-independent CreatorFlow Local Engine.
 * Does not require any network connection or remote API key.
 */
export async function generateAutonomousContent(
  request: AutonomousGenerationRequest
): Promise<GenerateApiResponse> {
  const result = await executeAutonomousGeneration(request);
  if (!result.success) {
    return {
      success: false,
      error: 'AUTONOMOUS_GENERATION_FAILED',
      errorCategory: 'server_error',
      message: result.error || 'CreatorFlow Local Engine was unable to generate content for this topic.',
      autonomousResult: result,
      engineUsed: 'autonomous',
      providerLabel: GENERATION_PROVIDER_LABELS.autonomous,
    };
  }

  return {
    success: true,
    data: result.displayText,
    autonomousResult: result,
    engineUsed: 'autonomous',
    providerLabel: GENERATION_PROVIDER_LABELS.autonomous,
  };
}

/**
 * Unified generation entry point with explicit provider selection.
 * Never silently falls back from Gemini Cloud to Local Engine — failures are returned cleanly
 * so the UI can let the creator retry Cloud or explicitly switch providers.
 */
export async function generateContentWithEngine(
  request: AutonomousGenerationRequest,
  engine: GenerationEngineType = 'autonomous',
  promptForGemini?: string,
  feature?: string
): Promise<GenerateApiResponse> {
  if (engine === 'autonomous') {
    return generateAutonomousContent(request);
  }

  return callSecureGenerateApi(promptForGemini || request.topic, feature);
}
