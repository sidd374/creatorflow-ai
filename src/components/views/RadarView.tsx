import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  RotateCw, 
  TrendingUp, 
  Check, 
  Clock, 
  Film, 
  Layers, 
  Zap, 
  Sliders, 
  HelpCircle, 
  CheckCircle2, 
  Lightbulb, 
  AlertCircle,
  XCircle,
  Eye,
  Plus
} from 'lucide-react';
import { 
  CreatorProfile, 
  VideoProject, 
  RecommendedVideoIdea, 
  VideoAnalytics, 
  ContentOpportunity, 
  NextVideoRecommendation, 
  CreatorContentGap 
} from '../../types';
import { 
  getStoredPlan, 
  getRadarDailyLimit, 
  getNextVideoDailyRefreshes, 
  getRadarUsageCounters, 
  incrementRadarUsage, 
  isRadarLimitReached, 
  isNextVideoLimitReached, 
  getCapabilityInfo, 
  PlanId 
} from '../../lib/planEntitlements';
import { 
  generateDailyContentRadar, 
  generateNextVideoIntelligence, 
  generateCreatorContentGaps, 
  convertOpportunityToIdea, 
  convertOpportunityToProject 
} from '../../lib/radarEngine';
import { 
  getIsolatedSavedOpportunities, 
  saveIsolatedOpportunity, 
  removeIsolatedSavedOpportunity, 
  dismissIsolatedOpportunity,
  saveIsolatedIdeas,
  getIsolatedIdeas,
  saveIsolatedProjects,
  getIsolatedProjects,
  getActiveAccountId
} from '../../lib/accountStorage';
import { trackEvent } from '../../lib/analyticsService';
import { useToast } from '../ui/Toast';
import {
  executeIntelligence,
  IntelligenceClientError,
  IntelligenceExecutionResponse,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface RadarViewProps {
  creatorProfile: CreatorProfile;
  projects?: VideoProject[];
  ideas?: RecommendedVideoIdea[];
  analyticsList?: VideoAnalytics[];
  onNavigate: (view: string) => void;
  onOpenProject?: (projectId: string) => void;
  onStartGuidedWorkflow?: (topicOrIdea?: string | RecommendedVideoIdea) => void;
  onBuildIdea?: (idea: RecommendedVideoIdea) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  creatorProfile,
  projects = [],
  ideas = [],
  analyticsList = [],
  onNavigate,
  onOpenProject,
  onStartGuidedWorkflow,
  onBuildIdea,
}) => {
  const { toast } = useToast();
  const [activePlan, setActivePlan] = useState<PlanId>(() => getStoredPlan());
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'easy' | 'medium' | 'advanced' | 'shorts' | 'longform' | 'saved'>('all');
  const [activeTab, setActiveTab] = useState<'radar' | 'next-video' | 'gaps' | 'saved'>('radar');
  const [radarUsage, setRadarUsage] = useState(() => getRadarUsageCounters());
  const [aiRadarLoading, setAiRadarLoading] = useState(false);
  const [aiRadarResult, setAiRadarResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [aiNextVideoLoading, setAiNextVideoLoading] = useState(false);
  const [aiNextVideoResult, setAiNextVideoResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [radarByokError, setRadarByokError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    const handlePlanChange = () => {
      setActivePlan(getStoredPlan());
    };
    const handleUsageChange = () => {
      setRadarUsage(getRadarUsageCounters());
    };
    window.addEventListener('creatorflow_plan_changed', handlePlanChange);
    window.addEventListener('creatorflow_radar_usage_changed', handleUsageChange);
    return () => {
      window.removeEventListener('creatorflow_plan_changed', handlePlanChange);
      window.removeEventListener('creatorflow_radar_usage_changed', handleUsageChange);
    };
  }, []);

  // Track initial view
  useEffect(() => {
    trackEvent('session_started', { feature: 'daily_content_radar', properties: { view: 'radar' } });
  }, []);

  // Generate Radar data
  const radarData = useMemo(() => {
    return generateDailyContentRadar(
      creatorProfile,
      projects,
      ideas,
      analyticsList,
      activePlan,
      { refreshSeed }
    );
  }, [creatorProfile, projects, ideas, analyticsList, activePlan, refreshSeed]);

  // Generate Next Video Intelligence data
  const nextVideoData = useMemo(() => {
    return generateNextVideoIntelligence(
      creatorProfile,
      projects,
      ideas,
      analyticsList,
      activePlan
    );
  }, [creatorProfile, projects, ideas, analyticsList, activePlan, refreshSeed]);

  // Generate Content Gaps
  const contentGaps = useMemo(() => {
    return generateCreatorContentGaps(
      creatorProfile,
      projects,
      ideas,
      analyticsList
    );
  }, [creatorProfile, projects, ideas, analyticsList]);

  // Saved Opportunities list
  const savedOpportunities = radarData.savedOpportunities;

  // Filter opportunities for display
  const filteredOpportunities = useMemo(() => {
    if (filterType === 'saved') {
      return savedOpportunities;
    }
    return radarData.opportunities.filter((opp) => {
      if (filterType === 'easy') return opp.difficulty === 'Easy';
      if (filterType === 'medium') return opp.difficulty === 'Medium';
      if (filterType === 'advanced') return opp.difficulty === 'Advanced';
      if (filterType === 'shorts') return opp.format.includes('Short');
      if (filterType === 'longform') return !opp.format.includes('Short');
      return true;
    });
  }, [radarData.opportunities, savedOpportunities, filterType]);

  const isRadarLimitHit = isRadarLimitReached(activePlan);
  const isNextVideoLimitHit = isNextVideoLimitReached(activePlan);

  // Handle Refresh Radar
  const handleRefreshRadar = () => {
    if (activePlan === 'free' && isRadarLimitHit) {
      trackEvent('radar_limit_reached', { plan: activePlan });
      toast('You have used today\'s free Radar opportunities. Upgrade to Pro for 15 daily opportunities.', 'info');
      return;
    }
    incrementRadarUsage('radar_refresh');
    trackEvent('radar_refresh', { plan: activePlan });
    setRefreshSeed((s) => s + 1);
    toast('Radar opportunities refreshed with new creator angles!', 'success');
  };

  // Handle Refresh Next Video
  const handleRefreshNextVideo = () => {
    if (isNextVideoLimitHit) {
      trackEvent('next_video_limit_reached', { plan: activePlan });
      toast('Daily Next Video refresh limit reached. Upgrade for more refreshes.', 'info');
      return;
    }
    incrementRadarUsage('next_video_refresh');
    trackEvent('next_video_refresh', { plan: activePlan });
    setRefreshSeed((s) => s + 1);
    toast('Next Video intelligence refreshed with fresh catalog signals!', 'success');
  };

  // Handle Live Gemini BYOK + Google Search Web Radar
  const handleGenerateLiveAiRadar = async () => {
    setAiRadarLoading(true);
    setRadarByokError(null);
    trackEvent('feature_used', { feature: 'ai_web_radar_byok', properties: { niche: creatorProfile.channelTopic } });
    try {
      const res = await executeIntelligence({
        task: 'content_radar',
        feature: 'content_radar_live',
        input: {
          topic: creatorProfile.channelTopic || creatorProfile.niche || 'YouTube growth',
          language: creatorProfile.preferredLanguage || 'English',
          variationSeed: Date.now(),
        },
        enableWebResearch: true,
        bypassCache: true,
      });
      setAiRadarResult(res);
      setActiveTab('radar');
      toast('Live AI Web Radar Ready', `Validated ${res.data?.opportunities?.length || 0} grounded opportunities (${res.qualityReport.score}/100).`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setRadarByokError({ code: err.code, message: err.message });
      } else {
        toast('Live Radar Failed', err?.message || 'Unable to generate live web-grounded opportunities.', 'error');
      }
    } finally {
      setAiRadarLoading(false);
    }
  };

  // Handle Live Gemini BYOK Next Video Intelligence
  const handleGenerateAiNextVideo = async () => {
    setAiNextVideoLoading(true);
    setRadarByokError(null);
    try {
      const res = await executeIntelligence({
        task: 'next_video',
        feature: 'next_video_byok',
        input: {
          topic: creatorProfile.channelTopic || creatorProfile.niche || 'YouTube channel strategy',
          language: creatorProfile.preferredLanguage || 'English',
        },
        enableWebResearch: true,
      });
      setAiNextVideoResult(res);
      setActiveTab('next-video');
      toast('AI Next Video Ready', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setRadarByokError({ code: err.code, message: err.message });
      } else {
        toast('Next Video AI Failed', err?.message || 'Unable to generate AI next video recommendation.', 'error');
      }
    } finally {
      setAiNextVideoLoading(false);
    }
  };

  // Handle Save Opportunity
  const handleToggleSave = (opportunity: ContentOpportunity) => {
    const isCurrentlySaved = savedOpportunities.some((s) => s.id === opportunity.id);
    if (isCurrentlySaved) {
      removeIsolatedSavedOpportunity(opportunity.id);
      toast('Opportunity removed from saved list', 'info');
    } else {
      saveIsolatedOpportunity(opportunity);
      trackEvent('radar_opportunity_saved', { feature: 'radar', properties: { title: opportunity.title } });
      toast('Opportunity saved to your strategy board!', 'success');
    }
    setRefreshSeed((s) => s + 1);
  };

  // Handle Dismiss Opportunity (Not Interested)
  const handleDismiss = (opportunityId: string) => {
    dismissIsolatedOpportunity(opportunityId);
    trackEvent('radar_opportunity_dismissed', { properties: { opportunityId } });
    toast('Opportunity dismissed and replaced.', 'info');
    setRefreshSeed((s) => s + 1);
  };

  // Handle Convert to Idea
  const handleCreateIdea = (opportunity: ContentOpportunity) => {
    const newIdea = convertOpportunityToIdea(opportunity, creatorProfile);
    const existingIdeas = getIsolatedIdeas() || ideas || [];
    const updated = [newIdea, ...existingIdeas];
    saveIsolatedIdeas(updated);
    trackEvent('radar_opportunity_to_idea', { properties: { title: opportunity.title } });
    toast(`Idea "${opportunity.title}" added to Content Planner!`, 'success');
    if (onBuildIdea) {
      onBuildIdea(newIdea);
    } else {
      onNavigate('ideas');
    }
  };

  // Handle Convert to Project
  const handleStartProject = (opportunity: ContentOpportunity) => {
    const newProject = convertOpportunityToProject(opportunity, creatorProfile);
    const existingProjects = getIsolatedProjects() || projects || [];
    const updated = [newProject, ...existingProjects];
    saveIsolatedProjects(updated);
    trackEvent('radar_opportunity_to_project', { properties: { title: opportunity.title } });
    toast(`New project created: "${opportunity.title}"`, 'success');
    if (onOpenProject) {
      onOpenProject(newProject.id);
    } else if (onStartGuidedWorkflow) {
      onStartGuidedWorkflow(opportunity.topic);
    } else {
      onNavigate('builder');
    }
  };

  // Handle Build from Next Video recommendation
  const handleBuildNextVideo = (rec: NextVideoRecommendation) => {
    const opp: ContentOpportunity = {
      id: rec.id,
      title: rec.recommendedVideo,
      topic: rec.recommendedVideo,
      angle: rec.whyNext,
      format: rec.suggestedFormat,
      suggestedDuration: 8,
      suggestedDurationDisplay: rec.suggestedDuration,
      creatorFitScore: rec.creatorFitScore,
      opportunityScore: rec.opportunityScore,
      difficulty: rec.difficulty,
      whyNow: rec.whyNext,
      whyThisFitsYou: rec.basedOn,
      hook: rec.suggestedHook,
      suggestedProductionMethod: rec.productionMethod,
      language: creatorProfile.preferredLanguage || 'English',
      tags: rec.tags || [],
      sourceType: rec.isPerformanceBased ? 'performance' : 'creator_profile',
      tierRequired: 'free',
    };
    handleStartProject(opp);
  };

  const currentDateDisplay = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. HEADER & TOP BANNER */}
      <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                <Radar className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Daily Content Radar</span>
              </span>
              <span className="text-neutral-300 hidden sm:inline">&bull;</span>
              <span className="text-xs text-neutral-500 font-mono">
                {currentDateDisplay}
              </span>
              <span className="text-neutral-300 hidden sm:inline">&bull;</span>
              <span className="text-xs font-mono font-semibold text-neutral-700 bg-[#eeeae3] px-2 py-0.5 rounded">
                {activePlan.toUpperCase()} TIER
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-normal text-[#1a1a1a] tracking-tight">
              Daily Content Radar &amp; Next Video Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              What could you create today? Grounded opportunities, deterministic CreatorFit scores, and next video recommendations based strictly on your creator profile and studio logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleGenerateLiveAiRadar}
              disabled={aiRadarLoading}
              className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>{aiRadarLoading ? 'Researching Web…' : 'Live Web Radar (BYOK)'}</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshRadar}
              className="px-4 py-2.5 bg-white border border-neutral-300 hover:border-black text-neutral-800 font-mono text-xs uppercase font-semibold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Refresh Opportunities</span>
            </button>

            {activePlan === 'free' && (
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="px-4 py-2.5 bg-[#eeeae3] hover:bg-[#d4a017] hover:text-white text-[#1a1a1a] font-mono text-xs uppercase font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Upgrade to Pro</span>
              </button>
            )}
          </div>
        </div>

        {radarByokError && (
          <ByokConnectionGate
            errorCode={radarByokError.code}
            message={radarByokError.message}
            compact
            onConnected={() =>
              activeTab === 'next-video' ? handleGenerateAiNextVideo() : handleGenerateLiveAiRadar()
            }
          />
        )}

        {/* INCOMPLETE PROFILE NOTICE IF APPLICABLE */}
        {!radarData.hasEnoughProfileData && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <strong>Complete your creator profile for maximum relevance: </strong>
              <span>Missing {radarData.profileMissingFields.join(', ')}.</span>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="font-semibold underline hover:text-black"
                >
                  Update Profile in Settings &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`pb-3 px-3 text-xs font-mono uppercase font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'radar'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Today's Opportunities ({radarData.opportunities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('next-video')}
            className={`pb-3 px-3 text-xs font-mono uppercase font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'next-video'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            What Should You Create Next? ({nextVideoData.recommendations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gaps')}
            className={`pb-3 px-3 text-xs font-mono uppercase font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gaps'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Creator Content Gaps ({contentGaps.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`pb-3 px-3 text-xs font-mono uppercase font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'saved'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Saved Opportunities ({savedOpportunities.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TODAY'S RADAR OPPORTUNITIES                       */}
      {/* ======================================================== */}
      {activeTab === 'radar' && (
        <div className="space-y-8">
          {/* LIVE GEMINI BYOK + WEB RESEARCH OPPORTUNITIES */}
          {aiRadarResult?.data?.opportunities && Array.isArray(aiRadarResult.data.opportunities) && (
            <div className="bg-white border-2 border-[#1a1a1a] p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-[#1a1a1a] text-[#d4a017] font-mono text-[10px] uppercase font-bold">
                    Gemini BYOK Live Web Radar ({aiRadarResult.model})
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                    Quality {aiRadarResult.qualityReport.score}/100
                  </span>
                  {aiRadarResult.researchBrief && (
                    <span className="text-[11px] font-mono text-neutral-500">
                      Grounded: {new Date(aiRadarResult.researchBrief.retrievedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLiveAiRadar}
                  disabled={aiRadarLoading}
                  className="text-xs font-mono uppercase text-neutral-600 hover:text-black underline cursor-pointer"
                >
                  {aiRadarLoading ? 'Refreshing…' : 'Refresh Live Scan'}
                </button>
              </div>

              {aiRadarResult.researchBrief?.summary && (
                <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] text-xs text-neutral-700 space-y-2">
                  <p><strong>Web Research Summary:</strong> {aiRadarResult.researchBrief.summary}</p>
                  {aiRadarResult.researchBrief.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiRadarResult.researchBrief.sources.slice(0, 5).map((src, idx) => (
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
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiRadarResult.data.opportunities.map((rawOpp: any, idx: number) => {
                  const mappedOpp: ContentOpportunity = {
                    id: rawOpp.id || `ai_radar_${idx}`,
                    title: rawOpp.title || 'AI Opportunity',
                    topic: rawOpp.topic || rawOpp.title || creatorProfile.channelTopic || 'Creator Topic',
                    angle: rawOpp.angle || '',
                    format: rawOpp.format || 'Long-form',
                    suggestedDuration: Number(rawOpp.suggestedDuration || 480),
                    suggestedDurationDisplay: rawOpp.suggestedDurationDisplay || '8-10 min',
                    creatorFitScore: aiRadarResult.qualityReport.score,
                    opportunityScore: Number(rawOpp.opportunityScore || 85),
                    difficulty: rawOpp.difficulty || 'Easy',
                    whyNow: rawOpp.whyNow || '',
                    whyThisFitsYou: rawOpp.whyThisFitsYou || '',
                    hook: rawOpp.hook || '',
                    suggestedProductionMethod: rawOpp.suggestedProductionMethod || creatorProfile.primaryProductionMethod || 'Faceless',
                    language: rawOpp.language || creatorProfile.preferredLanguage || 'English',
                    tags: Array.isArray(rawOpp.tags) ? rawOpp.tags : [],
                    sourceType: rawOpp.sourceType || 'creator_profile',
                    tierRequired: 'free',
                  };
                  return (
                    <div key={mappedOpp.id} className="p-5 bg-[#f8f7f4] border border-black/[0.08] flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a]">
                            {mappedOpp.format} &bull; {mappedOpp.suggestedDurationDisplay}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-amber-700">
                            {mappedOpp.opportunityScore} Opp &bull; {mappedOpp.difficulty}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-[#1a1a1a]">{mappedOpp.title}</h3>
                        <p className="text-xs text-neutral-700"><strong>Angle:</strong> {mappedOpp.angle}</p>
                        <p className="text-[11px] text-neutral-500"><strong>Why Now:</strong> {mappedOpp.whyNow}</p>
                        <p className="text-[11px] text-neutral-500"><strong>Fits Your Setup:</strong> {mappedOpp.whyThisFitsYou}</p>
                        {mappedOpp.hook && (
                          <p className="text-xs font-serif italic text-neutral-800 bg-white p-2.5 border border-black/[0.05]">
                            "{mappedOpp.hook}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-black/[0.05]">
                        <button
                          type="button"
                          onClick={() => handleCreateIdea(mappedOpp)}
                          className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase font-semibold cursor-pointer"
                        >
                          Save Idea
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartProject(mappedOpp)}
                          className="px-3 py-1.5 bg-white border border-black/15 hover:border-black text-neutral-900 font-mono text-[11px] uppercase font-semibold cursor-pointer"
                        >
                          Start Project
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FEATURED SPOTLIGHT: 🔥 BEST MATCH */}
          {radarData.bestMatch && (
            <div className="bg-white border-2 border-[#d4a017] p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-mono text-[10px] uppercase font-bold rounded flex items-center gap-1.5 border border-amber-200">
                    <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                    <span>🔥 Best Match for Today</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-[#eeeae3] text-neutral-800 rounded">
                    {radarData.bestMatch.format} &bull; {radarData.bestMatch.suggestedDurationDisplay}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block uppercase">Creator Fit</span>
                    <strong className="text-neutral-900 font-bold text-base">{radarData.bestMatch.creatorFitScore}/100</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block uppercase">Opportunity</span>
                    <strong className="text-amber-700 font-bold text-base">{radarData.bestMatch.opportunityScore}/100</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block uppercase">Difficulty</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      radarData.bestMatch.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-800' :
                      radarData.bestMatch.difficulty === 'Medium' ? 'bg-sky-50 text-sky-800' : 'bg-purple-50 text-purple-800'
                    }`}>
                      {radarData.bestMatch.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-xs uppercase text-neutral-400 font-semibold">
                  {radarData.bestMatch.topic}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1a1a1a] leading-tight">
                  {radarData.bestMatch.title}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600">
                  <strong>Angle:</strong> {radarData.bestMatch.angle}
                </p>
              </div>

              {/* WHY THIS FITS YOU & HOOK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#f8f7f4] rounded-lg border border-black/[0.06] text-xs">
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-neutral-500">Why this fits you</span>
                  <p className="text-neutral-700">{radarData.bestMatch.whyThisFitsYou}</p>
                  <p className="text-[11px] text-neutral-500 pt-1"><strong>Production:</strong> {radarData.bestMatch.suggestedProductionMethod}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-neutral-500">Suggested Opening Hook</span>
                  <p className="font-serif italic text-neutral-800">{radarData.bestMatch.hook}</p>
                  <p className="text-[11px] text-neutral-500 pt-1"><strong>Timing Signal:</strong> {radarData.bestMatch.whyNow}</p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCreateIdea(radarData.bestMatch!)}
                    className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Create Idea</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartProject(radarData.bestMatch!)}
                    className="px-5 py-2.5 bg-white border border-black/[0.15] hover:border-black text-neutral-900 font-mono text-xs uppercase font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-sky-600" />
                    <span>Start Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSave(radarData.bestMatch!)}
                    className={`px-3.5 py-2.5 rounded font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer border ${
                      radarData.bestMatch.isSaved
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:text-black'
                    }`}
                  >
                    {radarData.bestMatch.isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" /> : <Bookmark className="w-3.5 h-3.5" />}
                    <span>{radarData.bestMatch.isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismiss(radarData.bestMatch!.id)}
                  className="text-xs font-mono text-neutral-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Not Interested</span>
                </button>
              </div>
            </div>
          )}

          {/* FILTER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
              <span className="text-neutral-400 mr-1 text-[11px] uppercase">Filter:</span>
              {[
                { id: 'all', label: 'All Opportunities' },
                { id: 'easy', label: 'Easy' },
                { id: 'medium', label: 'Medium' },
                { id: 'advanced', label: 'Advanced' },
                { id: 'shorts', label: 'Shorts' },
                { id: 'longform', label: 'Long-Form' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-neutral-500">
              Showing {filteredOpportunities.length} of {radarData.totalAvailableToday} opportunities
            </div>
          </div>

          {/* OPPORTUNITY CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-black/[0.08] p-5 rounded-lg shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#eeeae3] text-neutral-800 rounded font-semibold">
                      {opp.format}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-neutral-500 font-semibold">{opp.creatorFitScore} Fit</span>
                      <span className="text-neutral-300">&bull;</span>
                      <span className="text-amber-700 font-semibold">{opp.opportunityScore} Opp</span>
                    </div>
                  </div>

                  <h3 className="font-serif text-lg font-semibold text-[#1a1a1a] leading-snug">
                    {opp.title}
                  </h3>

                  <div className="text-xs text-neutral-600 space-y-1.5">
                    <p><strong>Angle:</strong> {opp.angle}</p>
                    <p className="text-[11px] text-neutral-500"><strong>Why this fits:</strong> {opp.whyThisFitsYou}</p>
                  </div>

                  <div className="p-3 bg-[#f8f7f4] rounded border border-black/[0.04] text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 block mb-0.5">Hook</span>
                    <p className="font-serif italic text-neutral-700 line-clamp-2">{opp.hook}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/[0.05] space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span>Length: {opp.suggestedDurationDisplay}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                      opp.difficulty === 'Easy' ? 'text-emerald-700 bg-emerald-50' :
                      opp.difficulty === 'Medium' ? 'text-sky-700 bg-sky-50' : 'text-purple-700 bg-purple-50'
                    }`}>
                      {opp.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateIdea(opp)}
                        className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase font-semibold transition-colors rounded-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Lightbulb className="w-3 h-3" />
                        <span>Idea</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartProject(opp)}
                        className="px-2.5 py-1.5 bg-white border border-neutral-300 hover:border-black text-neutral-800 font-mono text-[11px] uppercase font-semibold transition-colors rounded-xs cursor-pointer"
                      >
                        Project
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSave(opp)}
                        className={`p-1.5 rounded transition-colors cursor-pointer border ${
                          opp.isSaved ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-neutral-200 text-neutral-500 hover:text-black'
                        }`}
                        title={opp.isSaved ? 'Remove from saved' : 'Save opportunity'}
                      >
                        {opp.isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismiss(opp.id)}
                      className="text-neutral-400 hover:text-rose-500 text-xs p-1"
                      title="Not interested"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FREE PLAN DAILY LIMIT REACHED BANNER */}
          {activePlan === 'free' && (
            <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 font-serif font-bold text-base">
                  <Sparkles className="w-4 h-4 text-[#d4a017]" />
                  <span>Unlock Deeper Radar Intelligence</span>
                </div>
                <p className="text-xs text-neutral-600 max-w-xl">
                  Free plan includes 3 daily content opportunities. Pro unlocks 15 daily opportunities, advanced content-gap analysis, deeper creator-fit scoring, and production recommendations.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('pricing')}
                  className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Upgrade to Pro &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WHAT SHOULD YOU CREATE NEXT?                      */}
      {/* ======================================================== */}
      {activeTab === 'next-video' && (
        <div className="space-y-6">
          <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Next Video Intelligence</span>
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
                  What Should You Create Next?
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  {nextVideoData.hasAnalyticsEvidence
                    ? 'Based partly on your recorded video performance, content gaps, and channel trajectory.'
                    : 'Based on your creator profile and content history. Add video performance logs in Analytics to unlock deeper signals.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleGenerateAiNextVideo}
                  disabled={aiNextVideoLoading}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>{aiNextVideoLoading ? 'Analyzing…' : 'AI Next Video (BYOK)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRefreshNextVideo}
                  className="px-4 py-2 bg-white border border-neutral-300 hover:border-black text-neutral-800 font-mono text-xs uppercase font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Refresh Next Video</span>
                </button>
              </div>
            </div>

            {aiNextVideoResult?.data && (
              <div className="p-6 bg-[#faf6ea] border-2 border-[#d4a017] rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#d4a017] font-mono text-[10px] uppercase font-bold">
                      Gemini BYOK Next Video ({aiNextVideoResult.model})
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                      Quality {aiNextVideoResult.qualityReport.score}/100
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-600">
                    {aiNextVideoResult.data.suggestedFormat} &bull; {aiNextVideoResult.data.suggestedDuration}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1a1a1a]">
                  {aiNextVideoResult.data.recommendedVideo}
                </h3>
                <p className="text-xs text-neutral-700 leading-relaxed">{aiNextVideoResult.data.whyNext}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-black/[0.06]">
                    <strong>Opening Hook:</strong> <span className="font-serif italic">{aiNextVideoResult.data.suggestedHook}</span>
                  </div>
                  <div className="p-3 bg-white border border-black/[0.06]">
                    <strong>Production Method:</strong> {aiNextVideoResult.data.productionMethod}
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-neutral-500">
                    Based on: {aiNextVideoResult.data.basedOn}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleBuildNextVideo({
                        id: aiNextVideoResult.data.id || `ai_next_${Date.now()}`,
                        recommendedVideo: aiNextVideoResult.data.recommendedVideo,
                        whyNext: aiNextVideoResult.data.whyNext,
                        basedOn: aiNextVideoResult.data.basedOn,
                        basedOnType: aiNextVideoResult.data.basedOnType || 'creator_goal',
                        suggestedFormat: aiNextVideoResult.data.suggestedFormat || 'Long-form',
                        suggestedDuration: aiNextVideoResult.data.suggestedDuration || '8-10 min',
                        suggestedHook: aiNextVideoResult.data.suggestedHook || '',
                        productionMethod: aiNextVideoResult.data.productionMethod || creatorProfile.primaryProductionMethod || 'Faceless',
                        creatorFitScore: aiNextVideoResult.qualityReport.score,
                        opportunityScore: aiNextVideoResult.qualityReport.score,
                        confidence: aiNextVideoResult.data.confidence || 'High',
                        isPerformanceBased: Boolean(aiNextVideoResult.data.isPerformanceBased),
                        difficulty: aiNextVideoResult.data.difficulty || 'Easy',
                        tags: aiNextVideoResult.data.tags || [],
                      })
                    }
                    className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Build This AI Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* RECOMMENDATIONS STACK */}
            <div className="space-y-4 pt-4">
              {nextVideoData.recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="p-6 bg-[#f8f7f4] border border-black/[0.06] rounded-xl hover:border-black/[0.15] transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-neutral-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                          Recommended Video #{idx + 1}
                        </span>
                        <h3 className="font-serif text-xl font-bold text-[#1a1a1a]">
                          {rec.recommendedVideo}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-white text-neutral-800 border border-neutral-200 font-semibold">
                        {rec.suggestedFormat} &bull; {rec.suggestedDuration}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {rec.creatorFitScore} Fit
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-2">
                      <div>
                        <strong className="text-neutral-900 block font-mono text-[10px] uppercase">Why next:</strong>
                        <p className="text-neutral-700 leading-relaxed">{rec.whyNext}</p>
                      </div>
                      <div className="text-[11px] text-neutral-500 bg-white p-2.5 rounded border border-black/[0.04]">
                        <strong>Based on:</strong> {rec.basedOn}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <strong className="text-neutral-900 block font-mono text-[10px] uppercase">Opening Hook:</strong>
                        <p className="font-serif italic text-neutral-800">{rec.suggestedHook}</p>
                      </div>
                      <div className="text-[11px] text-neutral-600">
                        <strong>Production Method:</strong> {rec.productionMethod}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{rec.confidence}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleBuildNextVideo(rec)}
                      className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Build This Video</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CREATOR CONTENT GAPS                              */}
      {/* ======================================================== */}
      {activeTab === 'gaps' && (
        <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Creator Content Gap Engine</span>
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              Creator Content Gap Matrix
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-xl">
              Analyzes covered formats vs unrepresented opportunity areas in your personal catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentGaps.map((gap) => (
              <div
                key={gap.id}
                className="p-5 rounded-lg border border-black/[0.08] bg-[#f8f7f4] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-base text-neutral-900">
                    {gap.area}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                    gap.category === 'Covered' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    gap.category === 'Underused' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {gap.category}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {gap.rationale}
                </p>

                <div className="p-3 bg-white rounded border border-black/[0.04] text-xs space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 block">
                    Opportunity Example:
                  </span>
                  <p className="font-medium text-neutral-800">{gap.topicExample}</p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-500 font-mono">{gap.recommendedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SAVED OPPORTUNITIES                               */}
      {/* ======================================================== */}
      {activeTab === 'saved' && (
        <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                Saved Opportunities ({savedOpportunities.length})
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Your bookmarked content concepts. Persisted in your account and accessible even after daily limits.
              </p>
            </div>
          </div>

          {savedOpportunities.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 bg-[#f8f7f4] rounded-lg border border-dashed border-neutral-300">
              No saved opportunities yet. Click "Save" on any opportunity card in Today's Opportunities.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-5 rounded-lg border border-black/[0.08] bg-white shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase font-semibold text-[#d4a017]">
                      {opp.format}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-[#1a1a1a]">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-neutral-600">{opp.angle}</p>
                  </div>

                  <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateIdea(opp)}
                        className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase font-semibold transition-colors"
                      >
                        Create Idea
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartProject(opp)}
                        className="px-3 py-1.5 bg-white border border-neutral-300 hover:border-black text-neutral-800 font-mono text-[11px] uppercase font-semibold transition-colors"
                      >
                        Project
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSave(opp)}
                      className="text-neutral-400 hover:text-rose-600 p-1"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
