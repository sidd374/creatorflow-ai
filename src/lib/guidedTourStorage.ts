/**
 * CreatorFlow AI — Guided Tour State & Persistence Layer
 *
 * Tracks first-login welcome modal status, tour completion, and resumable step progress
 * per authenticated user account with cloud Firestore sync and local offline fallback.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getCurrentAccount } from './auth';
import { ANONYMOUS_ACCOUNT_ID, getAccountScopedKey } from './accountStorage';

export const CURRENT_TOUR_VERSION = 1;
export const TOTAL_TOUR_STEPS = 8;

export interface OnboardingTourProgress {
  completed: boolean;
  tourVersion: number;
  lastCompletedStep: number;
  dismissedWelcomeModal: boolean;
  completedAt?: string;
  skippedAt?: string;
  updatedAt: string;
}

const DEFAULT_TOUR_PROGRESS: OnboardingTourProgress = {
  completed: false,
  tourVersion: CURRENT_TOUR_VERSION,
  lastCompletedStep: 0,
  dismissedWelcomeModal: false,
  updatedAt: new Date().toISOString(),
};

const inMemoryTourProgressByAccount = new Map<string, OnboardingTourProgress>();

/**
 * Returns the account-scoped tour storage key
 */
function getTourStorageKey(accountId: string): string {
  return getAccountScopedKey(accountId, 'onboarding_tour');
}

/**
 * Retrieves the stored tour progress for the active account
 */
export function getTourProgress(customAccountId?: string): OnboardingTourProgress {
  const user = getCurrentAccount();
  const accountId = customAccountId || (user && user.id ? user.id : ANONYMOUS_ACCOUNT_ID);

  if (typeof window === 'undefined') {
    return inMemoryTourProgressByAccount.get(accountId) || { ...DEFAULT_TOUR_PROGRESS };
  }

  try {
    const raw = localStorage.getItem(getTourStorageKey(accountId));
    if (!raw) return DEFAULT_TOUR_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      completed: Boolean(parsed.completed),
      tourVersion: typeof parsed.tourVersion === 'number' ? parsed.tourVersion : CURRENT_TOUR_VERSION,
      lastCompletedStep: typeof parsed.lastCompletedStep === 'number' ? parsed.lastCompletedStep : 0,
      dismissedWelcomeModal: Boolean(parsed.dismissedWelcomeModal),
      completedAt: parsed.completedAt,
      skippedAt: parsed.skippedAt,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[CreatorFlow Tour] Failed to parse tour progress:', err);
    return DEFAULT_TOUR_PROGRESS;
  }
}

/**
 * Asynchronously pushes tour progress to Firestore under /workspaces/{accountId}/resources/onboarding_tour
 */
async function syncTourToCloud(accountId: string, progress: OnboardingTourProgress): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!accountId || accountId === ANONYMOUS_ACCOUNT_ID) return;
  if (!auth.currentUser || auth.currentUser.uid !== accountId) return;

  try {
    const payloadJson = JSON.stringify(progress).slice(0, 490000);
    const ref = doc(db, 'workspaces', accountId, 'resources', 'onboarding_tour');
    await setDoc(ref, {
      accountId,
      resource: 'onboarding_tour',
      payloadJson,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking cloud sync
    console.warn('[CreatorFlow Tour] Cloud sync skipped for onboarding_tour:', err);
  }
}

/**
 * Asynchronously pushes tour progress to server endpoint if available
 */
async function syncTourToServer(progress: OnboardingTourProgress): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    if (!token) return;
    await fetch('/api/user/tour-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(progress),
    });
  } catch {
    // Non-blocking server sync
  }
}

/**
 * Saves tour progress locally and triggers non-blocking cloud persistence
 */
export async function saveTourProgress(
  updates: Partial<OnboardingTourProgress>,
  customAccountId?: string
): Promise<OnboardingTourProgress> {
  const user = getCurrentAccount();
  const accountId = customAccountId || (user && user.id ? user.id : ANONYMOUS_ACCOUNT_ID);

  const current = getTourProgress(accountId);
  const next: OnboardingTourProgress = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  inMemoryTourProgressByAccount.set(accountId, next);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getTourStorageKey(accountId), JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent('creatorflow_tour_changed', {
          detail: { accountId, progress: next },
        })
      );
    } catch (err) {
      console.warn('[CreatorFlow Tour] Failed to save tour progress locally:', err);
    }
  }

  // Cloud sync if authenticated
  if (accountId !== ANONYMOUS_ACCOUNT_ID) {
    syncTourToCloud(accountId, next).catch(() => {});
    syncTourToServer(next).catch(() => {});
  }

  return next;
}

/**
 * Checks if the first-login welcome modal should be shown
 */
export function shouldShowWelcomeModal(customAccountId?: string): boolean {
  const user = getCurrentAccount();
  const accountId = customAccountId || (user && user.id ? user.id : null);
  if (!accountId) return false;

  const progress = getTourProgress(accountId);
  // Show only if not already completed and not already dismissed/skipped
  return !progress.completed && !progress.dismissedWelcomeModal;
}

/**
 * Marks welcome modal as dismissed without starting tour (user chose 'Explore on My Own')
 */
export async function dismissWelcomeModal(customAccountId?: string): Promise<void> {
  await saveTourProgress(
    {
      dismissedWelcomeModal: true,
      skippedAt: new Date().toISOString(),
    },
    customAccountId
  );
}

/**
 * Marks the tour as completed
 */
export async function markTourCompleted(customAccountId?: string): Promise<void> {
  await saveTourProgress(
    {
      completed: true,
      dismissedWelcomeModal: true,
      lastCompletedStep: TOTAL_TOUR_STEPS,
      completedAt: new Date().toISOString(),
    },
    customAccountId
  );
}

/**
 * Resets tour progress so the user can replay it from Step 1
 */
export async function resetTourForReplay(customAccountId?: string): Promise<void> {
  await saveTourProgress(
    {
      lastCompletedStep: 0,
    },
    customAccountId
  );
}
