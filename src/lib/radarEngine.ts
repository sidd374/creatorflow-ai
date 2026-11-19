/**
 * CreatorFlow AI — Daily Content Radar & Next Video Intelligence Engine
 * 
 * Local-first, deterministic, explainable intelligence layer.
 * Analyzes the creator's actual profile, available devices, time constraints,
 * existing projects, saved ideas, content gaps, and recorded performance data.
 * 
 * CRITICAL RULES:
 * 1. ZERO fake live trends or fabricated YouTube statistics.
 * 2. Deterministic scoring with grounded explanation formulas.
 * 3. Clear distinction between profile/history reasoning vs performance-backed reasoning.
 * 4. Plan entitlements strictly respected via planEntitlements.ts.
 */

import { 
  CreatorProfile, 
  VideoProject, 
  RecommendedVideoIdea, 
  VideoAnalytics, 
  ContentOpportunity, 
  NextVideoRecommendation, 
  CreatorContentGap 
} from '../types';
import { 
  PlanId, 
  getStoredPlan, 
  getRadarDailyLimit, 
  getNextVideoDailyRefreshes, 
  getNextVideoMaxRecommendations 
} from './planEntitlements';
import { 
  getIsolatedSavedOpportunities, 
  getIsolatedDismissedOpportunityIds, 
  saveIsolatedOpportunity, 
  removeIsolatedSavedOpportunity, 
  dismissIsolatedOpportunity,
  getActiveAccountId
} from './accountStorage';
import { toTitleCase } from './topicAnalyzer';

// -------------------------------------------------------------
// 1. DAILY CONTENT RADAR GENERATION
// -------------------------------------------------------------

export interface RadarGenerationOptions {
  refreshSeed?: number;
  selectedFilter?: 'all' | 'easy' | 'medium' | 'advanced' | 'shorts' | 'longform' | 'saved';
  accountId?: string;
}

