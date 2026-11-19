import React from 'react';
import { 
  Users, 
  Activity, 
  GitFork, 
  Compass, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Film,
  Lock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { AnalyticsDateRange, OwnerOverviewMetrics } from '../../types/ownerAnalytics';

interface OwnerOverviewTabProps {
  metrics: OwnerOverviewMetrics;
  dateRange: AnalyticsDateRange;
}

export const OwnerOverviewTab: React.FC<OwnerOverviewTabProps> = ({ metrics, dateRange }) => {
  const rangeLabelMap = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    custom: 'Custom Range',
  };

  // If there are zero accounts and zero events, display honest empty state per user request
  if (!metrics.hasEnoughData && metrics.totalAccounts === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm my-6">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-neutral-900 mb-2">
          CreatorFlow Analytics
        </h3>
        <p className="font-medium text-neutral-700 text-sm mb-4">
          No product activity yet.
        </p>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed mb-6">
          Once creators start using CreatorFlow, this dashboard will show real metrics:
        </p>
        <div className="bg-neutral-50 rounded-xl p-4 text-left max-w-sm mx-auto text-xs text-neutral-700 space-y-2 border border-neutral-200/80">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>User growth &amp; registered accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>Product engagement (ideas, projects, creation kits)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>Workflow progression &amp; funnel drop-offs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>Feature usage frequency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>Account retention cohorts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            <span>Product error diagnostics</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Product Intelligence Overview
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real usage and conversion telemetry for <span className="font-semibold text-neutral-700">{rangeLabelMap[dateRange]}</span>.
          </p>
        </div>
      </div>

      {/* SECTION 1: USERS METRICS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <span>User Accounts &amp; Distribution</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-500 block uppercase">Total Accounts</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1">{metrics.totalAccounts}</div>
            <span className="text-[11px] text-neutral-400 block mt-1">Registered account identities</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-500 block uppercase">Active Users</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1">
              {metrics.activeUsers > 0 ? metrics.activeUsers : 'No data yet'}
            </div>
            <span className="text-[11px] text-neutral-400 block mt-1">Accounts active in selected window</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-500 block uppercase">Returning Users</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1">
              {metrics.returningUsers > 0 ? metrics.returningUsers : 'No data yet'}
            </div>
            <span className="text-[11px] text-neutral-400 block mt-1">Active on multiple distinct dates</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-500 block uppercase">New Accounts</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1">
              {metrics.newAccounts > 0 ? metrics.newAccounts : 'No data yet'}
            </div>
            <span className="text-[11px] text-neutral-400 block mt-1">Created within timeframe</span>
          </div>
        </div>

        {/* Plan Breakdown Chips */}
        <div className="mt-3 bg-white rounded-xl border border-neutral-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-neutral-600 text-xs">Plan Breakdown:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-medium">
              Free: <strong className="text-neutral-900">{metrics.planBreakdown.free}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-medium border border-blue-200/60">
              Pro: <strong className="text-blue-900">{metrics.planBreakdown.pro}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-medium border border-purple-200/60">
              Creator: <strong className="text-purple-900">{metrics.planBreakdown.creator}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200/60">
              MAX: <strong className="text-amber-900">{metrics.planBreakdown.max}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: ENGAGEMENT METRICS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
          <span>Core Product Engagement</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Ideas</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.ideasGenerated}</span>
            <span className="text-[10px] text-neutral-500">Generated</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Projects</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.projectsCreated}</span>
            <span className="text-[10px] text-neutral-500">Created</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Creation Kits</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.creationKitsCreated}</span>
            <span className="text-[10px] text-neutral-500">Generated</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Prompts</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.promptsCopied}</span>
            <span className="text-[10px] text-neutral-500">Copied</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Publishing</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.publishingStarted}</span>
            <span className="text-[10px] text-neutral-500">Initiated</span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Completed</span>
            <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{metrics.projectsCompleted}</span>
            <span className="text-[10px] text-neutral-500">Workflows</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: CONVERSION & RETENTION MATRICES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Progression */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-neutral-700" />
              <span>Conversion Milestones</span>
            </h4>
            <span className="text-[11px] font-mono text-neutral-400">Step Progression</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">Signup → Onboarding Complete</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.signupToOnboarding !== null ? `${metrics.conversion.signupToOnboarding}%` : 'Not enough data'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">Onboarding → First Idea Generated</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.onboardingToFirstIdea !== null ? `${metrics.conversion.onboardingToFirstIdea}%` : 'Not enough data'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">First Idea → First Project Created</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.firstIdeaToFirstProject !== null ? `${metrics.conversion.firstIdeaToFirstProject}%` : 'Not enough data'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">First Project → Creation Kit Generated</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.firstProjectToCreationKit !== null ? `${metrics.conversion.firstProjectToCreationKit}%` : 'Not enough data'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">Creation Kit → Upgrade Page Viewed</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.creationKitToUpgrade !== null ? `${metrics.conversion.creationKitToUpgrade}%` : 'Not enough data'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-700">Upgrade Page Viewed → Paid Plan</span>
              <span className="font-mono font-bold text-neutral-900">
                {metrics.conversion.upgradeToPaid !== null ? `${metrics.conversion.upgradeToPaid}%` : 'Not enough data'}
              </span>
            </div>
          </div>
        </div>

        {/* Retention & Revenue Policy */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-700" />
              <span>Account Retention (Day 1, 7, 30)</span>
            </h4>
            <p className="text-xs text-neutral-500">
              Measured by real return logins relative to initial account registration.
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 bg-neutral-50 rounded-lg text-center border border-neutral-100">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Day 1</span>
                <span className="text-base font-bold text-neutral-900 mt-1 block">
                  {metrics.retention.day1 !== null ? `${metrics.retention.day1}%` : 'Not enough data'}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg text-center border border-neutral-100">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Day 7</span>
                <span className="text-base font-bold text-neutral-900 mt-1 block">
                  {metrics.retention.day7 !== null ? `${metrics.retention.day7}%` : 'Not enough data'}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg text-center border border-neutral-100">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Day 30</span>
                <span className="text-base font-bold text-neutral-900 mt-1 block">
                  {metrics.retention.day30 !== null ? `${metrics.retention.day30}%` : 'Not enough data'}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Policy Card */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200/80 p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Revenue Analytics Notice</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Revenue analytics unavailable until payment integration is enabled. Cashfree checkout and webhooks are intentionally postponed; zero fake billing numbers are displayed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
