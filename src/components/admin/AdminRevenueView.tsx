import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCcw, 
  Lock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { getRevenueMetrics } from '../../lib/adminAnalyticsService';

export const AdminRevenueView: React.FC = () => {
  const rev = getRevenueMetrics();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Revenue Analytics</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit recurring billings, ARR, payment health, and plan yield.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Payment Gateway: Disconnected
          </span>
        </div>
      </div>

      {/* Strict Policy Notice */}
      <div className="p-4 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-600 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-neutral-900">
          <Lock className="w-4 h-4 text-neutral-500" />
          <span>Real Payment Data Policy: No Client-Side Revenue Hallucination</span>
        </div>
        <p className="text-neutral-500 leading-relaxed">
          In compliance with architectural data standards, revenue, MRR, ARR, and payment settlement metrics must strictly stream from verified server-side payment webhooks (Stripe / Paddle). We deliberately do not compute or simulate financial revenue from frontend localStorage.
        </p>
      </div>

      {/* Top 4 Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">MRR</span>
          <div className="text-2xl font-bold text-neutral-900 mt-2">
            {rev.mrr !== null ? `$${rev.mrr.toLocaleString()}` : 'No data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Monthly Recurring Revenue</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">ARR</span>
          <div className="text-2xl font-bold text-neutral-900 mt-2">
            {rev.arr !== null ? `$${rev.arr.toLocaleString()}` : 'No data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Annualized Run Rate</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Revenue This Month</span>
          <div className="text-2xl font-bold text-neutral-900 mt-2">
            {rev.monthlyRevenue !== null ? `$${rev.monthlyRevenue.toLocaleString()}` : 'No data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Net recognized revenue</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Average Revenue Per User</span>
          <div className="text-2xl font-bold text-neutral-900 mt-2">
            {rev.arpu !== null ? `$${rev.arpu}` : 'No data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">ARPU (Paid users)</span>
        </div>
      </div>

      {/* Revenue Breakdown by Plan & Payment Transaction Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Revenue by Plan Tier</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Distribution of revenue contributions.</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { name: 'PRO Plan', key: 'pro' },
              { name: 'CREATOR Plan', key: 'creator' },
              { name: 'MAX Plan', key: 'max' },
            ].map((item) => (
              <div key={item.key} className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-800">{item.name}</span>
                <span className="text-neutral-500 font-mono">
                  {rev.revenueByPlan[item.key] !== null ? `$${rev.revenueByPlan[item.key]}` : 'No data yet'}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-500 flex justify-between">
            <span>Annual Plan Revenue:</span>
            <span className="font-mono text-neutral-700">
              {rev.annualPlanRevenue !== null ? `$${rev.annualPlanRevenue}` : 'No data yet'}
            </span>
          </div>
        </div>

        {/* Transaction & Settlement Health */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Payment Settlements & Churn</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Successful charges, failures, refunds, and cancellations.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-neutral-800">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Successful Payments
              </span>
              <span className="font-mono text-neutral-600">
                {rev.successfulPayments !== null ? rev.successfulPayments : 'No data yet'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-neutral-800">
                <XCircle className="w-4 h-4 text-rose-500" />
                Failed Payments
              </span>
              <span className="font-mono text-neutral-600">
                {rev.failedPayments !== null ? rev.failedPayments : 'No data yet'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-neutral-800">
                <RefreshCcw className="w-4 h-4 text-amber-500" />
                Refunds
              </span>
              <span className="font-mono text-neutral-600">
                {rev.refunds !== null ? rev.refunds : 'No data yet'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-neutral-800">
                <AlertTriangle className="w-4 h-4 text-neutral-400" />
                Cancelled Subscriptions
              </span>
              <span className="font-mono text-neutral-600">
                {rev.cancelledSubscriptions !== null ? rev.cancelledSubscriptions : 'No data yet'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
