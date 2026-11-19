import React, { useState } from 'react';
import { Search, Sparkles, Filter } from 'lucide-react';
import { YOUTUBE_TOOLS } from '../../data/tools';
import { Tool, ToneType } from '../../types';
import { ToolCard } from '../common/ToolCard';
import { SingleToolModal } from './SingleToolModal';

interface ToolsViewProps {
  onGoToFullPack: (topic?: string, lang?: string, tone?: ToneType) => void;
  selectedToolId?: string | null;
}

export const ToolsView: React.FC<ToolsViewProps> = ({ onGoToFullPack, selectedToolId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTool, setActiveTool] = useState<Tool | null>(() => {
    if (selectedToolId) {
      return YOUTUBE_TOOLS.find((t) => t.id === selectedToolId) || null;
    }
    return null;
  });

  const categories = ['All', 'Optimization', 'Strategy', 'Shorts', 'Engagement'];

  const filteredTools = YOUTUBE_TOOLS.filter((tool) => {
    const matchesCategory =
      selectedCategory === 'All' || tool.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto select-none pb-16">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-black/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Creator Toolkit
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-mono">9 Specialized Engines</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            YouTube Creator Tools
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
            Zero in on individual aspects of your video strategy with algorithmic precision.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-md border border-black/[0.12] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Category Pills (Functional Segmented Control) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-xs font-semibold'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-black/[0.08] hover:bg-[#f8f7f4]'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-400 hidden sm:inline font-mono">
          Showing {filteredTools.length} tools
        </span>
      </div>

      {/* 9 Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onOpen={(t) => setActiveTool(t)}
          />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="p-12 text-center bg-white rounded-lg border border-black/[0.08]">
          <p className="text-sm text-neutral-500">No YouTube tools found matching "{searchQuery}".</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-xs text-[#d4a017] font-semibold mt-2 hover:underline font-mono uppercase"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Active Single Tool Modal */}
      <SingleToolModal
        tool={activeTool}
        onClose={() => setActiveTool(null)}
        onGoToFullPack={onGoToFullPack}
      />
    </div>
  );
};
