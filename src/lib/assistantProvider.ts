/**
 * CreatorFlow AI — Assistant Provider Abstraction Layer
 * Interfaces with backend AI route /api/assistant and ensures zero client key exposure
 * Features robust, grounded fallback intelligence if AI service is offline
 */

import { CreatorFlowAssistantContext } from './assistantContext';
import { AssistantMessage } from './assistantStorage';
import { generateAutonomousAssistantResponse } from './autonomousAssistantEngine';
import { getAuthIdToken } from './auth';
import type { CloudErrorCategory } from './aiGenerateService';

export type AssistantProviderMode = 'local' | 'cloud';

export const ASSISTANT_PROVIDER_LABELS: Record<AssistantProviderMode, string> = {
  local: 'CreatorFlow Local Engine',
  cloud: 'Gemini Cloud',
};

export class AssistantProviderError extends Error {
  errorCategory: CloudErrorCategory;
  code: string;

  constructor(code: string, category: CloudErrorCategory, message: string) {
    super(message);
    this.name = 'AssistantProviderError';
    this.code = code;
    this.errorCategory = category;
  }
}

export interface AssistantProvider {
  generateResponse(
    messages: AssistantMessage[],
    context: CreatorFlowAssistantContext,
    mode?: AssistantProviderMode,
    options?: { timeoutMs?: number }
  ): Promise<string>;
}

export class ServerApiAssistantProvider implements AssistantProvider {
  async generateResponse(
    messages: AssistantMessage[],
    context: CreatorFlowAssistantContext,
    mode: AssistantProviderMode = 'local',
    options?: { timeoutMs?: number }
  ): Promise<string> {
    if (mode === 'local') {
      return generateAutonomousAssistantResponse(messages, context);
    }

    // Explicit Gemini Cloud path (/api/assistant) — zero silent fallback
    const timeoutMs = options?.timeoutMs ?? 20000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timerId = controller
      ? setTimeout(() => {
          controller.abort();
        }, timeoutMs)
      : null;

    try {
      const token = await getAuthIdToken();
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, context }),
        ...(controller ? { signal: controller.signal } : {}),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errCode = String(json.error || 'SERVER_ERROR');
        if (response.status === 401) {
          throw new AssistantProviderError(
            'UNAUTHORIZED',
            'unauthorized',
            json.message || 'Please sign in to use Gemini Cloud assistant.'
          );
        }
        if (response.status === 403) {
          const cat: CloudErrorCategory = errCode === 'LIMIT_REACHED' ? 'quota_exceeded' : 'feature_locked';
          throw new AssistantProviderError(
            errCode,
            cat,
            json.message || 'Your Gemini Cloud assistant allowance or plan access does not permit this request.'
          );
        }
        if (response.status === 429) {
          throw new AssistantProviderError(
            'RATE_LIMIT_EXCEEDED',
            'rate_limited',
            json.message || 'Gemini Cloud rate limit reached. Your quota was not consumed.'
          );
        }
        if (response.status === 504 || errCode === 'timeout') {
          throw new AssistantProviderError(
            'TIMEOUT',
            'timeout',
            json.message || 'Gemini Cloud timed out before replying. Your quota was not consumed.'
          );
        }
        if (response.status === 428 || errCode === 'MISSING_API_KEY' || errCode === 'INVALID_API_KEY' || response.status === 503 || errCode === 'unavailable') {
          throw new AssistantProviderError(
            errCode === 'INVALID_API_KEY' ? 'INVALID_API_KEY' : 'MISSING_API_KEY',
            'invalid_key',
            json.message || 'Connect your personal Gemini API key in Settings -> Gemini API to chat with Gemini Cloud.'
          );
        }
        throw new AssistantProviderError(
          errCode,
          'server_error',
          json.message || 'Gemini Cloud encountered an error. Your quota was not consumed.'
        );
      }

      const replyText = String(json.text || '').trim();
      if (!replyText) {
        throw new AssistantProviderError(
          'EMPTY_RESPONSE',
          'empty_response',
          'Gemini Cloud returned an empty response. Your quota was not consumed.'
        );
      }
      return replyText;
    } catch (err: any) {
      if (err instanceof AssistantProviderError) {
        throw err;
      }
      const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted');
      if (isAbort) {
        throw new AssistantProviderError(
          'TIMEOUT',
          'timeout',
          'Gemini Cloud timed out before replying. Retry cloud or switch to CreatorFlow Local Engine.'
        );
      }
      throw new AssistantProviderError(
        'NETWORK_ERROR',
        'network_error',
        err?.message || 'Network error reaching Gemini Cloud.'
      );
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }
}

// Global shared provider instance
export const defaultAssistantProvider = new ServerApiAssistantProvider();
