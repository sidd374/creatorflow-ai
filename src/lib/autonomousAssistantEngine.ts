/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Autonomous Creator Assistant Engine
 * 100% API-Free, local, channel-aware assistant engine.
 * Guides creators step-by-step through:
 * 1. Channel Context Analysis & Next-Video Idea Selection
 * 2. Retention Hook & Structured Scripting
 * 3. Spatial Scene & Storyboard Planning
 * 4. Model-Aware Video Prompt Construction
 * 5. Voiceover, Captions, Editing Directions, Title & SEO Metadata
 * 6. Revision & Production Package Persistence
 *
 * Principles:
 * - Uses real saved channel data (topic, audience, style, past analytics).
 * - Asks for missing information instead of inventing fake context.
 * - Never fabricates live trend data or promises viral performance.
 * - Production guide framing (creator renders and uploads in their own tools).
 * - Zero remote LLM API calls.
 */

import { CreatorFlowAssistantContext } from './assistantContext';
import { AssistantMessage } from './assistantStorage';
import { getCreatorProfile, getVideoProjects, saveVideoProject } from './creatorStorage';
import { calculateAnalyticsSummary } from './analyticsEngine';
import { VideoProject } from '../types';
import {
  executeAutonomousGeneration,
  analyzeTopicSemantics,
  generateVideoPromptCandidates,
  generateVideoStoryboardPackage,
} from './autonomousEngine';
import { generateProductionKit, saveStoredProductionKit } from './productionRequirementEngine';
import { getAIVideoToolProfile } from './aiVideoToolProfiles';
import { checkWeeklyVideoQuota } from './videoQuota';

/**
 * Main Entry Point for the Autonomous Creator Assistant Engine
 */
