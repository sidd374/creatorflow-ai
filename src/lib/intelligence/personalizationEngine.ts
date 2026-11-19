/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow Personalization Engine & Context Manager.
 * Extracts structured, compact creator context and selects ONLY relevant fields per task
 * so prompts remain concise, token-efficient, and deeply personalized.
 */

import type {
  AnalyticsSummary,
  CreatorProfile,
  VideoAnalytics,
} from '../../types/index.ts';
import type { CreatorContextProfile, IntelligenceTaskType } from './types.ts';

function normalizeBudgetTier(monthlyBudget: string | undefined): 'zero' | 'low' | 'flexible' {
  const raw = String(monthlyBudget || '').toLowerCase();
  if (
    !raw ||
    raw.includes('0') ||
    raw.includes('free') ||
    raw.includes('no budget') ||
    raw.includes('zero')
  ) {
    return 'zero';
  }
  if (raw.includes('low') || raw.includes('500') || raw.includes('1000') || raw.includes('1,000') || raw.includes('20')) {
    return 'low';
  }
  return 'flexible';
}

function summarizeAnalyticsList(analyticsList?: VideoAnalytics[]): AnalyticsSummary | null {
  if (!Array.isArray(analyticsList) || analyticsList.length === 0) {
    return null;
  }
  const realRecords = analyticsList.filter((a) => !a.isDemoData);
  const demoCount = analyticsList.filter((a) => a.isDemoData).length;
  const active = realRecords.length > 0 ? realRecords : [];

  const totalViews = active.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
  const totalWatchTimeMinutes = active.reduce((acc, v) => acc + (Number(v.watchTimeMinutes) || 0), 0);
  const totalSubscribersGained = active.reduce((acc, v) => acc + (Number(v.subscribersGained) || 0), 0);
  const ctrs = active.map((v) => v.ctr).filter((v): v is number => typeof v === 'number');
  const avds = active
    .map((v) => v.averageViewDurationSeconds)
    .filter((v): v is number => typeof v === 'number');
  const pcts = active
    .map((v) => v.averagePercentageViewed)
    .filter((v): v is number => typeof v === 'number');

  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  return {
    totalVideos: active.length,
    totalViews,
    totalWatchTimeMinutes,
    totalSubscribersGained,
    averageCtr: avg(ctrs),
    averageViewDurationSeconds: avg(avds),
    averagePercentageViewed: avg(pcts),
    engagementRate: null,
    hasReliableBaseline: active.length >= 3 && totalViews >= 100,
    baselineNote:
      active.length === 0
        ? 'No real published video analytics logged yet.'
        : active.length < 3
        ? `Only ${active.length} real video metric(s) logged — early directional signal only.`
        : 'Real channel analytics baseline active.',
    demoCount,
    realCount: active.length,
  };
}

