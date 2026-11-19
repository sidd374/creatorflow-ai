import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  HelpCircle, 
  ExternalLink, 
  DollarSign, 
  Laptop, 
  AlertCircle,
  FileCheck,
  ListOrdered,
  Wrench,
  CheckSquare,
  Clock,
  Target
} from 'lucide-react';
import { 
  CreatorProfile, 
  VideoProject, 
  ToolCategory 
} from '../../types';
import { 
  getRecommendedTools, 
  getRecommendedStack, 
  getProductionReadiness, 
  getRequiredAssets, 
  generatePersonalizedProductionPlan, 
  ScoredTool 
} from '../../lib/toolRecommendationEngine';
import { TOOL_CATEGORIES_META } from '../../data/creatorToolsData';
import { RecommendedToolCard } from './RecommendedToolCard';
import { ToolDetailModal } from './ToolDetailModal';
import { ToolComparisonModal } from './ToolComparisonModal';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface ToolsWorkspaceViewProps {
  project: VideoProject;
  creatorProfile: CreatorProfile;
  onUpdateProject: (updated: Partial<VideoProject>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type FilterType = 'All' | 'Recommended' | 'Free' | 'Paid' | 'Easy' | 'Medium' | 'Advanced';

export const ToolsWorkspaceView: React.FC<ToolsWorkspaceViewProps> = ({
  project,
  creatorProfile,
  onUpdateProject,
  onNext,
  onPrev,
}) => {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'stack' | 'plan' | 'checklist' | 'directory'>('stack');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('all');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [detailModalTool, setDetailModalTool] = useState<ScoredTool | null>(null);
  const [comparedToolIds, setComparedToolIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const isFreeBudget = creatorProfile.monthlyBudget.includes('₹0') || 
                       creatorProfile.monthlyBudget.includes('$0') || 
                       creatorProfile.monthlyBudget.toLowerCase().includes('zero');

  // Compute recommendations deterministically
  const scoredTools = useMemo(() => {
    return getRecommendedTools(creatorProfile, project);
  }, [creatorProfile, project]);

  // Compute recommended stack for essential categories
  const recommendedStack = useMemo(() => {
    return getRecommendedStack(creatorProfile, project, scoredTools);
  }, [creatorProfile, project, scoredTools]);

  // Production readiness calculation based on actual completed steps
  const readiness = useMemo(() => {
    return getProductionReadiness(project);
  }, [project]);

  // Required assets checklist
  const requiredAssets = useMemo(() => {
    return getRequiredAssets(project, scoredTools);
  }, [project, scoredTools]);

  // Personalized production plan
  const productionPlan = useMemo(() => {
    return generatePersonalizedProductionPlan(project, creatorProfile, scoredTools);
  }, [project, creatorProfile, scoredTools]);

  // Handle selecting a tool for its category
  const handleSelectTool = (tool: ScoredTool) => {
    const current = project.selectedTools || {};
    const updated = {
      ...current,
      [tool.categoryKey]: tool.id,
    };
    onUpdateProject({
      selectedTools: updated,
    });
    toast('Tool Confirmed', `${tool.name} assigned to ${tool.category} in your stack.`, 'success');
  };

  // Handle toggling required asset item in checklist
  const handleToggleAsset = (assetId: string) => {
    const currentChecklist = project.toolChecklist || {};
    const nextState = {
      ...currentChecklist,
      [assetId]: !currentChecklist[assetId],
    };
    onUpdateProject({
      toolChecklist: nextState,
    });
  };

  // Compare tool toggles (up to 3)
  const handleToggleCompare = (tool: ScoredTool) => {
    setComparedToolIds((prev) => {
      if (prev.includes(tool.id)) {
        return prev.filter((id) => id !== tool.id);
      }
      if (prev.length >= 3) {
        toast('Compare Limit', 'You can compare up to 3 tools at once.', 'info');
        return prev;
      }
      return [...prev, tool.id];
    });
  };

  const comparedTools = useMemo(() => {
    return scoredTools.filter((t) => comparedToolIds.includes(t.id));
  }, [scoredTools, comparedToolIds]);

  // Filter tools for the directory
  const filteredTools = useMemo(() => {
    return scoredTools.filter((tool) => {
      // Category filter
      if (selectedCategoryKey !== 'all' && tool.categoryKey !== selectedCategoryKey) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tool.name.toLowerCase().includes(q);
        const matchesCat = tool.category.toLowerCase().includes(q);
        const matchesBest = tool.bestFor.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesBest) return false;
      }

      // Filter pill
      if (filterType === 'Recommended') {
        return tool.matchLevel === 'Best match' || tool.matchLevel === 'Strong match';
      }
      if (filterType === 'Free') {
        return tool.availability === 'Free';
      }
      if (filterType === 'Paid') {
        return tool.paidAvailable;
      }
      if (filterType === 'Easy') {
        return tool.difficulty === 'Easy';
      }
      if (filterType === 'Medium') {
        return tool.difficulty === 'Medium';
      }
      if (filterType === 'Advanced') {
        return tool.difficulty === 'Advanced';
      }

      return true;
    }).sort((a, b) => b.fitScore - a.fitScore);
  }, [scoredTools, selectedCategoryKey, searchQuery, filterType]);

  const selectedToolMap = project.selectedTools || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & EXPLANATION */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Production Stack & Tools
              </span>
              <span className="text-xs text-neutral-300">/</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                {project.format}
              </span>
              {isFreeBudget && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  FREE-FIRST STACK
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900">
              Personalized Production Tools & Plan
            </h2>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              Choose the tools that fit your video, budget ({creatorProfile.monthlyBudget}), device ({creatorProfile.availableDevices.join(', ')}), skill level ({creatorProfile.experienceLevel}), and production time.
            </p>
          </div>

          {/* Production Readiness Score Indicator */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 sm:p-4 min-w-[200px] shrink-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-neutral-700">Production Readiness</span>
              <span className="font-mono font-bold text-neutral-900">{readiness.scorePct}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${readiness.scorePct}%` }}
              />
            </div>
            <div className="text-[10px] text-neutral-500 mt-1.5 flex items-center justify-between">
              <span>{readiness.completedItemsCount} / {readiness.totalItemsCount} steps ready</span>
              <span className="font-medium text-emerald-700">
                {readiness.scorePct >= 75 ? 'Ready to Edit' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* FREE-FIRST STACK DEDICATED BANNER IF BUDGET IS ₹0 */}
        {isFreeBudget && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ₹
              </div>
              <div>
                <span className="font-black text-emerald-950">Build This Video for ₹0:</span>
                <span className="text-emerald-900 ml-1">
                  You can make this complete video without paying for a tool subscription.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
              Free tiers & open-source prioritized
            </span>
          </div>
        )}
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl overflow-x-auto select-none no-scrollbar">
        <button
          onClick={() => setActiveSubTab('stack')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'stack'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Recommended Stack</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {recommendedStack.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('plan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'plan'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Personalized Production Plan</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {productionPlan.length} Steps
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'checklist'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Required Assets Checklist</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {requiredAssets.filter(a => a.isReady).length}/{requiredAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('directory')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'directory'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>All Recommended Tools</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {scoredTools.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: YOUR RECOMMENDED PRODUCTION STACK */}
      {/* ========================================================================= */}
      {activeSubTab === 'stack' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-neutral-900">
                Your Recommended Production Stack
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                The top-matching tool for each production phase required by "{project.selectedTitle || project.topic}".
              </p>
            </div>

            {comparedTools.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompareModalOpen(true)}
                leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                className="text-xs text-rose-600 font-semibold"
              >
                Compare Selected ({comparedTools.length}/3)
              </Button>
            )}
          </div>

          {/* Grid of Recommended Stack Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedStack.map((item) => {
              const tool = item.recommendedTool;
              const isSelected = selectedToolMap[item.categoryKey] === tool.id;

              return (
                <div 
                  key={item.categoryKey}
                  className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-2.5">
                    {/* Header with category and fit */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {item.categoryName}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        tool.matchLevel === 'Best match'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-neutral-100 text-neutral-800'
                      }`}>
                        {tool.matchLevel}
                      </span>
                    </div>

                    {/* Tool name & best for */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-neutral-900">
                          {tool.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          tool.availability === 'Free' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {tool.availability}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                        {tool.mainBenefit}
                      </p>
                    </div>

                    {/* Reasons */}
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                        Why this fits you
                      </span>
                      {tool.reasons.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-neutral-700 text-[11px]">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span className="line-clamp-1">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailModalTool(tool)}
                      className="text-xs flex-1"
                    >
                      View Details
                    </Button>
                    <Button
                      variant={isSelected ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleSelectTool(tool)}
                      leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
                      className={`text-xs font-semibold flex-1 ${
                        isSelected 
                          ? 'border-emerald-600 text-emerald-800 bg-emerald-50' 
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      }`}
                    >
                      {isSelected ? 'Confirmed' : 'Choose Tool'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick jump to Explore Directory */}
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-neutral-600 shrink-0" />
              <span className="text-neutral-700 font-medium">
                Want to explore other alternatives or specialized options?
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSubTab('directory')}
              className="text-xs shrink-0"
            >
              Browse All 10 Categories →
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PERSONALIZED PRODUCTION PLAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'plan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-neutral-900">
                Your Production Plan
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Concrete step-by-step workflow tailored to your selected tools, script, and visual storyboard.
              </p>
            </div>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full font-medium self-start sm:self-auto">
              Estimated duration: {project.estimatedMinutes} minutes
            </span>
          </div>

          {/* Timeline / Card Steps */}
          <div className="space-y-3">
            {productionPlan.map((step) => (
              <div 
                key={step.stepNumber}
                className="p-4 sm:p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:border-neutral-300 transition-all flex flex-col sm:flex-row items-start gap-4"
              >
                {/* Number Badge */}
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {step.stepNumber}
                </div>

                {/* Step Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-neutral-900">
                      {step.title}
                    </h4>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                      Tool: <strong className="text-neutral-900">{step.toolName}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    {step.whatToDo}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Input Needed
                      </span>
                      <span className="text-neutral-600 text-[11px] mt-0.5 block">{step.inputNeeded}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Expected Output
                      </span>
                      <span className="text-neutral-800 text-[11px] font-semibold mt-0.5 block">{step.expectedOutput}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: REQUIRED ASSETS CHECKLIST */}
      {/* ========================================================================= */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-neutral-900">
                What You Need Before Editing
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Check off each asset as you record or gather it so you can edit without interruptions.
              </p>
            </div>
            <div className="text-xs font-semibold text-neutral-700">
              Completed: <strong className="text-emerald-700">{requiredAssets.filter(a => a.isReady).length}</strong> / {requiredAssets.length}
            </div>
          </div>

          <div className="bg-white border border-neutral-200/90 rounded-2xl divide-y divide-neutral-100 shadow-xs overflow-hidden">
            {requiredAssets.map((asset) => (
              <div 
                key={asset.id}
                onClick={() => handleToggleAsset(asset.id)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                  asset.isReady ? 'bg-emerald-50/30' : 'hover:bg-neutral-50/70'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    asset.isReady 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-neutral-300 bg-white'
                  }`}>
                    {asset.isReady && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs sm:text-sm font-bold ${
                        asset.isReady ? 'text-neutral-900 line-through text-neutral-400' : 'text-neutral-900'
                      }`}>
                        {asset.label}
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                        {asset.category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {asset.description}
                    </p>
                  </div>
                </div>

                {asset.sourceTool && (
                  <span className="text-[11px] text-neutral-500 font-medium shrink-0 hidden sm:inline-block">
                    via {asset.sourceTool}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: ALL RECOMMENDED TOOLS (DIRECTORY & FILTERS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6">
          {/* Search, Filter Pills & Category Switcher */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, features, or capability..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
                Filter:
              </span>
              {(['All', 'Recommended', 'Free', 'Paid', 'Easy', 'Medium', 'Advanced'] as FilterType[]).map((pill) => (
                <button
                  key={pill}
                  onClick={() => setFilterType(pill)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    filterType === pill
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* 10 Categories Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs pt-1 border-t border-neutral-100">
              <button
                onClick={() => setSelectedCategoryKey('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                  selectedCategoryKey === 'all'
                    ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                All 10 Categories
              </button>
              {TOOL_CATEGORIES_META.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategoryKey(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                    selectedCategoryKey === cat.key
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => {
              const isSelected = selectedToolMap[tool.categoryKey] === tool.id;
              const isCompared = comparedToolIds.includes(tool.id);

              return (
                <RecommendedToolCard
                  key={tool.id}
                  tool={tool}
                  isSelected={isSelected}
                  isCompared={isCompared}
                  onSelect={handleSelectTool}
                  onOpenDetails={setDetailModalTool}
                  onToggleCompare={handleToggleCompare}
                  canCompare={comparedToolIds.length < 3 || isCompared}
                  isFreeBudget={isFreeBudget}
                />
              );
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
              No tools match your current filter or search criteria.
            </div>
          )}
        </div>
      )}

      {/* Floating Comparison Bar if 1+ tools selected */}
      {comparedTools.length > 0 && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 bg-neutral-900 text-white rounded-2xl shadow-xl p-3 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <SlidersHorizontal className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold">
            {comparedTools.length} / 3 Tools Selected
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCompareModalOpen(true)}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            Compare Now
          </Button>
          <button
            onClick={() => setComparedToolIds([])}
            className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Tool Detail Modal */}
      <ToolDetailModal
        tool={detailModalTool}
        isOpen={Boolean(detailModalTool)}
        onClose={() => setDetailModalTool(null)}
        onSelectTool={handleSelectTool}
        isSelected={Boolean(detailModalTool && selectedToolMap[detailModalTool.categoryKey] === detailModalTool.id)}
        videoTitle={project.selectedTitle || project.topic}
      />

      {/* Tool Comparison Modal */}
      <ToolComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        tools={comparedTools}
        onRemoveTool={(id) => setComparedToolIds(prev => prev.filter(t => t !== id))}
        onSelectTool={handleSelectTool}
        selectedToolIds={selectedToolMap}
      />

      {/* Bottom Step Navigation: Production → Tools → Publishing */}
      <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
        >
          ← Production Checklist
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
        >
          Next: Publishing Package →
        </Button>
      </div>
    </div>
  );
};
