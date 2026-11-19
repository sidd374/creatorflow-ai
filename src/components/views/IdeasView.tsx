import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  Check, 
  Layers, 
  Calendar, 
  Compass, 
  Plus, 
  ExternalLink 
} from 'lucide-react';
import { VideoIdea, RecommendedVideoIdea, CreatorProfile, IdeaStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IdeaDetailModal } from './IdeaDetailModal';

interface IdeasViewProps {
  ideas: RecommendedVideoIdea[];
  creatorProfile: CreatorProfile;
  onBuildIdea: (idea: VideoIdea | RecommendedVideoIdea) => void;
  onUpdateIdeaStatus: (ideaId: string, status: 'Idea' | 'Planned' | 'In Production' | 'Published') => void;
  onAnalyzeNewTopic: () => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({
  ideas,
  creatorProfile,
  onBuildIdea,
  onUpdateIdeaStatus,
  onAnalyzeNewTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Idea' | 'Planned' | 'In Production' | 'Published'>('All');
  const [selectedIdeaForDetail, setSelectedIdeaForDetail] = useState<RecommendedVideoIdea | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize statuses (handles legacy 'Ideas' vs 'Idea')
  const normalizeStatus = (s: string) => (s === 'Ideas' ? 'Idea' : s);

  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      const statusMatches = activeTab === 'All' || normalizeStatus(idea.status) === activeTab;
      const searchMatches = searchQuery.trim() === '' || 
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.goal.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatches && searchMatches;
    });
  }, [ideas, activeTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Content Planner
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-mono">
              {ideas.length} Saved Concepts
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            Video Ideas & Queue
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
            Calibrated video concepts ranked by your CreatorFit score. Select any idea to start production.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onAnalyzeNewTopic}
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />}
          className="self-start sm:self-auto font-mono text-xs uppercase tracking-wider"
        >
          Analyze New Topic
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#eeeae3] rounded-md overflow-x-auto select-none no-scrollbar">
          {(['All', 'Idea', 'Planned', 'In Production', 'Published'] as const).map((tab) => {
            const count = tab === 'All' 
              ? ideas.length 
              : ideas.filter((i) => normalizeStatus(i.status) === tab).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                    : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
                }`}
              >
                <span>{tab === 'Idea' ? 'Ideas' : tab}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-[#2a2a2a] text-[#f8f7f4]' : 'bg-black/[0.06] text-neutral-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas or goals..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-black/[0.12] bg-white text-xs text-[#1a1a1a] focus:outline-none focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Desktop Table View & Mobile Stacked Cards */}
      <Card className="border-black/[0.08] shadow-xs bg-white overflow-hidden rounded-lg">
        {/* Empty State */}
        {filteredIdeas.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#eeeae3] text-neutral-500 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6 text-[#d4a017]" />
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">
                No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} videos yet
              </h3>
              <p className="text-xs text-neutral-500">
                Choose an idea and start building your next high-retention video.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('All')}
              className="text-xs"
            >
              Explore All Ideas
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f7f4] border-b border-black/[0.06] text-neutral-500 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-6">Idea</th>
                    <th className="py-3 px-3">Format</th>
                    <th className="py-3 px-3">Goal</th>
                    <th className="py-3 px-3">Difficulty</th>
                    <th className="py-3 px-3">Est. Time</th>
                    <th className="py-3 px-3">CreatorFit</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filteredIdeas.map((idea) => {
                    const status = normalizeStatus(idea.status);
                    return (
                      <tr 
                        key={idea.id} 
                        className="hover:bg-[#f8f7f4] transition-colors group cursor-pointer"
                        onClick={() => setSelectedIdeaForDetail(idea)}
                      >
                        <td className="py-3.5 px-6 font-semibold text-neutral-900 max-w-sm">
                          <div className="text-[#1a1a1a] group-hover:text-[#d4a017] transition-colors font-serif text-base font-normal">
                            "{idea.title}"
                          </div>
                          <div className="text-[11px] text-neutral-500 font-sans font-normal truncate mt-0.5">
                            {idea.whyThisIdea[0] || 'Optimized for channel growth'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4]">
                            {idea.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-neutral-600 truncate max-w-[120px]">
                          {idea.goal}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`font-mono text-[11px] font-semibold ${
                            idea.difficulty === 'Easy' ? 'text-emerald-700' : idea.difficulty === 'Medium' ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {idea.difficulty}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-neutral-600 font-mono text-[11px]">
                          {idea.estimatedTime}
                        </td>
                        <td className="py-3.5 px-3 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[11px] border border-emerald-200">
                            {idea.creatorFitScore}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-mono">
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedIdeaForDetail(idea)}
                              className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded hover:bg-black/[0.04] transition-colors cursor-pointer"
                              title="View Strategy Detail"
                            >
                              <Compass className="w-4 h-4" />
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onBuildIdea(idea)}
                              className="text-xs py-1 px-3 font-mono uppercase tracking-wider"
                            >
                              Build
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Visible on screens < md) */}
            <div className="md:hidden divide-y divide-black/[0.06]">
              {filteredIdeas.map((idea) => {
                const status = normalizeStatus(idea.status);
                return (
                  <div
                    key={idea.id}
                    className="p-4 space-y-3 hover:bg-[#f8f7f4] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4]">
                          {idea.format}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                            {idea.creatorFitScore} Fit
                          </span>
                          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                            {status}
                          </span>
                        </div>
                      </div>

                      <h3 
                        onClick={() => setSelectedIdeaForDetail(idea)}
                        className="text-base font-serif font-semibold text-neutral-900 leading-snug cursor-pointer pt-0.5 hover:text-[#d4a017]"
                      >
                        "{idea.title}"
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {idea.whyThisIdea[0]}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-black/[0.04]">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span>{idea.difficulty}</span>
                        <span>·</span>
                        <span>{idea.estimatedTime}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIdeaForDetail(idea)}
                          className="text-xs py-1 px-2.5 font-mono uppercase"
                        >
                          Strategy
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onBuildIdea(idea)}
                          className="text-xs py-1 px-3 font-mono uppercase"
                        >
                          Build
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Idea Strategy Detail Modal */}
      {selectedIdeaForDetail && (
        <IdeaDetailModal
          idea={selectedIdeaForDetail}
          onClose={() => setSelectedIdeaForDetail(null)}
          onBuild={(idea) => {
            setSelectedIdeaForDetail(null);
            onBuildIdea(idea);
          }}
          onAddToPlanner={(idea) => {
            onUpdateIdeaStatus(idea.id, 'Planned');
          }}
        />
      )}
    </div>
  );
};
