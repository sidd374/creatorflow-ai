/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central types for the CreatorFlow AI BYOK Intelligence Engine.
 */

import type {
  AnalyticsSummary,
  CreatorProfile,
  PlatformType,
  RecommendedVideoIdea,
  ToneType,
  VideoAnalytics,
  VideoProject,
  ContentPack,
} from '../../types/index.ts';

export type GeminiModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export interface SupportedGeminiModel {
  id: GeminiModelId;
  label: string;
  tier: 'free_and_paid' | 'paid_required';
  badge: string;
  description: string;
  recommendedFor: string;
  isDefault?: boolean;
}

export type GeminiFailurePhase =
  | 'connection'
  | 'response_headers'
  | 'response_generation'
  | 'completed';

export interface GeminiDiagnosticInfo {
  requestStartedAt: string;
  requestCompletedAt: string;
  elapsedMs: number;
  model: GeminiModelId;
  httpStatus: number | null;
  googleErrorCode: string | null;
  googleRequestId: string | null;
  failurePhase: GeminiFailurePhase;
  safeErrorMessage: string | null;
}

export type ByokKeyStatus =
  | 'unconfigured'
  | 'connected'
  | 'invalid'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'error';

export interface ByokKeyMetadata {
  hasKey: boolean;
  keyLast4: string | null;
  maskedHint: string | null;
  selectedModel: GeminiModelId;
  status: ByokKeyStatus;
  lastTestedAt: string | null;
  lastError: string | null;
  lastDiagnostic?: GeminiDiagnosticInfo | null;
  updatedAt: string | null;
  quotaNotice: string;
}

export interface EncryptedByokRecord {
  uid: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  keyLast4: string;
  maskedHint: string;
  selectedModel: GeminiModelId;
  status: ByokKeyStatus;
  lastTestedAt: string | null;
  lastError: string | null;
  lastDiagnostic?: GeminiDiagnosticInfo | null;
  createdAt: string;
  updatedAt: string;
}

export type IntelligenceTaskType =
  | 'topic_analysis'
  | 'idea_generation'
  | 'content_radar'
  | 'next_video'
  | 'content_pack'
  | 'script_generation'
  | 'title_seo'
  | 'thumbnail_intelligence'
  | 'analytics_intelligence'
  | 'creator_assistant'
  | 'guided_workflow_pack';

export interface AiUsageMetricsRecord {
  uid: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cacheHits: number;
  validationRepairs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastModelUsed: GeminiModelId | null;
  lastTaskExecuted: IntelligenceTaskType | null;
  lastExecutedAt: string | null;
  byTask: Record<string, number>;
}

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'BAD_REQUEST'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_MODEL'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESPONSE'
  | 'GENERATION_FAILED';

export interface CreatorContextProfile {
  uid: string;
  niche: string;
  channelTopic: string;
  targetAudience: string;
  creatorStage: string;
  experienceLevel: string;
  primaryGoal: string;
  secondaryGoals: string[];
  dailyTimeAvailable: string;
  monthlyBudget: string;
  budgetTier: 'zero' | 'low' | 'flexible';
  availableDevices: string[];
  availableTools: string[];
  preferredLanguage: string;
  preferredPlatform: PlatformType;
  creatorStyle: string;
  productionMethods: string[];
  primaryProductionMethod: string;
  onCamera: boolean;
  aiWorkflow: string;
  isZeroBudget: boolean;
  isPhoneOnly: boolean;
  isBeginner: boolean;
  isFaceless: boolean;
  isAiVideoCreator: boolean;
  recentTopics: string[];
  recentTitles: string[];
  analyticsSummary: AnalyticsSummary | null;
}

export interface WebResearchSource {
  title: string;
  url: string;
  snippet?: string;
  retrievedAt: string;
  sourceType: 'google_search_grounding';
}

export interface WebResearchBrief {
  query: string;
  normalizedQuery: string;
  niche: string;
  language: string;
  retrievedAt: string;
  cached: boolean;
  summary: string;
  verifiedFacts: string[];
  strategicHypotheses: string[];
  sources: WebResearchSource[];
}

export interface QualityCheckItem {
  id: string;
  label: string;
  category:
    | 'topic_fidelity'
    | 'format_duration'
    | 'budget_device'
    | 'language_workflow'
    | 'anti_repetition'
    | 'accuracy_grounding'
    | 'completeness';
  passed: boolean;
  critical: boolean;
  detail: string;
}

export interface QualityReport {
  score: number;
  passed: boolean;
  checks: QualityCheckItem[];
  criticalFailures: string[];
  warnings: string[];
  repairInstructions: string[];
  attempts: number;
  repaired: boolean;
}

export interface IntelligenceExecutionInput {
  topic?: string;
  prompt?: string;
  platform?: PlatformType;
  language?: string;
  tone?: ToneType;
  format?: string;
  durationMinutes?: number;
  durationLabel?: string;
  goal?: string;
  angle?: string;
  toolId?: string;
  selectedTitle?: string;
  selectedHook?: string;
  variationSeed?: number;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextSnapshot?: Record<string, unknown>;
}

export interface IntelligenceExecutionRequest {
  uid: string;
  task: IntelligenceTaskType;
  input: IntelligenceExecutionInput;
  creatorProfile?: Partial<CreatorProfile> & Record<string, any>;
  recentProjects?: Array<Pick<VideoProject, 'id' | 'topic' | 'selectedTitle' | 'format' | 'status' | 'createdAt'>>;
  recentIdeas?: Array<Pick<RecommendedVideoIdea, 'id' | 'title' | 'format' | 'status'>>;
  recentPacks?: Array<Pick<ContentPack, 'id' | 'topic' | 'titles' | 'createdAt'>>;
  analyticsList?: VideoAnalytics[];
  preferredModel?: GeminiModelId;
  bypassCache?: boolean;
  enableWebResearch?: boolean;
}

export interface IntelligenceExecutionResponse<T = any> {
  success: true;
  task: IntelligenceTaskType;
  model: GeminiModelId;
  data: T;
  qualityReport: QualityReport;
  researchBrief: WebResearchBrief | null;
  personalizationSummary: {
    niche: string;
    language: string;
    budgetTier: string;
    productionMethod: string;
    onCamera: boolean;
    devices: string[];
    appliedConstraints: string[];
  };
  cacheHit: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
  diagnostic?: GeminiDiagnosticInfo;
}
