/**
 * CreatorFlow AI — Structured Assistant Context Layer
 * Extracts the minimum relevant structured context based on active page/workflow.
 * Strictly separates local storage from sent context and preserves data privacy.
 */

import { CreatorProfile, RecommendedVideoIdea, VideoProject, VideoAnalytics } from '../types';
import { CreatorWorkflowState } from '../types/guidedWorkflow';
import { getStoredPlan } from './planEntitlements';
import { calculateAnalyticsSummary } from './analyticsEngine';

export interface CreatorFlowAssistantContext {
  currentPage: string;
  workflowStep?: string;

  creatorProfile?: {
    channelTopic: string;
    primaryGoal: string;
    creatorStyle: string;
    experienceLevel: string;
    dailyTimeAvailable: string;
    monthlyBudget: string;
    availableDevices: string[];
    preferredLanguage: string;
  };

  currentTopic?: string;
  topicIntent?: {
    coreTopic: string;
    subject: string;
    intent: string;
    presentationFormat?: string;
    topicKeywords: string[];
    isFormatSubject?: boolean;
    excludedInterpretations?: string[];
  };

  selectedIdea?: {
    id: string;
    title: string;
    format: string;
    goal: string;
    difficulty: string;
    estimatedTime: string;
    creatorFitScore: number;
    whyThisIdea?: string[];
    suggestedAngle?: string;
  };

  selectedMethod?: string;
  selectedTool?: {
    id: string;
    name: string;
    category: string;
    cost: string;
    bestFor?: string;
  };

  currentCreationKit?: {
    method: string;
    selectedToolName: string;
    hasScript: boolean;
    hasCharacterBible: boolean;
    hasStyleBible: boolean;
    sceneCount: number;
    hasImagePrompts: boolean;
    hasVoiceGuide: boolean;
    dependencyOrder: string[];
  };

  currentProject?: {
    id: string;
    title: string;
    topic: string;
    format: string;
    status: string;
  };

  plan: string;

  recentAnalyticsSummary?: {
    totalVideos: number;
    totalViews: number;
    averageCtr: number | null;
    averageRetention: number | null;
    hasReliableBaseline: boolean;
  };

  recommendedIdeasSummary?: Array<{
    title: string;
    format: string;
    creatorFitScore: number;
    difficulty: string;
    whyThisIdea?: string;
  }>;

  activeProjectsCount?: number;

  publishingMetadata?: {
    title?: string;
    descriptionSnippet?: string;
    tagsCount?: number;
    hasThumbnailConcept?: boolean;
  };

  availableFeatures?: string[];
}

export interface BuildContextParams {
  currentPage: string;
  creatorProfile?: CreatorProfile | null;
  workflowState?: CreatorWorkflowState | null;
  activeProject?: VideoProject | null;
  activeIdea?: RecommendedVideoIdea | null;
  ideas?: RecommendedVideoIdea[];
  projects?: VideoProject[];
  analyticsList?: VideoAnalytics[];
}

/**
 * Builds minimal, clean, structured context for the AI Assistant
 */
