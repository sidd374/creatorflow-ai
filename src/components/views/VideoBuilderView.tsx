import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Copy, 
  ArrowRight, 
  RotateCw, 
  Target, 
  Clock, 
  FileText, 
  Eye, 
  Wrench, 
  Share2, 
  CheckCircle2, 
  Compass, 
  Layers, 
  Mic, 
  Scissors, 
  Music, 
  Film, 
  CheckSquare, 
  Volume2, 
  Type, 
  HelpCircle,
  Plus,
  Trash2,
  AlertCircle,
  SlidersHorizontal,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { 
  VideoProject, 
  CreatorProfile, 
  TitleResult, 
  HookResult, 
  ScriptSection, 
  VisualPlanItem, 
  VisualType, 
  VoiceSource, 
  VoiceTone, 
  SpeakingPace, 
  CaptionStyle, 
  MusicStyle, 
  BuilderTab 
} from '../../types';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { saveVideoProject } from '../../lib/creatorStorage';
import { analyzeTopic } from '../../lib/topicAnalyzer';
import { getLanguagePack } from '../../lib/languagePatterns';
import { generateTitles, generateHooks } from '../../lib/contentEngine';
import { reserveVideoSlotServer, releaseVideoSlotServer } from '../../lib/videoQuota';
import { ToolsWorkspaceView } from './ToolsWorkspaceView';
import { PublishingWorkspaceView } from './PublishingWorkspaceView';
import { getProductionReadiness } from '../../lib/toolRecommendationEngine';
import { calculatePublishingReadiness } from '../../lib/publishingEngine';
import { 
  generateStructuredScript, 
  regenerateSingleSection, 
  generateVisualPlanFromScript, 
  getDefaultVoiceSettings, 
  getDefaultEditingSettings, 
  SHORTS_DURATIONS, 
  LONG_FORM_DURATIONS, 
  DEFAULT_EDITING_ITEMS 
} from '../../lib/scriptEngine';
import {
  executeIntelligence,
  IntelligenceClientError,
  IntelligenceExecutionResponse,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface VideoBuilderViewProps {
  project: VideoProject;
  creatorProfile: CreatorProfile;
  onBack: () => void;
  onOpenFullContentPack?: (topic: string, platform?: 'YouTube' | 'Shorts') => void;
  onUpdateProject: (updated: VideoProject) => void;
  onOpenAnalytics?: (projectId?: string) => void;
  onQuotaExceeded?: () => void;
}

export const VideoBuilderView: React.FC<VideoBuilderViewProps> = ({
  project,
  creatorProfile,
  onBack,
  onOpenFullContentPack,
  onUpdateProject,
  onOpenAnalytics,
  onQuotaExceeded,
}) => {
  // Resume last active tab or start at overview
  const [activeTab, setActiveTab] = useState<BuilderTab>(() => project.lastActiveTab || 'overview');
  const [titleSeed, setTitleSeed] = useState(0);
  const [hookSeed, setHookSeed] = useState(0);
  const [sectionSeed, setSectionSeed] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [aiTitlesLoading, setAiTitlesLoading] = useState(false);
  const [aiTitleResult, setAiTitleResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [aiScriptLoading, setAiScriptLoading] = useState(false);
  const [aiScriptResult, setAiScriptResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [builderByokError, setBuilderByokError] = useState<{ code: string; message: string } | null>(null);
  const { toast } = useToast();

  const isShortFormat = project.format.includes('Short');
  const durationOptions = isShortFormat ? SHORTS_DURATIONS : LONG_FORM_DURATIONS;
  const currentDuration = project.durationSeconds || (isShortFormat ? 60 : 180);

  const langPack = useMemo(() => {
    return getLanguagePack(creatorProfile.preferredLanguage || 'English');
  }, [creatorProfile.preferredLanguage]);

  const topicProfile = useMemo(() => {
    return analyzeTopic(project.topic);
  }, [project.topic]);

  // Generate 5 titles using the shared content engine
  const titlesList: TitleResult[] = useMemo(() => {
    return generateTitles(topicProfile, langPack, 'Educational', titleSeed);
  }, [topicProfile, langPack, titleSeed]);

  // Generate 3 hooks using the shared content engine
  const hooksList: HookResult[] = useMemo(() => {
    return generateHooks(topicProfile, langPack, 'Educational', hookSeed);
  }, [topicProfile, langPack, hookSeed]);

  // Production Readiness derived from real completed project steps
  const readiness = useMemo(() => {
    return getProductionReadiness(project);
  }, [project]);

  // Publishing Readiness derived from actual publishing state
  const publishingReport = useMemo(() => {
    return calculatePublishingReadiness(project);
  }, [project]);

  const builderWorkflowId = project.workflowId || `proj_builder_${project.id}`;

  const ensureBuilderVideoSlot = async (): Promise<{ allowed: boolean; alreadyReserved: boolean; workflowId: string }> => {
    const reservation = await reserveVideoSlotServer({
      workflowId: builderWorkflowId,
      topic: project.topic,
    });

    if (!reservation.success) {
      const countdownNote = reservation.resetsInFormatted ? ` (Next slot resets in ${reservation.resetsInFormatted})` : '';
      toast(
        'Video Quota Limit Reached',
        `${reservation.message || 'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'}${countdownNote}`,
        'warning'
      );
      onQuotaExceeded?.();
      return { allowed: false, alreadyReserved: false, workflowId: builderWorkflowId };
    }

    return {
      allowed: true,
      alreadyReserved: Boolean(reservation.alreadyReserved),
      workflowId: reservation.workflowId || builderWorkflowId,
    };
  };

  // Initialize script sections, visuals, voice, and editing if not present (authoritatively gated)
  useEffect(() => {
    if (project.scriptSections && project.scriptSections.length > 0) return;
    let cancelled = false;

    const initBuilder = async () => {
      const slot = await ensureBuilderVideoSlot();
      if (cancelled || !slot.allowed) return;

      try {
        const initialSections = generateStructuredScript(project, currentDuration, creatorProfile, langPack, 0);
        const initialVisuals = generateVisualPlanFromScript(initialSections, project);
        const initialVoice = getDefaultVoiceSettings(initialSections);
        const initialEditing = getDefaultEditingSettings();

        const updated: VideoProject = {
          ...project,
          workflowId: slot.workflowId,
          durationSeconds: currentDuration,
          durationLabel: durationOptions.find(d => d.seconds === currentDuration)?.label || `${currentDuration}s`,
          scriptSections: initialSections,
          visualPlan: initialVisuals,
          voiceSettings: initialVoice,
          editingSettings: initialEditing,
          updatedAt: new Date().toISOString(),
        };
        saveVideoProject(updated);
        onUpdateProject(updated);
      } catch (err: any) {
        if (!slot.alreadyReserved) {
          await releaseVideoSlotServer({ workflowId: slot.workflowId, topic: project.topic });
        }
        toast('Generation Failed', err?.message || 'Unable to generate initial video script.', 'error');
      }
    };

    initBuilder();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  // Update tab and remember position
  const handleTabChange = (tab: BuilderTab) => {
    setActiveTab(tab);
    const updated: VideoProject = {
      ...project,
      lastActiveTab: tab,
      updatedAt: new Date().toISOString(),
    };
    saveVideoProject(updated);
    onUpdateProject(updated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to persist updates
  const persistProject = (updates: Partial<VideoProject>) => {
    const updated: VideoProject = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveVideoProject(updated);
    onUpdateProject(updated);
  };

  // Handle selecting a Title
  const handleSelectTitle = (titleText: string) => {
    persistProject({
      selectedTitle: titleText,
      status: 'Writing',
    });
    toast('Title Selected', `"${titleText}" saved to project.`, 'success');
  };

  // Handle selecting a Hook
  const handleSelectHook = (hookText: string, hookType: string) => {
    // If hook is chosen, update first script section hook if present
    const updatedSections = project.scriptSections ? project.scriptSections.map((s, idx) => {
      if (idx === 0 || s.label.includes('HOOK')) {
        return {
          ...s,
          text: hookText,
          wordCount: hookText.trim().split(/\s+/).filter(Boolean).length,
        };
      }
      return s;
    }) : undefined;

    persistProject({
      selectedHook: hookText,
      selectedHookType: hookType,
      scriptSections: updatedSections,
      status: 'Writing',
    });
    toast('Hook Selected', `${hookType} hook saved to project.`, 'success');
  };

  // Handle Duration Change (authoritatively gated via idempotent project workflow slot)
  const handleDurationChange = async (seconds: number) => {
    const slot = await ensureBuilderVideoSlot();
    if (!slot.allowed) return;

    try {
      const label = durationOptions.find(d => d.seconds === seconds)?.label || `${seconds}s`;
      const newSections = generateStructuredScript(project, seconds, creatorProfile, langPack, sectionSeed);
      const newVisuals = generateVisualPlanFromScript(newSections, project);
      const newVoice = getDefaultVoiceSettings(newSections);

      persistProject({
        workflowId: slot.workflowId,
        durationSeconds: seconds,
        durationLabel: label,
        scriptSections: newSections,
        visualPlan: newVisuals,
        voiceSettings: newVoice,
      });
      toast('Duration Updated', `Script recalibrated for ${label}.`, 'info');
    } catch (err: any) {
      if (!slot.alreadyReserved) {
        await releaseVideoSlotServer({ workflowId: slot.workflowId, topic: project.topic });
      }
      toast('Update Failed', err?.message || 'Unable to update script duration.', 'error');
    }
  };

  // Handle editing a script section text
  const handleUpdateSectionText = (id: string, newText: string) => {
    if (!project.scriptSections) return;
    const words = newText.trim().split(/\s+/).filter(Boolean).length;
    const updatedSections = project.scriptSections.map(s => {
      if (s.id === id) {
        return { ...s, text: newText, wordCount: words };
      }
      return s;
    });

    persistProject({
      scriptSections: updatedSections,
    });
  };

  // Toggle finalize section
  const handleToggleSectionFinalized = (id: string) => {
    if (!project.scriptSections) return;
    const updatedSections = project.scriptSections.map(s => {
      if (s.id === id) {
        return { ...s, isFinalized: !s.isFinalized };
      }
      return s;
    });

    persistProject({
      scriptSections: updatedSections,
    });
  };

  // Regenerate single section (authoritatively gated via idempotent project workflow slot)
  const handleRegenerateSection = async (sectionId: string) => {
    if (!project.scriptSections) return;
    const slot = await ensureBuilderVideoSlot();
    if (!slot.allowed) return;

    try {
      const nextSeed = sectionSeed + 1;
      setSectionSeed(nextSeed);
      const updatedSections = regenerateSingleSection(
        sectionId,
        project.scriptSections,
        project,
        creatorProfile,
        langPack,
        nextSeed
      );

      persistProject({
        workflowId: slot.workflowId,
        scriptSections: updatedSections,
      });
      toast('Section Refreshed', 'Alternative phrasing loaded without losing other sections.', 'success');
    } catch (err: any) {
      if (!slot.alreadyReserved) {
        await releaseVideoSlotServer({ workflowId: slot.workflowId, topic: project.topic });
      }
      toast('Regeneration Failed', err?.message || 'Unable to regenerate section.', 'error');
    }
  };

  // AI Title Generation via Gemini BYOK Intelligence Engine
  const handleGenerateAiTitles = async () => {
    setAiTitlesLoading(true);
    setBuilderByokError(null);
    try {
      const res = await executeIntelligence({
        task: 'title_seo',
        feature: 'video_builder_titles',
        input: {
          topic: project.topic,
          platform: isShortFormat ? 'Shorts' : 'YouTube',
          language: creatorProfile.preferredLanguage || 'English',
          variationSeed: Date.now(),
        },
        enableWebResearch: true,
        bypassCache: true,
      });
      setAiTitleResult(res);
      toast('Gemini Titles Ready', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setBuilderByokError({ code: err.code, message: err.message });
      } else {
        toast('AI Titles Failed', err?.message || 'Unable to generate Gemini titles.', 'error');
      }
    } finally {
      setAiTitlesLoading(false);
    }
  };

  // AI Script Generation via Gemini BYOK Intelligence Engine
  const handleGenerateAiScript = async () => {
    setAiScriptLoading(true);
    setBuilderByokError(null);
    try {
      const res = await executeIntelligence({
        task: 'script_generation',
        feature: 'video_builder_script',
        input: {
          topic: project.selectedTitle || project.topic,
          angle: project.angle,
          format: project.format,
          durationMinutes: Math.max(1, Math.round(currentDuration / 60)),
          durationLabel: durationOptions.find((d) => d.seconds === currentDuration)?.label || `${currentDuration}s`,
          language: creatorProfile.preferredLanguage || 'English',
        },
        enableWebResearch: true,
      });
      setAiScriptResult(res);
      const rawSections = Array.isArray(res.data?.scriptSections) ? res.data.scriptSections : [];
      if (rawSections.length > 0) {
        const mappedSections: ScriptSection[] = rawSections.map((s: any, idx: number) => {
          const text = String(s.text || '');
          return {
            id: s.id || `ai_script_sec_${idx + 1}`,
            label: s.label || `SECTION ${idx + 1}`,
            timeRange: s.timeRange || '0:00–0:45',
            text,
            wordCount: text.trim().split(/\s+/).filter(Boolean).length,
            visualCue: s.visualCue || '',
            deliveryTip: s.deliveryTip || '',
            isFinalized: false,
          };
        });
        persistProject({
          scriptSections: mappedSections,
          status: 'Writing',
        });
        toast('Gemini Script Loaded', `Quality validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
      } else {
        toast('Empty Script', 'Gemini returned an unexpected script format. Please retry.', 'error');
      }
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setBuilderByokError({ code: err.code, message: err.message });
      } else {
        toast('AI Script Failed', err?.message || 'Unable to generate Gemini script.', 'error');
      }
    } finally {
      setAiScriptLoading(false);
    }
  };

  // Visuals Row Updates
  const handleUpdateVisualItem = (id: string, field: keyof VisualPlanItem, value: any) => {
    if (!project.visualPlan) return;
    const updatedPlan = project.visualPlan.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    });

    persistProject({
      visualPlan: updatedPlan,
    });
  };

  // Voice Settings Updates
  const handleUpdateVoice = (updates: Partial<typeof project.voiceSettings>) => {
    const current = project.voiceSettings || getDefaultVoiceSettings(project.scriptSections || []);
    persistProject({
      voiceSettings: { ...current, ...updates },
    });
  };

  // Editing Settings Updates
  const handleToggleChecklist = (item: string) => {
    const current = project.editingSettings || getDefaultEditingSettings();
    const nextChecklist = {
      ...current.checklist,
      [item]: !current.checklist[item],
    };

    persistProject({
      editingSettings: {
        ...current,
        checklist: nextChecklist,
      },
    });
  };

  const handleUpdateEditingSettings = (updates: Partial<typeof project.editingSettings>) => {
    const current = project.editingSettings || getDefaultEditingSettings();
    persistProject({
      editingSettings: { ...current, ...updates },
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast('Copied', `${label} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Script completion calculations
  const scriptSections = project.scriptSections || [];
  const completedSectionsCount = scriptSections.filter(s => s.isFinalized).length;
  const scriptProgressPct = scriptSections.length > 0
    ? Math.round((completedSectionsCount / scriptSections.length) * 100)
    : 0;

  // Checklist completion
  const checklistItems = project.editingSettings?.checklist || {};
  const checkedCount = Object.values(checklistItems).filter(Boolean).length;
  const totalChecklist = DEFAULT_EDITING_ITEMS.length;

  // Determine completion states for tabs
  const stepCompletions: { [key in BuilderTab]: boolean } = {
    overview: true,
    title: Boolean(project.selectedTitle),
    hook: Boolean(project.selectedHook),
    script: scriptSections.length > 0 && completedSectionsCount > 0,
    visuals: Boolean(project.visualPlan && project.visualPlan.length > 0),
    voice: Boolean(project.voiceSettings?.source),
    editing: checkedCount > 0,
    production: checkedCount >= 4,
    tools: Object.keys(project.selectedTools || {}).length >= 2,
    publishing: publishingReport.isReadyToPublish || project.status === 'Ready',
  };

  const allTabs: Array<{ id: BuilderTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Compass },
    { id: 'title', label: 'Title', icon: FileText },
    { id: 'hook', label: 'Hook', icon: Sparkles },
    { id: 'script', label: 'Script', icon: Layers },
    { id: 'visuals', label: 'Visuals', icon: Eye },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'editing', label: 'Editing', icon: Scissors },
    { id: 'production', label: 'Production', icon: Wrench },
    { id: 'tools', label: 'Tools', icon: SlidersHorizontal },
    { id: 'publishing', label: 'Publishing', icon: Share2 },
  ];

  // Find the next incomplete step
  const nextIncompleteStep = allTabs.find(t => !stepCompletions[t.id])?.id || 'publishing';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 select-none">
      {/* Top Breadcrumb & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono uppercase tracking-wider shrink-0"
          >
            Dashboard
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
                Video Studio
              </span>
              <span className="text-neutral-300">/</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4] font-semibold">
                {project.status}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold">
                {project.creatorFitScore} Fit
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a] truncate max-w-xl mt-0.5">
              {project.selectedTitle || project.topic}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenFullContentPack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenFullContentPack(project.selectedTitle || project.topic, isShortFormat ? 'Shorts' : 'YouTube')}
              leftIcon={<Layers className="w-3.5 h-3.5 text-neutral-500" />}
              className="text-xs font-mono uppercase tracking-wider hidden sm:inline-flex"
            >
              Quick Content Pack
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left & Center Main Studio Column (3 cols on desktop) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Horizontal Nav Tabs with Visual Completion Badges */}
          <div className="flex items-center gap-1 p-1 bg-[#eeeae3] rounded-md overflow-x-auto select-none no-scrollbar">
            {allTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isCompleted = stepCompletions[tab.id];
              const isNext = tab.id === nextIncompleteStep && !isCompleted;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                      : isNext
                      ? 'bg-white text-[#1a1a1a] border border-[#d4a017] font-semibold'
                      : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold ${
                    isCompleted 
                      ? (isActive ? 'text-[#d4a017]' : 'text-emerald-700') 
                      : (isActive ? 'text-neutral-400' : 'text-neutral-400')
                  }`}>
                    {isCompleted ? '✓' : '○'}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#1a1a1a]/60'}`} />
                  <span>{tab.label}</span>
                  {isNext && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Next step" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW TAB */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                    <div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Video Production Overview
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                        {project.selectedTitle ? `"${project.selectedTitle}"` : `Topic: ${project.topic}`}
                      </h2>
                      {!project.selectedTitle && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md inline-block mt-2">
                          Title not selected yet — proceed to the Title tab to select your high-CTR title.
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-neutral-900">{project.creatorFitScore}/100</div>
                      <div className="text-xs text-neutral-500">CreatorFit Score</div>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Format</span>
                      <div className="text-sm font-bold text-neutral-900 mt-0.5">{project.format}</div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Primary Goal</span>
                      <div className="text-sm font-bold text-neutral-900 mt-0.5 truncate">{project.primaryGoal}</div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Difficulty</span>
                      <div className="text-sm font-bold text-emerald-600 mt-0.5">{project.difficulty}</div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Est. Production Time</span>
                      <div className="text-sm font-bold text-neutral-900 mt-0.5">{project.estimatedMinutes} minutes</div>
                    </div>
                  </div>

                  {/* Strategy Details */}
                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Recommended Angle</h3>
                      <p className="text-xs text-neutral-700 leading-relaxed">{project.angle}</p>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Why CreatorFlow Recommended This</h3>
                      <ul className="space-y-1.5 text-xs text-neutral-600">
                        {project.reasonForFit.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div className="text-xs text-neutral-500">
                      Step 1 of 9: Setup your video parameters
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleTabChange('title')}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs"
                    >
                      Choose Your Title →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TITLE TAB */}
          {/* ========================================================================= */}
          {activeTab === 'title' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl font-black text-neutral-900 tracking-tight">Select Video Title</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    5 high-CTR formulas. Select the one that matches your video style and target curiosity.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateAiTitles}
                    disabled={aiTitlesLoading}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />}
                    className="text-xs bg-neutral-900 text-white"
                  >
                    {aiTitlesLoading ? 'Generating…' : 'AI Titles (BYOK)'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTitleSeed((s) => s + 1)}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Generate More Titles
                  </Button>
                </div>
              </div>

              {builderByokError && (
                <ByokConnectionGate
                  errorCode={builderByokError.code}
                  message={builderByokError.message}
                  compact
                  onConnected={handleGenerateAiTitles}
                />
              )}

              {aiTitleResult?.data?.titles && Array.isArray(aiTitleResult.data.titles) && (
                <div className="p-4 bg-[#faf6ea] border border-[#d4a017]/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#d4a017] rounded">
                      Gemini BYOK Titles ({aiTitleResult.model})
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                      Quality {aiTitleResult.qualityReport.score}/100
                    </span>
                  </div>
                  <div className="space-y-2">
                    {aiTitleResult.data.titles.map((t: any, i: number) => {
                      const text = t.text || String(t);
                      const isSel = project.selectedTitle === text;
                      return (
                        <div key={i} className="p-3 bg-white rounded-xl border border-black/[0.08] flex items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] font-mono uppercase text-neutral-500">{t.style || 'AI Title'}</span>
                            <div className="text-sm font-bold text-neutral-900">"{text}"</div>
                          </div>
                          <Button
                            variant={isSel ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleSelectTitle(text)}
                            className={`text-xs shrink-0 ${isSel ? 'bg-neutral-900 text-white' : ''}`}
                          >
                            {isSel ? 'Selected ✓' : 'Use Title'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Titles List */}
              <div className="space-y-3">
                {titlesList.map((t, idx) => {
                  const isSelected = project.selectedTitle === t.text;
                  return (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                            {t.style}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {t.score}/100 Quality Score
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {t.charCount} chars
                          </span>
                        </div>

                        <div className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                          "{t.text}"
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopy(t.text, `Title #${idx + 1}`)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                          title="Copy title"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <Button
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleSelectTitle(t.text)}
                          leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
                          className={`text-xs ${isSelected ? 'bg-neutral-900 text-white font-bold' : ''}`}
                        >
                          {isSelected ? 'Selected ✓' : 'Select Title'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation to Hook */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('overview')}
                >
                  ← Overview
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('hook')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Select Hook →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HOOK TAB */}
          {/* ========================================================================= */}
          {activeTab === 'hook' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl font-black text-neutral-900 tracking-tight">Select Retention Hook</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    The first 3 to 5 seconds make or break video retention. Pick the angle that hooks your viewer.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHookSeed((s) => s + 1)}
                  leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                  className="text-xs self-start sm:self-auto"
                >
                  Regenerate Hooks
                </Button>
              </div>

              {/* Hooks Cards */}
              <div className="grid grid-cols-1 gap-4">
                {hooksList.map((h, idx) => {
                  const isSelected = project.selectedHook === h.hook;
                  return (
                    <Card
                      key={idx}
                      className={`bg-white transition-all ${
                        isSelected
                          ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-sm'
                          : 'border-neutral-200/90 hover:border-neutral-300'
                      }`}
                    >
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-md">
                            {h.type}
                          </span>
                          {isSelected && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                              <Check className="w-3 h-3" /> Selected Hook
                            </span>
                          )}
                        </div>

                        <div className="text-base sm:text-lg font-semibold text-neutral-900 leading-relaxed italic bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          "{h.hook}"
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-600">
                          <div className="p-3 bg-neutral-50/60 rounded-xl">
                            <span className="font-bold text-neutral-900 block mb-0.5">Why it works:</span>
                            <span>{h.retentionReason || 'Creates an immediate curiosity gap in the first 5 seconds.'}</span>
                          </div>

                          <div className="p-3 bg-neutral-50/60 rounded-xl">
                            <span className="font-bold text-neutral-900 block mb-0.5">Delivery & Visual Cue:</span>
                            <span>{h.deliveryTip}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            onClick={() => handleCopy(h.hook, `Hook #${idx + 1}`)}
                            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Hook
                          </button>

                          <Button
                            variant={isSelected ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleSelectHook(h.hook, h.type)}
                            leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
                            className={`text-xs ${isSelected ? 'bg-neutral-900 text-white font-bold' : ''}`}
                          >
                            {isSelected ? 'Selected ✓' : 'Select Hook'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Navigation to Script */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('title')}
                >
                  ← Title
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('script')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Build Script →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SCRIPT TAB (Phase 3D Core) */}
          {/* ========================================================================= */}
          {activeTab === 'script' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Script Header Card */}
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Production Scripting
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-neutral-900">Build Your Script</h2>
                        {aiScriptResult && (
                          <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                            Gemini {aiScriptResult.qualityReport.score}/100
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-neutral-500 font-medium">
                        Audience: <span className="font-semibold text-neutral-900">{project.targetAudience}</span>
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleGenerateAiScript}
                        disabled={aiScriptLoading}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />}
                        className="text-xs bg-neutral-900 text-white font-semibold"
                      >
                        {aiScriptLoading ? 'Writing Script…' : 'Write Script with Gemini (BYOK)'}
                      </Button>
                    </div>
                  </div>

                  {builderByokError && (
                    <ByokConnectionGate
                      errorCode={builderByokError.code}
                      message={builderByokError.message}
                      compact
                      onConnected={handleGenerateAiScript}
                    />
                  )}

                  {/* Video Meta Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Video</span>
                      <div className="text-xs font-bold text-neutral-900 truncate mt-0.5">
                        {project.selectedTitle || project.topic}
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Format</span>
                      <div className="text-xs font-bold text-neutral-900 mt-0.5">
                        {project.format}
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Recommended Duration</span>
                      <div className="text-xs font-bold text-rose-600 mt-0.5">
                        {isShortFormat ? '45–60 seconds' : '3–5 minutes'}
                      </div>
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                      Choose Target Duration:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {durationOptions.map((opt) => {
                        const isCurrent = currentDuration === opt.seconds;
                        return (
                          <button
                            key={opt.seconds}
                            type="button"
                            onClick={() => handleDurationChange(opt.seconds)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isCurrent
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                            }`}
                          >
                            <div className="font-bold text-xs">{opt.label}</div>
                            <div className={`text-[10px] mt-0.5 line-clamp-1 ${isCurrent ? 'text-neutral-300' : 'text-neutral-500'}`}>
                              {opt.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-neutral-900">Script Completion:</span>
                        <span className="font-mono text-emerald-700 font-bold">{scriptProgressPct}%</span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-neutral-500">
                          {completedSectionsCount} of {scriptSections.length} sections finalized
                        </span>
                      </div>
                      <div className="w-48 sm:w-64 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${scriptProgressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400 italic">
                      Click "Mark as Finalized" on each card as you review.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Script Sections Cards List */}
              <div className="space-y-4">
                {scriptSections.map((sec, idx) => {
                  return (
                    <Card
                      key={sec.id}
                      className={`bg-white border transition-all ${
                        sec.isFinalized
                          ? 'border-emerald-300 ring-1 ring-emerald-200'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <CardContent className="p-5 sm:p-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-md">
                              {sec.label}
                            </span>
                            <span className="text-xs font-mono font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                              {sec.timeRange}
                            </span>
                            <span className="text-xs font-mono text-neutral-400">
                              {sec.wordCount} words
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerateSection(sec.id)}
                              leftIcon={<RotateCw className="w-3 h-3" />}
                              className="text-xs py-1"
                              title="Regenerate this section only"
                            >
                              Regenerate Section
                            </Button>

                            <button
                              onClick={() => handleCopy(sec.text, `${sec.label} text`)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                              title="Copy text"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleSectionFinalized(sec.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                sec.isFinalized
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{sec.isFinalized ? 'Finalized ✓' : 'Mark Finalized'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Editable Script Textarea */}
                        <div>
                          <textarea
                            value={sec.text}
                            onChange={(e) => handleUpdateSectionText(sec.id, e.target.value)}
                            rows={3}
                            placeholder="Type spoken dialogue or narration here..."
                            className="w-full p-3.5 text-sm sm:text-base font-normal text-neutral-900 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white leading-relaxed resize-y"
                          />
                        </div>

                        {/* Visual Cue & Delivery Direction Guidance */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {sec.visualCue && (
                            <div className="p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-100 text-neutral-600 flex items-start gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                              <span><strong className="text-neutral-800">Visual Cue:</strong> {sec.visualCue}</span>
                            </div>
                          )}
                          {sec.deliveryTip && (
                            <div className="p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-100 text-neutral-600 flex items-start gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                              <span><strong className="text-neutral-800">Delivery:</strong> {sec.deliveryTip}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Navigation to Visuals */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('hook')}
                >
                  ← Hook
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('visuals')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Build Visual Plan →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: VISUALS TAB (Phase 3D Shot-by-Shot Visual Plan) */}
          {/* ========================================================================= */}
          {activeTab === 'visuals' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl font-black text-neutral-900 tracking-tight">Shot-by-Shot Visual Plan</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Synchronized visual directions and on-screen text overlays matching each script beat.
                  </p>
                </div>
                <div className="text-xs text-neutral-400">
                  {project.visualPlan?.length || 0} Visual Shots
                </div>
              </div>

              {/* Visuals Table / Cards */}
              <div className="space-y-4">
                {project.visualPlan && project.visualPlan.map((vis, idx) => (
                  <Card key={vis.id} className="bg-white border-neutral-200/90 shadow-xs">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            {vis.timeRange}
                          </span>
                          <span className="text-xs text-neutral-400">·</span>
                          <span className="text-xs font-semibold text-neutral-700">
                            Shot #{idx + 1}
                          </span>
                        </div>

                        {/* Visual Type Selector */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-neutral-500">Visual Type:</label>
                          <select
                            value={vis.visualType}
                            onChange={(e) => handleUpdateVisualItem(vis.id, 'visualType', e.target.value as VisualType)}
                            className="text-xs font-semibold text-neutral-900 bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          >
                            <option value="Camera shot">Camera shot</option>
                            <option value="Screen recording">Screen recording</option>
                            <option value="B-roll">B-roll</option>
                            <option value="Image">Image</option>
                            <option value="Animation">Animation</option>
                            <option value="Text animation">Text animation</option>
                            <option value="Chart / graphic">Chart / graphic</option>
                            <option value="Stock footage">Stock footage</option>
                            <option value="AI-generated visual">AI-generated visual</option>
                            <option value="Gameplay">Gameplay</option>
                            <option value="No visual">No visual</option>
                          </select>
                        </div>
                      </div>

                      {/* Spoken Narration Context */}
                      <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200/60">
                        <span className="font-bold text-neutral-900">Spoken line: </span>
                        <span>"{vis.spokenLine}"</span>
                      </div>

                      {/* What to Show & On-Screen Text Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                            What to show (Visual Direction):
                          </label>
                          <textarea
                            value={vis.visualDirection}
                            onChange={(e) => handleUpdateVisualItem(vis.id, 'visualDirection', e.target.value)}
                            rows={2}
                            className="w-full p-2.5 text-xs text-neutral-900 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-y"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                            On-screen Text (Punchy Graphic):
                          </label>
                          <input
                            type="text"
                            value={vis.onScreenText}
                            onChange={(e) => handleUpdateVisualItem(vis.id, 'onScreenText', e.target.value.toUpperCase())}
                            className="w-full p-2.5 text-xs font-bold font-mono tracking-wide text-rose-700 bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            placeholder="SHORT TITLE / SUMMARY"
                          />
                        </div>
                      </div>

                      {/* Framing & Transition Footer */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 pt-1">
                        <div className="flex items-center gap-3">
                          <span>Framing: <strong className="text-neutral-700">{vis.cameraFraming || 'Medium shot'}</strong></span>
                          <span>·</span>
                          <span>Transition: <strong className="text-neutral-700">{vis.transition || 'Cut on beat'}</strong></span>
                        </div>

                        <button
                          onClick={() => handleCopy(`${vis.visualDirection} | Text: "${vis.onScreenText}"`, `Shot #${idx + 1}`)}
                          className="text-neutral-400 hover:text-neutral-800 flex items-center gap-1 font-semibold transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Cue
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Navigation to Voice */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('script')}
                >
                  ← Script
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('voice')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Plan Voice →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: VOICE TAB (Phase 3D Delivery & Vocal Energy) */}
          {/* ========================================================================= */}
          {activeTab === 'voice' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-2">
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Voice & Delivery</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set narration method, speaking pace, and identify words that require vocal punch.
                </p>
              </div>

              {/* Voice Source Options Card */}
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    1. Narration Method
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        source: 'Your Own Voice' as VoiceSource,
                        title: 'Your Own Voice',
                        desc: 'Record narration using your normal natural voice.',
                        badge: 'Recommended',
                      },
                      {
                        source: 'AI Voice' as VoiceSource,
                        title: 'AI Voice',
                        desc: 'Use a compatible text-to-speech voice tool.',
                        badge: 'Automated',
                      },
                      {
                        source: 'Text Only' as VoiceSource,
                        title: 'Text Only',
                        desc: 'For videos relying solely on music and captions.',
                        badge: 'No Narration',
                      },
                    ].map((opt) => {
                      const isSelected = (project.voiceSettings?.source || 'Your Own Voice') === opt.source;
                      return (
                        <div
                          key={opt.source}
                          onClick={() => handleUpdateVoice({ source: opt.source })}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900 shadow-xs'
                              : 'border-neutral-200 hover:border-neutral-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-neutral-900">{opt.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Settings Card */}
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-5">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    2. Vocal Delivery Settings
                  </h3>

                  {/* Tone Options */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Delivery Tone:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {(['Calm', 'Energetic', 'Professional', 'Friendly', 'Serious', 'Excited'] as VoiceTone[]).map((t) => {
                        const isSelected = (project.voiceSettings?.tone || 'Friendly') === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleUpdateVoice({ tone: t })}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                              isSelected
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speaking Pace */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Speaking Pace:</label>
                    <div className="grid grid-cols-3 gap-2 max-w-md">
                      {(['Slow', 'Normal', 'Fast'] as SpeakingPace[]).map((p) => {
                        const isSelected = (project.voiceSettings?.pace || 'Normal') === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleUpdateVoice({ pace: p })}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                              isSelected
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
                            }`}
                          >
                            {p} Pace
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Emphasis Words */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Words to Emphasize (Vocal Punch):
                      </label>
                      <span className="text-[11px] text-neutral-400">
                        Give these words slightly more volume or inflection.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(project.voiceSettings?.emphasisWords || ['Stop', 'Never', 'First', 'Mistake', 'Fix']).map((word, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold tracking-wide"
                        >
                          "{word}"
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation to Editing */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('visuals')}
                >
                  ← Visuals
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('editing')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Create Editing Plan →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: EDITING TAB (Phase 3D Timeline & Checklist) */}
          {/* ========================================================================= */}
          {activeTab === 'editing' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-2">
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Editing Plan & Timeline</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Follow a structured cut timeline and practical pre-publish quality checklist.
                </p>
              </div>

              {/* Visual Cut Timeline */}
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Cut Timeline Sequence
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {project.durationLabel || `${currentDuration}s total`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {scriptSections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center space-y-1"
                      >
                        <div className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded inline-block">
                          {sec.timeRange.split('–')[0]}
                        </div>
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {sec.label}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {sec.wordCount} words
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Interactive Editing Checklist */}
              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Pre-Export Quality Checklist
                      </span>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {checkedCount} of {totalChecklist} checks verified
                      </p>
                    </div>

                    <div className="w-32 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${Math.round((checkedCount / totalChecklist) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DEFAULT_EDITING_ITEMS.map((item) => {
                      const isChecked = Boolean(checklistItems[item]);
                      return (
                        <div
                          key={item}
                          onClick={() => handleToggleChecklist(item)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                            isChecked
                              ? 'bg-emerald-50/50 border-emerald-300 text-neutral-900'
                              : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-emerald-600 text-white' : 'border border-neutral-300'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className={`text-xs font-medium ${isChecked ? 'line-through text-neutral-500' : ''}`}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Captions & Music Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Captions Plan */}
                <Card className="bg-white border-neutral-200/90 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-neutral-700" />
                      <span>Captions Planning</span>
                    </span>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-neutral-500">Caption Style:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Clean', 'Bold', 'Minimal', 'Word emphasis'] as CaptionStyle[]).map((style) => {
                          const isSelected = (project.editingSettings?.captionStyle || 'Bold') === style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => handleUpdateEditingSettings({ captionStyle: style })}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                                isSelected
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                              }`}
                            >
                              {style}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 space-y-1 border border-neutral-200/60">
                      <div className="font-bold text-neutral-800">Caption Best Practices:</div>
                      <div>• Keep lines under 4–6 words each.</div>
                      <div>• Highlight important keywords with contrasting color.</div>
                      <div>• Keep captions synchronized with speech.</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Background Music */}
                <Card className="bg-white border-neutral-200/90 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-neutral-700" />
                      <span>Background Music</span>
                    </span>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-neutral-500">Music Mood:</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['None', 'Subtle', 'Energetic', 'Cinematic', 'Upbeat'] as MusicStyle[]).map((style) => {
                          const isSelected = (project.editingSettings?.musicStyle || 'Subtle') === style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => handleUpdateEditingSettings({ musicStyle: style })}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                                isSelected
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                              }`}
                            >
                              {style}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 space-y-1 border border-neutral-200/60">
                      <div className="font-bold text-neutral-800">Audio Mixing Rule:</div>
                      <div>• Keep background music below -22dB so voice stays 100% clear.</div>
                      <div>• Always use royalty-free YouTube Audio Library tracks.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Navigation to Production */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('voice')}
                >
                  ← Voice
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('production')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Production Checklist →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: PRODUCTION TAB */}
          {/* ========================================================================= */}
          {activeTab === 'production' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-2">
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Production Setup</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Gear check and filming setup tailored to your {creatorProfile.monthlyBudget} budget.
                </p>
              </div>

              <Card className="bg-white border-neutral-200/90 shadow-xs">
                <CardContent className="p-6 space-y-5">
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Tailored Production Stack
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      You are operating on a <strong>{creatorProfile.monthlyBudget}</strong> budget. Everything in this plan can be filmed with your phone or PC and edited with 100% free software like CapCut or DaVinci Resolve.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Filming Day Routine</h3>
                    <div className="space-y-2 text-xs text-neutral-700">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2">
                        <span className="font-bold text-neutral-900">1.</span>
                        <span>Wipe your phone lens with a soft cloth before recording.</span>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2">
                        <span className="font-bold text-neutral-900">2.</span>
                        <span>Face a window for natural diffuse lighting (avoid backlighting).</span>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2">
                        <span className="font-bold text-neutral-900">3.</span>
                        <span>Do a 10-second test recording and listen with headphones to check for room echo.</span>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2">
                        <span className="font-bold text-neutral-900">4.</span>
                        <span>Record 2 takes of your Hook section to give yourself options in the edit.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation to Publishing */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('editing')}
                >
                  ← Editing
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTabChange('tools')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
                >
                  Next: Production Tools →
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: TOOLS RECOMMENDATIONS & PRODUCTION PLAN TAB */}
          {/* ========================================================================= */}
          {activeTab === 'tools' && (
            <ToolsWorkspaceView
              project={project}
              creatorProfile={creatorProfile}
              onUpdateProject={persistProject}
              onPrev={() => handleTabChange('production')}
              onNext={() => handleTabChange('publishing')}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 10: PUBLISHING TAB */}
          {/* ========================================================================= */}
          {activeTab === 'publishing' && (
            <PublishingWorkspaceView
              project={project}
              creatorProfile={creatorProfile}
              onUpdateProject={persistProject}
              onPrev={() => handleTabChange('tools')}
              onReturnToDashboard={onBack}
              onOpenFullContentPack={onOpenFullContentPack}
              onOpenAnalytics={onOpenAnalytics}
            />
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR: PERSISTENT PRODUCTION & PUBLISHING SUMMARY PANEL */}
        {/* ========================================================================= */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-4">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">
                  Video Progress
                </span>
                <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                  {Object.values(stepCompletions).filter(Boolean).length}/10
                </span>
              </div>

              {/* Vertical Step Indicators */}
              <div className="space-y-1.5 text-xs">
                {allTabs.map((t) => {
                  const isCompleted = stepCompletions[t.id];
                  const isCurrent = activeTab === t.id;
                  const isNext = t.id === nextIncompleteStep && !isCompleted;

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleTabChange(t.id)}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-neutral-900 text-white font-semibold'
                          : isNext
                          ? 'bg-rose-50 text-rose-800 font-medium border border-rose-200/60'
                          : 'hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[11px] ${
                          isCompleted 
                            ? (isCurrent ? 'text-emerald-400' : 'text-emerald-600 font-bold') 
                            : (isCurrent ? 'text-neutral-400' : 'text-neutral-400')
                        }`}>
                          {isCompleted ? '✓' : '○'}
                        </span>
                        <span className="truncate">{t.label}</span>
                      </div>

                      {isNext && (
                        <span className="text-[9px] font-bold uppercase bg-rose-500 text-white px-1.5 py-0.2 rounded">
                          Next
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dual Readiness Metrics (Production & Publishing) */}
              <div className="pt-3 border-t border-neutral-100 space-y-3 text-xs">
                {/* Production Readiness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700">Production</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {readiness.scorePct === 100 ? '✓ Complete' : `${readiness.scorePct}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${readiness.scorePct}%` }}
                    />
                  </div>
                </div>

                {/* Publishing Readiness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700">Publishing</span>
                    <span className={`font-mono font-bold ${
                      publishingReport.isReadyToPublish ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {publishingReport.isReadyToPublish ? '✓ Ready' : `${publishingReport.scorePct}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        publishingReport.isReadyToPublish ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${publishingReport.scorePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Video Project Summary Information */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Current Step:</span>
                  <strong className="text-neutral-900 capitalize">{activeTab}</strong>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Title:</span>
                  <span className="text-neutral-900 font-medium truncate max-w-[130px]" title={project.selectedTitle || project.topic}>
                    {project.selectedTitle || project.topic}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Format:</span>
                  <span className="text-neutral-900 font-medium">{project.format}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Duration:</span>
                  <span className="text-neutral-900 font-medium">
                    {project.durationLabel || `${project.estimatedMinutes}m`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Selected Tools:</span>
                  <span className="font-medium text-neutral-900">
                    {Object.keys(project.selectedTools || {}).length > 0 
                      ? `${Object.keys(project.selectedTools || {}).length} selected`
                      : 'None selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Next Action:</span>
                  <span className="font-semibold text-rose-600 truncate max-w-[130px]">
                    {activeTab === 'publishing'
                      ? (publishingReport.isReadyToPublish ? 'Publish on Studio' : 'Review Checklist')
                      : `Continue to ${nextIncompleteStep}`}
                  </span>
                </div>
              </div>

              {/* Next Step CTA */}
              {activeTab === 'publishing' ? (
                <a
                  href="https://studio.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition-colors"
                >
                  <span>Open YouTube Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleTabChange(nextIncompleteStep)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-semibold"
                >
                  Continue to Next Step
                </Button>
              )}

              {onOpenAnalytics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenAnalytics(project.id)}
                  className="w-full text-xs font-medium hover:bg-neutral-50 text-neutral-700"
                  title="Log YouTube Studio metrics for this project"
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1 text-neutral-600" />
                  Log Results in Analytics
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
