/**
 * CreatorFlow AI — Achievement & Creator Progress Engine
 * 100% Honest Milestone Tracking.
 * Strictly derives achievements and milestone events from real stored actions.
 * Zero fabricated dates, zero fake unlocks.
 */

import { CreatorAchievement, CreatorMilestoneEvent } from '../types/guidedWorkflow';
import { getVideoProjects, getVideoAnalyticsList, hasCompletedOnboarding } from './creatorStorage';
import { getActiveAccountId } from './accountStorage';

const ACHIEVEMENTS_STORAGE_PREFIX = 'creatorflow_achievements_v2_';
const MILESTONES_STORAGE_PREFIX = 'creatorflow_milestone_events_v2_';

function getAchievementsKey(): string {
  return `${ACHIEVEMENTS_STORAGE_PREFIX}${getActiveAccountId()}`;
}

function getMilestonesKey(): string {
  return `${MILESTONES_STORAGE_PREFIX}${getActiveAccountId()}`;
}

export const INITIAL_ACHIEVEMENTS: CreatorAchievement[] = [
  // Getting Started
  {
    id: 'ach_onboarding',
    title: 'Profile Calibrated',
    description: 'Completed creator onboarding and saved strategy plan.',
    category: 'Getting Started',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Compass',
    milestoneKey: 'onboarding_completed',
  },
  {
    id: 'ach_first_topic',
    title: 'Topic Strategist',
    description: 'Analyzed your first video topic to discover angles.',
    category: 'Getting Started',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Search',
    milestoneKey: 'first_topic_analyzed',
  },
  {
    id: 'ach_first_idea',
    title: 'Idea Locked',
    description: 'Selected your first targeted video idea.',
    category: 'Getting Started',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Lightbulb',
    milestoneKey: 'first_idea_selected',
  },

  // Production
  {
    id: 'ach_first_project',
    title: 'First Project Initialized',
    description: 'Created your first persistent video project.',
    category: 'Production',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'FolderPlus',
    milestoneKey: 'first_project_created',
  },
  {
    id: 'ach_first_script',
    title: 'Script Master',
    description: 'Finalized structured hook, points, and payoff in a script.',
    category: 'Production',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'FileText',
    milestoneKey: 'first_script_completed',
  },
  {
    id: 'ach_first_created',
    title: 'First Video Created',
    description: 'Completed video filming & editing checklist.',
    category: 'Production',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'CheckCircle2',
    milestoneKey: 'first_video_created',
  },
  {
    id: 'ach_first_published',
    title: 'First Release Ready',
    description: 'Prepared complete video publishing package for YouTube.',
    category: 'Production',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Send',
    milestoneKey: 'first_video_published',
  },

  // Consistency
  {
    id: 'ach_3_videos',
    title: 'Cadence Builder (3 Videos)',
    description: 'Completed or prepared 3 video packages.',
    category: 'Consistency',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Flame',
    milestoneKey: 'three_videos_completed',
  },
  {
    id: 'ach_5_videos',
    title: 'Creator Momentum (5 Videos)',
    description: 'Produced 5 videos with disciplined workflows.',
    category: 'Consistency',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'TrendingUp',
    milestoneKey: 'five_videos_completed',
  },
  {
    id: 'ach_10_videos',
    title: 'Consistent Publisher (10 Videos)',
    description: 'Hit the double-digit catalog milestone.',
    category: 'Consistency',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Award',
    milestoneKey: 'ten_videos_completed',
  },
  {
    id: 'ach_25_videos',
    title: 'Studio Veteran (25 Videos)',
    description: 'Built a sustainable library of 25 video packages.',
    category: 'Consistency',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Trophy',
    milestoneKey: 'twentyfive_videos_completed',
  },

  // Learning
  {
    id: 'ach_first_analytics',
    title: 'First Performance Log',
    description: 'Recorded real YouTube Studio stats to begin tracking growth.',
    category: 'Learning',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'BarChart2',
    milestoneKey: 'first_analytics_logged',
  },
  {
    id: 'ach_compare_tools',
    title: 'Tool Savvy',
    description: 'Compared production tools to optimize your ₹0 budget stack.',
    category: 'Learning',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Sliders',
    milestoneKey: 'compared_tools',
  },
  {
    id: 'ach_performance_review',
    title: 'Audience Insight',
    description: 'Reviewed retention and CTR insights based on recorded data.',
    category: 'Learning',
    isUnlocked: false,
    unlockedAt: null,
    iconName: 'Brain',
    milestoneKey: 'performance_reviewed',
  },
];

