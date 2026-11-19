/**
 * CreatorFlow AI — Guided Workflow Storage & State Orchestrator
 * Persists user journey seamlessly across sessions & page refreshes.
 * Bridges into project storage and achievement triggers.
 */

import {
  CreatorWorkflowState,
  WorkflowScriptSection,
  WorkflowVisualItem,
  WorkflowVoicePlan,
  WorkflowEditingPlan,
  WorkflowAssets,
  WorkflowAIPrompts,
  WorkflowMetadata,
  WorkflowDiscovery,
  WorkflowYoutubeSettings,
  WorkflowStepNumber,
  CreationMethodType,
  WorkflowToolInfo,
  VideoCreationBrief,
  DeviceType,
  PresentationStyleType,
  RecordingCapabilityType,
  ExistingAssetType,
  VideoTypeOption,
  ProductionLevelType,
  PrimaryPriorityType,
  SecondaryPriorityType,
  VideoBudgetType,
  AIAssistanceType,
  TopicIntent,
} from '../types/guidedWorkflow';
import { CreatorProfile, RecommendedVideoIdea, VideoProject } from '../types';
import { analyzeTopicStrategy } from './strategyEngine';
import { saveVideoProject, getVideoProject } from './creatorStorage';
import { unlockAchievement, recordMilestoneEvent } from './achievementEngine';
import { searchAndRecommendTools } from './toolSearchEngine';
import { extractTopicIntent } from './topicAnalyzer';
import { getIsolatedGuidedWorkflow, saveIsolatedGuidedWorkflow, clearIsolatedGuidedWorkflow } from './accountStorage';

export function getGuidedWorkflowState(): CreatorWorkflowState | null {
  if (typeof window === 'undefined') return null;
  const isolated = getIsolatedGuidedWorkflow();
  if (isolated && typeof isolated.currentStep === 'number') {
    return isolated as CreatorWorkflowState;
  }
  return null;
}

export function saveGuidedWorkflowState(state: CreatorWorkflowState): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    saveIsolatedGuidedWorkflow(updated);
  } catch (err) {
    console.error('Error saving guided workflow state:', err);
  }
}

export function clearGuidedWorkflowState(): void {
  if (typeof window === 'undefined') return;
  try {
    clearIsolatedGuidedWorkflow();
  } catch (err) {
    console.error('Error clearing guided workflow state:', err);
  }
}

/**
 * Generate default VideoCreationBrief mapped from CreatorProfile
 */
