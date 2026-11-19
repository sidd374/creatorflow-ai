/**
 * CreatorFlow AI — Phase 3 Local Creator Profile & Activity Storage
 * 100% browser-based persistence via localStorage.
 * Survives page refreshes with zero external database dependencies.
 */

import { CreatorProfile, CreatorActivityStats, RecommendedVideoIdea, VideoProject, VideoIdea, VideoAnalytics } from '../types';
import {
  getIsolatedProfile,
  saveIsolatedProfile,
  getIsolatedProjects,
  saveIsolatedProjects,
  getIsolatedIdeas,
  saveIsolatedIdeas,
  getIsolatedAnalytics,
  saveIsolatedAnalytics,
  getIsolatedActivityStats,
  saveIsolatedActivityStats,
} from './accountStorage';

const PROFILE_STORAGE_KEY = 'creatorflow_creator_profile_v3';

export const DEFAULT_CREATOR_PROFILE: CreatorProfile = {
  channelExists: 'no',
  channelTopic: 'Tech tutorials & AI tools for beginners',
  subscriberRange: '0–100',
  uploadFrequency: 'Weekly',
  creatorStage: 'New Creator',
  primaryGoal: 'Grow subscribers',
  secondaryGoals: ['Get more views', 'Learn content creation'],
  goalTimeline: '6 months',
  contentCategories: ['Tutorials', 'Tech', 'AI'],
  experienceLevel: 'Beginner',
  dailyTimeAvailable: '1–2 hours/day',
  availableDevices: ['Phone', 'Laptop / PC', 'Microphone'],
  availableTools: ['CapCut (Free)', 'Canva (Free)', 'Screen Recorder'],
  monthlyBudget: '₹0 — Free only',
  aiExperience: 'Sometimes',
  aiNeeds: ['Ideas', 'Scripts', 'Thumbnails', 'SEO'],
  creatorStyle: 'Educational creator',
  preferredLanguage: 'English',
  preferredPlatform: 'YouTube',
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_ACTIVITY_STATS: CreatorActivityStats = {
  recommendedVideosCount: 0,
  videosPlannedCount: 0,
  videosCompletedCount: 0,
  publishingQueueCount: 0,
  videosPublishedTotal: 0,
  viewsLoggedTotal: 0,
  subscribersLoggedTotal: 0,
  consistencyScorePct: 0,
  goalProgressPct: 0,
};

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const profile = getCreatorProfile();
  return Boolean(profile && profile.onboardingCompleted);
}

export function getCreatorProfile(): CreatorProfile {
  if (typeof window === 'undefined') return DEFAULT_CREATOR_PROFILE;
  const isolated = getIsolatedProfile();
  if (isolated) return { ...DEFAULT_CREATOR_PROFILE, ...isolated };
  return DEFAULT_CREATOR_PROFILE;
}

export function saveCreatorProfile(profile: CreatorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    saveIsolatedProfile(updated);
  } catch (err) {
    console.error('Error saving creator profile to localStorage:', err);
  }
}

export function resetCreatorProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    saveIsolatedProfile(DEFAULT_CREATOR_PROFILE);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (err) {
    console.error('Error resetting creator profile:', err);
  }
}

export function getActivityStats(): CreatorActivityStats {
  if (typeof window === 'undefined') return DEFAULT_ACTIVITY_STATS;
  try {
    const isolated = getIsolatedActivityStats();
    if (!isolated) return DEFAULT_ACTIVITY_STATS;
    return { ...DEFAULT_ACTIVITY_STATS, ...isolated };
  } catch {
    return DEFAULT_ACTIVITY_STATS;
  }
}

export function saveActivityStats(stats: Partial<CreatorActivityStats>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getActivityStats();
    const updated: CreatorActivityStats = { ...current, ...stats };
    saveIsolatedActivityStats(updated);
  } catch (err) {
    console.error('Error saving activity stats:', err);
  }
}

export function getSavedIdeas(): RecommendedVideoIdea[] | null {
  if (typeof window === 'undefined') return null;
  return getIsolatedIdeas();
}

