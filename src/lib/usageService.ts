/**
 * CreatorFlow AI — Centralized Entitlement & Usage Service
 * Authoritative Server-Side Validation Layer with Privacy-Preserving Device Risk Signals
 */

import { CheckUsageResult, MeteredFeature, AccountUsageSummary, RiskLevel } from '../types/accountSecurity';
import { getOrCreateDeviceInstallId } from './deviceSecurity';
import { getStoredPlan } from './planEntitlements';
import { getAuthIdToken } from './auth';

const USAGE_CACHE_PREFIX = 'cf_usage_cache_';

function getUsageCacheKey(accountId: string): string {
  return `${USAGE_CACHE_PREFIX}${accountId}`;
}

export class CentralizedUsageService {
  /**
   * Centralized check for feature usage authorization
   */
  async checkUsage(accountId: string, feature: MeteredFeature): Promise<CheckUsageResult> {
    const deviceInstallId = getOrCreateDeviceInstallId();
    const idToken = await getAuthIdToken();

    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-creatorflow-device-id': deviceInstallId,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          accountId,
          deviceInstallId,
          feature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Usage check failed with status: ${response.status}`);
      }

      const result: CheckUsageResult = await response.json();
      
      // Cache verified server usage for account
      if (result.usage && typeof window !== 'undefined') {
        localStorage.setItem(getUsageCacheKey(accountId), JSON.stringify(result.usage));
      }

      return result;
    } catch (err) {
      console.warn('Server-side usage check failed or offline:', err);
      return this.handleOfflineUsageCheck(accountId, feature);
    }
  }

  /**
   * Authoritative usage record consumption
   */
  async recordUsage(accountId: string, feature: MeteredFeature): Promise<CheckUsageResult> {
    const deviceInstallId = getOrCreateDeviceInstallId();
    const idToken = await getAuthIdToken();

    try {
      const response = await fetch('/api/usage/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-creatorflow-device-id': deviceInstallId,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          accountId,
          deviceInstallId,
          feature,
        }),
      });

      if (response.status === 403) {
        const errorData = await response.json();
        return {
          allowed: false,
          remaining: 0,
          limit: 3,
          plan: 'free',
          reason: 'LIMIT_REACHED',
          riskStatus: 'LOW_RISK',
          message: errorData.message || "You've reached your Free Creation Kit limit for this month.",
        };
      }

      if (!response.ok) {
        throw new Error(`Usage record failed with status: ${response.status}`);
      }

      const result: CheckUsageResult = await response.json();

      if (result.usage && typeof window !== 'undefined') {
        localStorage.setItem(getUsageCacheKey(accountId), JSON.stringify(result.usage));
      }

      return result;
    } catch (err) {
      console.warn('Server-side usage record failed or offline:', err);
      // OFFLINE BEHAVIOR: Never assume unlimited usage for metered actions
      return {
        allowed: false,
        remaining: 0,
        limit: 3,
        plan: getStoredPlan(),
        reason: 'LIMIT_REACHED',
        riskStatus: 'LOW_RISK',
        message: "CreatorFlow couldn't verify your usage right now. Please reconnect and try again.",
      };
    }
  }

  /**
   * Fetches latest authoritative account usage summary
   */
  async getUsageSummary(accountId: string): Promise<AccountUsageSummary | null> {
    const deviceInstallId = getOrCreateDeviceInstallId();
    const idToken = await getAuthIdToken();
    try {
      const res = await fetch(
        `/api/usage/summary?accountId=${encodeURIComponent(accountId)}&deviceId=${encodeURIComponent(deviceInstallId)}`,
        {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.usage && typeof window !== 'undefined') {
          localStorage.setItem(getUsageCacheKey(accountId), JSON.stringify(data.usage));
        }
        return data.usage || null;
      }
    } catch {
      // ignore
    }

    // Read cached server usage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(getUsageCacheKey(accountId));
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Reauthenticates account with Google/Microsoft to resolve MEDIUM_RISK or soft restrictions
   */
  async reauthenticate(accountId: string): Promise<{ success: boolean; riskLevel: RiskLevel; message?: string }> {
    const deviceInstallId = getOrCreateDeviceInstallId();
    const idToken = await getAuthIdToken();
    try {
      const res = await fetch('/api/auth/reauthenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ accountId, deviceInstallId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Reauthentication request failed:', err);
    }
    return { success: false, riskLevel: 'MEDIUM_RISK', message: 'Re-authentication failed' };
  }

  /**
   * Offline safety rule: Never grant unlimited usage if server is unreachable
   */
  private handleOfflineUsageCheck(accountId: string, feature: MeteredFeature): CheckUsageResult {
    // If cached usage is at limit, reject
    let cachedUsage: AccountUsageSummary | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(getUsageCacheKey(accountId));
        if (raw) cachedUsage = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (cachedUsage && cachedUsage.creationKitsUsed >= (typeof cachedUsage.creationKitsLimit === 'number' ? cachedUsage.creationKitsLimit : 3)) {
      return {
        allowed: false,
        remaining: 0,
        limit: cachedUsage.creationKitsLimit,
        plan: getStoredPlan(),
        reason: 'LIMIT_REACHED',
        riskStatus: 'LOW_RISK',
        message: "You've reached your Free Creation Kit limit for this month.",
        usage: cachedUsage,
      };
    }

    // Conservative offline lock for metered generation
    return {
      allowed: false,
      remaining: 0,
      limit: 3,
      plan: getStoredPlan(),
      reason: 'LIMIT_REACHED',
      riskStatus: 'LOW_RISK',
      message: "CreatorFlow couldn't verify your usage right now. Please reconnect and try again.",
    };
  }
}

export const usageService = new CentralizedUsageService();