export function buildCreatorContextProfile(params: {
  uid: string;
  creatorProfile?: Partial<CreatorProfile> & Record<string, any>;
  recentProjects?: Array<{ topic?: string; selectedTitle?: string; format?: string }>;
  recentIdeas?: Array<{ title?: string }>;
  recentPacks?: Array<{ topic?: string; titles?: Array<{ text?: string }> }>;
  analyticsList?: VideoAnalytics[];
}): CreatorContextProfile {
  const p = params.creatorProfile || {};
  const productionMethods: string[] = Array.isArray(p.productionMethods)
    ? p.productionMethods.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : typeof p.primaryProductionMethod === 'string' && p.primaryProductionMethod
    ? [p.primaryProductionMethod]
    : typeof p.creatorStyle === 'string' && p.creatorStyle
    ? [p.creatorStyle]
    : [];

  const primaryProductionMethod =
    (typeof p.primaryProductionMethod === 'string' && p.primaryProductionMethod) ||
    productionMethods[0] ||
    p.creatorStyle ||
    'Flexible / Creator Workflow';

  const devices: string[] = Array.isArray(p.availableDevices)
    ? p.availableDevices.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : ['Smartphone'];

  const tools: string[] = Array.isArray(p.availableTools)
    ? p.availableTools.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  const budgetTier = normalizeBudgetTier(p.monthlyBudget);
  const styleLower = `${primaryProductionMethod} ${productionMethods.join(' ')} ${p.creatorStyle || ''}`.toLowerCase();
  const explicitOnCamera = typeof p.onCamera === 'boolean' ? p.onCamera : undefined;
  const isFaceless =
    explicitOnCamera === false ||
    styleLower.includes('faceless') ||
    styleLower.includes('narration') ||
    styleLower.includes('voiceover') ||
    styleLower.includes('ai-generated') ||
    styleLower.includes('ai presenter');
  const onCamera = explicitOnCamera !== undefined ? explicitOnCamera : !isFaceless;

  const isPhoneOnly =
    devices.length > 0 &&
    devices.every((d) => /phone|mobile|android|iphone/i.test(d)) &&
    !devices.some((d) => /laptop|desktop|pc|mac|computer/i.test(d));

  const exp = String(p.experienceLevel || 'Beginner');
  const isBeginner = /beginner|new/i.test(exp);

  const isAiVideoCreator =
    styleLower.includes('ai') ||
    Boolean(p.aiWorkflow && String(p.aiWorkflow).trim()) ||
    Boolean(p.aiExperience && /using|experienced|interested/i.test(String(p.aiExperience)));

  // Collect concise anti-repetition history (max 10 recent items)
  const topicSet = new Set<string>();
  const titleSet = new Set<string>();

  for (const proj of params.recentProjects || []) {
    if (proj.topic) topicSet.add(proj.topic.trim());
    if (proj.selectedTitle) titleSet.add(proj.selectedTitle.trim());
  }
  for (const idea of params.recentIdeas || []) {
    if (idea.title) titleSet.add(idea.title.trim());
  }
  for (const pack of params.recentPacks || []) {
    if (pack.topic) topicSet.add(pack.topic.trim());
    if (Array.isArray(pack.titles)) {
      for (const t of pack.titles.slice(0, 2)) {
        if (t?.text) titleSet.add(t.text.trim());
      }
    }
  }

  return {
    uid: params.uid,
    niche: String(p.niche || p.channelTopic || 'General Educational & Creator Growth').trim(),
    channelTopic: String(p.channelTopic || p.niche || 'YouTube Content').trim(),
    targetAudience: String(p.targetAudience || 'Curious YouTube viewers').trim(),
    creatorStage: String(p.creatorStage || 'New Creator').trim(),
    experienceLevel: exp,
    primaryGoal: String(p.primaryGoal || 'Grow channel audience and retention').trim(),
    secondaryGoals: Array.isArray(p.secondaryGoals) ? p.secondaryGoals.slice(0, 3) : [],
    dailyTimeAvailable: String(p.dailyTimeAvailable || '1-2 hours').trim(),
    monthlyBudget: String(p.monthlyBudget || '₹0 / Free tools only').trim(),
    budgetTier,
    availableDevices: devices,
    availableTools: tools,
    preferredLanguage: String(p.preferredLanguage || 'English').trim(),
    preferredPlatform: p.preferredPlatform === 'Shorts' ? 'Shorts' : 'YouTube',
    creatorStyle: String(p.creatorStyle || primaryProductionMethod).trim(),
    productionMethods,
    primaryProductionMethod,
    onCamera,
    aiWorkflow: String(p.aiWorkflow || '').trim(),
    isZeroBudget: budgetTier === 'zero',
    isPhoneOnly,
    isBeginner,
    isFaceless,
    isAiVideoCreator,
    recentTopics: Array.from(topicSet).slice(0, 8),
    recentTitles: Array.from(titleSet).slice(0, 12),
    analyticsSummary: summarizeAnalyticsList(params.analyticsList),
  };
}