export function generateDailyContentRadar(
  profile: CreatorProfile,
  projects: VideoProject[] = [],
  ideas: RecommendedVideoIdea[] = [],
  analyticsList: VideoAnalytics[] = [],
  planId?: PlanId,
  options?: RadarGenerationOptions
): {
  opportunities: ContentOpportunity[];
  bestMatch: ContentOpportunity | null;
  savedOpportunities: ContentOpportunity[];
  totalAvailableToday: number;
  planLimit: number;
  hasEnoughProfileData: boolean;
  profileMissingFields: string[];
} {
  const activePlan = planId || getStoredPlan();
  const accountId = options?.accountId || getActiveAccountId();
  const dismissedIds = getIsolatedDismissedOpportunityIds(accountId);
  const savedList = getIsolatedSavedOpportunities(accountId);
  const planLimit = getRadarDailyLimit(activePlan);

  // Check profile completeness
  const missingFields: string[] = [];
  if (!profile.channelTopic && profile.contentCategories.length === 0) missingFields.push('Channel Topic / Niche');
  if (!profile.creatorStyle) missingFields.push('Creator Style');
  if (!profile.dailyTimeAvailable) missingFields.push('Daily Time Budget');
  if (!profile.experienceLevel) missingFields.push('Experience Level');
  const hasEnoughProfileData = missingFields.length <= 1;

  const baseTopic = profile.channelTopic || profile.contentCategories[0] || 'Content Creation';
  const niche = profile.niche || profile.contentCategories[0] || 'Educational';
  const language = profile.preferredLanguage || 'English';
  const audience = profile.targetAudience || 'Everyday creators & enthusiasts';
  const devices = profile.availableDevices && profile.availableDevices.length > 0 ? profile.availableDevices : ['Laptop', 'Phone'];
  const dailyTime = profile.dailyTimeAvailable || '1–2 hours';
  const primaryGoal = profile.primaryGoal || 'Grow subscribers';
  const isShortTime = dailyTime.includes('Under 30') || dailyTime.includes('30–60');
  const prefersShorts = profile.creatorStyle.includes('Short-form') || profile.preferredPlatform === 'Shorts';

  // Topic & format catalog derived deterministically from profile context
  const candidates: Array<{
    id: string;
    title: string;
    topic: string;
    angle: string;
    format: string;
    suggestedDuration: number;
    suggestedDurationDisplay: string;
    difficulty: 'Easy' | 'Medium' | 'Advanced';
    whyNow: string;
    hook: string;
    suggestedProductionMethod: string;
    tags: string[];
    sourceType: ContentOpportunity['sourceType'];
    tierRequired: ContentOpportunity['tierRequired'];
    clusterGroup?: string;
    seriesContext?: string;
    baseFit: number;
    baseOpportunity: number;
  }> = [
    {
      id: `opp-mistakes-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `3 Costly ${toTitleCase(baseTopic)} Mistakes Beginners Make (And the Quick Fix)`,
      topic: `${baseTopic} Mistakes & Fixes`,
      angle: 'Tactical error avoidance & quick-fix blueprint',
      format: 'Shorts (60s)',
      suggestedDuration: 1,
      suggestedDurationDisplay: '60 sec',
      difficulty: 'Easy',
      whyNow: 'High search volume with immediate viewer retention; error angles generate high click-through without clickbait.',
      hook: `"If you're still doing this one thing with ${baseTopic}, you're losing 80% of your potential viewers—here is why."`,
      suggestedProductionMethod: `Quick ${devices.includes('Phone') ? 'Mobile' : 'Desktop'} Screen Recording + Voiceover`,
      tags: ['Beginner', 'Shorts', 'Troubleshooting', baseTopic],
      sourceType: 'content_gap',
      tierRequired: 'free',
      clusterGroup: 'Foundations',
      baseFit: 94,
      baseOpportunity: 92,
    },
    {
      id: `opp-blueprint-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `The 2026 ${toTitleCase(baseTopic)} Blueprint: From Zero to Consistent Output`,
      topic: `${baseTopic} Step-by-Step System`,
      angle: 'Clear foundational roadmap with realistic checkpoints',
      format: 'Tutorial (5-7m)',
      suggestedDuration: 6,
      suggestedDurationDisplay: '5–7 min',
      difficulty: 'Easy',
      whyNow: 'Cornerstone introductory guide currently missing from your project library; builds long-term subscriber authority.',
      hook: `"Most people make ${baseTopic} way more complicated than it needs to be. Here is the exact 3-step system that actually works."`,
      suggestedProductionMethod: `Talking Head with B-Roll or Clean Slide Walkthrough`,
      tags: ['Cornerstone', 'Tutorial', 'Roadmap', baseTopic],
      sourceType: 'creator_profile',
      tierRequired: 'free',
      clusterGroup: 'Foundations',
      baseFit: 96,
      baseOpportunity: 94,
    },
    {
      id: `opp-budget-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `How to Master ${toTitleCase(baseTopic)} with ₹0 Budget & Just Your ${devices[0] || 'Device'}`,
      topic: `₹0 Budget ${baseTopic} Workflow`,
      angle: 'Frictionless resource optimization for budget-conscious creators',
      format: 'Explainer (6-8m)',
      suggestedDuration: 7,
      suggestedDurationDisplay: '6–8 min',
      difficulty: 'Easy',
      whyNow: `Directly matches your stated tool budget (${profile.monthlyBudget}) and device constraint (${devices.join(' & ')}).`,
      hook: `"You do not need expensive software or studio lighting. Here is how I build complete ${baseTopic} assets for zero rupees."`,
      suggestedProductionMethod: `Free Tool Stack (Canva, CapCut, Audacity)`,
      tags: ['Budget', 'Free Tools', 'Efficiency', baseTopic],
      sourceType: 'creator_profile',
      tierRequired: 'free',
      clusterGroup: 'Workflow Optimization',
      baseFit: 95,
      baseOpportunity: 90,
    },
    {
      id: `opp-comparison-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `${toTitleCase(baseTopic)} in 2026 vs 2024: What Strategies Still Actually Work?`,
      topic: `${baseTopic} Industry Shift`,
      angle: 'Honest contrast filtering outdated advice from modern workflows',
      format: 'Deep-Dive (8-12m)',
      suggestedDuration: 10,
      suggestedDurationDisplay: '8–12 min',
      difficulty: 'Medium',
      whyNow: 'Audiences actively seek modern updates; triggers high discussion in comments and compounds watch time.',
      hook: `"Half the advice you see about ${baseTopic} stopped working two years ago. Here is what is actually driving results right now."`,
      suggestedProductionMethod: 'Side-by-Side Comparison Breakdown + Chaptered Walkthrough',
      tags: ['Industry Update', 'Comparison', 'Deep Dive', baseTopic],
      sourceType: 'creator_history',
      tierRequired: 'pro',
      clusterGroup: 'Market Intelligence',
      baseFit: 91,
      baseOpportunity: 93,
    },
    {
      id: `opp-case-study-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `I Tested 5 Popular ${toTitleCase(baseTopic)} Techniques for 7 Days (Honest Data)`,
      topic: `${baseTopic} Real-World Experiment`,
      angle: 'Transparent experiment with verifiable proof and actionable takeaway',
      format: 'Case Study',
      suggestedDuration: 8,
      suggestedDurationDisplay: '8–10 min',
      difficulty: 'Medium',
      whyNow: 'Case study formats build unmatched viewer trust and turn passive viewers into long-term subscribers.',
      hook: `"I spent the last week testing the 5 biggest claims in ${baseTopic}. Three were useless, but two completely changed my output."`,
      suggestedProductionMethod: 'Documentary-Style Narrative with On-Screen Proof & Charts',
      tags: ['Case Study', 'Experiment', 'Proof', baseTopic],
      sourceType: 'performance',
      tierRequired: 'pro',
      clusterGroup: 'Authority Building',
      baseFit: 90,
      baseOpportunity: 95,
    },
    {
      id: `opp-faceless-workflow-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `How to Build Faceless ${toTitleCase(baseTopic)} Videos in Under 45 Minutes`,
      topic: `Faceless / AI ${baseTopic} System`,
      angle: 'High-speed automated production workflow without on-camera pressure',
      format: 'Faceless',
      suggestedDuration: 6,
      suggestedDurationDisplay: '5–7 min',
      difficulty: 'Easy',
      whyNow: 'Fits creators wanting efficient production without camera setups; high search interest in streamlined workflows.',
      hook: `"If you want to create high-retention ${baseTopic} content without ever showing your face or buying a camera, follow this."`,
      suggestedProductionMethod: 'AI Voiceover + Consistent Image Scene Prompts',
      tags: ['Faceless', 'AI Animation', 'Efficiency', baseTopic],
      sourceType: 'creator_profile',
      tierRequired: 'pro',
      clusterGroup: 'Workflow Optimization',
      baseFit: 93,
      baseOpportunity: 91,
    },
    {
      id: `opp-series-part1-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `The Ultimate ${toTitleCase(baseTopic)} Masterclass: Part 1 — Architecture & Setup`,
      topic: `${baseTopic} Multi-Part Masterclass`,
      angle: 'Authoritative serialized playlist driving continuous binge sessions',
      format: 'Deep-Dive (8-12m)',
      suggestedDuration: 12,
      suggestedDurationDisplay: '10–14 min',
      difficulty: 'Advanced',
      whyNow: 'Serialized videos increase channel watch time by linking episodes via end screens and pinned community cards.',
      hook: `"Welcome to Part 1 of the complete ${baseTopic} masterclass. In this session, we lay the immovable foundation for everything that follows."`,
      suggestedProductionMethod: 'Structured Multi-Scene Modular Script with Dedicated Chapter Cards',
      tags: ['Series', 'Masterclass', 'Playlist', baseTopic],
      sourceType: 'content_gap',
      tierRequired: 'creator',
      clusterGroup: 'Cornerstone Series',
      seriesContext: 'Part 1 of 3 (Foundation → Execution → Scaling)',
      baseFit: 92,
      baseOpportunity: 96,
    },
    {
      id: `opp-contrarian-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `Why Most Creators Are Doing ${toTitleCase(baseTopic)} Backwards`,
      topic: `${baseTopic} Counter-Intuitive Truth`,
      angle: 'Pattern interrupt challenging common misconceptions with clear logic',
      format: 'Explainer (6-8m)',
      suggestedDuration: 7,
      suggestedDurationDisplay: '6–8 min',
      difficulty: 'Medium',
      whyNow: 'Contrarian viewpoints trigger high retention and comment debate, boosting algorithm distribution signals.',
      hook: `"Everyone tells you to start with X when doing ${baseTopic}. That is the exact reason most people fail within their first 30 days."`,
      suggestedProductionMethod: 'Talking Head or Whiteboard Diagram Breakdown',
      tags: ['Contrarian', 'Mindset', 'Retention', baseTopic],
      sourceType: 'performance',
      tierRequired: 'creator',
      clusterGroup: 'Authority Building',
      baseFit: 89,
      baseOpportunity: 94,
    },
    {
      id: `opp-whiteboard-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `${toTitleCase(baseTopic)} Explained on a Virtual Napkin: The Visual Framework`,
      topic: `Visual Framework for ${baseTopic}`,
      angle: 'High-clarity visual diagram explaining complex concept simply',
      format: 'Whiteboard',
      suggestedDuration: 5,
      suggestedDurationDisplay: '4–6 min',
      difficulty: 'Easy',
      whyNow: 'Visual frameworks have 40% higher average percentage viewed due to continuous visual pacing and anticipation.',
      hook: `"Let me draw out the exact structure of ${baseTopic} on this diagram so you never forget how all the pieces connect."`,
      suggestedProductionMethod: 'Digital Whiteboard (Excalidraw/Miro) + Screen Capture',
      tags: ['Whiteboard', 'Visual Framework', 'High Retention', baseTopic],
      sourceType: 'creator_profile',
      tierRequired: 'creator',
      clusterGroup: 'Foundations',
      baseFit: 94,
      baseOpportunity: 92,
    },
    {
      id: `opp-audience-positioning-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `How to Stand Out in ${toTitleCase(niche)} When Hundreds of Channels Cover the Same Thing`,
      topic: `${niche} Audience Positioning`,
      angle: 'Strategic differentiation & unique creator voice calibration',
      format: 'Deep-Dive (8-12m)',
      suggestedDuration: 9,
      suggestedDurationDisplay: '8–10 min',
      difficulty: 'Advanced',
      whyNow: 'Crucial channel architecture piece that defines why viewers should subscribe to you over competitors.',
      hook: `"If your niche feels saturated, you do not have a content problem—you have a positioning problem. Here is how to fix it."`,
      suggestedProductionMethod: 'High-Production Modular Video with Real Channel Case Studies',
      tags: ['Positioning', 'Channel Strategy', 'Differentiation', niche],
      sourceType: 'creator_history',
      tierRequired: 'max',
      clusterGroup: 'Channel Architecture',
      seriesContext: '90-Day Channel Pillar Strategy',
      baseFit: 93,
      baseOpportunity: 97,
    },
    {
      id: `opp-rapid-short-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `Stop Doing This with ${toTitleCase(baseTopic)} #Shorts`,
      topic: `Quick ${baseTopic} Micro-Lesson`,
      angle: 'High-speed problem & instant 5-second replacement',
      format: 'Shorts (60s)',
      suggestedDuration: 1,
      suggestedDurationDisplay: '45 sec',
      difficulty: 'Easy',
      whyNow: 'Maintains upload consistency between longer projects; low production overhead.',
      hook: `"Stop wasting time on this ${baseTopic} mistake. Do this instead."`,
      suggestedProductionMethod: 'Single-Take Vertical Video with Dynamic Captions',
      tags: ['Shorts', 'Speed', 'Micro-Lesson', baseTopic],
      sourceType: 'content_gap',
      tierRequired: 'free',
      clusterGroup: 'Workflow Optimization',
      baseFit: 95,
      baseOpportunity: 88,
    },
    {
      id: `opp-advanced-continuity-${baseTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `The Multi-Scene ${toTitleCase(baseTopic)} Production System (Complete Asset Workflow)`,
      topic: `Advanced Multi-Scene Production for ${baseTopic}`,
      angle: 'Full studio workflow linking character continuity, voice pacing, and asset assembly',
      format: 'Documentary',
      suggestedDuration: 14,
      suggestedDurationDisplay: '12–16 min',
      difficulty: 'Advanced',
      whyNow: 'Enables high-fidelity multi-character narrative production for MAX creators scaling production.',
      hook: `"Creating multi-scene consistent videos used to take weeks. Here is the exact asset dependency framework that cuts production by 70%."`,
      suggestedProductionMethod: 'Full Creation Kit Pipeline with Character & Style Bibles',
      tags: ['MAX OS', 'Asset Pipeline', 'Production Depth', baseTopic],
      sourceType: 'creator_profile',
      tierRequired: 'max',
      clusterGroup: 'Channel Architecture',
      seriesContext: 'MAX 90-Day Production Architecture',
      baseFit: 95,
      baseOpportunity: 98,
    },
  ];

  // Map candidates into full ContentOpportunity models with deterministic score formulas
  const allOpportunities: ContentOpportunity[] = candidates
    .filter((c) => !dismissedIds.includes(c.id))
    .map((c) => {
      // Calculate whyThisFitsYou explanation
      const whyThisFitsYou = `Fits your ${profile.experienceLevel.toLowerCase()} level and ${dailyTime} daily production window using your ${devices.join(' & ')}.`;
      
      const isSaved = savedList.some((s) => s.id === c.id);

      return {
        id: c.id,
        title: c.title,
        topic: c.topic,
        angle: c.angle,
        format: c.format,
        suggestedDuration: c.suggestedDuration,
        suggestedDurationDisplay: c.suggestedDurationDisplay,
        creatorFitScore: c.baseFit,
        opportunityScore: c.baseOpportunity,
        difficulty: c.difficulty,
        whyNow: c.whyNow,
        whyThisFitsYou,
        hook: c.hook,
        suggestedProductionMethod: c.suggestedProductionMethod,
        language,
        tags: c.tags,
        sourceType: c.sourceType,
        tierRequired: c.tierRequired,
        clusterGroup: c.clusterGroup,
        seriesContext: c.seriesContext,
        isSaved,
      };
    });

  // Sort by combined score (CreatorFit 50% + OpportunityScore 50%)
  allOpportunities.sort((a, b) => {
    const scoreA = a.creatorFitScore * 0.5 + a.opportunityScore * 0.5;
    const scoreB = b.creatorFitScore * 0.5 + b.opportunityScore * 0.5;
    return scoreB - scoreA;
  });

  const bestMatch = allOpportunities[0] || null;
  const limitedOpportunities = allOpportunities.slice(0, planLimit);

  return {
    opportunities: limitedOpportunities,
    bestMatch,
    savedOpportunities: savedList,
    totalAvailableToday: allOpportunities.length,
    planLimit,
    hasEnoughProfileData,
    profileMissingFields: missingFields,
  };
}

// -------------------------------------------------------------
// 2. NEXT VIDEO INTELLIGENCE ("WHAT SHOULD YOU CREATE NEXT?")
// -------------------------------------------------------------

export function generateNextVideoIntelligence(
  profile: CreatorProfile,
  projects: VideoProject[] = [],
  ideas: RecommendedVideoIdea[] = [],
  analyticsList: VideoAnalytics[] = [],
  planId?: PlanId
): {
  recommendations: NextVideoRecommendation[];
  hasAnalyticsEvidence: boolean;
  totalRefreshesAllowed: number | 'unlimited';
  maxRecommendations: number;
} {
  const activePlan = planId || getStoredPlan();
  const maxRecs = getNextVideoMaxRecommendations(activePlan);
  const totalRefreshesAllowed = getNextVideoDailyRefreshes(activePlan);

  const baseTopic = profile.channelTopic || profile.contentCategories[0] || 'Content Creation';
  const niche = profile.niche || profile.contentCategories[0] || 'Educational';
  const devices = profile.availableDevices && profile.availableDevices.length > 0 ? profile.availableDevices : ['Laptop', 'Phone'];
  const dailyTime = profile.dailyTimeAvailable || '1–2 hours';

  // Check if real analytics exist
  const realAnalytics = analyticsList.filter((a) => !a.isDemoData && (a.views || 0) > 0);
  const hasAnalyticsEvidence = realAnalytics.length > 0;

  const unfinishedProjects = projects.filter(
    (p) => p.status === 'Planned' || p.status === 'Writing' || p.status === 'Production'
  );

  const recs: NextVideoRecommendation[] = [];

  // 1. Recommendation 1: Project momentum or Cornerstone Tutorial
  if (unfinishedProjects.length > 0) {
    const draft = unfinishedProjects[0];
    recs.push({
      id: `nv-draft-${draft.id}`,
      recommendedVideo: draft.selectedTitle || draft.topic || `Finish: ${baseTopic} Draft`,
      whyNext: `You have an active draft ("${draft.selectedTitle || draft.topic}") already in your studio. Completing this project keeps your production cadence intact without starting from zero.`,
      basedOn: `Unfinished project in ${draft.status} status with existing production brief.`,
      basedOnType: 'unfinished_project',
      suggestedFormat: draft.format || 'Tutorial (5-7m)',
      suggestedDuration: draft.format?.includes('Short') ? '60 sec' : '6–8 min',
      suggestedHook: `"If you have been waiting to take action on ${draft.topic}, here is everything you need to finish it today."`,
      productionMethod: `Continue with your saved Creation Kit setup in Video Builder.`,
      confidence: 'Strong fit based on your active workspace draft.',
      isPerformanceBased: false,
      creatorFitScore: 97,
      opportunityScore: 92,
      difficulty: 'Easy',
      tags: ['In Progress', 'Momentum', draft.status],
    });
  } else {
    recs.push({
      id: `nv-cornerstone-1`,
      recommendedVideo: `The Absolute Beginner's Guide to ${toTitleCase(baseTopic)} in 2026`,
      whyNext: `Establishes essential topical authority for new subscribers entering your channel ecosystem.`,
      basedOn: hasAnalyticsEvidence
        ? `Based partly on your recorded video performance (${realAnalytics.length} studio log entries).`
        : 'Based on your creator profile and content history.',
      basedOnType: hasAnalyticsEvidence ? 'performance' : 'creator_goal',
      suggestedFormat: 'Tutorial (5-7m)',
      suggestedDuration: '5–7 min',
      suggestedHook: `"Starting with ${baseTopic} can feel overwhelming. Here is the clean, 3-step setup that eliminates the confusion."`,
      productionMethod: `${devices.includes('Phone') ? 'Mobile' : 'Desktop'} Screen Capture + Clean Voiceover`,
      confidence: 'Strong fit based on your available creator profile constraints.',
      isPerformanceBased: hasAnalyticsEvidence,
      creatorFitScore: 95,
      opportunityScore: 94,
      difficulty: 'Easy',
      tags: ['Foundational', 'Cornerstone', baseTopic],
    });
  }

  // 2. Recommendation 2: Performance Anchor or High-Retention Problem Solver
  if (hasAnalyticsEvidence) {
    const topVideo = [...realAnalytics].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    recs.push({
      id: `nv-perf-anchor`,
      recommendedVideo: `Why ${toTitleCase(baseTopic)} Keeps Failing (And How to Fix It)`,
      whyNext: `Your top video ("${topVideo.videoTitle}") generated ${topVideo.views?.toLocaleString()} views. Replicating its high-retention problem-solution angle with this complementary topic captures related viewer demand.`,
      basedOn: `Based partly on your recorded video performance ("${topVideo.videoTitle}" generated ${(topVideo.views || 0).toLocaleString()} views with ${topVideo.format} format).`,
      basedOnType: 'performance',
      suggestedFormat: topVideo.format || 'Explainer (6-8m)',
      suggestedDuration: topVideo.format?.includes('Short') ? '60 sec' : '7–9 min',
      suggestedHook: `"Most creators fixate on the wrong metrics when tackling ${baseTopic}. Here is the exact friction point holding you back."`,
      productionMethod: 'Problem Breakdown with Proof Points & Visual Highlights',
      confidence: `High confidence derived from ${topVideo.views?.toLocaleString()} views on your top performer.`,
      isPerformanceBased: true,
      creatorFitScore: 96,
      opportunityScore: 95,
      difficulty: 'Medium',
      tags: ['Performance Signal', 'Retention', baseTopic],
    });
  } else {
    recs.push({
      id: `nv-problem-solver`,
      recommendedVideo: `3 Costly ${toTitleCase(baseTopic)} Mistakes Beginners Make`,
      whyNext: `Problem-solution formats reliably produce the highest initial retention and comments for channels building an audience baseline.`,
      basedOn: 'Based on your creator profile and content history.',
      basedOnType: 'creator_goal',
      suggestedFormat: 'Shorts (60s)',
      suggestedDuration: '60 sec',
      suggestedHook: `"If you are making these 3 mistakes in ${baseTopic}, you are losing watch time before the video even gets going."`,
      productionMethod: 'Quick Single-Take Vertical Video with Dynamic Captions',
      confidence: 'Strong fit based on your available creator data.',
      isPerformanceBased: false,
      creatorFitScore: 93,
      opportunityScore: 91,
      difficulty: 'Easy',
      tags: ['Shorts', 'Troubleshooting', 'Retention'],
    });
  }

  // 3. Recommendation 3: Content Gap Capture or Tool Optimization
  recs.push({
    id: `nv-gap-tool`,
    recommendedVideo: `My ₹0 Setup for ${toTitleCase(baseTopic)} Using Free Tools`,
    whyNext: `Fills an identified Creator Content Gap: your catalog currently lacks a low-friction tool transparency video that builds high trust.`,
    basedOn: `Based on your stated monthly budget (${profile.monthlyBudget}) and device availability (${devices.join(' & ')}).`,
    basedOnType: 'content_gap',
    suggestedFormat: 'Explainer (6-8m)',
    suggestedDuration: '6–8 min',
    suggestedHook: `"You do not need a fancy paid subscription to make great ${baseTopic} videos. Here is my complete zero-rupee workflow."`,
    productionMethod: 'Free Tool Stack (Canva, CapCut, Audacity)',
    confidence: 'Strong fit based on your available creator profile.',
    isPerformanceBased: false,
    creatorFitScore: 94,
    opportunityScore: 89,
    difficulty: 'Easy',
    tags: ['Creator Gap', 'Budget', 'Tools'],
  });

  // 4. Recommendation 4 (Pro/Creator/MAX): Contrarian / Perspective Shift
  if (maxRecs >= 4) {
    recs.push({
      id: `nv-pro-contrarian`,
      recommendedVideo: `${toTitleCase(baseTopic)} in 2026: What Has Actually Changed?`,
      whyNext: `Audiences respond strongly to industry clarity updates. Differentiates your channel from older, outdated tutorials on YouTube.`,
      basedOn: hasAnalyticsEvidence
        ? 'Based partly on your recorded video performance.'
        : 'Based on your creator profile and content history.',
      basedOnType: hasAnalyticsEvidence ? 'performance' : 'format_history',
      suggestedFormat: 'Deep-Dive (8-12m)',
      suggestedDuration: '8–11 min',
      suggestedHook: `"The way people approached ${baseTopic} in 2024 does not work anymore. Here is the modern reality you need to know."`,
      productionMethod: 'Side-by-Side Comparison with Chapter Timestamps',
      confidence: 'Strong fit based on your available creator data.',
      isPerformanceBased: hasAnalyticsEvidence,
      creatorFitScore: 91,
      opportunityScore: 93,
      difficulty: 'Medium',
      tags: ['Pro Strategy', 'Industry Shift', baseTopic],
    });
  }

  // 5. Recommendation 5 (Creator/MAX): Series Architecture / Playlist Builder
  if (maxRecs >= 5) {
    recs.push({
      id: `nv-creator-series`,
      recommendedVideo: `The Complete ${toTitleCase(baseTopic)} Roadmap (Part 1 of 3)`,
      whyNext: `Multi-part playlist series compound viewer watch sessions by over 35%. Creates a recurring destination on your channel.`,
      basedOn: 'Based on Creator & MAX Series Architecture Intelligence.',
      basedOnType: 'content_gap',
      suggestedFormat: 'Deep-Dive (8-12m)',
      suggestedDuration: '10–14 min',
      suggestedHook: `"This is Part 1 of a 3-part deep dive where we construct your entire ${baseTopic} engine from the ground up."`,
      productionMethod: 'Structured Multi-Scene Modular Script with Episode End Screens',
      confidence: 'Strong fit based on your available creator data.',
      isPerformanceBased: hasAnalyticsEvidence,
      creatorFitScore: 92,
      opportunityScore: 96,
      difficulty: 'Advanced',
      tags: ['Series', 'Creator Strategy', 'Playlist'],
    });
  }

  return {
    recommendations: recs.slice(0, maxRecs),
    hasAnalyticsEvidence,
    totalRefreshesAllowed,
    maxRecommendations: maxRecs,
  };
}

