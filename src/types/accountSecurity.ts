/**
 * CreatorFlow AI — Account, Device Security & Usage Risk Types
 */

import { PlanId } from '../lib/planEntitlements';

export type RiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export type MeteredFeature =
  | 'creation_kit'
  | 'ai_assistant'
  | 'topic_analysis'
  | 'project_creation'
  | 'idea_generation';

export interface CreatorFlowAccount {
  id: string; // Stable internal account ID (e.g. acc_google_12345)
  providerId: string; // Google OAuth sub / provider ID
  email: string;
  displayName: string;
  photoURL?: string;
  plan: PlanId;
  createdAt: string;
  lastLoginAt: string;
  isVerified: boolean;
  associatedDeviceIds: string[];
}

export interface UsageRecord {
  id: string;
  accountId: string;
  deviceInstallId: string;
  feature: MeteredFeature;
  period: string; // e.g. '2026-10'
  timestamp: string; // Server ISO timestamp
  success: boolean;
}

export interface AccountUsageSummary {
  month: string;
  creationKitsUsed: number;
  creationKitsLimit: number | 'unlimited';
  assistantMessagesUsed: number;
  assistantMessagesLimit: number | 'unlimited';
  projectsCreated: number;
  projectsLimit: number | 'unlimited';
  topicsAnalyzed: number;
}

export interface CheckUsageResult {
  allowed: boolean;
  remaining: number;
  limit: number | 'unlimited';
  plan: PlanId;
  reason: 'OK' | 'LIMIT_REACHED' | 'HIGH_RISK_RESTRICTION' | 'VERIFICATION_REQUIRED' | 'FEATURE_LOCKED';
  riskStatus: RiskLevel;
  message?: string;
  usage?: AccountUsageSummary;
}

export interface DeviceSecurityDiagnostics {
  deviceInstallId: string;
  firstSeen: string;
  lastSeen: string;
  associatedAccountIds: string[];
  recentSwitchesCount: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  activeAccountId: string | null;
  serverTimestamp: string;
}

export interface DeviceAccountSession {
  accountId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: PlanId;
  lastUsedAt: string;
}