export function selectMinimalContextForTask(
  task: IntelligenceTaskType,
  ctx: CreatorContextProfile
): Record<string, unknown> {
  const base = {
    niche: ctx.niche,
    preferredLanguage: ctx.preferredLanguage,
    primaryGoal: ctx.primaryGoal,
    targetAudience: ctx.targetAudience,
  };

  switch (task) {
    case 'title_seo':
      return {
        ...base,
        preferredPlatform: ctx.preferredPlatform,
        recentTitlesToAvoidRepeating: ctx.recentTitles.slice(0, 6),
      };
    case 'thumbnail_intelligence':
      return {
        ...base,
        productionMethod: ctx.primaryProductionMethod,
        onCamera: ctx.onCamera,
        isPhoneOnly: ctx.isPhoneOnly,
        budgetTier: ctx.budgetTier,
      };
    case 'analytics_intelligence':
      return {
        ...base,
        creatorStage: ctx.creatorStage,
        analyticsSummary: ctx.analyticsSummary,
      };
    case 'topic_analysis':
    case 'idea_generation':
      return {
        ...base,
        creatorStage: ctx.creatorStage,
        experienceLevel: ctx.experienceLevel,
        dailyTimeAvailable: ctx.dailyTimeAvailable,
        budgetTier: ctx.budgetTier,
        monthlyBudget: ctx.monthlyBudget,
        availableDevices: ctx.availableDevices,
        productionMethod: ctx.primaryProductionMethod,
        onCamera: ctx.onCamera,
        recentTopics: ctx.recentTopics.slice(0, 5),
        recentTitlesToAvoidRepeating: ctx.recentTitles.slice(0, 8),
      };
    case 'content_radar':
    case 'next_video':
      return {
        ...base,
        creatorStage: ctx.creatorStage,
        experienceLevel: ctx.experienceLevel,
        dailyTimeAvailable: ctx.dailyTimeAvailable,
        budgetTier: ctx.budgetTier,
        availableDevices: ctx.availableDevices,
        productionMethod: ctx.primaryProductionMethod,
        onCamera: ctx.onCamera,
        recentTopics: ctx.recentTopics.slice(0, 6),
        recentTitlesToAvoidRepeating: ctx.recentTitles.slice(0, 8),
        analyticsSummary: ctx.analyticsSummary,
      };
    default:
      // script_generation, content_pack, guided_workflow_pack, creator_assistant
      return {
        ...base,
        creatorStage: ctx.creatorStage,
        experienceLevel: ctx.experienceLevel,
        dailyTimeAvailable: ctx.dailyTimeAvailable,
        monthlyBudget: ctx.monthlyBudget,
        budgetTier: ctx.budgetTier,
        availableDevices: ctx.availableDevices,
        availableTools: ctx.availableTools,
        productionMethod: ctx.primaryProductionMethod,
        productionMethods: ctx.productionMethods,
        onCamera: ctx.onCamera,
        aiWorkflow: ctx.aiWorkflow || undefined,
        recentTopics: ctx.recentTopics.slice(0, 4),
        recentTitlesToAvoidRepeating: ctx.recentTitles.slice(0, 6),
      };
  }
}

export function buildPersonalizationSummary(ctx: CreatorContextProfile) {
  const appliedConstraints: string[] = [
    `Language: ${ctx.preferredLanguage}`,
    `Method: ${ctx.primaryProductionMethod}${ctx.onCamera ? ' (On-Camera)' : ' (Faceless / Off-Camera)'}`,
    `Budget: ${ctx.isZeroBudget ? '₹0 Free-Only Tools Strictly Enforced' : ctx.monthlyBudget}`,
    `Devices: ${ctx.availableDevices.join(', ') || 'Standard'}`,
    `Level: ${ctx.experienceLevel}`,
  ];
  if (ctx.isPhoneOnly) {
    appliedConstraints.push('Mobile-Only Workflow Enforced');
  }
  if (ctx.recentTitles.length > 0) {
    appliedConstraints.push(`Anti-Repetition Guard (${ctx.recentTitles.length} past titles checked)`);
  }

  return {
    niche: ctx.niche,
    language: ctx.preferredLanguage,
    budgetTier: ctx.budgetTier,
    productionMethod: ctx.primaryProductionMethod,
    onCamera: ctx.onCamera,
    devices: ctx.availableDevices,
    appliedConstraints,
  };
}
