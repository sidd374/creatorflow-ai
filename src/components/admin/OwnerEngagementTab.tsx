import React from 'react';
import { 
  Activity, 
  Lightbulb, 
  Film, 
  FolderPlus, 
  Copy, 
  Send, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Crown,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { AnalyticsDateRange, EngagementDetails } from '../../types/ownerAnalytics';

interface OwnerEngagementTabProps {
  engagement: EngagementDetails;
  dateRange: AnalyticsDateRange;
}

export const OwnerEngagementTab: React.FC<OwnerEngagementTabProps> = ({
  engagement,
  dateRange,
}) => {
  const rangeLabelMap = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    custom: 'Custom Range',
  };

  if (!engagement.hasData) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm my-6">
        <div className="w-12 h-12 bg-neutral-100 rounded-xl text-neutral-600 flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-neutral-900 mb-1">
          No Engagement Data Yet
        </h3>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          As creators log in, generate video ideas, build Creation Kits, and advance projects, real engagement telemetry will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Product Engagement Telemetry
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real creative actions and production depth across active creators for{' '}
            <span className="font-semibold text-neutral-700">{rangeLabelMap[dateRange]}</span>.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 self-start sm:self-auto font-mono">
          {engagement.activeCreatorsCount} Active Creators
        </div>
      </div>

      {/* CORE PRODUCTION ENGAGEMENT COUNTERS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
          <span>Core Creative Production Output</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Ideas Generated</span>
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.ideasGenerated}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Topic ideations</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Projects Created</span>
              <FolderPlus className="w-4 h-4 text-sky-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.projectsCreated}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Active workspaces</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Creation Kits</span>
              <Layers className="w-4 h-4 text-violet-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.creationKitsCreated}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Production packs</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Prompts Copied</span>
              <Copy className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.promptsCopied}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Exported to AI tools</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Publishing Started</span>
              <Send className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.publishingStarted}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Distribution flow</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[11px] font-medium">Completed Projects</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900">
              {engagement.projectsCompleted}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">End-to-end videos</p>
          </div>
        </div>
      </div>

      {/* ACTIVE VS PASSIVE & PLAN ENGAGEMENT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIVE CREATORS VS PASSIVE CREATORS */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-700" />
              <h3 className="font-bold text-sm text-neutral-900 font-serif">
                Active Creators vs Passive Creators
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-neutral-500">
              {engagement.activeCreatorRatioPct !== null ? `${engagement.activeCreatorRatioPct}% Active` : 'No data'}
            </span>
          </div>

          <p className="text-xs text-neutral-500">
            Active creators produce ideas, scripts, Creation Kits, and video projects. Passive accounts view or browse without creating content.
          </p>

          {/* Visual Ratio Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-neutral-900 h-full transition-all duration-300" 
                style={{ width: `${engagement.activeCreatorRatioPct || 0}%` }}
                title="Active Creators"
              />
              <div 
                className="bg-amber-400 h-full transition-all duration-300" 
                style={{ width: `${100 - (engagement.activeCreatorRatioPct || 0)}%` }}
                title="Passive Accounts"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-900"></span>
                <span>Active: <strong>{engagement.activeCreatorsCount}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Passive: <strong>{engagement.passiveCreatorsCount}</strong></span>
              </span>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200/80 text-[11px] text-neutral-600 leading-relaxed">
            <strong>Product Insight: </strong>
            {engagement.activeCreatorRatioPct && engagement.activeCreatorRatioPct > 60
              ? 'High activation rate. Creators are diving directly into creation tools upon sign-in.'
              : 'Encourage early activation by pointing passive creators to 1-click idea generation.'}
          </div>
        </div>

        {/* MOST ENGAGED PLAN TIER */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-neutral-900 font-serif">
                Engagement by Plan Tier
              </h3>
            </div>
            {engagement.mostEngagedPlanTier && (
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                Top: {engagement.mostEngagedPlanTier.toUpperCase()}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px] font-mono">
                  <th className="pb-2">Plan</th>
                  <th className="pb-2 text-right">Creators</th>
                  <th className="pb-2 text-right">Actions</th>
                  <th className="pb-2 text-right">Avg Actions / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-xs">
                {engagement.planEngagement.map((row) => (
                  <tr key={row.plan} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 font-sans font-semibold text-neutral-800 capitalize flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        row.plan === 'max' ? 'bg-purple-600' :
                        row.plan === 'creator' ? 'bg-indigo-600' :
                        row.plan === 'pro' ? 'bg-sky-600' : 'bg-neutral-400'
                      }`} />
                      {row.plan.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 text-right text-neutral-700">{row.userCount}</td>
                    <td className="py-2.5 text-right text-neutral-700">{row.totalEvents}</td>
                    <td className="py-2.5 text-right font-bold text-neutral-900">
                      {row.avgEventsPerUser}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DAILY ACTIVE ENGAGEMENT TIMELINE */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-sm text-neutral-900 font-serif">
              Daily Active Engagement Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {engagement.dailyTimeline.length} Recorded Active Days
          </span>
        </div>

        {engagement.dailyTimeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No daily telemetry events logged yet for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 text-center">Active Creators</th>
                  <th className="py-2.5 px-3 text-center">Ideas Generated</th>
                  <th className="py-2.5 px-3 text-center">Creation Kits</th>
                  <th className="py-2.5 px-3 text-center">Projects Created</th>
                  <th className="py-2.5 px-4 text-right">Total Event Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {engagement.dailyTimeline.map((day) => (
                  <tr key={day.date} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900">{day.date}</td>
                    <td className="py-2.5 px-3 text-center text-neutral-700">{day.activeAccounts}</td>
                    <td className="py-2.5 px-3 text-center text-amber-700">{day.ideas}</td>
                    <td className="py-2.5 px-3 text-center text-violet-700">{day.kits}</td>
                    <td className="py-2.5 px-3 text-center text-sky-700">{day.projects}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-neutral-900">{day.totalEvents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