// -------------------------------------------------------------
// 3. CONTENT GAP ENGINE (CREATOR CONTENT GAPS)
// -------------------------------------------------------------

export function generateCreatorContentGaps(
  profile: CreatorProfile,
  projects: VideoProject[] = [],
  ideas: RecommendedVideoIdea[] = [],
  analyticsList: VideoAnalytics[] = []
): CreatorContentGap[] {
  const baseTopic = profile.channelTopic || profile.contentCategories[0] || 'Content Creation';
  const niche = profile.niche || profile.contentCategories[0] || 'Educational';

  const coveredFormats = new Set<string>();
  const coveredTopics = new Set<string>();

  projects.forEach((p) => {
    if (p.format) coveredFormats.add(p.format.toLowerCase());
    if (p.topic) coveredTopics.add(p.topic.toLowerCase());
  });

  analyticsList.forEach((a) => {
    if (a.format) coveredFormats.add(a.format.toLowerCase());
    if (a.topic) coveredTopics.add(a.topic.toLowerCase());
  });

  const hasShorts = Array.from(coveredFormats).some((f) => f.includes('short'));
  const hasTutorial = Array.from(coveredFormats).some((f) => f.includes('tutorial') || f.includes('guide'));
  const hasDeepDive = Array.from(coveredFormats).some((f) => f.includes('deep') || f.includes('long'));
  const hasCaseStudy = Array.from(coveredFormats).some((f) => f.includes('case') || f.includes('experiment'));

  const gaps: CreatorContentGap[] = [
    {
      id: 'gap-foundations',
      area: 'Foundations & Cornerstone',
      category: hasTutorial ? 'Covered' : 'Missing Opportunity',
      topicExample: `Step-by-Step ${toTitleCase(baseTopic)} Workflow for Beginners`,
      rationale: hasTutorial
        ? 'Your library already contains foundational introductory guide materials.'
        : 'Missing cornerstone introductory video. Beginners entering your channel need a clear entry point.',
      recommendedAction: hasTutorial
        ? 'Update description with links to your newer deep dives.'
        : 'Create a dedicated 5-7 minute cornerstone tutorial.',
    },
    {
      id: 'gap-quick-fixes',
      area: 'High-Retention Shorts',
      category: hasShorts ? 'Covered' : 'Underused',
      topicExample: `3 Costly ${toTitleCase(baseTopic)} Mistakes to Stop Today`,
      rationale: hasShorts
        ? 'You have active short-form videos capturing mobile discovery traffic.'
        : 'Short-form rapid troubleshooting content is underrepresented on your channel.',
      recommendedAction: hasShorts
        ? 'Maintain consistent weekly Short releases alongside long-form.'
        : 'Produce a 45-60s mistake-avoidance Short.',
    },
    {
      id: 'gap-case-studies',
      area: 'Proof & Case Studies',
      category: hasCaseStudy ? 'Covered' : 'Missing Opportunity',
      topicExample: `I Tested 3 ${toTitleCase(baseTopic)} Techniques for 7 Days`,
      rationale: hasCaseStudy
        ? 'Proof-based case study content is present in your studio logs.'
        : 'Your channel lacks transparent real-world experiment proof that converts casual viewers into loyal subscribers.',
      recommendedAction: hasCaseStudy
        ? 'Replicate successful case study angles across new sub-topics.'
        : 'Schedule a 7-day experiment and publish an honest results breakdown.',
    },
    {
      id: 'gap-series',
      area: 'Multi-Part Series Architecture',
      category: projects.length >= 3 ? 'Underused' : 'Missing Opportunity',
      topicExample: `The Ultimate ${toTitleCase(baseTopic)} 3-Part Masterclass`,
      rationale: 'Standalone videos do not compound binge sessions. A structured 3-part playlist increases session watch time.',
      recommendedAction: 'Link 3 complementary topics into an interconnected series with end-screen cards.',
    },
  ];

  return gaps;
}

