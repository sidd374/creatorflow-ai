/**
 * CreatorFlow AI — Account-Isolated Assistant Storage & History
 * Stores session messages (capped at 20) and monthly usage counters scoped to the active account.
 * Guarantees zero cross-account conversation leaks.
 */

import {
  getIsolatedAssistantHistory,
  saveIsolatedAssistantHistory,
  clearIsolatedAssistantHistory,
  getActiveAccountId,
} from './accountStorage';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const ASSISTANT_USAGE_PREFIX = 'cf_assistant_usage_';

export function getAssistantHistory(accountId?: string): AssistantMessage[] {
  return getIsolatedAssistantHistory(accountId || getActiveAccountId());
}

export function saveAssistantHistory(messages: AssistantMessage[], accountId?: string): void {
  saveIsolatedAssistantHistory(messages, accountId || getActiveAccountId());
}

export function clearAssistantHistory(accountId?: string): void {
  clearIsolatedAssistantHistory(accountId || getActiveAccountId());
}

export function getAssistantUsage(accountId: string = getActiveAccountId()): { month: string; messageCount: number } {
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const defaultVal = { month: currentMonth, messageCount: 0 };

  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(`${ASSISTANT_USAGE_PREFIX}${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.month === currentMonth) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return defaultVal;
}

export function incrementAssistantUsage(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const usage = getAssistantUsage(accountId);
    usage.messageCount += 1;
    localStorage.setItem(`${ASSISTANT_USAGE_PREFIX}${accountId}`, JSON.stringify(usage));
  } catch (err) {
    console.error('Failed to increment assistant usage:', err);
  }
}
