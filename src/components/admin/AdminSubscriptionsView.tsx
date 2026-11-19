import React from 'react';
import { 
  CreditCard, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Zap,
  Layers
} from 'lucide-react';
import { getSubscriptionAnalytics } from '../../lib/adminAnalyticsService';

export const AdminSubscriptionsView: React.FC = () => {
  const subAnalytics = getSubscriptionAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Subscription Analytics</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor plan tier velocity, upgrades, downgrades, churn, and tier transition funnels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
            Payment Webhook: Disconnected
          </span>
        </div>
      </div>

      {/* Subscription Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">New Subs</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.newSubscriptions !== null ? subAnalytics.newSubscriptions : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Upgrades</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.upgrades !== null ? subAnalytics.upgrades : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Downgrades</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.downgrades !== null ? subAnalytics.downgrades : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Cancellations</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.cancellations !== null ? subAnalytics.cancellations : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Renewals</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.renewals !== null ? subAnalytics.renewals : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Active Subs</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.activeSubscriptions !== null ? subAnalytics.activeSubscriptions : 'No data yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">Expired Subs</span>
          <div className="text-lg font-bold text-neutral-900 mt-1">
            {subAnalytics.expiredSubscriptions !== null ? subAnalytics.expiredSubscriptions : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Conversion Paths Visualization */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Subscription Conversion Paths</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Breakdown of creators moving up across CreatorFlow tiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {subAnalytics.conversionPaths.map((item) => (
            <div key={item.path} className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-neutral-500" />
                  {item.path}
                </span>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-neutral-900">
                    {item.count !== null ? `${item.count} users` : 'No data yet'}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {item.percentage !== null ? `${item.percentage}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-neutral-900 h-full rounded-full" 
                  style={{ width: `${item.percentage || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-lg text-xs text-neutral-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <span>
            Conversion paths are populated in real time as creators complete checkout sessions or downgrade memberships.
          </span>
        </div>
      </div>
    </div>
  );
};