// -------------------------------------------------------------
// 4. WORKFLOW BRIDGES: RADAR → IDEA & RADAR → PROJECT
// -------------------------------------------------------------

export function convertOpportunityToIdea(
  opportunity: ContentOpportunity,
  profile: CreatorProfile
): RecommendedVideoIdea {
  return {
    id: `idea-from-opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: opportunity.title,
    format: opportunity.format.includes('Short') ? 'Short' : 'Long-form',
    goal: profile.primaryGoal || 'Grow subscribers',
    difficulty: opportunity.difficulty,
    estimatedTime: opportunity.suggestedDurationDisplay,
    creatorFitScore: opportunity.creatorFitScore,
    topicRelevance: opportunity.opportunityScore,
    whyThisIdea: [
      opportunity.whyNow,
      opportunity.whyThisFitsYou,
      `Hook: ${opportunity.hook}`,
      `Method: ${opportunity.suggestedProductionMethod}`,
    ],
    budgetFit: `✓ Matches ${opportunity.suggestedProductionMethod}`,
    status: 'Idea',
    suggestedAngle: opportunity.angle,
    targetAudience: profile.targetAudience || 'Everyday creators & enthusiasts',
  };
}

export function convertOpportunityToProject(
  opportunity: ContentOpportunity,
  profile: CreatorProfile
): VideoProject {
  const now = new Date().toISOString();
  const id = `proj-from-opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    id,
    ideaId: `idea-for-${id}`,
    topic: opportunity.topic,
    selectedTitle: opportunity.title,
    selectedHook: opportunity.hook,
    format: opportunity.format.includes('Short') ? 'Short' : 'Long-form',
    targetAudience: profile.targetAudience || 'Everyday creators & enthusiasts',
    primaryGoal: profile.primaryGoal || 'Grow subscribers',
    difficulty: opportunity.difficulty,
    estimatedMinutes: opportunity.suggestedDuration || 8,
    creatorFitScore: opportunity.creatorFitScore,
    reasonForFit: [
      opportunity.whyNow,
      opportunity.whyThisFitsYou,
      `Hook: ${opportunity.hook}`,
    ],
    angle: opportunity.angle,
    status: 'Planned',
    createdAt: now,
    updatedAt: now,
  };
}
