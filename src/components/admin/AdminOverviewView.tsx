import React, { useState } from 'react';
import { 
  Users, 
  Activity, 
  CreditCard, 
  DollarSign, 
  Percent, 
  TrendingDown, 
  Calendar,
  AlertCircle,
  Database,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { 
  getRegisteredUsersOverview, 
  getActiveUsersMetrics, 
  getPlanDistribution, 
  getPaidSubscribersMetrics, 
  getRevenueMetrics, 
  getChurnMetrics, 
  getUserGrowthData 
} from '../../lib/adminAnalyticsService';
import { AdminRetentionCard } from './AdminRetentionCard';

export const AdminOverviewView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const userOverview = getRegisteredUsersOverview();
  const activeMetrics = getActiveUsersMetrics();
  const planDist = getPlanDistribution();
  const paidMetrics = getPaidSubscribersMetrics();
  const revenueMetrics = getRevenueMetrics();
  const churnMetrics = getChurnMetrics();
  const growthData = getUserGrowthData(timeframe);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Executive Overview</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time platform metrics, registered user volume, and monetization health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            Live Snapshot
          </span>
        </div>
      </div>

      {/* Top-Level KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Total Users</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {userOverview.totalRegistered.toLocaleString()}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>New users today:</span>
              <span className="font-medium text-neutral-800">
                {userOverview.newUsersToday !== null ? userOverview.newUsersToday : 'No data yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>New users this month:</span>
              <span className="font-medium text-neutral-800">
                {userOverview.newUsersThisMonth !== null ? userOverview.newUsersThisMonth : 'No data yet'}
              </span>
            </div>
            {!userOverview.isBackendConnected && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200/60">
                Local device accounts only. SQL database not connected.
              </span>
            )}
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Active Users</span>
            <Activity className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {activeMetrics.hasTrackedActivity ? (
              <span>DAU: {activeMetrics.dau}</span>
            ) : (
              <span className="text-neutral-400 font-medium text-lg">No data yet</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>WAU (7 days):</span>
              <span className="font-medium text-neutral-800">
                {activeMetrics.wau !== null ? activeMetrics.wau : 'No data yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MAU (30 days):</span>
              <span className="font-medium text-neutral-800">
                {activeMetrics.mau !== null ? activeMetrics.mau : 'No data yet'}
              </span>
            </div>
            {!activeMetrics.hasTrackedActivity && (
              <span className="text-[10px] text-neutral-400 mt-1">
                Calculated from real event stream timestamps.
              </span>
            )}
          </div>
        </div>

        {/* Paid Subscribers */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Paid Subscribers</span>
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {paidMetrics.totalPaidSubscribers !== null ? (
              <span>{paidMetrics.totalPaidSubscribers}</span>
            ) : (
              <span className="text-neutral-400 font-medium text-lg">No data yet</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Share of total users:</span>
              <span className="font-medium text-neutral-800">
                {paidMetrics.paidPercentage !== null ? `${paidMetrics.paidPercentage}%` : 'No data yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Billing system:</span>
              <span className="font-medium text-neutral-400">Disconnected</span>
            </div>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {revenueMetrics.mrr !== null ? (
              <span>${revenueMetrics.mrr.toLocaleString()}</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-neutral-400 font-medium text-lg">No data yet</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>MoM Change:</span>
              <span className="font-medium text-neutral-400">
                {revenueMetrics.momChange !== null ? `${revenueMetrics.momChange}%` : 'Connect analytics'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200/60">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>Requires Stripe webhook connection. Revenue is never calculated from localStorage.</span>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Conversion Rate</span>
            <Percent className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {paidMetrics.paidPercentage !== null ? (
              <span>{paidMetrics.paidPercentage}%</span>
            ) : (
              <span className="text-neutral-400 font-medium text-lg">No data yet</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Free → Paid conversion:</span>
              <span className="font-medium text-neutral-800">
                {paidMetrics.paidPercentage !== null ? `${paidMetrics.paidPercentage}%` : 'No data yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MoM Change:</span>
              <span className="font-medium text-neutral-400">No data yet</span>
            </div>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Churn Rate</span>
            <TrendingDown className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {churnMetrics.churnRate !== null ? (
              <span>{churnMetrics.churnRate}%</span>
            ) : (
              <span className="text-neutral-400 font-medium text-lg">No data yet</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Cancelled this month:</span>
              <span className="font-medium text-neutral-800">
                {churnMetrics.cancelledThisMonth !== null ? churnMetrics.cancelledThisMonth : 'No data yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subscription status:</span>
              <span className="font-medium text-neutral-400">Connect payment provider</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: User Growth Chart & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Section (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">User Growth Over Time</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Total accounts, new registrations, and active users.
              </p>
            </div>
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80 text-xs font-medium">
              {(['7d', '30d', '90d', '12m'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timeframe === t
                      ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : '12 Months'}
                </button>
              ))}
            </div>
          </div>

          {growthData.hasTimeSeriesData ? (
            <div className="space-y-4">
              {/* SVG Line Chart */}
              <div className="h-56 w-full relative pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="45" x2="500" y2="45" stroke="#f0f0ef" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#f0f0ef" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="135" x2="500" y2="135" stroke="#f0f0ef" strokeDasharray="4 4" strokeWidth="1" />

                  {/* Polyline for Total Users */}
                  {(() => {
                    const maxVal = Math.max(...growthData.points.map((p) => p.totalUsers), 5);
                    const coords = growthData.points.map((p, idx) => {
                      const x = (idx / (growthData.points.length - 1 || 1)) * 500;
                      const y = 170 - (p.totalUsers / maxVal) * 140;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#171717"
                          strokeWidth="2.5"
                          points={coords}
                        />
                        {growthData.points.map((p, idx) => {
                          const x = (idx / (growthData.points.length - 1 || 1)) * 500;
                          const y = 170 - (p.totalUsers / maxVal) * 140;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r="3.5"
                              fill="#171717"
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono px-1">
                {growthData.points
                  .filter((_, idx) => idx % Math.ceil(growthData.points.length / 6) === 0)
                  .map((p, idx) => (
                    <span key={idx}>{p.label}</span>
                  ))}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 pt-2 border-t border-neutral-100 text-xs text-neutral-600 justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-900"></span>
                  <span>Total Users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-400"></span>
                  <span>Active Users</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-neutral-200 rounded-lg p-6 text-center bg-neutral-50/50">
              <Calendar className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs font-semibold text-neutral-700">No time-series data yet</p>
              <p className="text-[11px] text-neutral-500 max-w-sm mt-1">
                Real time-series points will plot automatically as client events and registrations accumulate across dates.
              </p>
              <div className="mt-3 px-2.5 py-1 rounded bg-neutral-100 text-[10px] font-mono text-neutral-600">
                Events currently in queue: {growthData.points.length}
              </div>
            </div>
          )}
        </div>

        {/* Plan Distribution Section (1 Column) */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Plan Distribution</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Share of accounts across tiers.</p>
              </div>
              <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                Total: {planDist.totalUsers}
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {planDist.plans.map((plan) => {
                const count = plan.count !== null ? plan.count : 'No data';
                const pct = plan.percentage !== null ? plan.percentage : 0;
                
                return (
                  <div key={plan.name} className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{plan.name}</span>
                        <span className="text-neutral-500 text-[11px]">
                          {plan.count !== null ? `${plan.count} users` : 'No data yet'}
                        </span>
                      </div>
                      <span className="font-bold text-neutral-900">
                        {plan.percentage !== null ? `${plan.percentage}%` : '—'}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-neutral-900 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span>Real distribution among known accounts on device. No mock data.</span>
          </div>
        </div>
      </div>

      {/* User Retention Section */}
      <AdminRetentionCard />
    </div>
  );
};
