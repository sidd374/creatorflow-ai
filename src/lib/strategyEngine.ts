/**
 * CreatorFlow AI — Phase 3B Strategy & Recommendation Engine
 * Analyzes topics against the saved CreatorProfile to calculate
 * CreatorFit Scores, production feasibility, format match, and tailored video ideas.
 * 100% browser-based rule intelligence (₹0 API cost, zero external dependencies).
 */

import { CreatorProfile, RecommendedVideoIdea, TopicAnalysisResult } from '../types';
import { analyzeTopic, toTitleCase } from './topicAnalyzer';

/**
 * Generate 5 default tailored recommendations based on the creator's saved profile
 */
export function getDefaultRecommendations(profile: CreatorProfile): RecommendedVideoIdea[] {
  const niche = profile.channelTopic || (profile.contentCategories[0] || 'YouTube Growth');
  const isZeroBudget = profile.monthlyBudget.includes('₹0');
  const isBeginner = profile.experienceLevel === 'Beginner';
  const isShortsPreferred = profile.creatorStyle.includes('Short-form') || profile.preferredPlatform === 'Shorts';

  const budgetLabel = isZeroBudget ? '✓ 100% Free Tools' : 'Fits your budget';
  const phoneDevice = profile.availableDevices.includes('Phone') ? 'phone' : 'device';

  // Base tailored titles depending on categories & goals
  const ideas: RecommendedVideoIdea[] = [
    {
      id: 'rec-1',
      title: isShortsPreferred
        ? `5 Mistakes Beginners Make with ${toTitleCase(niche)}`
        : `How to Start with ${toTitleCase(niche)} in 2026 (Realistic Beginner Guide)`,
      format: isShortsPreferred ? 'Short' : 'Long-form',
      goal: profile.primaryGoal,
      difficulty: 'Easy',
      estimatedTime: isShortsPreferred ? '35 minutes' : '1.5 hours',
      creatorFitScore: 94,
      topicRelevance: 95,
      whyThisIdea: [
        `Directly aligns with your goal: "${profile.primaryGoal}"`,
        `Designed for ${profile.experienceLevel.toLowerCase()} creators without complex editing`,
        `Can be filmed on your ${phoneDevice} with zero paid software`,
        `High curiosity topic for new viewers discovering your channel`,
      ],
      budgetFit: budgetLabel,
      status: 'Idea',
      suggestedAngle: 'Problem → Practical Solution',
      targetAudience: `People interested in ${niche.toLowerCase()}`,
    },
    {
      id: 'rec-2',
      title: `Why Most People Fail at ${toTitleCase(niche)} (And What to Do Instead)`,
      format: 'Long-form',
      goal: 'Get more views',
      difficulty: 'Medium',
      estimatedTime: '1 hour',
      creatorFitScore: 91,
      topicRelevance: 92,
      whyThisIdea: [
        `Addresses the biggest hesitation beginners face in your niche`,
        `Fits your daily time budget of ${profile.dailyTimeAvailable}`,
        `Builds strong retention through an honest, relatable story`,
        `No expensive gear needed—clean audio and clear advice matter most`,
      ],
      budgetFit: budgetLabel,
      status: 'Idea',
      suggestedAngle: 'Contrarian / Truth Reveal',
      targetAudience: 'Intermediate learners & struggling creators',
    },
    {
      id: 'rec-3',
      title: `The 1 Simple Rule for ${toTitleCase(niche)} Nobody Tells You`,
      format: 'Short',
      goal: 'Build an audience',
      difficulty: 'Easy',
      estimatedTime: '25 minutes',
      creatorFitScore: 89,
      topicRelevance: 88,
      whyThisIdea: [
        'Fast turnaround: film and edit in under 30 minutes',
        'Strong first 3-second hook potential for Shorts feeds',
        `Matches your creator style: "${profile.creatorStyle}"`,
        'Simple screen recording or talking-head setup',
      ],
      budgetFit: budgetLabel,
      status: 'Idea',
      suggestedAngle: 'Curiosity Gap / Single Key Insight',
      targetAudience: 'Fast scrollers on mobile',
    },
    {
      id: 'rec-4',
      title: `I Tested the Most Popular ${toTitleCase(niche)} Method (Honest Results)`,
      format: 'Long-form',
      goal: 'Build a personal brand',
      difficulty: 'Medium',
      estimatedTime: '2 hours',
      creatorFitScore: 87,
      topicRelevance: 90,
      whyThisIdea: [
        'First-person experiments build unmatched trust with your audience',
        'Demonstrates genuine experience even if you are just starting out',
        `Leverages free tools (${profile.availableTools.slice(0, 2).join(', ') || 'free editor'})`,
        'Encourages viewers to comment with their own experiences',
      ],
      budgetFit: budgetLabel,
      status: 'Idea',
      suggestedAngle: 'Real-World Experiment / Case Study',
      targetAudience: 'Skeptical viewers looking for proof',
    },
    {
      id: 'rec-5',
      title: `My 3-Step Setup for ${toTitleCase(niche)} with ₹0 Budget`,
      format: isShortsPreferred ? 'Short' : 'Long-form',
      goal: 'Learn content creation',
      difficulty: 'Easy',
      estimatedTime: '45 minutes',
      creatorFitScore: 92,
      topicRelevance: 93,
      whyThisIdea: [
        `100% matched to your budget preference: "${profile.monthlyBudget}"`,
        'Highly relatable to everyday viewers with minimal equipment',
        'Simple bulleted structure makes scripting straightforward',
        'Great opportunity for a pinned community discussion question',
      ],
      budgetFit: budgetLabel,
      status: 'Idea',
      suggestedAngle: 'Budget Hack / Transparent Walkthrough',
      targetAudience: 'Budget-conscious learners starting from zero',
    },
  ];

  return ideas;
}

