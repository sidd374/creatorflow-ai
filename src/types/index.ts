export type PlatformType = 'YouTube' | 'Shorts';

export type ToneType = 'Viral' | 'Professional' | 'Educational' | 'Funny';

export interface Language {
  id: string;
  name: string;
  nativeName?: string;
  code: string;
  isPopular?: boolean;
  supportTier?: 'full' | 'partial_prefix';
}

export interface Tool {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'Strategy' | 'Optimization' | 'Shorts' | 'Engagement' | 'Visuals';
  badge?: string;
  placeholderPrompt?: string;
}

export interface ContentPack {
  id: string;
  topic: string;
  platform: PlatformType;
  language: string;
  tone: ToneType;
  createdAt: string;
  isSaved?: boolean;
  variationSeed?: number;
  titles: Array<{
    text: string;
    style: string;
    charCount: number;
    score?: number; // CreatorFlow Score (1-100)
    predictedCtr?: string;
    explanations?: string[];
    scoreDisclaimer?: string;
  }>;
  hooks: Array<{
    hook: string;
    type: string;
    deliveryTip: string;
    retentionReason?: string;
  }>;
  description: {
    hookLine: string;
    summary: string;
    valuePoints?: string[];
    timestamps: Array<{ time: string; label: string }>;
    linksPlaceholder: string;
    callToAction: string;
  };
  keywords: string[];
  hashtags: string[];
  shortsScript: {
    title: string;
    duration: string;
    hook: string;
    body: Array<{ second: string; visual: string; audio: string }>;
    cta: string;
  };
  pinnedComment: {
    comment: string;
    engagementQuestion: string;
    boostTip: string;
  };
  thumbnailConcept: {
    composition: string;
    focalPoint: string;
    facialExpression: string;
    overlayText: string;
    overlayOptions?: string[];
    background?: string;
    visualContrast?: string;
    textPlacement?: string;
    colorPalette: string[];
    psychologicalTrigger: string;
  };
  videoIdeas?: Array<{
    title: string;
    angle: string;
    description: string;
    difficulty?: string;
    formatRecommendation?: string;
    targetAudience?: string;
  }>;
  aiPowered?: boolean;
  aiModelUsed?: string;
  qualityReport?: {
    score: number;
    passed: boolean;
    warnings: string[];
    attempts: number;
    repaired: boolean;
  };
  researchSources?: Array<{
    title: string;
    url: string;
    retrievedAt: string;
  }>;
  personalizationApplied?: string[];
}

export interface GeneratorOptions {
  topic: string;
  platform: PlatformType;
  language: string;
  tone: ToneType;
  variationSeed?: number;
  creatorProfile?: CreatorProfile;
  personalizationProfile?: {
    accountId?: string;
    enabled?: boolean;
    strategyWeights?: Record<string, number>;
    preferredTone?: ToneType;
    preferredLanguage?: string;
    [key: string]: any;
  };
}

export interface TitleResult {
  text: string;
  style: string;
  charCount: number;
  score: number;
  predictedCtr: string;
  explanations?: string[];
  scoreDisclaimer?: string;
}

export interface HookResult {
  hook: string;
  type: string;
  deliveryTip: string;
  retentionReason?: string;
}


export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  channelName: string;
  channelUrl: string;
  channelNiche: string;
  defaultLanguage: string;
  defaultTone: ToneType;
  generationsUsedToday: number;
  generationsLimitToday: number;
  totalSavedPacks: number;
}

export interface Subscription {
  planId: 'free' | 'pro' | 'creator' | 'max' | 'custom_annual';
  planName: string;
  priceFormatted: string;
  cadence: 'monthly' | 'yearly';
  renewalDate: string;
  status: 'active' | 'trialing' | 'canceled';
  features: string[];
}

export interface PricingPlan {
  id: 'free' | 'pro' | 'creator' | 'max' | 'custom_annual';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currencySymbol: string;
  popular?: boolean;
  features: string[];
  ctaText: string;
  position?: string;
  badge?: string;
}

// -------------------------------------------------------------
// PHASE 3 CREATOR PROFILE & STRATEGY ASSISTANT TYPES
// -------------------------------------------------------------
export type CreatorStage = 'New Creator' | 'Growing Creator' | 'Established Creator' | 'Reviving Channel';

