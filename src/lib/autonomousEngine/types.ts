/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Autonomous Content Intelligence Engine Types
 * Unified typed contracts for API-independent generation, planning, and evaluation.
 */

import { PlatformType, ToneType } from '../../types';

export type SupportedLanguage =
  | 'English'
  | 'Tamil'
  | 'Tanglish'
  | 'Hindi'
  | string;

export type GenerationTaskType =
  | 'titles'
  | 'hooks'
  | 'captions_descriptions'
  | 'hashtags_keywords'
  | 'short_form_script'
  | 'long_form_script'
  | 'content_ideas'
  | 'content_calendar'
  | 'rewriting'
  | 'summarization'
  | 'content_pack'
  | 'topic_analysis'
  | 'topic_intelligence'
  | 'seo_evaluation'
  | 'video_prompt'
  | 'video_storyboard';

export type CreativeStrategyType =
  | 'curiosity_mystery'
  | 'problem_solution'
  | 'unexpected_contrast'
  | 'storytelling_case_study'
  | 'myth_vs_fact'
  | 'practical_tutorial'
  | 'question_led'
  | 'beginner_friendly'
  | 'contrarian_perspective'
  | 'emotional_narrative';

export interface StrategyDefinition {
  type: CreativeStrategyType;
  label: string;
  description: string;
  bestFor: string[];
  psychologicalHook: string;
}

export interface UserGenerationPreferences {
  preferredTone?: ToneType;
  preferredLanguage?: SupportedLanguage;
  favoriteStrategies?: CreativeStrategyType[];
  dislikedStrategies?: CreativeStrategyType[];
  targetAudience?: string;
}

export interface AutonomousGenerationRequest {
  task: GenerationTaskType;
  topic: string;
  platform?: PlatformType | 'Instagram' | 'LinkedIn' | 'General';
  language?: SupportedLanguage;
  tone?: ToneType;
  audience?: string;
  objective?: string;
  format?: string;
  targetLength?: 'short' | 'medium' | 'long' | number;
  sourceText?: string;
  variationSeed?: number;
  constraints?: string[];
  candidateCount?: number;
  userPreferences?: UserGenerationPreferences;
  includeCritique?: boolean;
  targetModel?: string;            // e.g. 'runway_gen3', 'sora', 'kling_ai', 'luma_dream_machine', 'pika_art', 'hailuo_ai', 'google_flow'
  aspectRatio?: '16:9' | '9:16' | '1:1';
  characterBible?: any;
  styleBible?: any;
}

export interface CandidateQualityBreakdown {
  relevanceScore: number;       // 0-100: how closely it addresses the topic
  clarityScore: number;         // 0-100: readability and sentence structure
  specificityScore: number;     // 0-100: concrete details vs generic filler
  platformScore: number;        // 0-100: optimal length and formatting for target platform
  originalityScore: number;     // 0-100: distinctness from common clichés and history
  grammarScore: number;         // 0-100: syntactic correctness
  preferenceBonus: number;      // -10 to +10: user preference alignment
  totalScore: number;           // Weighted composite 0-100
  explanations?: string[];      // Transparent rationale detailing points awarded/deducted
  scoreDisclaimer?: string;    // Heuristic disclaimer notice
}

export interface CandidateOutput<T = any> {
  id: string;
  strategy: CreativeStrategyType;
  content: T;
  displayText: string;
  scores: CandidateQualityBreakdown;
  originalityScore: number;
  passedQualityGate: boolean;
  critiqueNotes?: string[];
  revisionAttempts?: number;
}

export interface GenerationExecutionMetadata {
  engine: 'autonomous-intelligence-engine-v1';
  task: GenerationTaskType;
  selectedStrategy: CreativeStrategyType;
  qualityScore: number;
  originalityScore: number;
  languageValidated: boolean;
  latencyMs: number;
  checksPassed: string[];
  warnings?: string[];
  provenanceNotice?: string;
  revisionPassesMade: number;
  isApiIndependent: true;
}

