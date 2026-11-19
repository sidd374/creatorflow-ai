import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Target, 
  Check, 
  TrendingUp, 
  Compass, 
  Layers, 
  Sliders, 
  ChevronRight, 
  Film, 
  CheckCircle2, 
  Eye, 
  Users, 
  Calendar, 
  Wrench, 
  BarChart3, 
  Flame, 
  HelpCircle,
  Plus,
  Trash2,
  AlertCircle,
  Zap,
  Lock
} from 'lucide-react';
import { 
  User, 
  CreatorProfile, 
  RecommendedVideoIdea, 
  VideoProject, 
  ContentPack, 
  BuilderTab, 
  Language, 
  ToneType, 
  IdeaStatus 
} from '../../types';
import { 
  getSavedIdeas, 
  saveIdeas, 
  getVideoAnalyticsList,
  clearDemoAnalytics,
  hasDemoAnalytics
} from '../../lib/creatorStorage';
import { calculateAnalyticsSummary, formatWatchTime } from '../../lib/analyticsEngine';
import { getDefaultRecommendations } from '../../lib/strategyEngine';
import { CreatorProgressTracker } from '../dashboard/CreatorProgressTracker';
import { DailyContentRadar } from '../dashboard/DailyContentRadar';
import { CompactPlanStatusCard } from '../common/CompactPlanStatusCard';
import { LockedStateCard } from '../common/LockedStateCard';
import { 
  canAccess, 
  getStoredPlan, 
  generateCreatorIntelligenceInsights, 
  PlanId 
} from '../../lib/planEntitlements';
import { useToast } from '../ui/Toast';
import { trackEvent } from '../../lib/analyticsService';
import {
  executeIntelligence,
  fetchByokStatus,
  navigateToByokSettings,
  IntelligenceClientError,
  IntelligenceExecutionResponse,
  ByokKeyMetadata,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface DashboardViewProps {
  user: User;
  creatorProfile: CreatorProfile;
  projects?: VideoProject[];
  onNavigate: (view: string) => void;
  onOpenPack: (packId: string) => void;
  onGeneratePack: (options: {
    topic: string;
    platform: any;
    language: string;
    tone: any;
  }) => void;
  onBuildIdea: (idea: RecommendedVideoIdea) => void;
  onOpenProject: (projectId: string, tab?: BuilderTab) => void;
  onOpenAnalytics?: (projectId?: string) => void;
  onRetakeOnboarding: () => void;
  recentPacks: ContentPack[];
  onStartGuidedWorkflow?: (topicOrIdea?: string | RecommendedVideoIdea) => void;
  onStartTour?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  creatorProfile,
  projects = [],
  onNavigate,
  onOpenPack,
  onGeneratePack,
  onBuildIdea,
  onOpenProject,
  onOpenAnalytics,
  onRetakeOnboarding,
  recentPacks,
  onStartGuidedWorkflow,
  onStartTour,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiTopicResult, setAiTopicResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [aiByokError, setAiByokError] = useState<{ code: string; message: string } | null>(null);
  const [byokMeta, setByokMeta] = useState<ByokKeyMetadata | null>(null);
  const [demoStateToken, setDemoStateToken] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const loadByokMeta = async () => {
      try {
        const res = await fetchByokStatus();
        if (active) setByokMeta(res.metadata);
      } catch {
        // Non-blocking status check
      }
    };
    loadByokMeta();
    const handleUpdated = (e: any) => {
      if (e?.detail?.metadata) {
        setByokMeta(e.detail.metadata);
      } else {
        loadByokMeta();
      }
    };
    window.addEventListener('creatorflow_byok_updated', handleUpdated);
    return () => {
      active = false;
      window.removeEventListener('creatorflow_byok_updated', handleUpdated);
    };
  }, [user.id]);

  // Load real stored data
  const isDemo = useMemo(() => hasDemoAnalytics(), [demoStateToken]);
  const analyticsList = useMemo(() => getVideoAnalyticsList(), [demoStateToken]);
  const analyticsSummary = useMemo(() => calculateAnalyticsSummary(analyticsList), [analyticsList]);

  const ideas = useMemo(() => {
    const saved = getSavedIdeas();
    if (saved && saved.length > 0) return saved;
    return getDefaultRecommendations(creatorProfile);
  }, [creatorProfile]);

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Next Best Video (Highest CreatorFit score idea)
  const nextBestVideo = useMemo(() => {
    if (!ideas || ideas.length === 0) return null;
    return [...ideas].sort((a, b) => b.creatorFitScore - a.creatorFitScore)[0];
  }, [ideas]);

  // Real Progress Counters (Strictly derived from actual storage)
  const realCounters = useMemo(() => {
    const publishedProjects = projects.filter((p) => p.status === 'Published').length;
    const publishedTotal = publishedProjects + analyticsList.filter(a => !a.isDemoData).length;
    const inProduction = projects.filter((p) => p.status === 'Production' || p.status === 'Writing').length;
    const readyToPublish = projects.filter((p) => p.status === 'Ready').length;
    const planned = projects.filter((p) => p.status === 'Planned').length;

    const hasRealAnalytics = analyticsList.length > 0;

    return {
      ideasCount: ideas.length,
      plannedCount: planned,
      inProductionCount: inProduction,
      readyCount: readyToPublish,
      publishedTotal: isDemo ? analyticsSummary.totalVideos : publishedTotal,
      viewsText: hasRealAnalytics ? analyticsSummary.totalViews.toLocaleString() : '—',
      watchTimeText: hasRealAnalytics ? formatWatchTime(analyticsSummary.totalWatchTimeMinutes) : '—',
      subscribersText: hasRealAnalytics ? `+${analyticsSummary.totalSubscribersGained}` : '—',
    };
  }, [projects, ideas, analyticsSummary, analyticsList, isDemo]);

  const handleClearDemoData = () => {
    clearDemoAnalytics();
    setDemoStateToken((prev) => prev + 1);
    toast('Sample Data Removed', 'Dashboard reset to pure live creator records.', 'info');
  };

  // Handle Analyze Topic -> Open Guided Experience immediately (Section 3)
  const handleAnalyzeTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput || !topicInput.trim()) {
      toast('Topic required', 'Enter a topic to analyze.', 'error');
      return;
    }

    setIsAnalyzing(true);
    trackEvent('feature_used', { feature: 'topic_analyzer', properties: { topic: topicInput.trim() } });
    setTimeout(() => {
      setIsAnalyzing(false);
      if (onStartGuidedWorkflow) {
        onStartGuidedWorkflow(topicInput.trim());
      } else {
        onNavigate('ideas');
      }
    }, 250);
  };

  // Handle AI Topic Brief via BYOK Gemini Intelligence Engine
  const handleGenerateAiTopicBrief = async () => {
    if (!topicInput || !topicInput.trim()) {
      toast('Topic required', 'Enter a topic to run Gemini BYOK analysis.', 'error');
      return;
    }
    setAiBriefLoading(true);
    setAiByokError(null);
    trackEvent('feature_used', { feature: 'ai_topic_brief_byok', properties: { topic: topicInput.trim() } });
    try {
      const res = await executeIntelligence({
        task: 'topic_analysis',
        feature: 'dashboard_topic_brief',
        input: {
          topic: topicInput.trim(),
          language: creatorProfile.preferredLanguage || 'English',
        },
        enableWebResearch: true,
      });
      setAiTopicResult(res);
      toast('Gemini Topic Brief Ready', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setAiByokError({ code: err.code, message: err.message });
      } else {
        toast('AI Analysis Failed', err?.message || 'Unable to generate AI topic brief.', 'error');
      }
    } finally {
      setAiBriefLoading(false);
    }
  };

  const handleBuildThisVideo = () => {
    if (!nextBestVideo) return;
    if (onStartGuidedWorkflow) {
      onStartGuidedWorkflow(nextBestVideo);
    } else {
      onBuildIdea(nextBestVideo);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 select-none">
      {/* SECTION A — Creator Overview (Section 2A) */}
      <div data-tour="dashboard-overview" className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest uppercase bg-[#eeeae3] text-[#1a1a1a] px-2 py-0.5 border border-[#e2ddd4] font-semibold">
                {creatorProfile.creatorStage}
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-xs text-neutral-500 font-mono">
                {creatorProfile.channelTopic || 'General Creator'}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
              {getGreeting()}, Creator
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-sans">
              Welcome back to your guided studio. Focus on one video at a time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={navigateToByokSettings}
              className={`font-mono text-[11px] uppercase tracking-wider py-1.5 px-3 border transition-colors flex items-center gap-1.5 cursor-pointer ${
                byokMeta?.hasKey && byokMeta.status === 'connected'
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'
                  : 'border-[#d4a017]/50 bg-[#faf6ea] text-[#1a1a1a] hover:border-[#d4a017]'
              }`}
              title="Configure your personal Gemini API key (BYOK)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>
                {byokMeta?.hasKey && byokMeta.status === 'connected'
                  ? `BYOK: ${byokMeta.selectedModel}`
                  : 'Connect Gemini Key'}
              </span>
            </button>
            {onStartTour && (
              <button
                type="button"
                data-tour="help-tour-button"
                onClick={onStartTour}
                className="font-mono text-xs uppercase tracking-wider text-neutral-700 hover:text-[#1a1a1a] hover:bg-[#faf9f5] py-1.5 px-3 border border-black/[0.12] bg-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Guided Studio Tour"
              >
                <Compass className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Take Tour</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRetakeOnboarding}
              className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] py-1.5 px-3 border border-black/[0.1] bg-white transition-colors cursor-pointer"
            >
              Edit Plan
            </button>
            <div className="w-10 h-10 rounded-full bg-[#eeeae3] border border-black/[0.08] flex items-center justify-center font-serif text-lg font-semibold text-[#1a1a1a]">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* Stored Profile Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Main Goal</span>
            <div className="font-serif text-base font-normal text-[#1a1a1a] mt-0.5 truncate">
              {creatorProfile.primaryGoal}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">{creatorProfile.goalTimeline}</span>
          </div>

          <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Available Time</span>
            <div className="font-serif text-base font-normal text-[#1a1a1a] mt-0.5">
              {creatorProfile.dailyTimeAvailable}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Sustainable routine</span>
          </div>

          <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Tool Budget</span>
            <div className="font-serif text-base font-normal text-[#1a1a1a] mt-0.5">
              {creatorProfile.monthlyBudget}
            </div>
            <span className="text-[10px] text-[#d4a017] font-mono font-medium">Zero costly traps</span>
          </div>

          <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Active Project</span>
            <div className="font-serif text-base font-normal text-[#1a1a1a] mt-0.5 truncate">
              {projects.length > 0 ? projects[0].topic : 'None active'}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {projects.length > 0 ? projects[0].status : 'Ready to start'}
            </span>
          </div>
        </div>

        {/* Compact Plan Entitlement Status Card */}
        <div data-tour="plan-status" className="pt-4 border-t border-black/[0.06] mt-4">
          <CompactPlanStatusCard onManagePlan={() => onNavigate('pricing')} />
        </div>
      </div>

      {/* TOPIC SEARCH BAR (Analyze My Topic -> Guided Experience) */}
      <div data-tour="topic-strategist" className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleAnalyzeTopic} className="space-y-3">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
              Topic Strategist
            </span>
            <label className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a] block">
              What are you creating today?
            </label>
            <p className="text-xs text-neutral-500 mt-1">
              Enter any video concept to analyze feasibility, angles, and launch your guided creation workflow.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="E.g., How to grow a YouTube channel from 0 subscribers"
              className="flex-1 p-3.5 bg-[#f8f7f4] border border-black/[0.12] text-sm font-sans text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
            />
            <button
              type="button"
              onClick={handleGenerateAiTopicBrief}
              disabled={aiBriefLoading || isAnalyzing}
              className="px-5 py-3.5 bg-white border border-[#1a1a1a] hover:bg-[#faf6ea] text-[#1a1a1a] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>{aiBriefLoading ? 'Researching…' : 'AI Brief (BYOK)'}</span>
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-8 py-3.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Analyzing your topic…</span>
                </>
              ) : (
                <>
                  <span>Analyze My Topic</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-neutral-500 overflow-x-auto pb-1">
            <span className="text-neutral-400">Try:</span>
            {[
              'How to grow a YouTube channel',
              'Why do humans dream?',
              'Top AI tools replacing everyday software in 2026',
            ].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setTopicInput(ex)}
                className="underline hover:text-[#1a1a1a] whitespace-nowrap cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {aiByokError && (
          <div className="mt-5">
            <ByokConnectionGate
              errorCode={aiByokError.code}
              message={aiByokError.message}
              compact
              onConnected={handleGenerateAiTopicBrief}
            />
          </div>
        )}

        {aiTopicResult?.data && (
          <div className="mt-6 p-5 bg-[#f8f7f4] border border-[#d4a017]/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1a1a1a] text-[#d4a017] font-bold">
                  Gemini BYOK ({aiTopicResult.model})
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Quality {aiTopicResult.qualityReport.score}/100
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white text-neutral-700 border border-black/[0.08]">
                  {aiTopicResult.data.bestFormat} &bull; {aiTopicResult.data.productionDifficulty} &bull; {aiTopicResult.data.estimatedProductionTime}
                </span>
              </div>
              {onStartGuidedWorkflow && (
                <button
                  type="button"
                  onClick={() => onStartGuidedWorkflow(topicInput.trim() || aiTopicResult.data.analyzedTopic)}
                  className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Launch 11-Step Workflow</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-neutral-700">
              <p className="font-medium text-[#1a1a1a] text-sm">{aiTopicResult.data.topicSummary}</p>
              <p><strong>Angle:</strong> {aiTopicResult.data.suggestedAngle}</p>
              <p><strong>Format Fit:</strong> {aiTopicResult.data.whyFormatFits}</p>
              <p><strong>Budget Alignment:</strong> {aiTopicResult.data.budgetFit}</p>
            </div>

            {Array.isArray(aiTopicResult.data.recommendedIdeas) && aiTopicResult.data.recommendedIdeas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {aiTopicResult.data.recommendedIdeas.slice(0, 3).map((idea: any, idx: number) => (
                  <div key={idea.id || idx} className="p-3.5 bg-white border border-black/[0.08] flex flex-col justify-between gap-2.5">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] uppercase text-[#d4a017] font-semibold">
                        {idea.format} &bull; {idea.estimatedTime}
                      </span>
                      <h4 className="font-serif text-sm font-semibold text-[#1a1a1a] leading-snug">{idea.title}</h4>
                      <p className="text-[11px] text-neutral-500">{idea.suggestedAngle}</p>
                    </div>
                    {onStartGuidedWorkflow && (
                      <button
                        type="button"
                        onClick={() => onStartGuidedWorkflow(idea.title)}
                        className="text-[11px] font-mono uppercase font-semibold text-[#1a1a1a] hover:text-[#d4a017] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Build This Angle</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {aiTopicResult.researchBrief && aiTopicResult.researchBrief.sources.length > 0 && (
              <div className="pt-2 border-t border-black/[0.06] space-y-1">
                <span className="font-mono text-[10px] uppercase text-neutral-500 font-semibold block">
                  Web Research Sources (Retrieved {new Date(aiTopicResult.researchBrief.retrievedAt).toLocaleString()}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {aiTopicResult.researchBrief.sources.slice(0, 4).map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-sky-700 hover:underline bg-white px-2 py-0.5 border border-black/[0.08]"
                    >
                      {src.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TODAY'S OPPORTUNITIES (DAILY CONTENT RADAR DASHBOARD WIDGET) */}
      <div data-tour="daily-radar">
        <DailyContentRadar
          creatorProfile={creatorProfile}
          projects={projects}
          ideas={ideas}
          analyticsList={analyticsList}
          onNavigate={onNavigate}
          onStartGuidedWorkflow={onStartGuidedWorkflow}
        />
      </div>

      {/* STUDIO WORKSPACE SHORTCUTS (Mobile + Desktop 1-tap access to key modules) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('situation-lab')}
          className="p-4 bg-white border border-black/[0.08] hover:border-[#d4a017] text-left transition-colors shadow-2xs cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4a017] font-semibold">Diagnostics</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#d4a017]" />
          </div>
          <div className="font-serif text-base font-normal text-[#1a1a1a]">Situation Lab</div>
          <div className="text-[11px] text-neutral-500 truncate">Test growth bottlenecks</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('radar')}
          className="p-4 bg-white border border-black/[0.08] hover:border-[#d4a017] text-left transition-colors shadow-2xs cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Discovery</span>
            <Flame className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-serif text-base font-normal text-[#1a1a1a]">Content Radar</div>
          <div className="text-[11px] text-neutral-500 truncate">Curated niche angles</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ideas')}
          className="p-4 bg-white border border-black/[0.08] hover:border-[#d4a017] text-left transition-colors shadow-2xs cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Strategy</span>
            <Calendar className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="font-serif text-base font-normal text-[#1a1a1a]">Content Planner</div>
          <div className="text-[11px] text-neutral-500 truncate">{ideas.length} ranked ideas</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('tools')}
          className="p-4 bg-white border border-black/[0.08] hover:border-[#d4a017] text-left transition-colors shadow-2xs cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Toolkit</span>
            <Wrench className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="font-serif text-base font-normal text-[#1a1a1a]">9 YouTube Tools</div>
          <div className="text-[11px] text-neutral-500 truncate">Titles, hooks &amp; tags</div>
        </button>
      </div>

      {/* SECTION B — What Should You Create Next? (Section 2B) */}
      {nextBestVideo && (
        <div data-tour="next-best-video" className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Your Next Best Video
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1a1a1a] text-[#f8f7f4] font-semibold">
              {nextBestVideo.creatorFitScore} CreatorFit Score
            </span>
          </div>

          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {nextBestVideo.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
              <span>Format: <strong>{nextBestVideo.format}</strong></span>
              <span>&bull;</span>
              <span>Difficulty: <strong>{nextBestVideo.difficulty}</strong></span>
              <span>&bull;</span>
              <span>Est. Production: <strong>{nextBestVideo.estimatedTime}</strong></span>
            </div>
          </div>

          {/* Why this fits you */}
          <div className="p-4 bg-[#f8f7f4] border border-black/[0.05] space-y-1.5 text-xs text-neutral-700">
            <span className="font-mono text-[10px] uppercase text-neutral-500 font-semibold block">
              Why this fits you:
            </span>
            <ul className="space-y-1">
              {nextBestVideo.whyThisIdea.map((why, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                  <span>{why}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleBuildThisVideo}
              className="w-full sm:w-auto px-8 py-3 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Build This Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ideas')}
              className="w-full sm:w-auto px-6 py-3 font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] border border-black/[0.1] bg-white transition-colors cursor-pointer"
            >
              See More Ideas ({ideas.length})
            </button>
          </div>
        </div>
      )}

      {/* CREATOR INTELLIGENCE INSIGHTS (MAX OS Layer or Value Upgrade) */}
      <div data-tour="creator-intelligence">
        {canAccess('creator_intelligence_engine') ? (
        <div className="bg-white border border-[#d4a017] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>MAX Creator Intelligence Layer</span>
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] rounded font-semibold border border-[#ded8cd]">
              Grounded Telemetry
            </span>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
              Channel Growth & Resource Strategy
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Personalized strategy synthesized from your Creator Profile, Channel Goals, Stored Studio Logs, and Production Time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {generateCreatorIntelligenceInsights(
              creatorProfile, 
              projects, 
              analyticsList, 
              nextBestVideo?.title || 'YouTube Channel Strategy'
            ).map((insight) => (
              <div key={insight.id} className="p-4 bg-[#f8f7f4] border border-black/[0.06] rounded-md space-y-2">
                <div className="flex items-center gap-1.5 font-serif text-base font-semibold text-[#1a1a1a]">
                  <Sparkles className="w-4 h-4 text-[#d4a017]" />
                  <span>{insight.title}</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  {insight.explanation}
                </p>
                <div className="pt-2 border-t border-black/[0.04] text-[10px] font-mono text-neutral-400">
                  {insight.evidenceText}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <LockedStateCard
          feature="creator_intelligence_engine"
          onUpgradeClick={() => onNavigate('pricing')}
          customTitle="Unlock Grounded Creator Intelligence"
          customDescription="MAX synthesizes your Stored Profile, Channel Goals, Past Projects, and YouTube Studio performance to provide personalized, evidence-backed strategy."
        />
      )}
      </div>

      {/* SECTION C — Your Progress (Strictly Real Values, Section 1 & 2C) */}
      <div data-tour="creator-telemetry" className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
              Real Creator Telemetry
            </span>
            <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
              Your Progress
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Strictly derived from your active projects and recorded YouTube Studio entries.
            </p>
          </div>

          {/* Sample Data Badge & Remove Option */}
          {isDemo && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-900 font-mono">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Sample Data</strong> active</span>
              </div>
              <button
                type="button"
                onClick={handleClearDemoData}
                className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-mono text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Trash2 className="w-3 h-3 text-amber-700" />
                <span>Remove Sample Data</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Primary Workflow Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Ideas Available</span>
            <div className="font-serif text-3xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.ideasCount}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">In strategy queue</span>
          </div>

          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">In Production</span>
            <div className="font-serif text-3xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.inProductionCount}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {realCounters.inProductionCount === 0 ? 'No active drafts' : 'Being written / edited'}
            </span>
          </div>

          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Ready to Publish</span>
            <div className="font-serif text-3xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.readyCount}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {realCounters.readyCount === 0 ? '0 packages ready' : 'Completed kits'}
            </span>
          </div>

          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Videos Published</span>
            <div className="font-serif text-3xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.publishedTotal}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {realCounters.publishedTotal === 0 ? '0 recorded' : `${realCounters.publishedTotal} catalog entries`}
            </span>
          </div>
        </div>

        {/* 3 Channel Metrics (Honest zeroes / dashes) */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/[0.06]">
          <div className="p-3.5 bg-white border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Recorded Views</span>
            <div className="font-serif text-2xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.viewsText}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {analyticsList.length > 0 ? `${analyticsList.length} video logs` : 'No logs yet'}
            </span>
          </div>

          <div className="p-3.5 bg-white border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Watch Time</span>
            <div className="font-serif text-2xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.watchTimeText}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">YouTube Studio records</span>
          </div>

          <div className="p-3.5 bg-white border border-black/[0.06]">
            <span className="font-mono text-[10px] uppercase text-neutral-500 block">Subscribers Gained</span>
            <div className="font-serif text-2xl font-normal text-[#1a1a1a] mt-1">
              {realCounters.subscribersText}
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Attributed to videos</span>
          </div>
        </div>
      </div>

      {/* SECTION D — Creator Journey (Progress Graph + Milestone Timeline) */}
      <CreatorProgressTracker />

      {/* SECTION E — Recent Projects (Section 25) */}
      <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-0.5">
              Production Workspace
            </span>
            <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
              Recent Video Projects
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('builder')}
            className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a]"
          >
            View Studio &rarr;
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="py-12 px-4 bg-[#f8f7f4] border border-black/[0.06] text-center space-y-3">
            <Film className="w-8 h-8 text-neutral-400 mx-auto" />
            <div>
              <div className="font-serif text-lg font-normal text-[#1a1a1a]">
                No active video projects yet
              </div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Analyze a topic or select "Build This Video" above to launch your first guided production kit.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBuildThisVideo}
              className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
            >
              Start First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {projects.slice(0, 4).map((proj) => (
              <div
                key={proj.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8f7f4] px-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4]">
                      {proj.status}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">&bull;</span>
                    <span className="font-mono text-xs text-neutral-500">{proj.format}</span>
                  </div>
                  <h3 className="font-serif text-lg font-normal text-[#1a1a1a]">
                    {proj.selectedTitle || proj.topic}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(proj.id)}
                  className="px-4 py-2 bg-white border border-black/[0.1] hover:border-[#d4a017] font-mono text-xs uppercase tracking-wider text-[#1a1a1a] self-start sm:self-auto shrink-0"
                >
                  Resume Project &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
