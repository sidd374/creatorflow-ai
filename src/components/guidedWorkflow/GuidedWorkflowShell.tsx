import React, { useState } from 'react';
import {
  CreatorWorkflowState,
  WorkflowStepNumber,
  CreationMethodType,
  WorkflowToolInfo,
} from '../../types/guidedWorkflow';
import { CreatorProfile } from '../../types';
import { 
  saveGuidedWorkflowState, 
  finalizeWorkflowToProject,
  buildPersonalizedIdeas,
} from '../../lib/guidedWorkflowStorage';
import { searchAndRecommendTools } from '../../lib/toolSearchEngine';
import { generateProductionKit } from '../../lib/productionRequirementEngine';
import { extractTopicIntent } from '../../lib/topicAnalyzer';
import { Step1CreationBrief } from './Step1CreationBrief';
import { Step2TopicAnalysis } from './Step2TopicAnalysis';
import { Step1VideoIdeas } from './Step1VideoIdeas';
import { Step2CreationMethod } from './Step2CreationMethod';
import { Step5VideoSetup } from './Step5VideoSetup';
import { Step3ChooseTool } from './Step3ChooseTool';
import { Step4CreationKit } from './Step4CreationKit';
import { Step5Metadata } from './Step5Metadata';
import { Step6Discovery } from './Step6Discovery';
import { Step7YoutubeSettings } from './Step7YoutubeSettings';
import { Step8FinishReview } from './Step8FinishReview';
import { ArrowLeft, ArrowRight, X, Sparkles, Check } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { trackEvent } from '../../lib/analyticsService';
import { 
  getUsageCounters, 
  getStoredPlan, 
  isAtLimit, 
  getLimit, 
  incrementUsage 
} from '../../lib/planEntitlements';
import { usageService } from '../../lib/usageService';
import { getActiveAccountId, ANONYMOUS_ACCOUNT_ID } from '../../lib/accountStorage';
import {
  executeIntelligence,
  IntelligenceClientError,
  IntelligenceExecutionResponse,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface GuidedWorkflowShellProps {
  initialState: CreatorWorkflowState;
  creatorProfile: CreatorProfile;
  onExit: () => void;
  onComplete: (projectId: string) => void;
}

const STEPS_NAV = [
  { num: 1 as WorkflowStepNumber, label: 'Brief' },
  { num: 2 as WorkflowStepNumber, label: 'Topic' },
  { num: 3 as WorkflowStepNumber, label: 'Ideas' },
  { num: 4 as WorkflowStepNumber, label: 'Method' },
  { num: 5 as WorkflowStepNumber, label: 'Setup' },
  { num: 6 as WorkflowStepNumber, label: 'Tools' },
  { num: 7 as WorkflowStepNumber, label: 'Create' },
  { num: 8 as WorkflowStepNumber, label: 'Metadata' },
  { num: 9 as WorkflowStepNumber, label: 'Search' },
  { num: 10 as WorkflowStepNumber, label: 'YouTube' },
  { num: 11 as WorkflowStepNumber, label: 'Finish' },
];

export const GuidedWorkflowShell: React.FC<GuidedWorkflowShellProps> = ({
  initialState,
  creatorProfile,
  onExit,
  onComplete,
}) => {
  const [state, setState] = useState<CreatorWorkflowState>(initialState);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [byokError, setByokError] = useState<{ code: string; message: string } | null>(null);
  const { toast } = useToast();

  const updateState = (updater: (prev: CreatorWorkflowState) => CreatorWorkflowState) => {
    setState((prev) => {
      const next = updater(prev);
      saveGuidedWorkflowState(next);
      return next;
    });
  };

  const handleRunStepAiIntelligence = async () => {
    setAiEnhancing(true);
    setByokError(null);
    const isShortFormat = state.selectedIdea?.format === 'Short' || state.creationBrief.videoType === 'Shorts';
    const topicText = state.topicIntent?.coreTopic || state.topic;
    try {
      if (state.currentStep <= 2) {
        const res = await executeIntelligence({
          task: 'topic_analysis',
          feature: 'guided_workflow_topic',
          input: {
            topic: topicText,
            format: state.creationBrief.videoType,
            durationLabel: state.creationBrief.preferredDuration,
            language: creatorProfile.preferredLanguage || 'English',
          },
          enableWebResearch: true,
        });
        setLastAiResult(res);
        const mappedIdeas = Array.isArray(res.data?.recommendedIdeas)
          ? res.data.recommendedIdeas.map((idea: any, i: number) => ({
              id: idea.id || `ai_gw_idea_${Date.now()}_${i}`,
              title: idea.title || topicText,
              format: idea.format || (isShortFormat ? 'Short' : 'Long-form'),
              goal: idea.goal || creatorProfile.primaryGoal || 'Audience Growth',
              difficulty: idea.difficulty || 'Easy',
              estimatedTime: idea.estimatedTime || '2-3 hours',
              creatorFitScore: res.qualityReport.score,
              topicRelevance: Number(idea.topicRelevance || 90),
              whyThisIdea: Array.isArray(idea.whyThisIdea) ? idea.whyThisIdea : [],
              budgetFit: idea.budgetFit || creatorProfile.monthlyBudget,
              status: 'Idea' as const,
              suggestedAngle: idea.suggestedAngle || res.data?.suggestedAngle,
              targetAudience: idea.targetAudience || res.data?.recommendedAudience,
              presentationFormat: idea.presentationFormat || state.creationBrief.presentationStyle[0],
            }))
          : state.analyzedIdeas;

        updateState((prev) => ({
          ...prev,
          strategicAngleRationale: res.data?.topicSummary || prev.strategicAngleRationale,
          analyzedIdeas: mappedIdeas.length > 0 ? mappedIdeas : prev.analyzedIdeas,
          selectedIdea: mappedIdeas[0] || prev.selectedIdea,
          topicIntent: {
            ...(prev.topicIntent || extractTopicIntent(prev.topic, prev.creationBrief)),
            coreTopic: res.data?.analyzedTopic || topicText,
            audience: res.data?.recommendedAudience || prev.topicIntent?.audience || creatorProfile.primaryGoal,
            presentationFormat:
              res.data?.bestFormat || prev.topicIntent?.presentationFormat || 'Educational',
          },
        }));
        toast('Gemini Topic Intelligence Applied', `Quality Score: ${res.qualityReport.score}/100`, 'success');
      } else if (state.currentStep === 3) {
        const res = await executeIntelligence({
          task: 'idea_generation',
          feature: 'guided_workflow_ideas',
          input: {
            topic: topicText,
            format: isShortFormat ? 'Short' : 'Long-form',
            language: creatorProfile.preferredLanguage || 'English',
            variationSeed: Date.now(),
          },
          enableWebResearch: true,
        });
        setLastAiResult(res);
        const mappedIdeas = Array.isArray(res.data?.ideas)
          ? res.data.ideas.map((idea: any, i: number) => ({
              id: idea.id || `ai_idea_${Date.now()}_${i}`,
              title: idea.title || topicText,
              format: idea.format || (isShortFormat ? 'Short' : 'Long-form'),
              goal: idea.goal || creatorProfile.primaryGoal || 'Audience Growth',
              difficulty: idea.difficulty || 'Easy',
              estimatedTime: idea.estimatedTime || '2-3 hours',
              creatorFitScore: res.qualityReport.score,
              topicRelevance: Number(idea.topicRelevance || 90),
              whyThisIdea: Array.isArray(idea.whyThisIdea) ? idea.whyThisIdea : [],
              budgetFit: idea.budgetFit || creatorProfile.monthlyBudget,
              status: 'Idea' as const,
              suggestedAngle: idea.suggestedAngle,
              targetAudience: idea.targetAudience,
              presentationFormat: idea.presentationFormat,
            }))
          : [];
        if (mappedIdeas.length > 0) {
          updateState((prev) => ({
            ...prev,
            analyzedIdeas: mappedIdeas,
            selectedIdea: mappedIdeas[0],
          }));
        }
        toast('Gemini Ideas Upgraded', `Loaded ${mappedIdeas.length} personalized concepts (${res.qualityReport.score}/100).`, 'success');
      } else if (state.currentStep === 7) {
        const res = await executeIntelligence({
          task: 'script_generation',
          feature: 'guided_workflow_script',
          input: {
            topic: state.selectedIdea?.title || topicText,
            angle: state.selectedIdea?.suggestedAngle || state.strategicAngleRationale,
            format: isShortFormat ? 'Short' : 'Long-form',
            durationLabel: state.creationBrief.preferredDuration,
            language: creatorProfile.preferredLanguage || 'English',
          },
          enableWebResearch: true,
        });
        setLastAiResult(res);
        const aiSections = Array.isArray(res.data?.scriptSections)
          ? res.data.scriptSections.map((sec: any, idx: number) => ({
              id: sec.id || `ai_sec_${idx + 1}`,
              type: (idx === 0 ? 'Hook' : `Section ${idx}`) as any,
              title: sec.label || `Section ${idx + 1}`,
              text: sec.text || '',
              durationSec: isShortFormat ? 15 : 60,
              deliveryTip: sec.deliveryTip || sec.visualCue || 'Clear, engaging delivery.',
            }))
          : [];
        if (aiSections.length > 0) {
          updateState((prev) => ({
            ...prev,
            script: {
              ...prev.script,
              sections: aiSections,
            },
          }));
        }
        toast('Gemini Script Generated', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
      } else {
        const res = await executeIntelligence({
          task: 'title_seo',
          feature: 'guided_workflow_metadata',
          input: {
            topic: state.selectedIdea?.title || topicText,
            platform: isShortFormat ? 'Shorts' : 'YouTube',
            language: creatorProfile.preferredLanguage || 'English',
          },
          enableWebResearch: true,
        });
        setLastAiResult(res);
        const descObj = res.data?.description;
        const formattedDesc =
          descObj && typeof descObj === 'object'
            ? [descObj.hookLine, descObj.summary, ...(descObj.valuePoints || []), descObj.callToAction]
                .filter(Boolean)
                .join('\n\n')
            : undefined;
        const nextTitle = res.data?.finalTitle || state.metadata.selectedTitle;
        const altTitles = Array.isArray(res.data?.titles)
          ? res.data.titles.map((t: any) => t.text || String(t)).filter(Boolean)
          : state.metadata.titleAlternatives;
        updateState((prev) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            selectedTitle: nextTitle,
            titleAlternatives: altTitles,
            titleCharCount: nextTitle.length,
            description:
              descObj && typeof descObj === 'object'
                ? {
                    opening: descObj.hookLine || prev.metadata.description.opening,
                    summary: descObj.summary || prev.metadata.description.summary,
                    keyPoints: Array.isArray(descObj.valuePoints)
                      ? descObj.valuePoints
                      : prev.metadata.description.keyPoints,
                    callToAction: descObj.callToAction || prev.metadata.description.callToAction,
                    formattedText: formattedDesc || prev.metadata.description.formattedText,
                  }
                : prev.metadata.description,
          },
          discovery: {
            ...prev.discovery,
            keywords: Array.isArray(res.data?.primaryKeywords)
              ? res.data.primaryKeywords
              : prev.discovery.keywords,
            hashtags: Array.isArray(res.data?.hashtags)
              ? res.data.hashtags
              : prev.discovery.hashtags,
          },
        }));
        toast('Gemini SEO & Packaging Applied', `Quality Score: ${res.qualityReport.score}/100`, 'success');
      }
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setByokError({ code: err.code, message: err.message });
      } else {
        toast('AI Step Upgrade Failed', err?.message || 'Unable to run Gemini step intelligence.', 'error');
      }
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleStepJump = (targetStep: WorkflowStepNumber) => {
    // Only allow clicking completed or current steps
    if (targetStep <= state.currentStep) {
      updateState((prev) => ({ ...prev, currentStep: targetStep }));
    }
  };

  const handleNextStep = async () => {
    if (state.currentStep < 11) {
      const nextStep = (state.currentStep + 1) as WorkflowStepNumber;

      // When moving from Step 2 (Topic Analysis) to Step 3 (Ideas), regenerate format-aware ideas
      if (state.currentStep === 2) {
        const freshIdeas = buildPersonalizedIdeas(
          state.topicIntent?.coreTopic || state.topic,
          creatorProfile,
          state.creationBrief
        );

        updateState((prev) => ({
          ...prev,
          currentStep: nextStep,
          analyzedIdeas: freshIdeas,
          selectedIdea: prev.selectedIdea && freshIdeas.some(i => i.id === prev.selectedIdea?.id)
            ? prev.selectedIdea
            : freshIdeas[0] || null,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // When moving from Step 5 (Setup) to Step 6 (Tools), search tools matching selection & brief
      if (state.currentStep === 5) {
        const isShort = state.selectedIdea?.format === 'Short' || state.creationBrief.videoType === 'Shorts';
        const freshTools = searchAndRecommendTools({
          device: state.creationBrief.availableDevices[0] || 'Laptop',
          videoType: state.creationBrief.videoType,
          creationMethod: state.creationMethod || 'ai_animation',
          format: isShort ? 'Short' : 'Long-form',
          experienceLevel: creatorProfile.experienceLevel,
          creationBrief: state.creationBrief,
        });

        updateState((prev) => ({
          ...prev,
          currentStep: nextStep,
          selectedTool: prev.selectedTool || freshTools[0] || null,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // When moving from Step 6 (Tools) to Step 7 (Create / Creation Kit), run Production Requirement Engine
      if (state.currentStep === 6) {
        const accountId = getActiveAccountId();
        const plan = getStoredPlan();

        if (accountId && accountId !== ANONYMOUS_ACCOUNT_ID) {
          const check = await usageService.checkUsage(accountId, 'creation_kit');
          if (!check.allowed) {
            toast(
              'Monthly Creation Kit Limit Reached',
              check.message || `You have used your monthly Creation Kit allowance on ${plan.toUpperCase()}. Upgrade to expand your production volume.`,
              'warning'
            );
            window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
            return;
          }
        } else {
          const usage = getUsageCounters();
          if (isAtLimit('creationKitsPerMonth', usage.creationKitsUsed, plan)) {
            const limit = getLimit('creationKitsPerMonth', plan);
            toast(
              'Monthly Creation Kit Limit Reached',
              `You have used your monthly limit of ${limit} Creation Kits on ${plan.toUpperCase()}. Upgrade to expand your production volume.`,
              'warning'
            );
            window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
            return;
          }
        }

        const activeTopicIntent = state.topicIntent || extractTopicIntent(state.topic, state.creationBrief);
        const activeIdea = state.selectedIdea || state.analyzedIdeas[0];
        
        const freshKit = generateProductionKit({
          topic: state.topic,
          topicIntent: activeTopicIntent,
          selectedIdea: activeIdea,
          creatorProfile,
          brief: state.creationBrief,
          creationMethod: state.creationMethod || 'ai_animation',
          selectedTool: state.selectedTool,
        });

        // Record authoritative server usage for creation kit generation after successful generation
        if (accountId && accountId !== ANONYMOUS_ACCOUNT_ID) {
          const recorded = await usageService.recordUsage(accountId, 'creation_kit');
          if (!recorded.allowed) {
            toast(
              'Monthly Creation Kit Limit Reached',
              recorded.message || `You have reached your monthly Creation Kit limit on ${plan.toUpperCase()}.`,
              'warning'
            );
            window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
            return;
          }
        }
        incrementUsage('creationKitGenerated');

        // Sync script sections and visual plan into workflow state
        const mappedSections = freshKit.scriptPackage?.mainSections.map((s, idx) => ({
          id: `sec_${idx + 1}`,
          type: (idx === 0 ? 'Introduction' : idx === freshKit.scriptPackage!.mainSections.length - 1 ? 'CTA' : `Main Point ${idx}`) as any,
          title: s.title,
          text: s.narration,
          durationSec: Math.round((freshKit.scriptPackage?.estimatedDuration || 300) / (freshKit.scriptPackage!.mainSections.length + 2)),
          deliveryTip: s.visualCue || 'Clear articulation with natural pauses.',
        })) || [];

        if (freshKit.scriptPackage?.hook) {
          mappedSections.unshift({
            id: 'sec_hook',
            type: 'Hook',
            title: 'Opening Hook',
            text: freshKit.scriptPackage.hook,
            durationSec: 15,
            deliveryTip: 'High energy pattern interrupt.',
          });
        }
        if (freshKit.scriptPackage?.payoff) {
          mappedSections.push({
            id: 'sec_payoff',
            type: 'Conclusion',
            title: 'Conclusion & Payoff',
            text: freshKit.scriptPackage.payoff,
            durationSec: 30,
            deliveryTip: 'Inspiring and conclusive.',
          });
        }

        const mappedVisuals = freshKit.scenePlan?.map((sc) => ({
          id: `vis_${sc.sceneNumber}`,
          timeRange: `Scene ${sc.sceneNumber} (${sc.durationSeconds}s)`,
          spokenSnippet: sc.narration ? sc.narration.slice(0, 60) + '...' : '',
          whatToShow: `${sc.action} - ${sc.environment}`,
          onScreenText: sc.onScreenText || '',
        })) || [];

        updateState((prev) => ({
          ...prev,
          currentStep: nextStep,
          productionKit: freshKit,
          script: {
            sections: mappedSections.length > 0 ? mappedSections : prev.script.sections,
            durationFormatted: `${Math.round((freshKit.scriptPackage?.estimatedDuration || 300) / 60)} min`,
          },
          visualPlan: mappedVisuals.length > 0 ? mappedVisuals : prev.visualPlan,
          voicePlan: {
            source: freshKit.voicePackage?.source || 'AI Voice',
            tone: freshKit.voicePackage?.tone || 'Warm & Confident',
            pace: freshKit.voicePackage?.pace || 'Moderate (140-150 WPM)',
            emphasisNotes: freshKit.voicePackage?.emphasisNotes || '',
            recordingTips: freshKit.voicePackage?.recordingTips || [],
          },
          editingPlan: {
            toolName: freshKit.selectedToolName || 'CapCut',
            steps: freshKit.editingPlan?.sequenceSteps || [],
          },
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      trackEvent('workflow_step_completed', { workflowStep: state.currentStep });
      trackEvent('workflow_step_entered', { workflowStep: nextStep });
      updateState((prev) => ({ ...prev, currentStep: nextStep }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (state.currentStep > 1) {
      const prevStep = (state.currentStep - 1) as WorkflowStepNumber;
      updateState((prev) => ({ ...prev, currentStep: prevStep }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = async () => {
    const accountId = getActiveAccountId();
    if (accountId && accountId !== ANONYMOUS_ACCOUNT_ID) {
      const projectRec = await usageService.recordUsage(accountId, 'project_creation');
      if (!projectRec.allowed && projectRec.reason === 'LIMIT_REACHED') {
        toast(
          'Project Limit Reached',
          projectRec.message || 'You have reached your active project limit for this plan. Upgrade to create more projects.',
          'warning'
        );
        window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
        return;
      }
    }

    const project = finalizeWorkflowToProject(state, creatorProfile);
    incrementUsage('projectCreated');
    trackEvent('workflow_step_completed', { workflowStep: 11 });
    trackEvent('project_created', { projectId: project.id, properties: { topic: project.topic, format: project.format } });
    trackEvent('project_completed', { projectId: project.id });
    trackEvent('publishing_completed', { projectId: project.id });
    toast('Workflow Completed ✓', `Saved "${project.selectedTitle}" to your Creator Studio.`, 'success');
    onComplete(project.id);
  };

  const isShort = state.selectedIdea?.format === 'Short' || state.creationBrief.videoType === 'Shorts';

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans select-none relative z-10">
      {/* Universal Guided Header */}
      <header className="sticky top-0 z-40 bg-[#f8f7f4]/95 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Step indicator info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="flex items-center gap-2 group text-left cursor-pointer"
              title="Save & Return to Dashboard"
            >
              <span className="font-serif text-2xl font-semibold tracking-tight text-[#1a1a1a]">
                CreatorFlow
              </span>
              <span className="font-mono text-[10px] tracking-wider bg-[#1a1a1a] text-[#f8f7f4] px-1.5 py-0.5 font-medium">
                AI
              </span>
            </button>
            <span className="text-neutral-300 hidden sm:inline">|</span>
            <span className="font-mono text-xs text-neutral-500 hidden sm:inline">
              Step {state.currentStep} of 11 &bull; {STEPS_NAV[state.currentStep - 1]?.label}
            </span>
          </div>

          {/* Stepper Trail */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
            {STEPS_NAV.map((s, idx) => {
              const isCurrent = state.currentStep === s.num;
              const isDone = state.currentStep > s.num;
              return (
                <div key={s.num} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepJump(s.num)}
                    disabled={!isDone && !isCurrent}
                    className={`font-mono text-[10px] uppercase tracking-wider py-1 px-2 border transition-all ${
                      isCurrent
                        ? 'border-[#d4a017] bg-[#eeeae3] text-[#1a1a1a] font-bold shadow-2xs'
                        : isDone
                        ? 'border-black/[0.08] bg-white text-neutral-700 hover:border-[#d4a017] cursor-pointer'
                        : 'border-transparent text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{s.num}. {s.label}</span>
                    {isDone && <span className="ml-1 text-[#d4a017] font-bold">✓</span>}
                  </button>
                  {idx < STEPS_NAV.length - 1 && (
                    <span className="text-neutral-300 text-[10px] font-mono">&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save & Exit Button */}
          <button
            type="button"
            onClick={onExit}
            className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1.5 py-1 px-3 border border-black/[0.08] hover:border-black/[0.2] bg-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Save &amp; Exit</span>
          </button>
        </div>
      </header>

      {/* Step View Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 space-y-6">
        {/* Gemini BYOK Intelligence Banner for Active Step */}
        <div className="bg-white border border-black/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1a1a1a] text-[#d4a017] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>CreatorFlow Intelligence Engine</span>
              </span>
              {lastAiResult && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Validated Quality {lastAiResult.qualityReport.score}/100 ({lastAiResult.model})
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600">
              Tailored for <strong>{creatorProfile.primaryProductionMethod || 'your workflow'}</strong> &bull; Budget: <strong>{state.creationBrief.videoBudget}</strong> &bull; Devices: <strong>{state.creationBrief.availableDevices.join(', ') || 'Phone'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunStepAiIntelligence}
            disabled={aiEnhancing}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
            <span>
              {aiEnhancing
                ? 'Generating with Gemini…'
                : state.currentStep <= 2
                ? 'AI Analyze Topic (BYOK)'
                : state.currentStep === 3
                ? 'AI Generate Ideas (BYOK)'
                : state.currentStep === 7
                ? 'AI Write Script (BYOK)'
                : 'AI Upgrade Packaging (BYOK)'}
            </span>
          </button>
        </div>

        {byokError && (
          <ByokConnectionGate
            errorCode={byokError.code}
            message={byokError.message}
            compact
            onConnected={handleRunStepAiIntelligence}
          />
        )}

        {/* Step 1: Video Creation Brief */}
        {state.currentStep === 1 && (
          <Step1CreationBrief
            topic={state.topic}
            creatorProfile={creatorProfile}
            initialBrief={state.creationBrief}
            onSaveBrief={(brief) => updateState((prev) => ({ ...prev, creationBrief: brief }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 2: Topic Analysis */}
        {state.currentStep === 2 && (
          <Step2TopicAnalysis
            topic={state.topic}
            brief={state.creationBrief}
            creatorProfile={creatorProfile}
            topicIntent={state.topicIntent}
            onUpdateTopicIntent={(intent) => updateState((prev) => ({ ...prev, topicIntent: intent }))}
            onContinue={handleNextStep}
            onEditBrief={() => updateState((prev) => ({ ...prev, currentStep: 1 }))}
          />
        )}

        {/* Step 3: Video Ideas Selection */}
        {state.currentStep === 3 && (
          <Step1VideoIdeas
            ideas={state.analyzedIdeas}
            selectedIdea={state.selectedIdea}
            onSelectIdea={(idea) => updateState((prev) => ({ ...prev, selectedIdea: idea }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 4: Creation Method Selection */}
        {state.currentStep === 4 && (
          <Step2CreationMethod
            selectedIdea={state.selectedIdea}
            creationMethod={state.creationMethod}
            onSelectMethod={(method) => updateState((prev) => ({ ...prev, creationMethod: method }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 5: Video Setup & Overrides */}
        {state.currentStep === 5 && (
          <Step5VideoSetup
            creationMethod={state.creationMethod}
            selectedIdea={state.selectedIdea}
            creatorProfile={creatorProfile}
            creationBrief={state.creationBrief}
            onUpdateBrief={(brief) => updateState((prev) => ({ ...prev, creationBrief: brief }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 6: Tool Selection */}
        {state.currentStep === 6 && (
          <Step3ChooseTool
            tools={searchAndRecommendTools({
              device: state.creationBrief.availableDevices[0] || 'Laptop',
              videoType: state.creationBrief.videoType,
              creationMethod: state.creationMethod || 'ai_animation',
              format: isShort ? 'Short' : 'Long-form',
              experienceLevel: creatorProfile.experienceLevel,
              creationBrief: state.creationBrief,
            })}
            selectedTool={state.selectedTool}
            onSelectTool={(tool) => updateState((prev) => ({ ...prev, selectedTool: tool }))}
            creationMethod={state.creationMethod || 'ai_animation'}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 7: Creation Kit */}
        {state.currentStep === 7 && (
          <Step4CreationKit
            scriptSections={state.script.sections}
            onUpdateSections={(secs) => updateState((prev) => ({
              ...prev,
              script: { ...prev.script, sections: secs },
            }))}
            visualPlan={state.visualPlan}
            onUpdateVisualPlan={(plan) => updateState((prev) => ({ ...prev, visualPlan: plan }))}
            voicePlan={state.voicePlan}
            onUpdateVoicePlan={(vPlan) => updateState((prev) => ({ ...prev, voicePlan: vPlan }))}
            editingPlan={state.editingPlan}
            assets={state.assets}
            selectedTool={state.selectedTool}
            productionKit={state.productionKit}
            onUpdateProductionKit={(kit) => updateState((prev) => ({ ...prev, productionKit: kit }))}
            topic={state.topic}
            isShort={isShort}
            isVideoCreated={state.isVideoCreated}
            onMarkVideoCreated={(created) => updateState((prev) => ({
              ...prev,
              isVideoCreated: created,
              completionChecklist: {
                ...prev.completionChecklist,
                contentCreated: created,
              },
            }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 8: Packaging & Metadata */}
        {state.currentStep === 8 && (
          <Step5Metadata
            metadata={state.metadata}
            onUpdateMetadata={(meta) => updateState((prev) => ({ ...prev, metadata: meta }))}
            isShort={isShort}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 9: Search & Discovery */}
        {state.currentStep === 9 && (
          <Step6Discovery
            discovery={state.discovery}
            onUpdateDiscovery={(disc) => updateState((prev) => ({ ...prev, discovery: disc }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 10: YouTube Upload Settings */}
        {state.currentStep === 10 && (
          <Step7YoutubeSettings
            settings={state.youtubeSettings}
            onUpdateSettings={(setts) => updateState((prev) => ({ ...prev, youtubeSettings: setts }))}
            onContinue={handleNextStep}
          />
        )}

        {/* Step 11: Finish & Creator Progress */}
        {state.currentStep === 11 && (
          <Step8FinishReview
            workflowState={state}
            onFinish={handleFinish}
            onBack={handlePrevStep}
          />
        )}
      </main>

      {/* Persistent Bottom Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f7f4]/95 backdrop-blur-md border-t border-black/[0.08] py-3.5 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Back Button */}
          {state.currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1.5 py-2 px-4 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExit}
              className="font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-neutral-700 py-2 px-2 cursor-pointer"
            >
              Exit to Dashboard
            </button>
          )}

          {/* Step Progress Pill */}
          <div className="font-mono text-[11px] text-neutral-500">
            Step {state.currentStep} of 11 &bull; {STEPS_NAV[state.currentStep - 1]?.label}
          </div>

          {/* Continue Button */}
          {state.currentStep < 11 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-7 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-8 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>Finish &amp; Save</span>
              <Check className="w-4 h-4 text-[#d4a017]" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