export function saveIdeas(ideas: RecommendedVideoIdea[]): void {
  if (typeof window === 'undefined') return;
  try {
    saveIsolatedIdeas(ideas);
  } catch (err) {
    console.error('Error saving ideas to localStorage:', err);
  }
}

// -------------------------------------------------------------
// VIDEO PROJECTS STORAGE & PERSISTENCE
// -------------------------------------------------------------
export function getVideoProjects(): VideoProject[] {
  if (typeof window === 'undefined') return [];
  const isolated = getIsolatedProjects();
  return isolated
    .filter((p) => p && typeof p === 'object' && typeof p.id === 'string')
    .map((p) => ({
      ...p,
      topic: p.topic || 'Untitled Video Project',
      format: p.format || 'Long-form',
      targetAudience: p.targetAudience || 'Beginner Creators',
      primaryGoal: p.primaryGoal || 'Grow YouTube Channel',
      difficulty: p.difficulty || 'Medium',
      estimatedMinutes: typeof p.estimatedMinutes === 'number' ? p.estimatedMinutes : 45,
      creatorFitScore: typeof p.creatorFitScore === 'number' ? p.creatorFitScore : 85,
      reasonForFit: Array.isArray(p.reasonForFit) ? p.reasonForFit : [],
      angle: p.angle || 'Practical Guide',
      status: p.status || 'Planned',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
}

export function getVideoProject(projectId: string): VideoProject | null {
  const projects = getVideoProjects();
  return projects.find((p) => p.id === projectId) || null;
}

export function saveVideoProject(project: VideoProject): void {
  if (typeof window === 'undefined' || !project || !project.id) return;
  try {
    const existing = getVideoProjects();
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    const index = existing.findIndex((p) => p.id === project.id);
    let nextList: VideoProject[];
    if (index >= 0) {
      nextList = [...existing];
      nextList[index] = updated;
    } else {
      nextList = [updated, ...existing];
    }
    saveIsolatedProjects(nextList);
  } catch (err) {
    console.error('Error saving video project to localStorage:', err);
  }
}

export function deleteVideoProject(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const projects = getVideoProjects();
    const nextProjects = projects.filter((p) => p.id !== projectId);
    saveIsolatedProjects(nextProjects);
  } catch (err) {
    console.error('Error deleting video project from localStorage:', err);
  }
}

export function createOrGetProjectFromIdea(
  idea: VideoIdea | RecommendedVideoIdea,
  profile: CreatorProfile
): VideoProject {
  const existingProjects = getVideoProjects();
  // Check if project for this idea already exists
  const found = existingProjects.find((p) => p.ideaId === idea.id);
  if (found) {
    return found;
  }

  // Derive minutes from estimatedTime or number
  let minutes = 45;
  if ('estimatedMinutes' in idea && idea.estimatedMinutes) {
    minutes = idea.estimatedMinutes;
  } else if ('estimatedTime' in idea && idea.estimatedTime) {
    if (idea.estimatedTime.includes('1.5')) minutes = 90;
    else if (idea.estimatedTime.includes('2')) minutes = 120;
    else if (idea.estimatedTime.includes('25') || idea.estimatedTime.includes('30')) minutes = 30;
    else if (idea.estimatedTime.includes('1 hour') || idea.estimatedTime.includes('60')) minutes = 60;
  }

  const topic = ('topic' in idea && idea.topic) ? idea.topic : idea.title;
  const targetAudience = idea.targetAudience || 'Beginner Creators';
  const primaryGoal = ('primaryGoal' in idea && idea.primaryGoal) ? idea.primaryGoal : ('goal' in idea ? (idea as any).goal : profile.primaryGoal);
  const angle = ('angle' in idea && idea.angle) ? idea.angle : (('suggestedAngle' in idea && (idea as any).suggestedAngle) ? (idea as any).suggestedAngle : 'Practical Guide');
  const reasons = ('reasonForFit' in idea && idea.reasonForFit) ? idea.reasonForFit : (('whyThisIdea' in idea && (idea as any).whyThisIdea) ? (idea as any).whyThisIdea : []);

  const newProject: VideoProject = {
    id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ideaId: idea.id,
    topic,
    format: idea.format,
    targetAudience,
    primaryGoal,
    difficulty: idea.difficulty,
    estimatedMinutes: minutes,
    creatorFitScore: idea.creatorFitScore,
    reasonForFit: reasons,
    angle,
    status: 'Planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveVideoProject(newProject);
  return newProject;
}

// -------------------------------------------------------------
// VIDEO ANALYTICS STORAGE & PERSISTENCE (PHASE 3G & 3H)
// -------------------------------------------------------------
export function getVideoAnalyticsList(): VideoAnalytics[] {
  if (typeof window === 'undefined') return [];
  const isolated = getIsolatedAnalytics();
  return isolated
    .filter((item) => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.videoTitle === 'string')
    .map((item) => ({
      ...item,
      videoTitle: item.videoTitle.trim(),
      format: item.format || 'Long-form',
      topic: item.topic || item.videoTitle,
      publishedDate: item.publishedDate || new Date().toISOString().split('T')[0],
      views: typeof item.views === 'number' && !isNaN(item.views) && item.views >= 0 ? Math.round(item.views) : undefined,
      impressions: typeof item.impressions === 'number' && !isNaN(item.impressions) && item.impressions >= 0 ? Math.round(item.impressions) : undefined,
      ctr: typeof item.ctr === 'number' && !isNaN(item.ctr) && item.ctr >= 0 && item.ctr <= 100 ? Number(item.ctr.toFixed(1)) : undefined,
      watchTimeMinutes: typeof item.watchTimeMinutes === 'number' && !isNaN(item.watchTimeMinutes) && item.watchTimeMinutes >= 0 ? item.watchTimeMinutes : undefined,
      averageViewDurationSeconds: typeof item.averageViewDurationSeconds === 'number' && !isNaN(item.averageViewDurationSeconds) && item.averageViewDurationSeconds >= 0 ? Math.round(item.averageViewDurationSeconds) : undefined,
      averagePercentageViewed: typeof item.averagePercentageViewed === 'number' && !isNaN(item.averagePercentageViewed) && item.averagePercentageViewed >= 0 && item.averagePercentageViewed <= 100 ? Number(item.averagePercentageViewed.toFixed(1)) : undefined,
      likes: typeof item.likes === 'number' && !isNaN(item.likes) && item.likes >= 0 ? Math.round(item.likes) : undefined,
      comments: typeof item.comments === 'number' && !isNaN(item.comments) && item.comments >= 0 ? Math.round(item.comments) : undefined,
      subscribersGained: typeof item.subscribersGained === 'number' && !isNaN(item.subscribersGained) ? Math.round(item.subscribersGained) : undefined,
      trafficSource: item.trafficSource || 'YouTube Search',
      notes: typeof item.notes === 'string' ? item.notes : '',
      isDemoData: Boolean(item.isDemoData || item.id.startsWith('test-va-')),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }));
}

export function getVideoAnalytics(id: string): VideoAnalytics | null {
  const list = getVideoAnalyticsList();
  return list.find((item) => item.id === id) || null;
}

export function saveVideoAnalytics(analytics: VideoAnalytics): void {
  if (typeof window === 'undefined' || !analytics || !analytics.id) return;
  try {
    const list = getVideoAnalyticsList();
    const index = list.findIndex((item) => item.id === analytics.id);
    let nextList: VideoAnalytics[];
    const updated = {
      ...analytics,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      nextList = [...list];
      nextList[index] = updated;
    } else {
      nextList = [updated, ...list];
    }
    saveIsolatedAnalytics(nextList);
  } catch (err) {
    console.error('Error saving video analytics to localStorage:', err);
  }
}

export function deleteVideoAnalytics(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getVideoAnalyticsList();
    const nextList = list.filter((item) => item.id !== id);
    saveIsolatedAnalytics(nextList);
  } catch (err) {
    console.error('Error deleting video analytics from localStorage:', err);
  }
}

/**
 * Remove only demo / test records, leaving real creator-entered data untouched
 */
export function clearDemoAnalytics(): VideoAnalytics[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getVideoAnalyticsList();
    const remaining = list.filter((item) => !item.isDemoData && !item.id.startsWith('test-va-'));
    saveIsolatedAnalytics(remaining);
    return remaining;
  } catch (err) {
    console.error('Error clearing demo analytics:', err);
    return [];
  }
}

/**
 * Check if demo analytics currently exist in storage
 */
export function hasDemoAnalytics(): boolean {
  const list = getVideoAnalyticsList();
  return list.some((item) => item.isDemoData || item.id.startsWith('test-va-'));
}

export function exportAnalyticsJson(): string {
  const list = getVideoAnalyticsList();
  return JSON.stringify(list, null, 2);
}

export function exportAnalyticsCsv(): string {
  const list = getVideoAnalyticsList();
  if (list.length === 0) return '';
  const headers = [
    'Title',
    'Published Date',
    'Format',
    'Topic',
    'Views',
    'Impressions',
    'CTR (%)',
    'Watch Time (Minutes)',
    'Avg View Duration (Seconds)',
    'Avg % Viewed',
    'Likes',
    'Comments',
    'Subscribers Gained',
    'Traffic Source',
    'Notes'
  ];

  const rows = list.map((item) => [
    `"${(item.videoTitle || '').replace(/"/g, '""')}"`,
    item.publishedDate || '',
    item.format || '',
    `"${(item.topic || '').replace(/"/g, '""')}"`,
    item.views ?? '',
    item.impressions ?? '',
    item.ctr ?? '',
    item.watchTimeMinutes ?? '',
    item.averageViewDurationSeconds ?? '',
    item.averagePercentageViewed ?? '',
    item.likes ?? '',
    item.comments ?? '',
    item.subscribersGained ?? '',
    `"${(item.trafficSource || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function importAnalyticsJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'Imported file must contain an array of video analytics.' };
    }
    const validated: VideoAnalytics[] = [];
    for (const item of parsed) {
      if (typeof item === 'object' && item && typeof item.videoTitle === 'string') {
        validated.push({
          id: item.id || `va-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          videoProjectId: item.videoProjectId,
          videoTitle: item.videoTitle.trim(),
          publishedDate: item.publishedDate || new Date().toISOString().split('T')[0],
          format: item.format || 'Long-form',
          topic: item.topic || item.videoTitle,
          views: typeof item.views === 'number' && item.views >= 0 ? Math.round(item.views) : undefined,
          impressions: typeof item.impressions === 'number' && item.impressions >= 0 ? Math.round(item.impressions) : undefined,
          ctr: typeof item.ctr === 'number' && item.ctr >= 0 && item.ctr <= 100 ? item.ctr : undefined,
          watchTimeMinutes: typeof item.watchTimeMinutes === 'number' && item.watchTimeMinutes >= 0 ? item.watchTimeMinutes : undefined,
          averageViewDurationSeconds: typeof item.averageViewDurationSeconds === 'number' && item.averageViewDurationSeconds >= 0 ? Math.round(item.averageViewDurationSeconds) : undefined,
          averagePercentageViewed: typeof item.averagePercentageViewed === 'number' && item.averagePercentageViewed >= 0 && item.averagePercentageViewed <= 100 ? item.averagePercentageViewed : undefined,
          likes: typeof item.likes === 'number' && item.likes >= 0 ? Math.round(item.likes) : undefined,
          comments: typeof item.comments === 'number' && item.comments >= 0 ? Math.round(item.comments) : undefined,
          subscribersGained: typeof item.subscribersGained === 'number' ? Math.round(item.subscribersGained) : undefined,
          trafficSource: item.trafficSource || 'YouTube Search',
          notes: item.notes || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (validated.length === 0) {
      return { success: false, count: 0, error: 'No valid video analytics records found.' };
    }

    // Merge or replace
    const current = getVideoAnalyticsList();
    const existingMap = new Map(current.map(i => [i.id, i]));
    validated.forEach(v => existingMap.set(v.id, v));
    const merged = Array.from(existingMap.values());
    saveIsolatedAnalytics(merged);

    return { success: true, count: validated.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Invalid JSON format' };
  }
}

/**
 * Development test data generator (for Acceptance Test 27)
 * Never loaded automatically without explicit creator action.
 */
export function seedSampleTestAnalytics(): VideoAnalytics[] {
  const sampleData: VideoAnalytics[] = [
    {
      id: 'test-va-1',
      videoTitle: 'How to Grow a YouTube Channel from 0 Subscribers (Step-by-Step)',
      publishedDate: '2026-09-01',
      format: 'Tutorial',
      topic: 'How to grow a YouTube channel',
      views: 3420,
      impressions: 48200,
      ctr: 7.1,
      watchTimeMinutes: 11450,
      averageViewDurationSeconds: 200,
      averagePercentageViewed: 52,
      likes: 210,
      comments: 48,
      subscribersGained: 142,
      trafficSource: 'YouTube Search',
      notes: 'Strong search volume; title with "Step-by-Step" performed well.',
      isDemoData: true,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'test-va-2',
      videoTitle: '7 Editing Mistakes Killing Your YouTube Retention',
      publishedDate: '2026-09-08',
      format: 'Educational',
      topic: 'Video Editing Tips',
      views: 2150,
      impressions: 34000,
      ctr: 6.3,
      watchTimeMinutes: 6800,
      averageViewDurationSeconds: 190,
      averagePercentageViewed: 48,
      likes: 135,
      comments: 29,
      subscribersGained: 68,
      trafficSource: 'Browse features',
      notes: 'Negative hook frame drew curious clicks.',
      isDemoData: true,
      createdAt: '2026-09-08T10:00:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
    },
    {
      id: 'test-va-3',
      videoTitle: 'Build a Full YouTube Content Pack in 60 Seconds #Shorts',
      publishedDate: '2026-09-14',
      format: 'Short',
      topic: 'Shorts Creation Workflow',
      views: 8900,
      impressions: 112000,
      ctr: 8.2,
      watchTimeMinutes: 6200,
      averageViewDurationSeconds: 42,
      averagePercentageViewed: 76,
      likes: 540,
      comments: 62,
      subscribersGained: 210,
      trafficSource: 'Shorts feed',
      notes: 'Fast pacing and quick sound effects held 76% average percentage viewed.',
      isDemoData: true,
      createdAt: '2026-09-14T10:00:00.000Z',
      updatedAt: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'test-va-4',
      videoTitle: 'Top Free Audio & Music Tools for Creators (Zero Copyright Strikes)',
      publishedDate: '2026-09-20',
      format: 'Tutorial',
      topic: 'Creator Tools',
      views: 1840,
      impressions: 31000,
      ctr: 5.9,
      watchTimeMinutes: 4900,
      averageViewDurationSeconds: 160,
      averagePercentageViewed: 44,
      likes: 98,
      comments: 18,
      subscribersGained: 42,
      trafficSource: 'YouTube Search',
      notes: 'Resource list format; viewers asked for specific link timestamps.',
      isDemoData: true,
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'test-va-5',
      videoTitle: 'My Complete YouTube Setup on a ₹0 Budget',
      publishedDate: '2026-09-26',
      format: 'Tutorial',
      topic: 'Beginner Studio Setup',
      views: 4100,
      impressions: 51000,
      ctr: 8.0,
      watchTimeMinutes: 13500,
      averageViewDurationSeconds: 198,
      averagePercentageViewed: 54,
      likes: 295,
      comments: 74,
      subscribersGained: 185,
      trafficSource: 'Suggested videos',
      notes: '₹0 budget resonated strongly with new creators.',
      isDemoData: true,
      createdAt: '2026-09-26T10:00:00.000Z',
      updatedAt: '2026-09-26T10:00:00.000Z',
    }
  ];

  // Preserve any existing real records and merge demo records
  const existingReal = getVideoAnalyticsList().filter(i => !i.isDemoData && !i.id.startsWith('test-va-'));
  const combined = [...sampleData, ...existingReal];
  saveIsolatedAnalytics(combined);
  return combined;
}


