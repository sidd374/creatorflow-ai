/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verified Gemini Model Catalog for CreatorFlow AI BYOK.
 * Strict compliance with @google/genai supported model IDs.
 */

import type { GeminiModelId, IntelligenceTaskType, SupportedGeminiModel } from './types.ts';

export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-4-hydrogen';

export const SUPPORTED_GEMINI_MODELS: SupportedGeminiModel[] = [
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

export const QUOTA_PROJECT_SHARING_NOTICE =
  'Important: In Google AI Studio / Google Cloud, API keys created within the same project share project-level rate limits and quotas. Create a separate project if you need isolated quota.';

export function isValidGeminiModel(modelId: unknown): modelId is GeminiModelId {
  return (
    typeof modelId === 'string' &&
    SUPPORTED_GEMINI_MODELS.some((m) => m.id === modelId)
  );
}

export function normalizeGeminiModel(modelId: unknown): GeminiModelId {
  return isValidGeminiModel(modelId) ? modelId : DEFAULT_GEMINI_MODEL;
}

export function getGeminiModelDefinition(modelId: GeminiModelId): SupportedGeminiModel {
  return (
    SUPPORTED_GEMINI_MODELS.find((m) => m.id === modelId) ||
    SUPPORTED_GEMINI_MODELS[0]
  );
}

export function isGemini4Model(modelId: GeminiModelId): boolean {
  return modelId.startsWith('gemini-4-');
}

export function resolveTaskModel(
  selectedModel: GeminiModelId,
  task: IntelligenceTaskType
): GeminiModelId {
  // Always honor the creator's explicitly selected valid model so quota/billing expectations match cleanly.
  if (isValidGeminiModel(selectedModel)) {
    return selectedModel;
  }
  return task === 'title_seo' ? 'gemini-3.1-flash-lite' : DEFAULT_GEMINI_MODEL;
}
