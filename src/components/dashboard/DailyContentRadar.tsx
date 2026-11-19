import React, { useMemo } from 'react';
import { 
  Radar, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Check, 
  Clock, 
  Film, 
  Zap,
  TrendingUp,
  Tag,
  Lightbulb
} from 'lucide-react';
import { CreatorProfile, VideoProject, RecommendedVideoIdea, VideoAnalytics } from '../../types';
import { getStoredPlan, PlanId, getCapabilityInfo } from '../../lib/planEntitlements';
import { generateDailyContentRadar } from '../../lib/radarEngine';

interface DailyContentRadarProps {
  creatorProfile: CreatorProfile;
  projects?: VideoProject[];
  ideas?: RecommendedVideoIdea[];
  analyticsList?: VideoAnalytics[];
  onSelectTopic?: (topic: string) => void;
  onNavigate: (view: string) => void;
  onStartGuidedWorkflow?: (topicOrIdea?: string | RecommendedVideoIdea) => void;
}

export const DailyContentRadar: React.FC<DailyContentRadarProps> = ({
  creatorProfile,
  projects = [],
  ideas = [],
  analyticsList = [],
  onSelectTopic,
  onNavigate,
  onStartGuidedWorkflow,
}) => {
  const plan = getStoredPlan();
  const capability = getCapabilityInfo('dailyContentRadar', plan);

  const radarData = useMemo(() => {
    return generateDailyContentRadar(
      creatorProfile,
      projects,
      ideas,
      analyticsList,
      plan
    );
  }, [creatorProfile, projects, ideas, analyticsList, plan]);

  const displayItems = radarData.opportunities.slice(0, plan === 'max' ? 5 : plan === 'creator' ? 4 : plan === 'pro' ? 3 : 2);

  return (
    <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1">
              <Radar className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Daily Content Radar</span>
            </span>
            <span className="text-neutral-300">&bull;</span>
            <span className="text-xs text-neutral-500 font-mono">
              Signal Level: {capability.level.toUpperCase()}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
            Today's Content Opportunities
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl font-sans">
            Fresh topic signals, format recommendations, and live Gemini Web Research opportunities grounded in your creator profile and channel niche.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('radar')}
            className="px-4 py-2 bg-neutral-900 hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
            <span>Open AI Radar Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayItems.map((item, idx) => (
          <div
            key={item.id}
            className="p-5 rounded-lg border border-black/[0.08] bg-[#f8f7f4]/60 hover:bg-[#f8f7f4] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-semibold text-[#d4a017] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {idx === 0 ? '🔥 Best Match' : `${item.creatorFitScore} Fit`}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#eeeae3] text-neutral-700 rounded">
                  {item.format}
                </span>
              </div>

              <h3 className="font-serif text-lg font-semibold text-[#1a1a1a] leading-snug">
                {item.title}
              </h3>

              <div className="text-xs text-neutral-600 space-y-1">
                <p><strong>Angle:</strong> {item.angle}</p>
                <p className="text-[11px] text-neutral-500"><strong>Why this fits:</strong> {item.whyThisFitsYou}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-neutral-400">
                {item.suggestedDurationDisplay}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onStartGuidedWorkflow) {
                    onStartGuidedWorkflow(item.topic);
                  } else if (onSelectTopic) {
                    onSelectTopic(item.topic);
                  } else {
                    onNavigate('radar');
                  }
                }}
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-[10px] uppercase font-semibold transition-colors rounded-xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Select</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {plan === 'free' && (
        <div className="p-3.5 bg-[#eeeae3]/60 rounded-md border border-[#ded8cd] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4a017] shrink-0" />
            <span>
              <strong>Want more daily opportunities?</strong> Pro creators get 15 daily opportunities, while Creator &amp; MAX receive full strategy alignment.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pricing')}
            className="text-xs font-mono uppercase font-semibold text-[#1a1a1a] hover:text-[#d4a017] underline whitespace-nowrap cursor-pointer"
          >
            Upgrade to Pro &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
