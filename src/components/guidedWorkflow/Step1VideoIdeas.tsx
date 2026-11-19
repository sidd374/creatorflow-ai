import React, { useState, useMemo } from 'react';
import { Sparkles, Check, Clock, Award, Filter, ArrowRight, Eye, ChevronRight, Layers, Layout, ShieldCheck } from 'lucide-react';
import { RecommendedVideoIdea } from '../../types';
import { trackEvent } from '../../lib/analyticsService';

interface Step1VideoIdeasProps {
  ideas: RecommendedVideoIdea[];
  selectedIdea: RecommendedVideoIdea | null;
  onSelectIdea: (idea: RecommendedVideoIdea) => void;
  onContinue: () => void;
}

type IdeaFilterTab = 'Recommended' | 'Best Fit' | 'Easiest' | 'Most Engaging' | 'Shorts' | 'Long-form';

export const Step1VideoIdeas: React.FC<Step1VideoIdeasProps> = ({
  ideas,
  selectedIdea,
  onSelectIdea,
  onContinue,
}) => {
  const [activeTab, setActiveTab] = useState<IdeaFilterTab>('Recommended');
  const [detailIdea, setDetailIdea] = useState<RecommendedVideoIdea | null>(null);

  const filteredIdeas = useMemo(() => {
    switch (activeTab) {
      case 'Best Fit':
        return [...ideas].sort((a, b) => b.creatorFitScore - a.creatorFitScore);
      case 'Easiest':
        return ideas.filter((i) => i.difficulty === 'Easy');
      case 'Most Engaging':
        return [...ideas].sort((a, b) => b.topicRelevance - a.topicRelevance);
      case 'Shorts':
        return ideas.filter((i) => i.format === 'Short' || (i.presentationFormat && i.presentationFormat.includes('Short')));
      case 'Long-form':
        return ideas.filter((i) => i.format === 'Long-form' || !i.presentationFormat?.includes('Short'));
      case 'Recommended':
      default:
        return [...ideas].sort((a, b) => (b.creatorFitScore + b.topicRelevance) - (a.creatorFitScore + a.topicRelevance));
    }
  }, [ideas, activeTab]);

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 3 of 10 — Idea Selection
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          What should you make?
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Format-aware ideas tailored to your presentation style, equipment, budget, and experience.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-black/[0.06] overflow-x-auto pb-px">
        <div className="flex items-center gap-1 sm:gap-3">
          {(['Recommended', 'Best Fit', 'Easiest', 'Most Engaging', 'Shorts', 'Long-form'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`font-mono text-xs uppercase tracking-wider py-2.5 px-3 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#d4a017] text-[#d4a017] font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-[#1a1a1a]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Cards List */}
      <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
        {filteredIdeas.map((idea) => {
          const isSelected = selectedIdea?.id === idea.id;
          return (
            <div
              key={idea.id}
              className={`bg-white border p-5 sm:p-6 transition-all duration-200 space-y-4 ${
                isSelected
                  ? 'border-[#1a1a1a] shadow-md ring-1 ring-[#1a1a1a]'
                  : 'border-black/[0.08] hover:border-[#d4a017] shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  {/* Meta Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4] font-medium">
                      {idea.presentationFormat || idea.format}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700">
                      Duration: {idea.estimatedTime}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700">
                      Difficulty: {idea.difficulty}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1a1a1a] text-[#f8f7f4] font-semibold ml-auto sm:ml-0">
                      {idea.creatorFitScore}% Creator Fit
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1a1a1a] leading-tight">
                    {idea.title}
                  </h3>

                  {/* Core Angle */}
                  {idea.suggestedAngle && (
                    <div className="text-xs text-neutral-600 font-sans flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Core Angle:
                      </span>
                      <span className="font-medium text-[#1a1a1a]">{idea.suggestedAngle}</span>
                    </div>
                  )}

                  {/* Why this fits you */}
                  <div className="bg-[#f8f7f4] border border-black/[0.05] p-3 text-xs text-neutral-700 space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                      Why this fits you:
                    </span>
                    <ul className="space-y-1">
                      {idea.whyThisIdea.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Structure */}
                  {idea.suggestedStructure && (
                    <div className="p-2.5 bg-[#eeeae3]/60 border border-[#e2ddd4] text-[11px] text-neutral-700 font-sans flex items-start gap-2">
                      <Layout className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 block">Suggested Structure:</strong>
                        <span>{idea.suggestedStructure}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection & Action Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.05]">
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('idea_generated', {
                        properties: {
                          ideaId: idea.id,
                          title: idea.title,
                          format: idea.format,
                          score: idea.creatorFitScore,
                        },
                      });
                      trackEvent('feature_used', { feature: 'idea_generator' });
                      onSelectIdea(idea);
                      onContinue();
                    }}
                    className={`px-5 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors w-full sm:w-auto text-center ${
                      isSelected
                        ? 'bg-[#d4a017] hover:bg-[#b8890f] text-white font-semibold'
                        : 'bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4]'
                    }`}
                  >
                    {isSelected ? 'Selected ✓' : 'Choose This Idea'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailIdea(detailIdea?.id === idea.id ? null : idea)}
                    className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-[#1a1a1a] py-1"
                  >
                    {detailIdea?.id === idea.id ? 'Hide Strategy' : 'Strategy Details'}
                  </button>
                </div>
              </div>

              {/* Expandable Strategy Details */}
              {detailIdea?.id === idea.id && (
                <div className="mt-3 pt-3 border-t border-black/[0.06] text-xs text-neutral-600 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50/70 p-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-neutral-400 block">Target Audience:</span>
                    <span className="font-medium text-[#1a1a1a]">{idea.targetAudience}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-neutral-400 block">Format & Platform:</span>
                    <span className="font-medium text-[#1a1a1a]">{idea.presentationFormat || idea.format} &bull; YouTube</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-neutral-400 block">Budget Fit:</span>
                    <span className="font-medium text-[#d4a017]">{idea.budgetFit}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
