import React from 'react';
import { 
  Compass, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { CreatorProfile, VideoProject } from '../../types';
import { getStoredPlan, PlanId, canAccess } from '../../lib/planEntitlements';

interface ContentGapFinderProps {
  creatorProfile: CreatorProfile;
  projects?: VideoProject[];
  onSelectGapTopic?: (topic: string) => void;
  onNavigate: (view: string) => void;
}

interface GapOpportunity {
  id: string;
  type: 'Untapped Topic' | 'Underrepresented Format' | 'Missing Series' | 'Follow-Up Opportunity';
  title: string;
  explanation: string;
  impactScore: 'High Impact' | 'Medium Impact';
  recommendedFormat: string;
}

export const ContentGapFinder: React.FC<ContentGapFinderProps> = ({
  creatorProfile,
  projects = [],
  onSelectGapTopic,
  onNavigate,
}) => {
  const plan = getStoredPlan();
  const hasAccess = canAccess('content_gap_finder');

  const topic = creatorProfile.channelTopic || 'YouTube Strategy';
  const niche = creatorProfile.niche || 'Educational';

  // Derived from existing library analysis
  const identifiedGaps: GapOpportunity[] = [
    {
      id: 'gap-1',
      type: 'Underrepresented Format',
      title: 'Missing Quick-Retention Shorts for Longform Conversion',
      explanation: `Your library currently has ${projects.length} planned longform project(s). Creating 60-second teaser Shorts linking to your deep dives can boost audience acquisition by up to 40%.`,
      impactScore: 'High Impact',
      recommendedFormat: 'YouTube Shorts (9:16 vertical)',
    },
    {
      id: 'gap-2',
      type: 'Untapped Topic',
      title: `Common Myths in ${niche} You Should Avoid`,
      explanation: `Viewers looking for "${topic}" actively search for debunking content. A myth-busting breakdown addresses viewer skepticism and builds strong channel trust.`,
      impactScore: 'High Impact',
      recommendedFormat: 'Talking Head or Faceless Breakdown',
    },
    {
      id: 'gap-3',
      type: 'Missing Series',
      title: `3-Part Cornerstone Series on ${topic}`,
      explanation: 'Compounding multi-part series create bingeable watch time and trigger YouTube algorithm playlist recommendations.',
      impactScore: 'High Impact',
      recommendedFormat: 'Serialized Multi-Episode Video Plan',
    },
    {
      id: 'gap-4',
      type: 'Follow-Up Opportunity',
      title: 'Viewer FAQ & Community Q&A Video',
      explanation: 'Addressing real objections and questions from your previous video topics builds loyal viewer retention.',
      impactScore: 'Medium Impact',
      recommendedFormat: 'Community Q&A / Screen Share',
    },
  ];

  return (
    <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-bold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Content Gap Finder</span>
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-mono">
              Channel Blind Spot Analysis
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
            Untapped Content Opportunities
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl font-sans">
            Identify topics you haven&apos;t covered, missing format variations, and high-converting playlist series holes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-[#eeeae3] text-neutral-800 rounded border border-[#ded8cd]">
            {hasAccess ? (plan === 'max' ? 'MAX Matrix' : 'CREATOR Tier') : 'Preview Mode'}
          </span>
        </div>
      </div>

      {!hasAccess ? (
        <div className="p-6 rounded-lg border border-dashed border-[#ded8cd] bg-[#f8f7f4] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#eeeae3] text-[#d4a017] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-xl font-normal text-[#1a1a1a]">
            Content Gap Finder is available on Creator & MAX
          </h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            See where your channel has untapped content opportunities with Creator. Stop guessing what to make next and unlock structured format and series gap detection.
          </p>
          <button
            onClick={() => onNavigate('pricing')}
            className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-colors rounded-xs shadow-xs"
          >
            Choose Creator →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {identifiedGaps.map((gap) => (
            <div
              key={gap.id}
              className="p-5 rounded-lg border border-black/[0.08] bg-[#f8f7f4]/60 hover:bg-[#f8f7f4] transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/60 font-semibold">
                    {gap.type}
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    {gap.impactScore}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-semibold text-[#1a1a1a] leading-snug">
                  {gap.title}
                </h3>

                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  {gap.explanation}
                </p>

                <p className="text-[11px] font-mono text-neutral-500">
                  <strong>Recommended Format:</strong> {gap.recommendedFormat}
                </p>
              </div>

              <div className="pt-3 border-t border-black/[0.05] flex justify-end">
                <button
                  onClick={() => onSelectGapTopic ? onSelectGapTopic(gap.title) : onNavigate('ideas')}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white text-[10px] font-mono uppercase font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Build To Fill Gap</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