export interface CreatorProfile {
  channelExists: 'yes' | 'no' | 'dormant';
  channelTopic: string;
  subscriberRange: string;
  uploadFrequency: string;
  creatorStage: CreatorStage;
  primaryGoal: string;
  secondaryGoals: string[];
  goalTimeline: string;
  contentCategories: string[];
  experienceLevel: 'Beginner' | 'Some experience' | 'Comfortable' | 'Advanced';
  dailyTimeAvailable: string;
  availableDevices: string[];
  availableTools: string[];
  monthlyBudget: string;
  aiExperience: string;
  aiNeeds: string[];
  creatorStyle: string;
  productionMethods?: string[];
  primaryProductionMethod?: string;
  onCamera?: boolean;
  aiWorkflow?: string;
  niche?: string;
  targetAudience?: string;
  preferredLanguage?: string;
  preferredPlatform?: PlatformType;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IdeaStatus = 'Idea' | 'Planned' | 'In Production' | 'Ready' | 'Published';

export interface VideoIdea {
  id: string;
  topic: string;
  title: string;
  alternativeTitles: string[];
  format: string;
  targetAudience: string;
  primaryGoal: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  estimatedMinutes: number;
  creatorFitScore: number;
  reasonForFit: string[];
  angle: string;
  status: IdeaStatus;
  budgetFit?: string;
}

export type ProjectStatus = 'Planned' | 'Writing' | 'Production' | 'Ready' | 'Published';

export type BuilderTab = 
  | 'overview' 
  | 'title' 
  | 'hook' 
  | 'script' 
  | 'visuals' 
  | 'voice' 
  | 'editing' 
  | 'production' 
  | 'tools'
  | 'publishing';

// -------------------------------------------------------------
// PHASE 3E TOOL RECOMMENDATIONS & PRODUCTION PLAN TYPES
// -------------------------------------------------------------
export type ToolCategory = 
  | 'Video Editing'
  | 'Screen Recording'
  | 'Voice / Narration'
  | 'AI Video'
  | 'Thumbnail Design'
  | 'Captions / Subtitles'
  | 'Music / Sound'
  | 'Stock Footage'
  | 'Research'
  | 'Image Creation';

export interface ToolRecommendation {
  id: string;
  name: string;
  category: ToolCategory;
  categoryKey: string;
  availability: 'Free' | 'Freemium' | 'Paid with Free Trial' | 'Paid';
  freeTier: boolean;
  paidAvailable: boolean;
  pricingNote: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  bestFor: string;
  deviceSupport: string[];
  demandsHardware?: boolean;
  mainBenefit: string;
  limitations: string;
  website: string;
  fitScore?: number;
  matchLevel?: 'Best match' | 'Strong match' | 'Good match';
  reasons?: string[];
  instructions?: string[];
  optionalUpgradeNote?: string;
}

export interface ProductionPlanStep {
  stepNumber: number;
  title: string;
  categoryKey?: string;
  toolName: string;
  toolCategory: string;
  whatToDo: string;
  inputNeeded: string;
  expectedOutput: string;
  isCompleted?: boolean;
}

export interface RequiredAssetItem {
  id: string;
  label: string;
  description: string;
  category: string;
  isReady: boolean;
  sourceTool?: string;
}

export interface ChapterItem {
  id: string;
  timestamp: string;
  seconds: number;
  title: string;
}

export interface ThumbnailBrief {
  mainVisual: string;
  subject: string;
  emotion: string;
  background: string;
  composition: string;
  contrast: string;
  visualHierarchy: string;
  textPlacement: string;
  lighting: string;
  style: string;
  colorDirection: string;
}

export interface ThumbnailTextOption {
  id: string;
  text: string;
  reason: string;
  isRecommended?: boolean;
}

export interface PublishUploadSettings {
  platform: 'YouTube';
  contentType: 'Long-form' | 'Short';
  visibility: 'Public' | 'Unlisted' | 'Private' | 'Schedule';
  scheduleDateTime?: string;
  audience: 'Not made for kids' | 'Made for kids' | 'Ask me later';
  language: string;
  category: string;
  playlist?: string;
  captions: 'Auto-generated' | 'Uploaded .srt' | 'None';
  comments: 'Allow all' | 'Hold potentially inappropriate' | 'Disable';
  license: 'Standard YouTube License' | 'Creative Commons - Attribution';
  embedding: boolean;
}

export interface VideoPublishingData {
  finalTitle: string;
  alternativeTitles: string[];
  description: string;
  primaryKeywords: string[];
  relatedKeywords: string[];
  longTailKeywords: string[];
  primaryHashtags: string[];
  secondaryHashtags: string[];
  pinnedComment: string;
  chapters: ChapterItem[];
  thumbnailBrief: ThumbnailBrief;
  thumbnailTextOptions: ThumbnailTextOption[];
  recommendedThumbnailText: string;
  thumbnailPrompt: string;
  uploadSettings: PublishUploadSettings;
  checklist: Record<string, boolean>;
  readinessPct?: number;
  lastActiveSection?: string;
}

export interface ScriptSection {
  id: string;
  label: string; // e.g., 'HOOK', 'SETUP', 'POINT 1', 'POINT 2', 'PAYOFF', 'CTA'
  timeRange: string; // e.g., '0:00–0:05'
  text: string;
  wordCount: number;
  isFinalized?: boolean;
  visualCue?: string;
  deliveryTip?: string;
}

export type VisualType = 
  | 'Camera shot' 
  | 'Screen recording' 
  | 'B-roll' 
  | 'Image' 
  | 'Animation' 
  | 'Text animation' 
  | 'Chart / graphic' 
  | 'Stock footage' 
  | 'AI-generated visual' 
  | 'Gameplay' 
  | 'No visual';

export interface VisualPlanItem {
  id: string;
  timeRange: string;
  spokenLine: string;
  visualDirection: string;
  onScreenText: string;
  visualType: VisualType;
  cameraFraming?: string;
  transition?: string;
}

export type VoiceSource = 'Your Own Voice' | 'AI Voice' | 'Text Only';
export type VoiceTone = 'Calm' | 'Energetic' | 'Professional' | 'Friendly' | 'Serious' | 'Excited';
export type SpeakingPace = 'Slow' | 'Normal' | 'Fast';

export interface VoiceSettings {
  source: VoiceSource;
  tone: VoiceTone;
  pace: SpeakingPace;
  emphasisWords: string[];
  customNotes?: string;
}

export type CaptionStyle = 'Clean' | 'Bold' | 'Minimal' | 'Word emphasis';
export type MusicStyle = 'None' | 'Subtle' | 'Energetic' | 'Cinematic' | 'Upbeat';

export interface EditingSettings {
  checklist: { [item: string]: boolean };
  captionStyle: CaptionStyle;
  musicStyle: MusicStyle;
  notes?: string;
}

export interface VideoProject {
  id: string;
  ideaId: string;
  workflowId?: string;
  topic: string;
  format: string;
  targetAudience: string;
  primaryGoal: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  estimatedMinutes: number;
  creatorFitScore: number;
  reasonForFit: string[];
  angle: string;
  selectedTitle?: string;
  selectedHook?: string;
  selectedHookType?: string;
  durationSeconds?: number;
  durationLabel?: string;
  lastActiveTab?: BuilderTab;
  scriptSections?: ScriptSection[];
  visualPlan?: VisualPlanItem[];
  voiceSettings?: VoiceSettings;
  editingSettings?: EditingSettings;
  selectedTools?: { [categoryKey: string]: string };
  toolChecklist?: { [itemId: string]: boolean };
  lastActiveToolCategory?: string;
  script?: unknown;
  visuals?: unknown;
  voice?: unknown;
  editing?: unknown;
  tools?: unknown;
  thumbnail?: unknown;
  publishing?: unknown;
  publishingData?: VideoPublishingData;
  creationBrief?: any;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedVideoIdea {
  id: string;
  title: string;
  format: 'Short' | 'Long-form' | 'Hybrid';
  goal: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  estimatedTime: string;
  creatorFitScore: number;
  topicRelevance: number;
  whyThisIdea: string[];
  budgetFit: string;
  status: IdeaStatus;
  suggestedAngle?: string;
  targetAudience?: string;
  presentationFormat?: string;
  suggestedStructure?: string;
}

export interface TopicAnalysisResult {
  analyzedTopic: string;
  bestFormat: string;
  whyFormatFits: string;
  recommendedAudience: string;
  suggestedAngle: string;
  productionDifficulty: 'Easy' | 'Medium' | 'Advanced';
  estimatedProductionTime: string;
  budgetFit: string;
  creatorFitScore: number;
  scoreBreakdown: {
    topicRelevance: number;
    goalAlignment: number;
    timeFit: number;
    skillFit: number;
    budgetFit: number;
    formatFit: number;
  };
  recommendedIdeas: RecommendedVideoIdea[];
}

export interface CreatorActivityStats {
  recommendedVideosCount: number;
  videosPlannedCount: number;
  videosCompletedCount: number;
  publishingQueueCount: number;
  videosPublishedTotal: number;
  viewsLoggedTotal: number;
  subscribersLoggedTotal: number;
  consistencyScorePct: number;
  goalProgressPct: number;
}

// -------------------------------------------------------------
// PHASE 3G CREATOR ANALYTICS TYPES
// -------------------------------------------------------------
export type PerformanceTier = 'Strong' | 'Healthy' | 'Needs Attention' | 'Not Enough Data';

export interface VideoAnalytics {
  id: string;
  videoProjectId?: string;
  videoTitle: string;
  publishedDate: string; // YYYY-MM-DD
  format: string; // 'Short' | 'Long-form' | 'Tutorial' | 'Educational' | etc.
  topic: string;
  views?: number;
  impressions?: number;
  ctr?: number; // 0-100%
  watchTimeMinutes?: number;
  averageViewDurationSeconds?: number;
  averagePercentageViewed?: number;
  likes?: number;
  comments?: number;
  subscribersGained?: number; // allow negative values
  trafficSource?: string;
  notes?: string;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalVideos: number;
  totalViews: number;
  totalWatchTimeMinutes: number;
  totalSubscribersGained: number;
  averageCtr: number | null;
  averageViewDurationSeconds: number | null;
  averagePercentageViewed: number | null;
  engagementRate: number | null;
  hasReliableBaseline: boolean;
  baselineNote?: string;
  demoCount: number;
  realCount: number;
}

// -------------------------------------------------------------
// DAILY CONTENT RADAR & NEXT VIDEO INTELLIGENCE TYPES
// -------------------------------------------------------------
export interface ContentOpportunity {
  id: string;
  title: string;
  topic: string;
  angle: string;
  format: string;
  suggestedDuration: number;
  suggestedDurationDisplay: string;
  creatorFitScore: number;
  opportunityScore: number;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  whyNow: string;
  whyThisFitsYou: string;
  hook: string;
  suggestedProductionMethod: string;
  language: string;
  tags: string[];
  sourceType: 'creator_profile' | 'creator_history' | 'performance' | 'content_gap' | 'manual';
  tierRequired: 'free' | 'pro' | 'creator' | 'max';
  clusterGroup?: string;
  seriesContext?: string;
  isSaved?: boolean;
}

export interface NextVideoRecommendation {
  id: string;
  recommendedVideo: string;
  whyNext: string;
  basedOn: string;
  basedOnType: 'performance' | 'creator_goal' | 'unfinished_project' | 'content_gap' | 'format_history';
  suggestedFormat: string;
  suggestedDuration: string;
  suggestedHook: string;
  productionMethod: string;
  confidence: string;
  isPerformanceBased: boolean;
  creatorFitScore: number;
  opportunityScore: number;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  tags?: string[];
}

export interface CreatorContentGap {
  id: string;
  area: string;
  category: 'Covered' | 'Underused' | 'Missing Opportunity';
  topicExample: string;
  rationale: string;
  recommendedAction: string;
}

export interface RadarUsageState {
  date: string; // YYYY-MM-DD
  opportunitiesGeneratedToday: number;
  refreshesToday: number;
  nextVideoRefreshesToday: number;
}


