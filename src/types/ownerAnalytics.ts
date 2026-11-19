/**
 * CreatorFlow AI — Owner Analytics & Product Intelligence Types
 * Schema for real account-based event tracking, conversion funnels,
 * feature performance, retention cohorts, error monitoring, and workflow telemetry.
 */

export type OwnerTab =
  | 'overview'
  | 'users'
  | 'engagement'
  | 'funnel'
  | 'features'
  | 'retention'
  | 'errors'
  | 'system';

export type UserRole = 'user' | 'admin' | 'owner';

export type CreatorFlowEventName =
  | 'signup_completed'
  | 'login_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'idea_generated'
  | 'project_created'
  | 'creation_kit_created'
  | 'prompt_copied'
  | 'script_created'
  | 'visual_plan_created'
  | 'voice_workflow_used'
  | 'editing_workflow_used'
  | 'publishing_started'
  | 'publishing_completed'
  | 'creator_analytics_used'
  | 'upgrade_viewed'
  | 'checkout_started'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'feature_used'
  | 'project_completed'
  | 'workflow_step_entered'
  | 'workflow_step_completed'
  | 'product_error'
  | 'session_started'
  | 'radar_opportunity_generated'
  | 'radar_refresh'
  | 'radar_opportunity_saved'
  | 'radar_opportunity_dismissed'
  | 'radar_opportunity_to_idea'
  | 'radar_opportunity_to_project'
  | 'next_video_generated'
  | 'next_video_refresh'
  | 'next_video_to_project'
  | 'radar_limit_reached'
  | 'radar_upgrade_viewed'
  | 'next_video_limit_reached'
  | 'next_video_upgrade_viewed'
  | 'custom_annual_configured'
  | 'dev_plan_switched'
  | 'upgrade_inquiry_submitted'
  | 'plan_request_submitted';

export interface CreatorFlowEvent {
  id: string;
  eventName: CreatorFlowEventName;
  accountId: string;
  timestamp: string; // ISO String
  plan: string;
  feature?: string;
  projectId?: string;
  workflowStep?: number;
  properties?: Record<string, any>;
  errorMessage?: string;
  errorType?: string;
}

export type AnalyticsDateRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface OwnerOverviewMetrics {
  // Users
  totalAccounts: number;
  newAccounts: number;
  activeUsers: number;
  returningUsers: number;
  planBreakdown: {
    free: number;
    pro: number;
    creator: number;
    max: number;
  };
  // Engagement
  ideasGenerated: number;
  projectsCreated: number;
  creationKitsCreated: number;
  promptsCopied: number;
  publishingStarted: number;
  projectsCompleted: number;
  // Conversion Rates (percentages or null if not enough data)
  conversion: {
    signupToOnboarding: number | null;
    onboardingToFirstIdea: number | null;
    firstIdeaToFirstProject: number | null;
    firstProjectToCreationKit: number | null;
    creationKitToUpgrade: number | null;
    upgradeToPaid: number | null;
  };
  // Retention (percentages or null if not enough data)
  retention: {
    day1: number | null;
    day7: number | null;
    day30: number | null;
  };
  hasEnoughData: boolean;
}

export interface OwnerUserRecord {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  plan: string;
  createdAt: string;
  lastActive: string;
  projectsCount: number;
  ideasCount: number;
  creationKitsCount: number;
  status: 'active' | 'inactive';
}

export interface FunnelStageData {
  id: string;
  name: string;
  stepNumber: number;
  userCount: number;
  conversionFromPrev: number | null; // % of previous stage
  dropOffRate: number | null; // % who left at this stage
}

export interface FeaturePerformanceData {
  id: string;
  name: string;
  category: string;
  uniqueUsers: number;
  totalUses: number;
  repeatUsers: number;
  usageRate: number | null; // % of active users who used it
  completionRate: number | null; // % who completed where measurable
  upgradeAfterUseRate: number | null; // % of users who used this feature AND later upgraded
  lastUsedAt?: string;
}

export interface WorkflowProgressionData {
  step: number;
  name: string;
  usersEntered: number;
  usersCompleted: number;
  dropOffRate: number | null;
}

export interface RetentionCohortRow {
  cohortDate: string; // e.g. "2026-10-01"
  usersAcquired: number;
  day1Count: number;
  day1Rate: number | null;
  day7Count: number;
  day7Rate: number | null;
  day30Count: number;
  day30Rate: number | null;
}

export interface ProductErrorRecord {
  id: string;
  errorType: string;
  timestamp: string;
  feature?: string;
  affectedAccountsCount: number;
  occurrenceCount: number;
  lastMessageSnippet?: string;
}

export interface SystemTelemetryData {
  isConfigured: boolean;
  apiFailures: number | null;
  requestFailures: number | null;
  averageResponseTimeMs: number | null;
  errorRatePct: number | null;
  serviceAvailabilityPct: number | null;
  notes?: string;
}

export interface DailyEngagementPoint {
  date: string;
  totalEvents: number;
  activeAccounts: number;
  ideas: number;
  kits: number;
  projects: number;
}

export interface PlanEngagementMetric {
  plan: string;
  userCount: number;
  totalEvents: number;
  avgEventsPerUser: number;
}

export interface EngagementDetails {
  ideasGenerated: number;
  projectsCreated: number;
  creationKitsCreated: number;
  promptsCopied: number;
  publishingStarted: number;
  projectsCompleted: number;
  activeCreatorsCount: number;
  passiveCreatorsCount: number;
  activeCreatorRatioPct: number | null;
  mostEngagedPlanTier: string | null;
  planEngagement: PlanEngagementMetric[];
  dailyTimeline: DailyEngagementPoint[];
  hasData: boolean;
}

export interface RetentionAnalysisData {
  day1Rate: number | null;
  day7Rate: number | null;
  day30Rate: number | null;
  cohorts: RetentionCohortRow[];
  hasEnoughHistoricalData: boolean;
  totalTrackedAccounts: number;
  frequencyDistribution: {
    singleVisit: number;
    twoToFiveVisits: number;
    sixToFifteenVisits: number;
    moreThanFifteenVisits: number;
  };
}