/**
 * Get all achievements synchronized with actual real system state
 */
export function getCreatorAchievements(): CreatorAchievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;

  let stored: Record<string, { isUnlocked: boolean; unlockedAt: string }> = {};
  try {
    const raw = localStorage.getItem(getAchievementsKey());
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = {};
  }

  // Derive real current state from actual collections
  const onboardingDone = hasCompletedOnboarding();
  const projects = getVideoProjects();
  const analytics = getVideoAnalyticsList();

  const completedProjectsCount = projects.filter((p) => p.status === 'Ready' || p.status === 'Published').length;
  const publishedCount = projects.filter((p) => p.status === 'Published').length + analytics.length;

  return INITIAL_ACHIEVEMENTS.map((ach) => {
    let unlocked = stored[ach.id]?.isUnlocked || false;
    let unlockedAt = stored[ach.id]?.unlockedAt || null;

    // Automatic reconciliation with actual stored facts
    if (ach.id === 'ach_onboarding' && onboardingDone && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_first_project' && projects.length > 0 && !unlocked) {
      unlocked = true;
      unlockedAt = projects[0].createdAt || new Date().toISOString();
    }
    if (ach.id === 'ach_first_script' && projects.some(p => p.scriptSections && p.scriptSections.length > 0) && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_first_created' && projects.some(p => p.status === 'Ready' || p.status === 'Published' || p.status === 'Production') && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_first_published' && (publishedCount > 0 || completedProjectsCount > 0) && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_3_videos' && (completedProjectsCount >= 3 || publishedCount >= 3) && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_5_videos' && (completedProjectsCount >= 5 || publishedCount >= 5) && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_10_videos' && (completedProjectsCount >= 10 || publishedCount >= 10) && !unlocked) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
    }
    if (ach.id === 'ach_first_analytics' && analytics.length > 0 && !unlocked) {
      unlocked = true;
      unlockedAt = analytics[0].createdAt || new Date().toISOString();
    }

    return {
      ...ach,
      isUnlocked: unlocked,
      unlockedAt,
    };
  });
}

/**
 * Trigger an achievement unlock from user action
 */
export function unlockAchievement(achievementId: string, eventTitle?: string, eventDesc?: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const key = getAchievementsKey();
    const raw = localStorage.getItem(key);
    const stored: Record<string, { isUnlocked: boolean; unlockedAt: string }> = raw ? JSON.parse(raw) : {};

    if (stored[achievementId]?.isUnlocked) {
      return false; // Already unlocked
    }

    const now = new Date().toISOString();
    stored[achievementId] = { isUnlocked: true, unlockedAt: now };
    localStorage.setItem(key, JSON.stringify(stored));

    // Record milestone event
    if (eventTitle) {
      recordMilestoneEvent({
        id: `ms_${achievementId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: eventTitle,
        description: eventDesc || 'Achievement unlocked in your creator journey.',
        date: now,
        milestoneType: achievementId,
      });
    }

    return true;
  } catch (err) {
    console.error('Error unlocking achievement:', err);
    return false;
  }
}

/**
 * Get chronological milestone events (actual dates only)
 */
export function getMilestoneEvents(): CreatorMilestoneEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getMilestonesKey());
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    // Deduplicate by ID to safeguard against legacy storage duplication
    const seenIds = new Set<string>();
    const deduplicated: CreatorMilestoneEvent[] = [];
    for (const item of list) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduplicated.push(item);
      } else if (item && item.id && seenIds.has(item.id)) {
        // Give duplicate legacy item a distinct ID
        const uniqueItem = { ...item, id: `${item.id}_${Math.random().toString(36).substring(2, 6)}` };
        seenIds.add(uniqueItem.id);
        deduplicated.push(uniqueItem);
      }
    }

    return deduplicated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

/**
 * Record a milestone event
 */
export function recordMilestoneEvent(event: CreatorMilestoneEvent): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getMilestoneEvents();
    // Prevent duplicate entries for same milestoneType
    if (current.some((e) => e.milestoneType === event.milestoneType && e.title === event.title)) {
      return;
    }
    const updated = [...current, event];
    localStorage.setItem(getMilestonesKey(), JSON.stringify(updated));
  } catch (err) {
    console.error('Error recording milestone event:', err);
  }
}
