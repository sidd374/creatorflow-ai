import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowUpDown, 
  Zap, 
  HelpCircle, 
  Filter, 
  Layers, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';
import { getFeaturePerformance, getUpgradeTriggerAnalytics } from '../../lib/adminAnalyticsService';
import { FeatureMetric } from '../../types/adminAnalytics';

type SortOption = 'most_used' | 'least_used' | 'highest_conversion' | 'highest_retention';

export const AdminFeaturePerformanceView: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>('most_used');
  const features = getFeaturePerformance();
  const upgradeTriggers = getUpgradeTriggerAnalytics();

  const sortedFeatures = [...features].sort((a, b) => {
    if (sortBy === 'most_used') {
      return (b.totalUses || 0) - (a.totalUses || 0);
    }
    if (sortBy === 'least_used') {
      return (a.totalUses || 0) - (b.totalUses || 0);
    }
    if (sortBy === 'highest_conversion') {
      return (b.conversionAfterUseRate || 0) - (a.conversionAfterUseRate || 0);
    }
    if (sortBy === 'highest_retention') {
      return (b.repeatUsersCount || 0) - (a.repeatUsersCount || 0);
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Feature Performance</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Identify which CreatorFlow features drive actual stickiness and convert free users into paid subscribers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-neutral-500">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs font-semibold bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none shadow-xs"
          >
            <option value="most_used">Most Used</option>
            <option value="least_used">Least Used</option>
            <option value="highest_conversion">Highest Conversion</option>
            <option value="highest_retention">Highest Repeat Retention</option>
          </select>
        </div>
      </div>

      {/* Special Upgrade Trigger Section */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold tracking-tight">What makes users upgrade?</h3>
        </div>
        <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
          Tracks the last major action completed immediately prior to a creator upgrading to a paid subscription (Pro, Creator, MAX).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {upgradeTriggers.map((trig) => (
            <div key={trig.featureId} className="bg-white/10 backdrop-blur-xs p-3.5 rounded-lg border border-white/10">
              <span className="text-xs font-medium text-neutral-300 block">{trig.featureName}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-white">
                  {trig.upgradeRate !== null ? `${trig.upgradeRate}%` : 'No data yet'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {trig.upgradeCount !== null ? `${trig.upgradeCount} upgrades` : '0 upgrades'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Performance Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Feature Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Users Using Feature</th>
                <th className="py-3 px-4">Total Uses</th>
                <th className="py-3 px-4">Repeat Creators</th>
                <th className="py-3 px-4">Conversion After Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedFeatures.map((feat) => (
                <tr key={feat.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-neutral-900">
                    {feat.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {feat.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-800">
                    {feat.usersCount !== null ? feat.usersCount : 'No data yet'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-neutral-900">
                    {feat.totalUses !== null ? feat.totalUses : 'No data yet'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-800">
                    {feat.repeatUsersCount !== null ? feat.repeatUsersCount : 'No data yet'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                    {feat.conversionAfterUseRate !== null ? `${feat.conversionAfterUseRate}%` : 'No data yet'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