export function getDefaultCreationBrief(profile: CreatorProfile, topic?: string): VideoCreationBrief {
  const devices: DeviceType[] = [];
  if (profile.availableDevices.some(d => d.toLowerCase().includes('laptop') || d.toLowerCase().includes('pc'))) {
    devices.push('Laptop');
  }
  if (profile.availableDevices.some(d => d.toLowerCase().includes('phone'))) {
    if (devices.length === 0) devices.push('Phone');
    else devices.push('Phone and Laptop');
  }
  if (devices.length === 0) {
    devices.push('Laptop');
  }

  let budget: VideoBudgetType = '₹0 — Completely Free';
  if (profile.monthlyBudget.includes('Paid') || profile.monthlyBudget.includes('500') || profile.monthlyBudget.includes('1000')) {
    budget = 'Low Budget';
  }

  return {
    availableDevices: devices,
    presentationStyle: ['Faceless', 'Voice-over + visuals', 'Screen recording'],
    recordingCapabilities: ['Screen recordings', 'Voice recording'],
    existingAssets: ['Nothing yet'],
    videoType: 'Educational',
    preferredDuration: '5 min',
    productionLevel: 'Clean & Professional',
    primaryPriority: 'Lowest cost',
    secondaryPriorities: ['Easy editing', 'Better visuals'],
    videoBudget: budget,
    aiAssistance: 'AI for Planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate AI prompts tailored to the video topic & brief
 */
export function generateAIPrompts(topic: string, brief: VideoCreationBrief): WorkflowAIPrompts {
  const cleanTopic = topic.replace(/^how to\s+/i, '');
  return {
    imagePrompt: `Clean, editorial YouTube thumbnail illustration showing ${cleanTopic}, modern minimalist design with dark slate background, warm amber gold highlights, high contrast typography, 16:9 aspect ratio, 8k resolution.`,
    videoPrompt: `Cinematic 4k B-roll footage demonstrating ${cleanTopic}, smooth camera tracking, clean natural lighting, educational software interface, uncluttered modern desk aesthetic.`,
    voicePrompt: `Warm, authoritative, and friendly narrator voice, natural conversational cadence at 145 words per minute, confident delivery with subtle pauses between core steps.`,
    musicPrompt: `Subtle, ambient lo-fi electronic background music with gentle melodic piano and light percussion, balanced at -22dB for vocal clarity, zero copyright risk.`,
    thumbnailPrompt: `Eye-catching YouTube thumbnail layout: high-contrast text "THE REAL SECRET" on left third, expressive facial expression on right third, electric cyan and amber accents, 1280x720.`,
  };
}

/**
 * Generate Personalized Ideas matching CreatorProfile + VideoCreationBrief + separated TopicIntent
 */
export function buildPersonalizedIdeas(
  rawTopic: string,
  profile: CreatorProfile,
  brief: VideoCreationBrief
): RecommendedVideoIdea[] {
  const profileFormat = brief.presentationStyle[0] || 'Whiteboard Animation';
  const topicIntent = extractTopicIntent(rawTopic, {
    profileFormat,
    profileAudience: profile.primaryGoal,
    profileGoal: profile.primaryGoal,
  });

  const subject = topicIntent.subject || rawTopic;
  const presentationFormat = topicIntent.presentationFormat || 'Whiteboard Animation';
  const isFormatSubject = topicIntent.isFormatSubject;

  const isShort = brief.videoType === 'Shorts' || brief.preferredDuration.includes('sec') || presentationFormat === 'Shorts';
  const duration = isShort ? '45 sec' : (brief.preferredDuration || '4–5 min');

  let candidateIdeas: RecommendedVideoIdea[] = [];

  if (isFormatSubject) {
    // Topic itself is about creating whiteboard animations / screen recordings / etc.
    candidateIdeas = [
      {
        id: `idea_${Date.now()}_1`,
        title: `How to Make Your First ${subject} (Complete Beginner Guide)`,
        format: isShort ? 'Short' : 'Long-form',
        goal: profile.primaryGoal,
        difficulty: 'Easy',
        estimatedTime: isShort ? '30 minutes' : '60 minutes',
        creatorFitScore: 95,
        topicRelevance: 98,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Step-by-Step Software & Creation Walkthrough',
        targetAudience: 'Beginners wanting to learn this creation method',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Hook (0:00) → Free Tool Setup (0:15) → Drawing/Recording Steps (1:00) → Exporting (3:30) → CTA',
        whyThisIdea: [
          `Directly addresses the subject "${subject}" without deviations.`,
          `Designed to run on your ${brief.availableDevices.join(' + ')} with ₹0 software.`,
          `Breaks down the creation mechanics into simple steps suitable for a ${profile.experienceLevel}.`,
        ],
      },
      {
        id: `idea_${Date.now()}_2`,
        title: `Top 3 Free Tools for ${subject} in 2025`,
        format: isShort ? 'Short' : 'Long-form',
        goal: 'High Search Traffic',
        difficulty: 'Easy',
        estimatedTime: isShort ? '20 minutes' : '45 minutes',
        creatorFitScore: 92,
        topicRelevance: 94,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Zero-Cost Tool Comparison & Recommendations',
        targetAudience: 'Budget-conscious creators looking for software',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Hook → Tool 1 (Free) → Tool 2 (Easy) → Tool 3 (Best Quality) → Final Verdict',
        whyThisIdea: [
          'High search queries for creators seeking free options.',
          `Matches your ${brief.videoBudget} target.`,
          'Quick to produce with screen recordings or clean slide visuals.',
        ],
      },
      {
        id: `idea_${Date.now()}_3`,
        title: `5 Mistakes Beginners Make With ${subject} (And How to Fix Them)`,
        format: 'Long-form',
        goal: 'Retention & Authority',
        difficulty: 'Easy',
        estimatedTime: '60 minutes',
        creatorFitScore: 91,
        topicRelevance: 92,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Common Pitfalls & Fixes Framework',
        targetAudience: 'Creators struggling with quality or workflow',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Problem Hook → Mistake 1 → Mistake 2 → Mistake 3 → Summary Checklist',
        whyThisIdea: [
          'High CTR curiosity angle that viewers search for when frustrated.',
          'Builds authority by demonstrating practical troubleshooting.',
          `Easily recorded using your ${brief.availableDevices.join(' + ')}.`,
        ],
      },
      {
        id: `idea_${Date.now()}_4`,
        title: `How to Create ${subject} in Under 15 Minutes #Shorts`,
        format: 'Short',
        goal: 'Rapid Channel Growth & Discovery',
        difficulty: 'Easy',
        estimatedTime: '25 minutes',
        creatorFitScore: 94,
        topicRelevance: 95,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Pattern Interrupt & Fast Shortcut',
        targetAudience: 'Mobile feed viewers',
        presentationFormat: 'Shorts',
        suggestedStructure: 'Fast Visual Hook → 3-Step Shortcut → Final Result',
        whyThisIdea: [
          'Fast 45-second vertical script with rapid pacing.',
          'Zero camera requirement—can be demonstrated with fast screen recordings.',
          'High algorithmic momentum for short-form feeds.',
        ],
      },
    ];
  } else if (/whiteboard/i.test(presentationFormat)) {
    // Whiteboard animation format with distinct topic (e.g. YouTube growth, Climate change, etc.)
    candidateIdeas = [
      {
        id: `idea_${Date.now()}_1`,
        title: `Why Most People Fail at ${subject} (The 5-Step Visual Fix)`,
        format: isShort ? 'Short' : 'Long-form',
        goal: profile.primaryGoal,
        difficulty: 'Easy',
        estimatedTime: isShort ? '30 minutes' : '90 minutes',
        creatorFitScore: 96,
        topicRelevance: 97,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Problem → Visual Cause/Effect Breakdown → Solution Blueprint',
        targetAudience: topicIntent.audience || 'Beginners seeking clear visual explanations',
        presentationFormat: 'Whiteboard Animation',
        suggestedStructure: 'Curiosity Hook (0:00) → Visual Mechanism of the Problem (0:30) → The 3 Core Fixes (1:45) → Summary Action Plan (4:00)',
        whyThisIdea: [
          `Subject remains strictly about "${subject}", presented through whiteboard visuals.`,
          'Visual diagrams and drawings simplify complex cause-and-effect concepts for viewers.',
          `100% faceless workflow: only requires a voiceover and simple digital sketches/slides on your ${brief.availableDevices.join(' + ')}.`,
        ],
      },
      {
        id: `idea_${Date.now()}_2`,
        title: `The 5-Step ${subject} System: Complete Visual Roadmap`,
        format: isShort ? 'Short' : 'Long-form',
        goal: 'Audience Authority & Retention',
        difficulty: 'Easy',
        estimatedTime: isShort ? '25 minutes' : '75 minutes',
        creatorFitScore: 94,
        topicRelevance: 95,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Step-by-Step Visual Framework & Diagrams',
        targetAudience: topicIntent.audience || 'Action-oriented learners',
        presentationFormat: 'Whiteboard Animation',
        suggestedStructure: 'Visual Blueprint Hook → Step 1 Drawing → Step 2 Flowchart → Step 3 Execution → Conclusion',
        whyThisIdea: [
          `Explains ${subject} as a visual step-by-step roadmap that keeps retention high.`,
          'No complex filming gear needed—easily animated using free tools or screen recording of digital drawings.',
          `Fits your ${brief.videoBudget} budget.`,
        ],
      },
      {
        id: `idea_${Date.now()}_3`,
        title: `What Actually Happens When You Start ${subject}? (Explained With Drawings)`,
        format: 'Long-form',
        goal: 'Educational Impact & Shares',
        difficulty: 'Medium',
        estimatedTime: '80 minutes',
        creatorFitScore: 90,
        topicRelevance: 93,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Behind-The-Scenes Timeline & Mechanism Breakdown',
        targetAudience: 'Curious learners & newcomers',
        presentationFormat: 'Whiteboard Animation',
        suggestedStructure: 'Timeline Hook (Day 1) → Day 30 Visual Curve → The Plateau Diagram → The Breakthrough Payoff',
        whyThisIdea: [
          'High storytelling potential using simple whiteboard timelines and illustrations.',
          'Keeps viewers watching till the end to see the visual transformation curve.',
          `Matches your ${brief.availableDevices.join(' + ')} hardware.`,
        ],
      },
      {
        id: `idea_${Date.now()}_4`,
        title: `3 Big Myths About ${subject} (Visual Truth) #Shorts`,
        format: 'Short',
        goal: 'Rapid Discovery & High CTR',
        difficulty: 'Easy',
        estimatedTime: '30 minutes',
        creatorFitScore: 95,
        topicRelevance: 96,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Myth vs Reality Rapid Visual Contrast',
        targetAudience: 'Mobile feed viewers',
        presentationFormat: 'Shorts (Whiteboard Style)',
        suggestedStructure: 'Fast Myth Sketch (0:00) → Red Crossout (0:15) → The Real Secret Diagram (0:30) → CTA',
        whyThisIdea: [
          `Rapid 45-second vertical sketch illustrating ${subject} misconceptions.`,
          'Pattern-interrupt visual contrast hooks mobile viewers in the first 2 seconds.',
          'Zero camera presence needed—pure voiceover and animated doodles.',
        ],
      },
    ];
  } else if (/screen/i.test(presentationFormat)) {
    // Screen recording format (e.g. Photoshop, video editing, coding, software)
    candidateIdeas = [
      {
        id: `idea_${Date.now()}_1`,
        title: `${subject} for Beginners: Complete Step-by-Step Walkthrough (${duration})`,
        format: isShort ? 'Short' : 'Long-form',
        goal: profile.primaryGoal,
        difficulty: 'Easy',
        estimatedTime: isShort ? '30 minutes' : '60 minutes',
        creatorFitScore: 96,
        topicRelevance: 97,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Click-by-Click Live Software Walkthrough',
        targetAudience: topicIntent.audience || 'Hands-on beginners',
        presentationFormat: 'Screen Recording',
        suggestedStructure: 'Interface Overview (0:00) → Core Controls Setup (1:00) → Live Project Creation (2:30) → Export (4:30)',
        whyThisIdea: [
          `Direct practical tutorial for ${subject} showing real clicks and settings on screen.`,
          `Recorded directly on your ${brief.availableDevices.join(' + ')} with OBS Studio (100% free).`,
          'High viewer search volume from people trying to learn the exact buttons to press.',
        ],
      },
      {
        id: `idea_${Date.now()}_2`,
        title: `The 5 Must-Know Shortcuts for ${subject} (Live Screen Demo)`,
        format: isShort ? 'Short' : 'Long-form',
        goal: 'High CTR & Saves',
        difficulty: 'Easy',
        estimatedTime: isShort ? '20 minutes' : '45 minutes',
        creatorFitScore: 92,
        topicRelevance: 94,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Workflow Speed & Efficiency Hacks',
        targetAudience: 'Creators wanting to speed up their work',
        presentationFormat: 'Screen Recording',
        suggestedStructure: 'Speed Hook → Shortcut 1 & 2 Demo → Shortcut 3 & 4 Demo → The Pro Secret → Wrap up',
        whyThisIdea: [
          'High bookmark/save rate on YouTube as viewers save it for future reference.',
          'Very quick to film: 5 short live screen demonstrations.',
          `Fits your ${brief.videoBudget} budget.`,
        ],
      },
      {
        id: `idea_${Date.now()}_3`,
        title: `Watch Me Fix Bad ${subject} Mistakes in Real Time`,
        format: 'Long-form',
        goal: 'Authority & Deep Engagement',
        difficulty: 'Medium',
        estimatedTime: '60 minutes',
        creatorFitScore: 89,
        topicRelevance: 91,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Before vs After Screen Troubleshooting',
        targetAudience: 'Intermediate creators facing roadblocks',
        presentationFormat: 'Screen Recording',
        suggestedStructure: 'Ugly Starting State → Diagnosing Error 1 → Live Correction → Stunning Final Result',
        whyThisIdea: [
          'Satisfying Before/After transformation demonstrated entirely on screen.',
          'Keeps watch time high as viewers anticipate the final result.',
        ],
      },
      {
        id: `idea_${Date.now()}_4`,
        title: `Stop Doing ${subject} The Slow Way #Shorts`,
        format: 'Short',
        goal: 'Fast Views & Subscribers',
        difficulty: 'Easy',
        estimatedTime: '25 minutes',
        creatorFitScore: 94,
        topicRelevance: 95,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Rapid Screen Shortcut & Time Saver',
        targetAudience: 'Mobile feed viewers',
        presentationFormat: 'Shorts (Screen Capture)',
        suggestedStructure: 'Slow way on screen (3s) → "Do this instead" (5s) → 1-click magic demonstration (20s)',
        whyThisIdea: [
          'Instant visual payoff in the first 3 seconds of vertical screen video.',
          'High shareability across creator communities.',
        ],
      },
    ];
  } else if (/documentary/i.test(presentationFormat)) {
    // Documentary format (e.g. History of the internet, Origins of AI, Rise and fall)
    candidateIdeas = [
      {
        id: `idea_${Date.now()}_1`,
        title: `The Untold Story of ${subject}: How It Changed Everything`,
        format: 'Long-form',
        goal: profile.primaryGoal,
        difficulty: 'Medium',
        estimatedTime: '90 minutes',
        creatorFitScore: 94,
        topicRelevance: 96,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Chronological Narrative Investigation',
        targetAudience: topicIntent.audience || 'Documentary & history enthusiasts',
        presentationFormat: 'Documentary',
        suggestedStructure: 'Intriguing Prologue Hook → The Forgotten Origins (Chapter 1) → The Critical Turning Point (Chapter 2) → The Modern Reality (Chapter 3) → Epilogue',
        whyThisIdea: [
          `Investigates the history and impact of "${subject}" with deep narrative pacing.`,
          'Can be edited with free historical archives, public domain photos, and voiceover.',
          'High watch-time retention through dramatic chapter storytelling.',
        ],
      },
      {
        id: `idea_${Date.now()}_2`,
        title: `From Origins to Global Phenomenon: The Rise of ${subject}`,
        format: 'Long-form',
        goal: 'Authority & Watch Time',
        difficulty: 'Medium',
        estimatedTime: '80 minutes',
        creatorFitScore: 91,
        topicRelevance: 93,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Historical Timeline & Key Milestones',
        targetAudience: 'Curious learners and tech enthusiasts',
        presentationFormat: 'Documentary',
        suggestedStructure: 'Opening Mystery → The Early Pioneers → The Breakthrough Year → Where We Are Today',
        whyThisIdea: [
          'Structured historical milestones make writing and editing predictable.',
          `Fully assembleable on your ${brief.availableDevices.join(' + ')}.`,
        ],
      },
      {
        id: `idea_${Date.now()}_3`,
        title: `The 1-Minute Documentary on ${subject} #Shorts`,
        format: 'Short',
        goal: 'Discovery & Viral Hook',
        difficulty: 'Easy',
        estimatedTime: '30 minutes',
        creatorFitScore: 93,
        topicRelevance: 94,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'High-Paced Micro Documentary Story',
        targetAudience: 'Mobile feed viewers',
        presentationFormat: 'Shorts (Documentary)',
        suggestedStructure: 'Dramatic Historical Hook (0:00) → 3 Rapid Archival Beats (0:15) → Mind-Blowing Conclusion (0:45)',
        whyThisIdea: [
          'High dramatic curiosity that captivates mobile feeds.',
          'Combines archival images with punchy voiceover narration.',
        ],
      },
    ];
  } else {
    // General / Talking Head / Educational fallback
    candidateIdeas = [
      {
        id: `idea_${Date.now()}_1`,
        title: `How to Master ${subject} From Scratch (${duration} Practical Guide)`,
        format: isShort ? 'Short' : 'Long-form',
        goal: profile.primaryGoal,
        difficulty: 'Easy',
        estimatedTime: isShort ? '30 minutes' : '60 minutes',
        creatorFitScore: 94,
        topicRelevance: 96,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Problem → Zero-Cost Framework → Immediate Action',
        targetAudience: topicIntent.audience || 'Beginner & intermediate creators',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Hook (0:00) → The Core Principle (0:45) → 3 Execution Steps (2:00) → Summary (4:30)',
        whyThisIdea: [
          `Directly teaches "${subject}" with zero fluff.`,
          `Designed for ${duration} duration matching your available ${profile.dailyTimeAvailable}.`,
          `Matches your ${brief.videoBudget} budget constraint.`,
        ],
      },
      {
        id: `idea_${Date.now()}_2`,
        title: `The 3 Biggest Mistakes Beginners Make With ${subject} (And How to Fix Them)`,
        format: isShort ? 'Short' : 'Long-form',
        goal: 'Retention & Authority',
        difficulty: 'Easy',
        estimatedTime: isShort ? '25 minutes' : '50 minutes',
        creatorFitScore: 92,
        topicRelevance: 93,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Mistakes & Corrections Framework',
        targetAudience: 'Creators struggling with consistency or traction',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Curiosity Hook → Mistake 1 → Mistake 2 → Mistake 3 → Next Action',
        whyThisIdea: [
          'High CTR curiosity angle that viewers search for when stuck.',
          'Simple 3-part breakdown speeds up writing and recording.',
        ],
      },
      {
        id: `idea_${Date.now()}_3`,
        title: `My Complete Step-by-Step Workflow for ${subject}`,
        format: 'Long-form',
        goal: 'Subscriber Conversion',
        difficulty: 'Medium',
        estimatedTime: '75 minutes',
        creatorFitScore: 89,
        topicRelevance: 90,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Behind-The-Scenes Walkthrough',
        targetAudience: 'Action-oriented creators',
        presentationFormat: presentationFormat,
        suggestedStructure: 'Workflow Hook → Phase 1 Planning → Phase 2 Execution → Phase 3 Review',
        whyThisIdea: [
          'Establishes deep authority by walking viewers through the exact workflow.',
          `Fully executable using your ${brief.availableDevices.join(' + ')}.`,
        ],
      },
      {
        id: `idea_${Date.now()}_4`,
        title: `Stop Doing ${subject} The Hard Way #Shorts`,
        format: 'Short',
        goal: 'Rapid Channel Growth',
        difficulty: 'Easy',
        estimatedTime: '25 minutes',
        creatorFitScore: 94,
        topicRelevance: 95,
        budgetFit: brief.videoBudget,
        status: 'Idea',
        suggestedAngle: 'Pattern Interrupt & Fast Shortcut',
        targetAudience: 'Mobile feed viewers',
        presentationFormat: 'Shorts',
        suggestedStructure: 'Problem Hook (3s) → The Fast Way (15s) → Proof & CTA (40s)',
        whyThisIdea: [
          'Fast 45-second vertical script with high algorithmic momentum.',
          'Zero camera requirement—can be produced with text overlays and b-roll.',
        ],
      },
    ];
  }

  // TOPIC CORRECTION SAFETY CHECK (Requirement 9 & 10)
  // If !isFormatSubject, reject any idea where the format accidentally became the subject of the title
  if (!isFormatSubject) {
    const formatTerms = ['how to make whiteboard', 'whiteboard animation tutorial', 'how to record screen', 'how to start a faceless', 'documentary filmmaking tutorial'];
    candidateIdeas = candidateIdeas.filter(idea => {
      const lowerTitle = idea.title.toLowerCase();
      const isCorrupted = formatTerms.some(term => lowerTitle.includes(term));
      return !isCorrupted;
    });
  }

  return candidateIdeas;
}

/**
 * Build initial structured script sections for an idea
 */
export function buildScriptSections(ideaTitle: string, isShort: boolean): WorkflowScriptSection[] {
  if (isShort) {
    return [
      {
        id: 'sec_hook',
        type: 'Hook',
        title: 'Hook (0:00–0:05)',
        text: `If you are trying to master ${ideaTitle.toLowerCase().replace(/^(how to|why|the)\s+/i, '')}, stop making this one costly mistake.`,
        durationSec: 5,
        deliveryTip: 'Deliver with high vocal energy and instant punch. Zero fluff.',
      },
      {
        id: 'sec_intro',
        type: 'Introduction',
        title: 'Context (0:05–0:12)',
        text: `Most beginners waste weeks doing it the hard way. Here is the exact 3-step shortcut that actually works.`,
        durationSec: 7,
        deliveryTip: 'Show text overlay on screen and point upwards.',
      },
      {
        id: 'sec_p1',
        type: 'Main Point 1',
        title: 'Point 1: The Setup (0:12–0:24)',
        text: `Step one: eliminate unnecessary tools. You only need one clear recording device and a focused checklist.`,
        durationSec: 12,
        deliveryTip: 'Cut abruptly to screen recording or demonstration.',
      },
      {
        id: 'sec_p2',
        type: 'Main Point 2',
        title: 'Point 2: The Core Rule (0:24–0:38)',
        text: `Step two: focus entirely on viewer clarity. Remove every sentence that doesn't advance your main point.`,
        durationSec: 14,
        deliveryTip: 'Highlight key phrase on screen with animated subtitles.',
      },
      {
        id: 'sec_p3',
        type: 'Main Point 3',
        title: 'Point 3: Quick Win (0:38–0:48)',
        text: `Step three: publish consistently before worrying about viral perfection. Momentum beats hesitation.`,
        durationSec: 10,
        deliveryTip: 'Confident, direct delivery.',
      },
      {
        id: 'sec_conclusion',
        type: 'Conclusion',
        title: 'Payoff (0:48–0:54)',
        text: `Apply this simple framework today and you will see your production time cut in half.`,
        durationSec: 6,
        deliveryTip: 'Nod and smile warmly.',
      },
      {
        id: 'sec_cta',
        type: 'CTA',
        title: 'Call to Action (0:54–0:60)',
        text: `Save this Short for your next shoot, and subscribe for weekly creator playbooks!`,
        durationSec: 6,
        deliveryTip: 'Point to subscribe button at bottom right.',
      },
    ];
  }

  // Long-form (3 to 5 min structure)
  return [
    {
      id: 'sec_hook',
      type: 'Hook',
      title: 'Hook (0:00–0:15)',
      text: `In this video, I am going to show you the exact, realistic roadmap for ${ideaTitle.toLowerCase()}—even if you are starting from zero subscribers and zero budget.`,
      durationSec: 15,
      deliveryTip: 'Open directly with eye contact or clear voice. Avoid saying "Welcome back guys" or greeting filler.',
    },
    {
      id: 'sec_intro',
      type: 'Introduction',
      title: 'Setup & Stakes (0:15–0:45)',
      text: `When I first started researching this, I found dozens of overcomplicated videos recommending thousands of rupees in gear. Today we strip all that away into an actionable, honest walkthrough.`,
      durationSec: 30,
      deliveryTip: 'Speak in a relatable, calm cadence. Establish honest expectations.',
    },
    {
      id: 'sec_p1',
      type: 'Main Point 1',
      title: 'Foundations & Equipment (0:45–1:45)',
      text: `First principle: your phone camera and basic lighting are already enough. 80% of retention comes from clear audio and crisp pacing, not 4K lenses. Place your microphone 6 inches from your mouth and face a window.`,
      durationSec: 60,
      deliveryTip: 'Show side-by-side b-roll of good lighting vs bad lighting.',
    },
    {
      id: 'sec_p2',
      type: 'Main Point 2',
      title: 'The Core Execution Strategy (1:45–2:45)',
      text: `Second principle: structure your content so viewers get practical value in the first 60 seconds. Don't withhold the solution until the end; explain how it works early, then demonstrate the step-by-step nuances.`,
      durationSec: 60,
      deliveryTip: 'Screen recording or diagram showing the progression.',
    },
    {
      id: 'sec_p3',
      type: 'Main Point 3',
      title: 'Avoiding the Fatal Pitfall (2:45–3:30)',
      text: `The biggest mistake creators make here is spending 10 hours editing before checking if their title and hook are clear. Spend 30 minutes perfecting your topic clarity before hitting record.`,
      durationSec: 45,
      deliveryTip: 'Use a thoughtful, cautionary vocal tone.',
    },
    {
      id: 'sec_conclusion',
      type: 'Conclusion',
      title: 'Key Takeaways & Recap (3:30–4:00)',
      text: `To summarize: keep your setup simple, prioritize clean voice delivery, and structure your points around viewer outcomes rather than vanity effects.`,
      durationSec: 30,
      deliveryTip: 'Recap with 3 clear bullet points appearing on screen.',
    },
    {
      id: 'sec_cta',
      type: 'CTA',
      title: 'Next Step / Pinned Resource (4:00–4:15)',
      text: `Let me know in the comments: what is the single biggest question you have about this? I read every reply. Don't forget to subscribe for more real creator guides.`,
      durationSec: 15,
      deliveryTip: 'Warm, genuine closing gesture. Point to next recommended video on end-screen.',
    },
  ];
}

/**
 * Regenerate single section without destroying others
 */
export function regenerateSingleSection(
  sectionType: string,
  topic: string,
  isShort: boolean
): { text: string; deliveryTip: string } {
  const shortAlternates: Record<string, { text: string; deliveryTip: string }> = {
    Hook: {
      text: `Most creators get ${topic.toLowerCase()} completely backward. Here is the honest truth in 45 seconds.`,
      deliveryTip: 'Deliver with immediate clarity and a fast visual cut.',
    },
    Introduction: {
      text: `You don't need fancy paid software to make this work. Here is what actually matters.`,
      deliveryTip: 'Display high-contrast bold subtitles.',
    },
    'Main Point 1': {
      text: `Rule number one: eliminate clutter. Focus entirely on one clear question your audience has.`,
      deliveryTip: 'Show screen demo or point to overlay text.',
    },
    'Main Point 2': {
      text: `Rule number two: cut the pauses. Keep the audio moving so the viewer never feels bored.`,
      deliveryTip: 'Zoom in slightly on timeline cut.',
    },
    'Main Point 3': {
      text: `Rule number three: give the direct takeaway before asking for any engagement.`,
      deliveryTip: 'Emphasize with a firm vocal beat.',
    },
    Conclusion: {
      text: `Try this on your very next upload and see the difference in retention.`,
      deliveryTip: 'Warm, positive nod.',
    },
    CTA: {
      text: `Hit like if this saved you time, and follow for more straightforward tips!`,
      deliveryTip: 'Point down toward channel handle.',
    },
  };

  const longAlternates: Record<string, { text: string; deliveryTip: string }> = {
    Hook: {
      text: `If you have ever felt overwhelmed trying to understand ${topic.toLowerCase()}, this video is for you. We are breaking it down into simple, proven steps you can apply today.`,
      deliveryTip: 'Relaxed, confident conversational tone.',
    },
    Introduction: {
      text: `A lot of tutorials make this sound 10 times harder than it actually is. Let's look at the real workflow from the ground up.`,
      deliveryTip: 'Show your desk or timeline setup in B-roll.',
    },
    'Main Point 1': {
      text: `To start off, let's look at the setup phase. When you organize your clips and outline first, the entire recording process takes half the time.`,
      deliveryTip: 'Demonstrate folder organization on screen.',
    },
    'Main Point 2': {
      text: `Now let's move into the actual execution. Notice how each step builds directly upon the previous one without unnecessary jargon.`,
      deliveryTip: 'Step-by-step screen recording with mouse cursor highlighted.',
    },
    'Main Point 3': {
      text: `Here is the key mistake to avoid: don't overcomplicate your graphics. Simple text and clear audio will always beat distracting animations.`,
      deliveryTip: 'Direct address with split-screen illustration.',
    },
    Conclusion: {
      text: `Remember: consistency and clear explanations are what turn casual viewers into long-term subscribers.`,
      deliveryTip: 'Summarize the 3 core steps on screen.',
    },
    CTA: {
      text: `Which of these steps are you going to implement first? Drop a comment below and let's discuss. Thanks for watching!`,
      deliveryTip: 'Friendly closing and smooth cut to end screen.',
    },
  };

  const pool = isShort ? shortAlternates : longAlternates;
  return pool[sectionType] || {
    text: `Here is the refined explanation for ${topic.toLowerCase()} with practical clarity.`,
    deliveryTip: 'Speak clearly with even pacing.',
  };
}

/**
 * Build Visuals Table
 */
export function buildVisualPlan(sections: WorkflowScriptSection[], isShort: boolean): WorkflowVisualItem[] {
  return sections.map((sec, idx) => {
    let whatToShow = 'Talking head to camera with clean natural lighting';
    let onScreenText = sec.type.toUpperCase();

    if (sec.type === 'Hook') {
      whatToShow = isShort ? 'Fast zoom-in on face or dynamic text burst' : 'Direct eye-contact address, slight slow push-in';
      onScreenText = 'STOP MAKING THIS MISTAKE';
    } else if (sec.type === 'Introduction') {
      whatToShow = 'Screen capture or B-roll showing the problem in action';
      onScreenText = 'THE 3-STEP SHORTCUT';
    } else if (sec.type.includes('Point 1')) {
      whatToShow = 'Close-up demonstration or software interface walkthrough';
      onScreenText = 'STEP 1: SIMPLE SETUP';
    } else if (sec.type.includes('Point 2')) {
      whatToShow = 'Annotated highlight or diagram showing the core rule';
      onScreenText = 'STEP 2: FOCUS ON VALUE';
    } else if (sec.type.includes('Point 3')) {
      whatToShow = 'Side-by-side comparison of good vs bad approach';
      onScreenText = 'STEP 3: EXECUTE WITH MOMENTUM';
    } else if (sec.type === 'Conclusion') {
      whatToShow = 'Summary graphic displaying the 3 main takeaways';
      onScreenText = 'RECAP & SUMMARY';
    } else if (sec.type === 'CTA') {
      whatToShow = 'End-screen card pointing to next video or subscribe bubble';
      onScreenText = 'SUBSCRIBE & COMMENT';
    }

    const startSec = idx * 20;
    const endSec = startSec + (isShort ? 8 : 25);
    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return {
      id: `vis_${sec.id}`,
      timeRange: `${formatTime(startSec)}–${formatTime(endSec)}`,
      spokenSnippet: sec.text.slice(0, 48) + '...',
      whatToShow,
      onScreenText,
    };
  });
}

/**
 * Build Editing Plan tailored to selected tool
 */
export function buildEditingPlan(toolName: string, isShort: boolean): WorkflowEditingPlan {
  const name = toolName || 'Your Video Editor';

  return {
    toolName: name,
    steps: [
      `1. Open ${name} and create a new project (${isShort ? '9:16 vertical 1080x1920' : '16:9 horizontal 1920x1080'}).`,
      `2. Import your raw A-roll recording and B-roll screen recordings.`,
      `3. Trim silent pauses and hesitation gaps at the beginning and between sentences.`,
      `4. Place the Hook section right at the 00:00 mark for immediate impact.`,
      `5. Add on-screen captions or text callouts highlighting key action points.`,
      `6. Insert B-roll overlays to visually cover talking head jump cuts.`,
      `7. Add background music, lowering its volume to -20dB to -24dB so vocals remain loud and clear.`,
      `8. Color grade: increase contrast slightly and set exposure for vibrant skin tones.`,
      `9. Export as MP4 at 1080p 60fps (Bitrate: 15–20 Mbps).`,
    ],
  };
}

/**
 * Build Assets checklist
 */
export function buildAssetsPlan(isShort: boolean): WorkflowAssets {
  return {
    required: [
      'Main video recording (phone or screen footage)',
      'Clean audio voice track (mic or quiet room recording)',
      '1280x720 Thumbnail image (16:9) or 9:16 Cover frame',
      'Video title and 3-sentence description text',
    ],
    optional: [
      'B-roll screen recording clips (demonstrating steps)',
      'Background music track (copyright-safe / royalty-free)',
      'Sound effects (pop, whoosh, click for transitions)',
      'Channel logo watermark or lower-third graphic',
      'End-screen video recommendation links',
    ],
  };
}

/**
 * Initialize a full guided workflow from a raw topic string
 */
export function initWorkflowFromTopic(rawTopic: string, profile: CreatorProfile): CreatorWorkflowState {
  const brief = getDefaultCreationBrief(profile, rawTopic);
  const topicIntent = extractTopicIntent(rawTopic, {
    profileFormat: brief.presentationStyle[0],
    profileAudience: profile.primaryGoal,
    profileGoal: profile.primaryGoal,
  });
  const ideas = buildPersonalizedIdeas(rawTopic, profile, brief);
  const selectedIdea = ideas[0] || null;
  const isShort = selectedIdea?.format === 'Short' || false;

  const scriptSections = buildScriptSections(rawTopic, isShort);
  const visualPlan = buildVisualPlan(scriptSections, isShort);
  const editingPlan = buildEditingPlan('CapCut Free', isShort);
  const assets = buildAssetsPlan(isShort);
  const aiPrompts = generateAIPrompts(rawTopic, brief);

  const initialTools = searchAndRecommendTools({
    brief,
    creationMethod: 'free',
    format: isShort ? 'Short' : 'Long-form',
    experienceLevel: profile.experienceLevel,
  });

  const selectedTool = initialTools[0] || null;

  // Trigger achievement: analyzed first topic
  unlockAchievement('ach_first_topic', 'First Topic Analyzed', `Analyzed "${rawTopic}" to build a targeted strategy.`);

  const state: CreatorWorkflowState = {
    currentStep: 1, // Step 1 is Video Creation Brief
    topic: rawTopic,
    topicIntent,
    creationBrief: brief,
    strategicAngleRationale: `Strategic alignment for ${profile.creatorStage}: Combining your ${brief.availableDevices.join(' + ')} with ${brief.presentationStyle.join(', ')} to produce a high-retention ${brief.videoType} video on a ${brief.videoBudget} budget.`,
    analyzedIdeas: ideas,
    selectedIdea,
    creationMethod: 'free',
    selectedTool,
    script: {
      sections: scriptSections,
      durationFormatted: isShort ? '45 seconds' : '4 minutes',
    },
    visualPlan,
    voicePlan: {
      source: 'Own Voice',
      tone: 'Friendly & Educational',
      pace: 'Normal (130–150 wpm)',
      emphasisNotes: 'Emphasize action verbs and numerical steps. Keep energy warm.',
      recordingTips: [
        'Place phone or microphone 6–8 inches from mouth at eye level',
        'Record in a carpeted or furnished room to reduce wall echo',
        'Do a 10-second test recording first to verify audio level',
      ],
    },
    editingPlan,
    assets,
    aiPrompts,
    isVideoCreated: false,
    metadata: {
      selectedTitle: selectedIdea?.title || rawTopic,
      titleAlternatives: [
        `How to Master ${rawTopic} (Beginner Step-by-Step)`,
        `The Only ${rawTopic} Guide You Need in 2026`,
        `Why Most Creators Fail at ${rawTopic}`,
      ],
      titleCharCount: (selectedIdea?.title || rawTopic).length,
      titleFeedback: 'Optimal length under 65 characters with strong curiosity keyword.',
      description: {
        opening: `Learn how to master ${rawTopic} with this straightforward, step-by-step tutorial.`,
        summary: `We break down the practical framework so you can avoid costly mistakes and save hours of trial and error.`,
        keyPoints: [
          'The core equipment and free tools required',
          'Step-by-step walkthrough of the exact execution process',
          'Common pitfalls and how to avoid them',
        ],
        callToAction: 'Subscribe for weekly creator tutorials and comment with your questions!',
        formattedText: `Learn how to master ${rawTopic} with this straightforward tutorial.\n\nIn this video, we break down the practical framework so you can avoid costly mistakes and produce better videos consistently.\n\nKey Takeaways:\n• Core setup and tools\n• Step-by-step walkthrough\n• Common pitfalls to avoid\n\nDrop a comment with your questions and subscribe for weekly creator guides!`,
      },
      thumbnailBrief: {
        focalPoint: 'High-contrast text and expressive creator face',
        facialExpression: 'Enthusiastic and welcoming with direct gaze',
        overlayText: 'ZERO BUDGET',
        compositionGuide: 'Place face on the right third, bold text on the left third.',
        colorPalette: ['#111827', '#F59E0B', '#FFFFFF'],
      },
      pinnedComment: `What is the biggest challenge you face with ${rawTopic}? Leave a comment below—I read and reply to all of them!`,
    },
    discovery: {
      keywords: [
        rawTopic.toLowerCase(),
        `${rawTopic.toLowerCase()} tutorial`,
        'how to grow on youtube',
        'creator tips 2026',
        'free video editing',
      ],
      hashtags: [
        `#${rawTopic.replace(/[^a-zA-Z0-9]/g, '')}`,
        '#YouTubeTips',
        '#ContentCreator',
        '#VideoProduction',
      ],
      tags: [
        rawTopic.toLowerCase(),
        'youtube tutorial',
        'creator advice',
        'beginner guide',
      ],
    },
    youtubeSettings: {
      visibility: 'Public',
      audience: 'Not made for kids',
      category: 'Howto & Style',
      language: 'English',
      captionsCertification: 'None',
      commentsSetting: 'Hold potentially inappropriate comments for review',
      license: 'Standard YouTube License',
      allowEmbedding: true,
      publishToSubscriptions: true,
    },
    completionChecklist: {
      briefCompleted: false,
      topicAnalyzed: false,
      ideaSelected: false,
      methodChosen: false,
      toolSelected: false,
      contentCreated: false,
      titleSelected: true,
      descriptionReady: true,
      thumbnailPlanned: true,
      keywordsReady: true,
      hashtagsReady: true,
      youtubeSettingsReviewed: false,
    },
    associatedProjectId: null,
    isFinished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveGuidedWorkflowState(state);
  return state;
}

/**
 * Initialize a guided workflow from an existing idea card
 */
export function initWorkflowFromIdea(idea: RecommendedVideoIdea, profile: CreatorProfile): CreatorWorkflowState {
  const brief = getDefaultCreationBrief(profile, idea.title);
  const isShort = idea.format === 'Short';
  const scriptSections = buildScriptSections(idea.title, isShort);
  const visualPlan = buildVisualPlan(scriptSections, isShort);
  const editingPlan = buildEditingPlan('CapCut Free', isShort);
  const assets = buildAssetsPlan(isShort);
  const aiPrompts = generateAIPrompts(idea.title, brief);

  const initialTools = searchAndRecommendTools({
    brief,
    creationMethod: 'free',
    format: isShort ? 'Short' : 'Long-form',
    experienceLevel: profile.experienceLevel,
  });

  unlockAchievement('ach_first_idea', 'First Idea Selected', `Locked in "${idea.title}" for guided production.`);

  const state: CreatorWorkflowState = {
    currentStep: 1, // Start with Video Creation Brief to calibrate video setup
    topic: idea.title,
    creationBrief: brief,
    strategicAngleRationale: `Strategic plan for "${idea.title}": Tailored to ${brief.presentationStyle.join(', ')} with ${brief.videoBudget} production.`,
    analyzedIdeas: [idea],
    selectedIdea: idea,
    creationMethod: 'free',
    selectedTool: initialTools[0] || null,
    script: {
      sections: scriptSections,
      durationFormatted: isShort ? '45 seconds' : '4 minutes',
    },
    visualPlan,
    voicePlan: {
      source: 'Own Voice',
      tone: 'Friendly & Educational',
      pace: 'Normal (130–150 wpm)',
      emphasisNotes: 'Speak naturally with steady pacing. Smile slightly on introductions.',
      recordingTips: [
        'Record with phone in landscape (or portrait for Shorts) at eye level',
        'Clean your phone lens with a soft cloth before recording',
        'Keep lighting in front of you, never behind you',
      ],
    },
    editingPlan,
    assets,
    aiPrompts,
    isVideoCreated: false,
    metadata: {
      selectedTitle: idea.title,
      titleAlternatives: [
        `How to Master ${idea.title}`,
        `The Real Secret Behind ${idea.title}`,
        `Beginner's Guide to ${idea.title}`,
      ],
      titleCharCount: idea.title.length,
      titleFeedback: 'Strong hook keyword with targeted viewer appeal.',
      description: {
        opening: `In this video, we break down ${idea.title}.`,
        summary: `Practical advice and step-by-step guidance tailored for growing creators.`,
        keyPoints: [
          'Immediate setup steps',
          'Actionable framework walkthrough',
          'Key mistakes to avoid',
        ],
        callToAction: 'Subscribe for weekly creator strategy videos!',
        formattedText: `In this video, we break down ${idea.title}.\n\nPractical advice tailored for growing creators.\n\nTakeaways:\n• Immediate setup steps\n• Actionable framework\n• Key pitfalls to avoid\n\nSubscribe for more creator guides!`,
      },
      thumbnailBrief: {
        focalPoint: 'Expressive face + 3-word bold punchy overlay',
        facialExpression: 'Approachable and authoritative',
        overlayText: 'EASY STEPS',
        compositionGuide: 'Text on left third, subject face on right third.',
        colorPalette: ['#1A1A1A', '#D4A017', '#FFFFFF'],
      },
      pinnedComment: `Have you tried this yet? Leave your questions below!`,
    },
    discovery: {
      keywords: [idea.title.toLowerCase(), 'youtube growth', 'creator guide', 'video tutorial'],
      hashtags: ['#YouTubeCreator', '#VideoTips', '#ContentCreation'],
      tags: [idea.title.toLowerCase(), 'tutorial', 'creator advice'],
    },
    youtubeSettings: {
      visibility: 'Public',
      audience: 'Not made for kids',
      category: 'Education',
      language: 'English',
      captionsCertification: 'None',
      commentsSetting: 'Hold potentially inappropriate comments for review',
      license: 'Standard YouTube License',
      allowEmbedding: true,
      publishToSubscriptions: true,
    },
    completionChecklist: {
      briefCompleted: true,
      topicAnalyzed: true,
      ideaSelected: true,
      methodChosen: false,
      toolSelected: false,
      contentCreated: false,
      titleSelected: true,
      descriptionReady: true,
      thumbnailPlanned: true,
      keywordsReady: true,
      hashtagsReady: true,
      youtubeSettingsReviewed: false,
    },
    associatedProjectId: null,
    isFinished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveGuidedWorkflowState(state);
  return state;
}

/**
 * Re-analyze and update workflow when Creation Brief is modified
 */
export function applyBriefToWorkflow(
  state: CreatorWorkflowState,
  brief: VideoCreationBrief,
  profile: CreatorProfile
): CreatorWorkflowState {
  const personalizedIdeas = buildPersonalizedIdeas(state.topic, profile, brief);
  const selectedIdea = personalizedIdeas.find(i => i.id === state.selectedIdea?.id) || personalizedIdeas[0];
  const isShort = selectedIdea?.format === 'Short';
  const tools = searchAndRecommendTools({
    brief,
    creationMethod: state.creationMethod || 'free',
    format: isShort ? 'Short' : 'Long-form',
    experienceLevel: profile.experienceLevel,
  });

  const aiPrompts = generateAIPrompts(state.topic, brief);

  return {
    ...state,
    creationBrief: brief,
    analyzedIdeas: personalizedIdeas,
    selectedIdea,
    selectedTool: tools[0] || state.selectedTool,
    aiPrompts,
    strategicAngleRationale: `Strategic calibration for ${profile.creatorStage}: Combining your ${brief.availableDevices.join(' + ')} with ${brief.presentationStyle.join(', ')} to produce a ${brief.preferredDuration} ${brief.videoType} video on a ${brief.videoBudget} budget.`,
    completionChecklist: {
      ...state.completionChecklist,
      briefCompleted: true,
      topicAnalyzed: true,
    },
  };
}

/**
 * Finalize workflow: saves persistent VideoProject, updates achievements
 */
export function finalizeWorkflowToProject(
  state: CreatorWorkflowState,
  profile: CreatorProfile
): VideoProject {
  const projectId = state.associatedProjectId || `proj_guided_${Date.now()}`;
  const now = new Date().toISOString();

  const newProject: VideoProject = {
    id: projectId,
    ideaId: state.selectedIdea?.id || `idea_${Date.now()}`,
    workflowId: state.workflowId,
    topic: state.topic,
    format: state.selectedIdea?.format === 'Short' ? 'Short' : 'Long-form',
    targetAudience: state.selectedIdea?.targetAudience || 'Beginner Creators',
    primaryGoal: profile.primaryGoal,
    difficulty: state.selectedIdea?.difficulty || 'Medium',
    estimatedMinutes: state.selectedIdea?.format === 'Short' ? 25 : 60,
    creatorFitScore: state.selectedIdea?.creatorFitScore || 90,
    reasonForFit: state.selectedIdea?.whyThisIdea || ['Tailored to your creator profile.'],
    angle: state.selectedIdea?.suggestedAngle || 'Problem → Practical Solution',
    status: 'Ready',
    selectedTitle: state.metadata.selectedTitle,
    selectedHook: state.script.sections.find(s => s.type === 'Hook')?.text || '',
    selectedHookType: 'Pattern Interrupt',
    durationLabel: state.script.durationFormatted,
    scriptSections: state.script.sections.map((s, idx) => ({
      id: s.id,
      label: s.title,
      timeRange: state.visualPlan[idx]?.timeRange || '0:00–0:15',
      text: s.text,
      wordCount: s.text.split(/\s+/).filter(Boolean).length,
      visualCue: state.visualPlan[idx]?.whatToShow || '',
      deliveryTip: s.deliveryTip,
      isFinalized: true,
    })),
    visualPlan: state.visualPlan.map(v => ({
      id: v.id,
      timeRange: v.timeRange,
      spokenLine: v.spokenSnippet,
      visualType: 'Camera shot' as const,
      visualDirection: v.whatToShow,
      onScreenText: v.onScreenText,
    })),
    voiceSettings: {
      source: state.voicePlan.source === 'Own Voice' ? 'Your Own Voice' : state.voicePlan.source === 'AI Voice' ? 'AI Voice' : 'Text Only',
      tone: 'Friendly' as const,
      pace: 'Normal' as const,
      emphasisWords: [],
      customNotes: state.voicePlan.emphasisNotes,
    },
    editingSettings: {
      checklist: {
        import_recordings: true,
        a_roll_cuts: true,
        captions: true,
        bg_music: true,
        export: true,
      },
      captionStyle: 'Bold' as const,
      musicStyle: 'Subtle' as const,
      notes: `Editor: ${state.selectedTool?.name || 'CapCut'}. Background music balanced at -22dB.`,
    },
    selectedTools: {
      'Video Editing': state.selectedTool?.id || 'capcut',
      'Thumbnail Design': 'canva',
    },
    creationBrief: state.creationBrief,
    publishingData: {
      finalTitle: state.metadata.selectedTitle,
      alternativeTitles: state.metadata.titleAlternatives,
      description: state.metadata.description.formattedText,
      primaryKeywords: state.discovery.keywords.slice(0, 3),
      relatedKeywords: state.discovery.keywords.slice(3),
      longTailKeywords: state.discovery.keywords,
      primaryHashtags: state.discovery.hashtags,
      secondaryHashtags: [],
      pinnedComment: state.metadata.pinnedComment,
      chapters: [],
      thumbnailBrief: {
        mainVisual: state.metadata.thumbnailBrief.focalPoint,
        subject: state.metadata.thumbnailBrief.facialExpression,
        emotion: 'Engaging',
        background: 'Clean contrast',
        composition: state.metadata.thumbnailBrief.compositionGuide,
        contrast: 'High',
        visualHierarchy: 'Face on right, bold copy on left',
        textPlacement: 'Left-aligned',
        lighting: 'Studio natural',
        style: 'Modern Editorial',
        colorDirection: state.metadata.thumbnailBrief.colorPalette.join(', '),
      },
      thumbnailTextOptions: [
        { id: 'opt_1', text: state.metadata.thumbnailBrief.overlayText, reason: 'High curiosity trigger', isRecommended: true },
      ],
      recommendedThumbnailText: state.metadata.thumbnailBrief.overlayText,
      thumbnailPrompt: `Professional YouTube thumbnail concept: ${state.metadata.thumbnailBrief.compositionGuide}`,
      uploadSettings: {
        platform: 'YouTube',
        contentType: state.selectedIdea?.format === 'Short' ? 'Short' : 'Long-form',
        visibility: state.youtubeSettings.visibility as any,
        audience: state.youtubeSettings.audience as any,
        category: state.youtubeSettings.category,
        language: state.youtubeSettings.language,
        captions: 'Auto-generated',
        comments: 'Hold potentially inappropriate',
        license: 'Standard YouTube License',
        embedding: state.youtubeSettings.allowEmbedding,
      },
      checklist: {
        content_ready: true,
        title_optimized: true,
        description_ready: true,
        tags_ready: true,
      },
      readinessPct: 100,
    },
    createdAt: now,
    updatedAt: now,
  };

  saveVideoProject(newProject);

  // Trigger achievements
  unlockAchievement('ach_first_project', 'First Project Created', `Project initialized for "${state.topic}".`);
  unlockAchievement('ach_first_script', 'Script Completed', `Finished structured script for "${state.topic}".`);
  unlockAchievement('ach_first_created', 'First Video Created', `Completed full production kit for "${state.topic}".`);
  unlockAchievement('ach_first_published', 'First Release Ready', `Prepared complete YouTube release package.`);

  // Mark workflow state as finished
  const finishedState: CreatorWorkflowState = {
    ...state,
    associatedProjectId: projectId,
    isFinished: true,
    completionChecklist: {
      ...state.completionChecklist,
      contentCreated: true,
      titleSelected: true,
      descriptionReady: true,
      thumbnailPlanned: true,
      keywordsReady: true,
      hashtagsReady: true,
      youtubeSettingsReviewed: true,
    },
  };
  saveGuidedWorkflowState(finishedState);

  return newProject;
}
