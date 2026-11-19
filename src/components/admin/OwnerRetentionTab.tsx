import React from 'react';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Repeat, 
  History 
} from 'lucide-react';
import { RetentionAnalysisData, AnalyticsDateRange } from '../../types/ownerAnalytics';

interface OwnerRetentionTabProps {
  retention: RetentionAnalysisData;
  dateRange: AnalyticsDateRange;
}

export const OwnerRetentionTab: React.FC<OwnerRetentionTabProps> = ({
  retention,
  dateRange,
}) => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Account Retention &amp; Cohort Analytics
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real return rates measured by authenticated account activity 1 day, 7 days, and 30 days post-acquisition.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 self-start sm:self-auto font-mono">
          {retention.totalTrackedAccounts} Tracked Accounts
        </div>
      </div>

      {/* HONEST EMPTY/INSUFFICIENT DATA BANNER (AS REQUIRED BY SPEC) */}
      {!retention.hasEnoughHistoricalData ? (
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 sm:p-10 shadow-2xs space-y-4 text-center max-w-2xl mx-auto my-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-neutral-900">
            Not enough historical data to calculate retention cohorts
          </h3>
          <p className="text-xs text-neutral-600 max-w-lg mx-auto leading-relaxed">
            CreatorFlow calculates true retention based on actual account activity over elapsed 24-hour, 7-day, and 30-day intervals. Synthesized cohorts and fake curves are never fabricated. Once creator accounts mature past their initial 24 hours of existence, cohort maturation will appear automatically.
          </p>

          <div className="bg-neutral-50 rounded-xl p-4 text-left text-xs text-neutral-700 border border-neutral-200/80 space-y-2 mt-4">
            <div className="font-semibold text-neutral-900 mb-1">Retention Methodology:</div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-neutral-400 font-bold">D1:</span>
              <span>Account returned and logged an event between 24 and 48 hours after creation.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-neutral-400 font-bold">D7:</span>
              <span>Account returned and performed workflow actions between Day 1 and Day 7.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-neutral-400 font-bold">D30:</span>
              <span>Account remained active up to 30 days post initial registration.</span>
            </div>
          </div>
        </div>
      ) : (
        /* RETENTION CARDS WHEN MATURED DATA EXISTS */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Day 1 Retention</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="font-mono text-3xl font-bold text-neutral-900">
              {retention.day1Rate !== null ? `${retention.day1Rate}%` : 'Maturity Pending'}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Returned within 24–48 hours</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Day 7 Retention</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="font-mono text-3xl font-bold text-neutral-900">
              {retention.day7Rate !== null ? `${retention.day7Rate}%` : 'Maturity Pending'}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Returned within 7 days</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Day 30 Retention</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="font-mono text-3xl font-bold text-neutral-900">
              {retention.day30Rate !== null ? `${retention.day30Rate}%` : 'Maturity Pending'}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Returned within 30 days</p>
          </div>
        </div>
      )}

      {/* COHORT MATRIX TABLE (ONLY WHEN MATURED) */}
      {retention.hasEnoughHistoricalData && retention.cohorts.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-700" />
              <h3 className="font-bold text-sm text-neutral-900 font-serif">
                Acquisition Cohort Matrix
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {retention.cohorts.length} Cohort Groups
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 font-sans">Acquisition Cohort</th>
                  <th className="py-2.5 px-3 text-center">Acquired</th>
                  <th className="py-2.5 px-3 text-center">Day 1 Retained</th>
                  <th className="py-2.5 px-3 text-center">Day 7 Retained</th>
                  <th className="py-2.5 px-3 text-center">Day 30 Retained</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {retention.cohorts.map((cohort) => (
                  <tr key={cohort.cohortDate} className="hover:bg-neutral-50/70">
                    <td className="py-2.5 px-4 font-sans font-semibold text-neutral-900">
                      {cohort.cohortDate}
                    </td>
                    <td className="py-2.5 px-3 text-center text-neutral-700 font-bold">
                      {cohort.usersAcquired}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {cohort.day1Rate !== null ? (
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                          {cohort.day1Rate}% ({cohort.day1Count})
                        </span>
                      ) : (
                        <span className="text-neutral-400">Maturity Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {cohort.day7Rate !== null ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                          {cohort.day7Rate}% ({cohort.day7Count})
                        </span>
                      ) : (
                        <span className="text-neutral-400">Maturity Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {cohort.day30Rate !== null ? (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                          {cohort.day30Rate}% ({cohort.day30Count})
                        </span>
                      ) : (
                        <span className="text-neutral-400">Maturity Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACCOUNT SESSION FREQUENCY DISTRIBUTION */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-sm text-neutral-900 font-serif">
              Creator Visit &amp; Activity Frequency Distribution
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            All-Time Activity Cycles
          </span>
        </div>

        <p className="text-xs text-neutral-500">
          Distribution of how many distinct working sessions or activity bursts creators have logged in CreatorFlow.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">Single Session</span>
            <span className="font-mono text-2xl font-bold text-neutral-900 block mt-1">
              {retention.frequencyDistribution.singleVisit}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">1 active visit</span>
          </div>

          <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">Occasional</span>
            <span className="font-mono text-2xl font-bold text-neutral-900 block mt-1">
              {retention.frequencyDistribution.twoToFiveVisits}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">2–5 active visits</span>
          </div>

          <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">Regular Creators</span>
            <span className="font-mono text-2xl font-bold text-neutral-900 block mt-1">
              {retention.frequencyDistribution.sixToFifteenVisits}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">6–15 active visits</span>
          </div>

          <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">Power Creators</span>
            <span className="font-mono text-2xl font-bold text-neutral-900 block mt-1">
              {retention.frequencyDistribution.moreThanFifteenVisits}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">16+ active visits</span>
          </div>
        </div>
      </div>
    </div>
  );
};