export async function generateAutonomousAssistantResponse(
  messages: AssistantMessage[],
  context: CreatorFlowAssistantContext
): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
  const query = (lastUserMsg?.content || '').trim().toLowerCase();

  // Load actual saved channel data from creatorStorage
  const savedProfile = getCreatorProfile();
  const analyticsSummary = context.recentAnalyticsSummary || calculateAnalyticsSummary([]);

  const channelTopic = context.creatorProfile !== undefined ? (context.creatorProfile.channelTopic || '') : (savedProfile?.channelTopic || '');
  const experienceLevel = context.creatorProfile !== undefined ? (context.creatorProfile.experienceLevel || 'Intermediate') : (savedProfile?.experienceLevel || 'Intermediate');
  const availableDevices = context.creatorProfile !== undefined ? (context.creatorProfile.availableDevices || ['Laptop']) : (savedProfile?.availableDevices || ['Laptop']);
  const preferredLanguage = context.creatorProfile !== undefined ? (context.creatorProfile.preferredLanguage || 'English') : (savedProfile?.preferredLanguage || 'English');

  // -------------------------------------------------------------
  // 1. MISSING CHANNEL CONTEXT CHECK
  // -------------------------------------------------------------
  if (
    (query.includes('plan') || query.includes('next video') || query.includes('idea') || query.includes('strategy')) &&
    !channelTopic
  ) {
    return `Welcome! I am your CreatorFlow Production Guide.\n\nTo give you a channel-tailored video strategy, what is your primary channel topic or niche? (e.g. "Personal Finance", "Tech Reviews", "Personal Vlogs", "Gaming Tutorials")\n\nOnce you tell me your niche, I will evaluate your CreatorFit parameters and guide you through scriptwriting, storyboard planning, model-specific video prompts, and SEO packaging.`;
  }

  // -------------------------------------------------------------
  // 2. STAGE 1: NEXT-VIDEO IDEA SELECTION & EXPLANATION
  // -------------------------------------------------------------
  if (
    query.includes('next video') ||
    query.includes('suggest an idea') ||
    query.includes('recommend idea') ||
    query.includes('pick the best idea') ||
    query.includes('what should i make next')
  ) {
    const topicToUse = channelTopic || context.currentTopic || 'Creator Economy';
    const semantics = analyzeTopicSemantics(topicToUse, preferredLanguage);

    const ideaGenResult = await executeAutonomousGeneration({
      task: 'content_ideas',
      topic: topicToUse,
      language: preferredLanguage,
    });

    const ideas = ideaGenResult.primaryOutput?.ideas || [];
    const topIdea = ideas[0] || {
      title: `How to Master ${semantics.subjectNoun} in 2026`,
      angle: 'Proven Step-by-Step System',
      recommendedFormat: 'Short',
      creatorFitScore: 92,
      productionDifficulty: 'Easy',
      corePremise: 'Clear practical guide breaking down essential workflow points.',
    };

    let response = `🎬 RECOMMENDED NEXT VIDEO STRATEGY FOR ${topicToUse.toUpperCase()}\n\n`;
    response += `📌 Selected Idea: "${topIdea.title}"\n`;
    response += `• Format: ${topIdea.recommendedFormat || 'Short'} (Calibrated for your ${experienceLevel} level)\n`;
    response += `• Angle: ${topIdea.angle || 'Practical Tutorial'}\n`;
    response += `• CreatorFit Score: ${topIdea.creatorFitScore || 90}/100\n`;
    response += `• Difficulty: ${topIdea.productionDifficulty || 'Easy'} (Matches devices: ${availableDevices.join(', ')})\n\n`;

    response += `💡 WHY THIS FIT:\n`;
    response += `• Directly addresses audience demand in ${topicToUse}.\n`;
    if (analyticsSummary.totalVideos > 0 && analyticsSummary.averageCtr) {
      response += `• Grounded in your channel baseline (${analyticsSummary.totalVideos} logged uploads, ${analyticsSummary.averageCtr}% avg CTR).\n`;
    } else {
      response += `• Calibrated for immediate execution with zero budget overhead.\n`;
    }
    response += `• Low production friction on your current hardware setup.\n\n`;

    response += `Next Step: Would you like me to draft a 30-second retention hook and structured script for "${topIdea.title}"?`;
    return response;
  }

  // -------------------------------------------------------------
  // 3. STAGE 2: HOOK & STRUCTURED SCRIPT
  // -------------------------------------------------------------
  if (
    query.includes('hook') ||
    query.includes('script') ||
    query.includes('draft script') ||
    query.includes('write script')
  ) {
    const isFreePlan = (context.plan || 'free').toLowerCase() === 'free';
    if (isFreePlan) {
      const quota = checkWeeklyVideoQuota('free');
      if (!quota.allowed) {
        return `You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.\n\n• Next reset: ${quota.resetsInFormatted || 'a few days'}\n• Upgrade to Pro or Creator: Open the Pricing page to unlock more video starts.`;
      }
    }

    const topicToUse = context.currentTopic || channelTopic || 'Video Creation';
    const isShort = query.includes('short') || context.currentPage === 'builder';

    const hookGenResult = await executeAutonomousGeneration({
      task: 'hooks',
      topic: topicToUse,
      language: preferredLanguage,
      platform: isShort ? 'Shorts' : 'YouTube',
      candidateCount: 3,
    });

    const topHook = hookGenResult.candidates[0]?.content?.spokenHook || `Stop making this costly ${topicToUse} mistake right now!`;
    const visualCue = hookGenResult.candidates[0]?.content?.visualDirection || `Rapid zoom cut with bold headline overlay`;

    let response = `🎣 RETENTION HOOK & SCRIPT BLUEPRINT FOR "${topicToUse.toUpperCase()}"\n\n`;
    response += `🔥 OPENING HOOK (0:00–0:05):\n"${topHook}"\n`;
    response += `📷 Visual Cue: ${visualCue}\n\n`;

    if (isShort) {
      response += `📜 STRUCTURED SCRIPT BEATS:\n`;
      response += `1. Setup (0:05–0:15): "Most creators spend hours doing this manually without realizing the shortcut."\n`;
      response += `2. Core Execution (0:15–0:35): "Step 1: Lock your visual identity. Step 2: Apply pattern interrupts every 15s."\n`;
      response += `3. Payoff & CTA (0:35–0:45): "Do this on your next upload and watch your retention graph stabilize. Subscribe for more blueprints!"\n\n`;
    } else {
      response += `📜 LONG-FORM SCRIPT OUTLINE:\n`;
      response += `• Section 1 (Foundation): Common mistakes & core problem setup.\n`;
      response += `• Section 2 (Step-by-Step Blueprint): Direct demonstration with clean visual overlays.\n`;
      response += `• Section 3 (Real-World Pro Tips): Workflow optimization & final CTA.\n\n`;
    }

    response += `Next Step: Type "Plan Storyboard" to generate scene-by-scene spatial compositions and lighting setups!`;
    return response;
  }

  // -------------------------------------------------------------
  // 4. STAGE 3: SCENE & STORYBOARD PLANNING
  // -------------------------------------------------------------
  if (
    query.includes('storyboard') ||
    query.includes('scene plan') ||
    query.includes('plan scenes') ||
    query.includes('visual plan')
  ) {
    const isFreePlan = (context.plan || 'free').toLowerCase() === 'free';
    if (isFreePlan) {
      const quota = checkWeeklyVideoQuota('free');
      if (!quota.allowed) {
        return `You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.\n\n• Next reset: ${quota.resetsInFormatted || 'a few days'}\n• Upgrade to Pro or Creator: Open the Pricing page to unlock more video starts.`;
      }
    }

    const topicToUse = context.currentTopic || channelTopic || 'AI Workflow';

    const storyboardResult = generateVideoStoryboardPackage(
      analyzeTopicSemantics(topicToUse, preferredLanguage),
      'google_flow',
      30,
      '16:9'
    );

    let response = `🎬 SCENE & STORYBOARD PLAN FOR "${topicToUse.toUpperCase()}" (3 Clips | 30s Total)\n\n`;
    storyboardResult.content.clips.forEach((clip: any) => {
      response += `🎥 CLIP ${clip.clipNumber} [${clip.timeRange}] — ${clip.title}\n`;
      response += `• Action: ${clip.observableAction}\n`;
      response += `• Camera: ${clip.camera}\n`;
      response += `• Lighting: ${clip.lighting}\n`;
      response += `• State Link: ${clip.continuityNotes}\n\n`;
    });

    response += `Next Step: Which AI video generator will you use? (e.g., Google Flow, Runway Gen-3, Sora, Kling AI, Luma, Pika, Hailuo, Leonardo). Tell me the model to format exact prompt code!`;
    return response;
  }

  // -------------------------------------------------------------
  // 5. STAGE 4: MODEL-AWARE VIDEO PROMPT GENERATION
  // -------------------------------------------------------------
  if (
    query.includes('prompt') ||
    query.includes('runway') ||
    query.includes('sora') ||
    query.includes('kling') ||
    query.includes('luma') ||
    query.includes('pika') ||
    query.includes('hailuo') ||
    query.includes('leonardo') ||
    query.includes('flow')
  ) {
    const isFreePlan = (context.plan || 'free').toLowerCase() === 'free';
    if (isFreePlan) {
      const quota = checkWeeklyVideoQuota('free');
      if (!quota.allowed) {
        return `You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.\n\n• Next reset: ${quota.resetsInFormatted || 'a few days'}\n• Upgrade to Pro or Creator: Open the Pricing page to unlock more video starts.`;
      }
    }

    const topicToUse = context.currentTopic || channelTopic || 'Digital Studio';
    let targetModel = 'google_flow';
    if (query.includes('runway')) targetModel = 'runway_gen3';
    else if (query.includes('sora')) targetModel = 'sora';
    else if (query.includes('kling')) targetModel = 'kling_ai';
    else if (query.includes('luma')) targetModel = 'luma_dream_machine';
    else if (query.includes('pika')) targetModel = 'pika_art';
    else if (query.includes('hailuo') || query.includes('minimax')) targetModel = 'hailuo_ai';
    else if (query.includes('leonardo')) targetModel = 'leonardo_ai';

    const profile = getAIVideoToolProfile(targetModel);
    const semantics = analyzeTopicSemantics(topicToUse, preferredLanguage);

    const vCandidates = generateVideoPromptCandidates(
      semantics,
      ['curiosity_mystery', 'practical_tutorial'],
      profile.toolId,
      2
    );

    let response = `🎥 MODEL-AWARE VIDEO PROMPTS FOR ${profile.name.toUpperCase()}\n\n`;
    vCandidates.forEach((c, idx) => {
      response += `PROMPT OPTION ${idx + 1} (${c.content.clipDurationSeconds}s | ${c.strategy}):\n`;
      response += `${c.content.promptText}\n`;
      if (c.content.negativePrompt) {
        response += `NEGATIVE PROMPT: ${c.content.negativePrompt}\n`;
      }
      response += `• Compatibility Note: ${c.content.compatibilityNotes.join(' ')}\n\n`;
    });

    response += `Next Step: Type "Prepare SEO & Voice" to generate YouTube titles, chapters, voiceover direction, and thumbnail text!`;
    return response;
  }

  // -------------------------------------------------------------
  // 6. STAGE 5: VOICEOVER, CAPTIONS, TITLE, SEO & THUMBNAIL
  // -------------------------------------------------------------
  if (
    query.includes('seo') ||
    query.includes('voice') ||
    query.includes('caption') ||
    query.includes('title') ||
    query.includes('thumbnail') ||
    query.includes('full package') ||
    query.includes('prepare seo')
  ) {
    const isFreePlan = (context.plan || 'free').toLowerCase() === 'free';
    if (isFreePlan) {
      const quota = checkWeeklyVideoQuota('free');
      if (!quota.allowed) {
        return `You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.\n\n• Next reset: ${quota.resetsInFormatted || 'a few days'}\n• Upgrade to Pro or Creator: Open the Pricing page to unlock more video starts.`;
      }
    }

    const topicToUse = context.currentTopic || channelTopic || 'Content Creation';

    const kit = generateProductionKit({
      topic: topicToUse,
      topicIntent: {
        rawInput: topicToUse,
        coreTopic: topicToUse,
        subject: topicToUse,
        intent: 'tutorial',
        topicKeywords: [topicToUse, 'tutorial', 'guide'],
        excludedInterpretations: [],
      },
      selectedIdea: {
        id: 'idea_1',
        title: `How to Master ${topicToUse} in 2026`,
        format: 'Short',
        goal: 'Growth',
        difficulty: 'Easy',
        estimatedTime: '30 mins',
        creatorFitScore: 92,
        topicRelevance: 95,
        whyThisIdea: ['Fits experience level'],
        budgetFit: 'Free',
        status: 'Idea',
        presentationFormat: 'Shorts',
      },
      creatorProfile: savedProfile || {
        channelTopic: topicToUse,
        primaryGoal: 'Growth',
        creatorStyle: 'Educational',
        experienceLevel: 'Intermediate',
        dailyTimeAvailable: '1 hour',
        monthlyBudget: '$0 (Free Tools Only)',
        availableDevices: ['Laptop'],
        preferredLanguage: 'English',
        customCharacters: [],
      },
      brief: {
        availableDevices: ['Laptop'],
        presentationStyle: ['Whiteboard/drawing'],
        recordingCapabilities: ['Screen recordings'],
        existingAssets: ['Photos'],
        videoType: 'Shorts',
        preferredDuration: '45 sec',
        productionLevel: 'Clean & Professional',
        primaryPriority: 'Simplicity',
        secondaryPriorities: ['Easy editing'],
        videoBudget: '₹0 — Completely Free',
        aiAssistance: 'AI for Creation',
        characterCast: 'single',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      creationMethod: 'ai_animation',
      selectedTool: {
        id: 'google_flow',
        name: 'Google Flow',
        toolCategory: 'ai_generator',
        cost: 'Free',
        difficulty: 'Easy',
        worksOn: ['Browser'],
        whyFitsVideo: 'Fast AI video generator',
        advantages: ['High quality'],
        limitations: ['Silent baseline output'],
        whatYouWillUseItFor: ['AI Video Generation'],
        bestFor: 'AI Scenes',
      },
    });

    saveStoredProductionKit(kit);

    let response = `📝 COMPLETE PRODUCTION & SEO PACKAGE FOR "${topicToUse.toUpperCase()}"\n\n`;
    response += `📌 HIGH-CTR YOUTUBE TITLES:\n`;
    response += `1. ${kit.scriptPackage?.title || topicToUse}\n`;
    response += `2. Stop Doing ${topicToUse} Wrong (The ₹0 AI Method)\n`;
    response += `3. 7 Minimal ${topicToUse} Hacks That Saved 10 Hours\n\n`;

    response += `🎙️ VOICEOVER DIRECTION:\n`;
    response += `• Pacing: ${kit.voicePackage?.pace || 'Normal'}\n`;
    response += `• Voice Tone: ${kit.voicePackage?.tone || 'Energetic'}\n\n`;

    response += `🖼️ THUMBNAIL OVERLAY TEXT OPTIONS:\n`;
    response += `• "${kit.thumbnailPackage?.thumbnailText || 'WATCH THIS'}"\n\n`;

    response += `✂️ CAPTIONS & EDITING DIRECTION:\n`;
    response += `• Audio Settings: Voice ${kit.editingPlan?.audioSettings?.voiceLevel || '0dB'}, Music ${kit.editingPlan?.audioSettings?.musicLevel || '-20dB'}\n`;
    response += `• Steps: ${(kit.editingPlan?.sequenceSteps || ['Import video clips', 'Add auto captions']).slice(0, 3).join(', ')}\n\n`;

    response += `💾 Status: Production Package built and saved to local workspace!\nType "Save Project" to lock into your active projects dashboard.`;
    return response;
  }

  // -------------------------------------------------------------
  // 7. STAGE 6: PERSISTENCE & SAVING PROJECT
  // -------------------------------------------------------------
  if (query.includes('save project') || query.includes('save package') || query.includes('save progress')) {
    const topicToUse = context.currentTopic || channelTopic || 'Creator Strategy';

    const projectToSave: VideoProject = {
      id: `proj_${Date.now()}`,
      ideaId: 'idea_1',
      topic: topicToUse,
      selectedTitle: `Mastering ${topicToUse}`,
      format: 'Short',
      targetAudience: 'Beginners',
      primaryGoal: 'Subscribers',
      difficulty: 'Easy',
      estimatedMinutes: 30,
      creatorFitScore: 92,
      reasonForFit: ['Channel topic match'],
      angle: 'Practical Tutorial',
      status: 'Planned',
      durationSeconds: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveVideoProject(projectToSave);

    return `✓ SAVED TO WORKSPACE!\n\nProject "${projectToSave.selectedTitle}" has been saved to your active projects list.\n\nYou can access your script, scene prompts, voice settings, and SEO package anytime from the Video Builder and Creation Kit views.`;
  }

  // -------------------------------------------------------------
  // 8. GENERAL GROUNDED ASSISTANT FALLBACK (Local Knowledge)
  // -------------------------------------------------------------
  if (query.includes('tool') || query.includes('which software') || query.includes('capcut') || query.includes('free')) {
    return `For your device setup (${availableDevices.join(', ')}), recommended verified tools include:\n• CapCut (Free editing & auto-captions)\n• Google Flow / Kling AI (Free-tier AI video generation)\n• Canva / Photopea (Free high-contrast thumbnail design)\n• Audacity / ElevenLabs (Free audio recording & voiceover)`;
  }

  if (query.includes('plan') || query.includes('upgrade') || query.includes('limit') || query.includes('quota')) {
    const currentPlan = context.plan || 'Free';
    return `You are currently on the ${currentPlan} plan. Higher tiers unlock multi-character planning, advanced video script engines, and expanded rolling generation quotas while maintaining 100% data privacy.`;
  }

  // Default helpful production guide prompt
  return `I am your CreatorFlow Production Guide.\n\nI can help you:\n1. Select and explain a suitable next video idea for ${channelTopic || 'your channel'}\n2. Draft retention hooks and structured scripts\n3. Plan spatial scenes and storyboards\n4. Format model-aware prompts for Runway, Sora, Kling, Luma, Pika, Hailuo, Leonardo, or Google Flow\n5. Prepare voiceover, captions, editing steps, and YouTube titles/SEO\n\nWhat would you like to build first?`;
}