/**
 * Analyzes any topic entered by user against their saved CreatorProfile
 */
export function analyzeTopicStrategy(rawTopic: string, profile: CreatorProfile): TopicAnalysisResult {
  const trimmed = rawTopic.trim() || 'How to grow a YouTube channel';
  const topicProfile = analyzeTopic(trimmed);

  // Format decision logic
  let bestFormat = 'Actionable Tutorial (4–7 min)';
  let whyFormatFits = `Fits your ${profile.experienceLevel.toLowerCase()} level and daily availability of ${profile.dailyTimeAvailable}.`;

  const isShortTime = profile.dailyTimeAvailable.includes('Under 30') || profile.dailyTimeAvailable.includes('30–60');
  const prefersShorts = profile.creatorStyle.includes('Short-form') || profile.preferredPlatform === 'Shorts';

  if (isShortTime || prefersShorts) {
    bestFormat = 'YouTube Short (30–60s)';
    whyFormatFits = 'Fits your quick production window and mobile-first workflow with high watch-through potential.';
  } else if (profile.experienceLevel === 'Beginner') {
    bestFormat = 'Step-by-Step Tutorial (3–5 min)';
    whyFormatFits = 'Clear, focused scope that avoids overcomplicating production while teaching one key technique.';
  } else if (profile.experienceLevel === 'Comfortable' || profile.experienceLevel === 'Advanced') {
    bestFormat = 'Deep-Dive Breakdown (8–12 min)';
    whyFormatFits = 'Allows detailed chapter breakdowns and higher mid-roll watch time matching your experience.';
  }

  // Production difficulty
  let productionDifficulty: 'Easy' | 'Medium' | 'Advanced' = 'Easy';
  let estimatedProductionTime = '35–50 minutes';

  if (bestFormat.includes('Deep-Dive') || profile.dailyTimeAvailable.includes('2–4') || profile.dailyTimeAvailable.includes('4+')) {
    productionDifficulty = 'Medium';
    estimatedProductionTime = '1.5–2 hours';
  } else if (bestFormat.includes('Short')) {
    productionDifficulty = 'Easy';
    estimatedProductionTime = '25–40 minutes';
  }

  // Recommended audience
  let recommendedAudience = 'Everyday YouTube creators looking for clear, actionable steps.';
  if (profile.contentCategories.includes('Tech') || profile.contentCategories.includes('AI')) {
    recommendedAudience = 'Tech enthusiasts, students, and digital creators wanting practical tools.';
  } else if (profile.contentCategories.includes('Gaming')) {
    recommendedAudience = 'Gaming fans looking for highlights, guides, and entertaining walkthroughs.';
  } else if (profile.contentCategories.includes('Business')) {
    recommendedAudience = 'Entrepreneurs and freelancers aiming to scale their brand and reach clients.';
  }

  // Suggested angle
  let suggestedAngle = `Why ${topicProfile.subject} Is Overlooked (And What to Do First)`;
  if (topicProfile.intent === 'comparison') {
    suggestedAngle = `Honest Contrast: Which Choice Makes Sense for You`;
  } else if (topicProfile.intent === 'tutorial') {
    suggestedAngle = `The Beginner-Friendly Routine to ${toTitleCase(topicProfile.actionPhrase)}`;
  } else if (topicProfile.intent === 'explanation') {
    suggestedAngle = `The Hidden Science Behind ${toTitleCase(topicProfile.subject)}`;
  }

  // Budget fit calculation
  const isZeroBudget = profile.monthlyBudget.includes('₹0');
  const budgetFit = isZeroBudget
    ? '✓ 100% Free Tool Stack (Phone + CapCut/Canva)'
    : `✓ Aligns with your tool budget (${profile.monthlyBudget})`;

  // CreatorFit Score Breakdown
  const scoreBreakdown = {
    topicRelevance: 93,
    goalAlignment: profile.primaryGoal.includes('subscriber') ? 95 : 91,
    timeFit: isShortTime ? 92 : 89,
    skillFit: profile.experienceLevel === 'Beginner' ? 90 : 94,
    budgetFit: isZeroBudget ? 98 : 94,
    formatFit: 92,
  };

  const avgScore = Math.round(
    (scoreBreakdown.topicRelevance * 0.25) +
    (scoreBreakdown.goalAlignment * 0.20) +
    (scoreBreakdown.timeFit * 0.15) +
    (scoreBreakdown.skillFit * 0.15) +
    (scoreBreakdown.budgetFit * 0.15) +
    (scoreBreakdown.formatFit * 0.10)
  );

  const creatorFitScore = Math.min(96, Math.max(78, avgScore));

  // Generate 5 ideas derived directly from the analyzed topic
  const act = topicProfile.actionPhrase;
  const subj = topicProfile.subject;
  const noun = topicProfile.nounPhrase;

  const recommendedIdeas: RecommendedVideoIdea[] = [
    {
      id: `rec-user-1-${Date.now()}`,
      title: `How to ${toTitleCase(act)} as a Complete Beginner`,
      format: bestFormat.includes('Short') ? 'Short' : 'Long-form',
      goal: profile.primaryGoal,
      difficulty: 'Easy',
      estimatedTime: estimatedProductionTime,
      creatorFitScore,
      topicRelevance: 96,
      whyThisIdea: [
        `Directly addresses: "${rawTopic}"`,
        `Prioritizes your main goal: "${profile.primaryGoal}"`,
        `Matches your ${profile.experienceLevel.toLowerCase()} skill level`,
        budgetFit,
      ],
      budgetFit,
      status: 'Idea',
      suggestedAngle: 'Beginner Walkthrough',
      targetAudience: recommendedAudience,
    },
    {
      id: `rec-user-2-${Date.now()}`,
      title: `5 Costly Mistakes When You ${toTitleCase(act)}`,
      format: 'Short',
      goal: 'Get more views',
      difficulty: 'Easy',
      estimatedTime: '30 minutes',
      creatorFitScore: Math.max(75, creatorFitScore - 2),
      topicRelevance: 92,
      whyThisIdea: [
        'Mistake angles trigger high click-through without clickbait',
        'Short format allows quick recording in under 30 minutes',
        'Keeps viewer retention high with punchy visual examples',
        'Works smoothly with free editing apps like CapCut',
      ],
      budgetFit,
      status: 'Idea',
      suggestedAngle: 'Mistake Avoidance',
      targetAudience: 'Creators and viewers struggling with this issue',
    },
    {
      id: `rec-user-3-${Date.now()}`,
      title: `Why Most People Struggle With ${toTitleCase(noun)}`,
      format: 'Long-form',
      goal: 'Build an audience',
      difficulty: 'Medium',
      estimatedTime: '1.5 hours',
      creatorFitScore: Math.max(75, creatorFitScore - 4),
      topicRelevance: 90,
      whyThisIdea: [
        'Positions you as an empathetic creator who understands the real struggle',
        `Fits your daily schedule (${profile.dailyTimeAvailable})`,
        'Enables chapterized timestamps in the video description',
        'Generates natural community discussion in comments',
      ],
      budgetFit,
      status: 'Planned',
      suggestedAngle: 'Root-Cause Analysis',
      targetAudience: recommendedAudience,
    },
    {
      id: `rec-user-4-${Date.now()}`,
      title: `The Easiest Way to ${toTitleCase(act)} in 2026`,
      format: 'Short',
      goal: 'Grow subscribers',
      difficulty: 'Easy',
      estimatedTime: '25 minutes',
      creatorFitScore: Math.max(75, creatorFitScore - 3),
      topicRelevance: 91,
      whyThisIdea: [
        'Simplifies a complicated subject into 3 actionable steps',
        'Mobile-friendly visual demonstration',
        'High shareability among beginners looking for fast tips',
        `Supports your creator style: "${profile.creatorStyle}"`,
      ],
      budgetFit,
      status: 'Idea',
      suggestedAngle: 'Frictionless Fast Guide',
      targetAudience: 'Busy viewers wanting immediate takeaways',
    },
    {
      id: `rec-user-5-${Date.now()}`,
      title: `I Tested Every Way to ${toTitleCase(act)} (Here's What Worked)`,
      format: 'Long-form',
      goal: 'Build a personal brand',
      difficulty: 'Medium',
      estimatedTime: '2 hours',
      creatorFitScore: Math.max(75, creatorFitScore - 5),
      topicRelevance: 89,
      whyThisIdea: [
        'Personal experiments establish strong authority and viewer connection',
        'Honest breakdown of what failed vs what worked builds long-term subscribers',
        'Great foundation for recurring series on your channel',
        budgetFit,
      ],
      budgetFit,
      status: 'Idea',
      suggestedAngle: 'Proof-Based Case Study',
      targetAudience: 'Viewers looking for real-world proof',
    },
  ];

  return {
    analyzedTopic: rawTopic,
    bestFormat,
    whyFormatFits,
    recommendedAudience,
    suggestedAngle,
    productionDifficulty,
    estimatedProductionTime,
    budgetFit,
    creatorFitScore,
    scoreBreakdown,
    recommendedIdeas,
  };
}
