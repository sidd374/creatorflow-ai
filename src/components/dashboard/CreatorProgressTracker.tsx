import React, { useState } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Sparkles, 
  ChevronRight, 
  Award, 
  Flame, 
  TrendingUp, 
  Compass, 
  Search, 
  Lightbulb, 
  FolderPlus, 
  FileText, 
  Send, 
  BarChart2, 
  Sliders, 
  Brain,
  Lock
} from 'lucide-react';
import { 
  getCreatorAchievements, 
  getMilestoneEvents 
} from '../../lib/achievementEngine';
import { CreatorAchievement, AchievementCategory } from '../../types/guidedWorkflow';

export const CreatorProgressTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'All'>('All');
  const achievements = getCreatorAchievements();
  const milestoneEvents = getMilestoneEvents();

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const progressPct = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = selectedCategory === 'All' 
    ? achievements 
    : achievements.filter((a) => a.category === selectedCategory);

  const getIcon = (iconName: string, isUnlocked: boolean) => {
    const className = `w-4 h-4 ${isUnlocked ? 'text-[#d4a017]' : 'text-neutral-400'}`;
    switch (iconName) {
      case 'Compass': return <Compass className={className} />;
      case 'Search': return <Search className={className} />;
      case 'Lightbulb': return <Lightbulb className={className} />;
      case 'FolderPlus': return <FolderPlus className={className} />;
      case 'FileText': return <FileText className={className} />;
      case 'CheckCircle2': return <CheckCircle2 className={className} />;
      case 'Send': return <Send className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'Award': return <Award className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'BarChart2': return <BarChart2 className={className} />;
      case 'Sliders': return <Sliders className={className} />;
      case 'Brain': return <Brain className={className} />;
      default: return <Award className={className} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-black/[0.08] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
                Creator Journey
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs text-neutral-500">Verified Milestone Log</span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
              Progress & Achievements
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-xl">
              Track milestones unlocked strictly through your real production actions—zero fabricated numbers or vanity telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-neutral-500 font-mono">Milestones Unlocked</div>
              <div className="font-serif text-2xl font-normal text-[#1a1a1a]">
                {unlockedCount} <span className="text-sm text-neutral-400">/ {totalCount}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-[#eeeae3] border border-[#e2ddd4] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#d4a017]" />
            </div>
          </div>
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-neutral-600">
            <span>Overall Roadmap Completion</span>
            <span className="font-semibold text-[#1a1a1a]">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 overflow-hidden">
            <div 
              className="h-full bg-[#1a1a1a] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Milestone Graph & Achievement Timeline (Section 23 & 24) */}
        <div className="mt-6 pt-6 border-t border-black/[0.06] grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Milestone Graph (Col 1 - 7/12) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold">
                Milestone Progress Graph
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {milestoneEvents.length} recorded events
              </span>
            </div>

            {milestoneEvents.length === 0 ? (
              <div className="py-8 px-4 bg-[#f8f7f4] border border-black/[0.06] text-center">
                <Compass className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                <div className="font-serif text-lg font-normal text-[#1a1a1a]">
                  Your creator journey starts here.
                </div>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                  As you analyze topics, lock video ideas, build scripts, and publish packages, your verified milestones will plot here chronologically.
                </p>
              </div>
            ) : (
              <div className="bg-[#f8f7f4] border border-black/[0.06] p-4">
                <div className="h-32 flex items-end gap-2 pt-4 px-2">
                  {milestoneEvents.map((evt, idx) => {
                    const heightPct = Math.min(100, Math.max(25, ((idx + 1) / milestoneEvents.length) * 100));
                    return (
                      <div key={`${evt.id}_${idx}`} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a1a] text-[#f8f7f4] text-[10px] font-mono px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                          {evt.title} ({new Date(evt.date).toLocaleDateString()})
                        </div>
                        <div 
                          className="w-full bg-[#1a1a1a] hover:bg-[#d4a017] transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[9px] font-mono text-neutral-500 truncate max-w-full">
                          {new Date(evt.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-2 px-1 border-t border-black/[0.06] pt-1">
                  <span>First Action</span>
                  <span>Latest Progress</span>
                </div>
              </div>
            )}
          </div>

          {/* Achievement Timeline (Col 2 - 5/12) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block">
              Achievement Timeline
            </span>

            <div className="bg-[#f8f7f4] border border-black/[0.06] p-4 space-y-4">
              {/* Recently Unlocked / Today */}
              <div>
                <span className="font-mono text-[10px] uppercase text-[#d4a017] font-semibold tracking-wider block mb-1.5">
                  Completed Milestones
                </span>
                <div className="space-y-1.5">
                  {achievements.filter(a => a.isUnlocked).length === 0 ? (
                    <div className="text-xs text-neutral-400 italic">No milestones unlocked yet.</div>
                  ) : (
                    achievements.filter(a => a.isUnlocked).slice(0, 3).map(ach => (
                      <div key={ach.id} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                        <span className="text-[#d4a017] font-bold">✓</span>
                        <span className="truncate">{ach.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Milestones */}
              <div className="pt-3 border-t border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 font-semibold tracking-wider block mb-1.5">
                  Upcoming Milestones
                </span>
                <div className="space-y-1.5">
                  {achievements.filter(a => !a.isUnlocked).slice(0, 3).map(ach => (
                    <div key={ach.id} className="flex items-start gap-2 text-xs text-neutral-500">
                      <span className="text-neutral-400">○</span>
                      <span className="truncate">{ach.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Category Filter & Cards */}
      <div className="bg-white border border-black/[0.08] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-600">
            Catalog Milestones
          </span>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'Getting Started', 'Production', 'Consistency', 'Learning'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                    : 'text-neutral-600 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 border transition-all ${
                ach.isUnlocked
                  ? 'border-black/[0.08] bg-[#f8f7f4] shadow-xs'
                  : 'border-black/[0.05] bg-white opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-none border flex items-center justify-center shrink-0 ${
                  ach.isUnlocked ? 'bg-white border-black/[0.08]' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  {ach.isUnlocked ? getIcon(ach.iconName, true) : <Lock className="w-3.5 h-3.5 text-neutral-300" />}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif text-base font-normal text-[#1a1a1a] truncate">
                      {ach.title}
                    </span>
                    {ach.isUnlocked && (
                      <span className="text-[9px] font-mono text-[#d4a017] font-semibold uppercase">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 leading-snug line-clamp-2">
                    {ach.description}
                  </p>
                  <div className="text-[10px] font-mono text-neutral-400 pt-1">
                    {ach.isUnlocked && ach.unlockedAt ? (
                      `Unlocked on ${new Date(ach.unlockedAt).toLocaleDateString()}`
                    ) : (
                      'Action locked'
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