export function buildAssistantContext(params: BuildContextParams): CreatorFlowAssistantContext {
  const {
    currentPage,
    creatorProfile,
    workflowState,
    activeProject,
    activeIdea,
    ideas = [],
    projects = [],
    analyticsList = [],
  } = params;

  const plan = getStoredPlan().toUpperCase();

  const context: CreatorFlowAssistantContext = {
    currentPage,
    plan,
    activeProjectsCount: projects.length,
  };

  // 1. Creator Profile (minimal summary)
  if (creatorProfile) {
    context.creatorProfile = {
      channelTopic: creatorProfile.channelTopic || 'General Creator',
      primaryGoal: creatorProfile.primaryGoal || 'Grow subscribers',
      creatorStyle: creatorProfile.creatorStyle || 'Educational creator',
      experienceLevel: creatorProfile.experienceLevel || 'Beginner',
      dailyTimeAvailable: creatorProfile.dailyTimeAvailable || '1–2 hours/day',
      monthlyBudget: creatorProfile.monthlyBudget || '₹0 — Free only',
      availableDevices: creatorProfile.availableDevices || ['Laptop / PC'],
      preferredLanguage: creatorProfile.preferredLanguage || 'English',
    };
  }

  // 2. Ideas summary (top 3)
  if (ideas && ideas.length > 0) {
    context.recommendedIdeasSummary = ideas.slice(0, 3).map((i) => ({
      title: i.title,
      format: i.format,
      creatorFitScore: i.creatorFitScore,
      difficulty: i.difficulty,
      whyThisIdea: i.whyThisIdea?.[0],
    }));
  }

  // 2. Guided Workflow Context (if in workflow)
  if (currentPage === 'guided-workflow' && workflowState) {
    const stepNames: Record<number, string> = {
      1: 'Brief & Preferences',
      2: 'Topic Analysis & Separation',
      3: 'Recommended Ideas',
      4: 'Creation Method Selection',
      5: 'Video Setup & Parameters',
      6: 'Tool Selection',
      7: 'Creation Kit & Production Requirements',
      8: 'Metadata & Packaging',
      9: 'Discovery & SEO Tags',
      10: 'YouTube Upload Configuration',
      11: 'Review & Finish',
    };

    context.workflowStep = `Step ${workflowState.currentStep}: ${stepNames[workflowState.currentStep] || 'Creation Flow'}`;
    context.currentTopic = workflowState.topic;

    if (workflowState.topicIntent) {
      context.topicIntent = {
        coreTopic: workflowState.topicIntent.coreTopic,
        subject: workflowState.topicIntent.subject,
        intent: workflowState.topicIntent.intent,
        presentationFormat: workflowState.topicIntent.presentationFormat,
        topicKeywords: workflowState.topicIntent.topicKeywords?.slice(0, 5) || [],
        excludedInterpretations: workflowState.topicIntent.excludedInterpretations,
      };
    }

    if (workflowState.selectedIdea) {
      context.selectedIdea = {
        id: workflowState.selectedIdea.id,
        title: workflowState.selectedIdea.title,
        format: workflowState.selectedIdea.format,
        goal: workflowState.selectedIdea.goal,
        difficulty: workflowState.selectedIdea.difficulty,
        estimatedTime: workflowState.selectedIdea.estimatedTime,
        creatorFitScore: workflowState.selectedIdea.creatorFitScore,
        whyThisIdea: workflowState.selectedIdea.whyThisIdea,
        suggestedAngle: workflowState.selectedIdea.suggestedAngle,
      };
    }

    if (workflowState.creationMethod) {
      context.selectedMethod = workflowState.creationMethod;
    }

    if (workflowState.productionKit) {
      const kit = workflowState.productionKit;
      context.currentCreationKit = {
        method: kit.method,
        selectedToolName: kit.selectedToolName || 'Editor',
        hasScript: Boolean(kit.scriptPackage),
        hasCharacterBible: Boolean(kit.characterBible),
        hasStyleBible: Boolean(kit.styleBible),
        sceneCount: kit.scenePlan?.length || 0,
        hasImagePrompts: Boolean(kit.imagePrompts && kit.imagePrompts.length > 0),
        hasVoiceGuide: Boolean(kit.voicePackage),
        dependencyOrder: [
          '1. Master Character Reference (Seed for visual continuity)',
          '2. Style Bible & Aesthetic Parameters',
          '3. Master Script & Retention Narration',
          '4. Scene Visual Breakdown & Prompts',
          '5. Voiceover Narration Track',
          `6. Timeline Assembly in ${kit.selectedToolName || 'Editor'}`,
          '7. High-CTR Thumbnail Design',
        ],
      };
    }
  }

  // 3. Tool Context (if selectedTool is available in workflow)
  if (workflowState?.selectedTool && !context.selectedTool) {
    context.selectedTool = {
      id: workflowState.selectedTool.id,
      name: workflowState.selectedTool.name,
      category: workflowState.selectedTool.toolCategory || 'Tool',
      cost: workflowState.selectedTool.cost || 'Free',
      bestFor: workflowState.selectedTool.bestFor,
    };
  }

  // 4. Creation Kit Context
  if (workflowState?.productionKit && !context.currentCreationKit) {
    const kit = workflowState.productionKit;
    context.currentCreationKit = {
      method: kit.method,
      selectedToolName: kit.selectedToolName || 'Editor',
      hasScript: Boolean(kit.scriptPackage),
      hasCharacterBible: Boolean(kit.characterBible),
      hasStyleBible: Boolean(kit.styleBible),
      sceneCount: kit.scenePlan?.length || 0,
      hasImagePrompts: Boolean(kit.imagePrompts && kit.imagePrompts.length > 0),
      hasVoiceGuide: Boolean(kit.voicePackage),
      dependencyOrder: [
        '1. Master Character Reference (Seed for visual continuity)',
        '2. Style Bible & Aesthetic Parameters',
        '3. Master Script & Retention Narration',
        '4. Scene Visual Breakdown & Prompts',
        '5. Voiceover Narration Track',
        `6. Timeline Assembly in ${kit.selectedToolName || 'Editor'}`,
        '7. High-CTR Thumbnail Design',
      ],
    };
  }

  // 5. Active Video Project Context (if on Builder)
  if (currentPage === 'builder' && activeProject) {
    context.currentProject = {
      id: activeProject.id,
      title: activeProject.selectedTitle || activeProject.topic,
      topic: activeProject.topic,
      format: activeProject.format,
      status: activeProject.status,
    };
    context.currentTopic = activeProject.topic;
  }

  // 4. Selected Idea Context (if on Ideas view)
  if (activeIdea && !context.selectedIdea) {
    context.selectedIdea = {
      id: activeIdea.id,
      title: activeIdea.title,
      format: activeIdea.format,
      goal: activeIdea.goal,
      difficulty: activeIdea.difficulty,
      estimatedTime: activeIdea.estimatedTime,
      creatorFitScore: activeIdea.creatorFitScore,
      whyThisIdea: activeIdea.whyThisIdea,
      suggestedAngle: activeIdea.suggestedAngle,
    };
  }

  // 5. Analytics Summary (if on Analytics or Dashboard)
  if (analyticsList.length > 0) {
    const summary = calculateAnalyticsSummary(analyticsList);
    context.recentAnalyticsSummary = {
      totalVideos: summary.totalVideos,
      totalViews: summary.totalViews,
      averageCtr: summary.averageCtr,
      averageRetention: summary.averagePercentageViewed,
      hasReliableBaseline: summary.hasReliableBaseline,
    };
  } else {
    context.recentAnalyticsSummary = {
      totalVideos: 0,
      totalViews: 0,
      averageCtr: null,
      averageRetention: null,
      hasReliableBaseline: false,
    };
  }

  return context;
}
