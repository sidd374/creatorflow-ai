import React from 'react';
import { 
  Users, 
  RotateCcw, 
  UserCheck, 
  Calendar, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { getUserRetentionStats } from '../../lib/adminAnalyticsService';

export const AdminRetentionCard: React.FC = () => {
  const retention = getUserRetentionStats();

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Creator Retention & Loyalty</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cohort retention curves, repeat creator return rates, and activity frequency.
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 self-start sm:self-auto">
          Cohort Tracking
        </span>
      </div>

      {/* Retention Rates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3.5 rounded-lg border border-neutral-100 bg-neutral-50/60">
          <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Day 1 Retention</span>
          <div className="text-xl font-bold text-neutral-900 mt-1">
            {retention.day1Retention !== null ? `${retention.day1Retention}%` : 'Not enough data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Creators returning within 24h</span>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-100 bg-neutral-50/60">
          <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Day 7 Retention</span>
          <div className="text-xl font-bold text-neutral-900 mt-1">
            {retention.day7Retention !== null ? `${retention.day7Retention}%` : 'Not enough data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Creators active after 1 week</span>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-100 bg-neutral-50/60">
          <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Day 30 Retention</span>
          <div className="text-xl font-bold text-neutral-900 mt-1">
            {retention.day30Retention !== null ? `${retention.day30Retention}%` : 'Not enough data yet'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Sustained monthly retention</span>
        </div>
      </div>

      {/* One-time vs Returning breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/40">
          <span className="text-[10px] text-neutral-500 uppercase font-semibold block">One-time Users</span>
          <span className="text-base font-bold text-neutral-900 mt-0.5 block">
            {retention.oneTimeUsers !== null ? retention.oneTimeUsers : 'No data yet'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/40">
          <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Returning Users</span>
          <span className="text-base font-bold text-neutral-900 mt-0.5 block">
            {retention.returningUsers !== null ? retention.returningUsers : 'No data yet'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/40">
          <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Weekly Active</span>
          <span className="text-base font-bold text-neutral-900 mt-0.5 block">
            {retention.weeklyActiveCreators !== null ? retention.weeklyActiveCreators : 'No data yet'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/40">
          <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Monthly Active</span>
          <span className="text-base font-bold text-neutral-900 mt-0.5 block">
            {retention.monthlyActiveCreators !== null ? retention.monthlyActiveCreators : 'No data yet'}
          </span>
        </div>
      </div>

      {/* Cohort Visualization or Insufficient Data State */}
      {retention.hasEnoughData && retention.cohorts.length > 0 ? (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400 font-semibold text-[10px] uppercase">
                <th className="py-2">Cohort</th>
                <th className="py-2">Users</th>
                <th className="py-2">Day 1</th>
                <th className="py-2">Day 7</th>
                <th className="py-2">Day 30</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {retention.cohorts.map((c) => (
                <tr key={c.cohortDate}>
                  <td className="py-2 font-mono font-medium">{c.cohortDate}</td>
                  <td className="py-2">{c.usersCount}</td>
                  <td className="py-2">{c.day1Rate !== null ? `${c.day1Rate}%` : '—'}</td>
                  <td className="py-2">{c.day7Rate !== null ? `${c.day7Rate}%` : '—'}</td>
                  <td className="py-2">{c.day30Rate !== null ? `${c.day30Rate}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 text-center">
          <p className="text-xs font-semibold text-neutral-600">Not enough data yet</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Retention cohorts require continuous multi-week active creator sessions. Metrics update dynamically as creator return sessions are logged.
          </p>
        </div>
      )}
    </div>
  );
};
