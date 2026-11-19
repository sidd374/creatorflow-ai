import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowUpDown, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  Info 
} from 'lucide-react';
import { FeaturePerformanceData } from '../../types/ownerAnalytics';

interface OwnerFeaturesTabProps {
  features: FeaturePerformanceData[];
}

type FeatureSort = 'most_used' | 'least_used' | 'highest_upgrade_rate' | 'highest_repeat';

export const OwnerFeaturesTab: React.FC<OwnerFeaturesTabProps> = ({ features }) => {
  const [sortKey, setSortKey] = useState<FeatureSort>('most_used');

  const sortedFeatures = [...features].sort((a, b) => {
    if (sortKey === 'most_used') return b.totalUses - a.totalUses;
    if (sortKey === 'least_used') return a.totalUses - b.totalUses;
    if (sortKey === 'highest_upgrade_rate') return (b.upgradeAfterUseRate || 0) - (a.upgradeAfterUseRate || 0);
    if (sortKey === 'highest_repeat') return b.repeatUsers - a.repeatUsers;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            CreatorFlow Feature Performance
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real usage and upgrade correlation across built-in production and strategy capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-neutral-500">Sort by:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as FeatureSort)}
            className="text-xs font-semibold bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none"
          >
            <option value="most_used">Most Used</option>
            <option value="least_used">Least Used</option>
            <option value="highest_upgrade_rate">Highest Upgrade Rate</option>
            <option value="highest_repeat">Highest Repeat Creators</option>
          </select>
        </div>
      </div>

      {/* Attribution & Correlation Disclaimer */}
      <div className="p-3.5 bg-neutral-100 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Statistical Transparency: </strong>
          <span>
            Metric labeled as <em>Upgrade rate among users who used this feature</em> reflects historical correlation, not verified sole causation.
          </span>
        </div>
      </div>

      {/* Features Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Unique Creators</th>
                <th className="py-3 px-3 text-center">Total Uses</th>
                <th className="py-3 px-3 text-center">Repeat Users</th>
                <th className="py-3 px-3 text-center">Usage Rate</th>
                <th className="py-3 px-4 text-right">Upgrade Rate After Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedFeatures.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {f.name}
                  </td>
                  <td className="py-3 px-3 text-neutral-500">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-700">
                      {f.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-neutral-900">
                    {f.uniqueUsers}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-neutral-800">
                    {f.totalUses}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-neutral-700">
                    {f.repeatUsers}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-neutral-700">
                    {f.usageRate !== null ? `${f.usageRate}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                    {f.upgradeAfterUseRate !== null ? `${f.upgradeAfterUseRate}%` : 'Not enough data'}
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
