/**
 * CreatorFlow AI — Admin Analytics & Telemetry Types
 * Schema for real event tracking, conversion funnels, subscription analytics,
 * feature performance, and system connectivity.
 */

export type AdminTab =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'revenue'
  | 'product_usage'
  | 'conversion'
  | 'feature_performance'
  | 'system'
  | 'settings';

export type AdminEventType =
  | 'page_view'
  | 'signup'
  | 'login'
  | 'onboarding_complete'
  | 'project_create'
  | 'generation_start'
  | 'generation_complete'
  | 'tool_selected'
  | 'creation_kit_opened'
  | 'upgrade_page_viewed'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'feature_used'
  | 'custom_event';

export type CreatorFeatureId =
  | 'topic_analyzer'
  | 'idea_generator'
  | 'strategy_engine'
  | 'creation_kit'
  | 'ai_video_prompt_generator'
  | 'character_consistency'
  | 'script_builder'
  | 'visual_planner'
  | 'publishing_studio'
  | 'analytics'
  | 'trend_radar'
  | 'content_gap_finder'
  | 'series_planner'
  | 'next_video_intelligence';

export interface AdminTelemetryEvent {
  id: string;
  type: AdminEventType;
  timestamp: string; // ISO String
  accountId: string;
  sessionId: string;
  properties?: Record<string, any>;
}

export interface FunnelStage {
  id: string;
  label: string;
  description: string;
  enteredCount: number | null;
  completedCount: number | null;
  dropOffRate: number | null; // e.g. 24.5 for 24.5%
  isBackendConnected: boolean;
}

export interface FeatureMetric {
  id: CreatorFeatureId;
  name: string;
  category: string;
  usersCount: number | null;
  totalUses: number | null;
  repeatUsersCount: number | null;
  conversionAfterUseRate: number | null; // % who upgraded to paid after using
  lastUsedTimestamp?: string;
}

export interface UpgradeTriggerMetric {
  featureId: CreatorFeatureId | string;
  featureName: string;
  upgradeCount: number | null;
  upgradeRate: number | null; // % of upgrades that had this as last major action
}

export interface RetentionCohort {
  cohortDate: string; // e.g. "2026-W38"
  usersCount: number;
  day1Rate: number | null;
  day7Rate: number | null;
  day30Rate: number | null;
}

export interface SystemServiceStatus {
  service: string;
  status: 'connected' | 'disconnected' | 'ready_local' | 'degraded';
  details: string;
  lastChecked: string;
}