export interface AutonomousGenerationResult<T = any> {
  success: boolean;
  task: GenerationTaskType;
  primaryOutput: T;
  displayText: string;
  candidates: CandidateOutput<T>[];
  metadata: GenerationExecutionMetadata;
  critiqueNotes?: string[];
  error?: string;
}

// -------------------------------------------------------------
// TASK-SPECIFIC OUTPUT STRUCTURES
// -------------------------------------------------------------

export interface TitleCandidateItem {
  title: string;
  style: string;
  charCount: number;
  predictedCtrTier: 'Strong' | 'Very Strong' | 'Exceptional';
  hookAngle: string;
  score?: number;
  explanations?: string[];
  scoreDisclaimer?: string;
}

export interface HookCandidateItem {
  spokenHook: string;
  visualDirection: string;
  retentionTrigger: string;
  deliveryTip: string;
}

export interface DescriptionPackage {
  hookLine: string;
  summary: string;
  valueBreakdown: string[];
  timestamps: Array<{ time: string; label: string }>;
  resourcesPlaceholders: string;
  callToAction: string;
  rawText: string;
}

export interface HashtagKeywordPackage {
  coreKeywords: string[];
  nicheKeywords: string[];
  intentKeywords: string[];
  allKeywordsCommaSeparated: string;
  trendingHashtags: string[];
  hashtagsString: string;
}

export interface ScriptBeat {
  timecode: string;
  spokenAudio: string;
  visualDirection: string;
  purpose: 'Hook' | 'Context' | 'Pillar' | 'Twist' | 'CallToAction';
}

export interface ShortFormScriptPackage {
  title: string;
  estimatedDurationSeconds: number;
  openingHook: string;
  beats: ScriptBeat[];
  loopingCta: string;
  fullScriptText: string;
}

export interface LongFormSection {
  sectionTitle: string;
  estimatedMinutes: string;
  talkingPoints: string[];
  visualBroll: string;
  transitionPhrase: string;
}

export interface LongFormScriptPackage {
  title: string;
  format: string;
  targetLengthMinutes: number;
  coldOpenHook: string;
  introContext: string;
  sections: LongFormSection[];
  practicalTakeaways: string[];
  conclusionCta: string;
  fullScriptOutlineText: string;
}

export interface ContentIdeaItem {
  id: string;
  title: string;
  angle: string;
  targetAudience: string;
  corePremise: string;
  recommendedFormat: 'Short' | 'Long-form' | 'Series' | 'Tutorial';
  creatorFitScore: number;
  productionDifficulty: 'Easy' | 'Medium' | 'Advanced';
}

export interface CalendarDayItem {
  dayNumber: number;
  dayOfWeek: string;
  focusTopic: string;
  contentType: 'Short' | 'Long-form Video' | 'Community Post' | 'Planning & Scripting';
  angle: string;
  status: 'Planned';
}

export interface ContentCalendarPackage {
  title: string;
  timeframe: '7-Day Sprint' | '14-Day Growth' | '30-Day Channel Engine';
  totalVideos: number;
  schedule: CalendarDayItem[];
  productionCadenceAdvice: string;
}

export interface RewriteResultPackage {
  originalText: string;
  rewrittenText: string;
  appliedTone: ToneType;
  changesMadeSummary: string;
  preservedCoreFacts: boolean;
}

export interface SummaryResultPackage {
  originalLengthWords: number;
  summaryLengthWords: number;
  oneSentenceThesis: string;
  coreTakeaways: string[];
  actionableSteps: string[];
  provenanceNotice: string;
}

export interface VideoPromptCandidateItem {
  promptText: string;
  modelId: string;
  modelName: string;
  negativePrompt?: string;
  clipDurationSeconds: number;
  aspectRatio: string;
  cameraChoreography: string;
  lightingAndAtmosphere: string;
  observableAction: string;
  narrativeAngle: string;
  compatibilityNotes: string[];
  imagePrompt?: string;
  motionPrompt?: string;
}

export interface VideoStoryboardPackage {
  topic: string;
  targetModel: string;
  totalDurationSeconds: number;
  totalClipsCount: number;
  aspectRatio: string;
  continuityBibleSummary: string;
  clips: any[];
  assemblyInstructions: string[];
}
