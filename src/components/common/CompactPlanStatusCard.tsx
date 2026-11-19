import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, ArrowRight, Layers, ShieldCheck, Zap } from 'lucide-react';
import { 
  getStoredPlan, 
  PLAN_DEFINITIONS, 
  getUsageCounters, 
  getLimit, 
  PlanId 
} from '../../lib/planEntitlements';
import { checkWeeklyVideoQuota, WeeklyQuotaStatus } from '../../lib/videoQuota';
import { Button } from '../ui/Button';

interface CompactPlanStatusCardProps {
  onManagePlan?: () => void;
  className?: string;
}

export const CompactPlanStatusCard: React.FC<CompactPlanStatusCardProps> = ({
  onManagePlan,
  className = '',
}) => {
  const [currentPlan, setCurrentPlan] = useState<PlanId>(() => getStoredPlan());
  const [usage, setUsage] = useState(() => getUsageCounters());
  const [weeklyQuota, setWeeklyQuota] = useState<WeeklyQuotaStatus>(() => checkWeeklyVideoQuota());

  useEffect(() => {
    const handlePlanChange = () => {
      setCurrentPlan(getStoredPlan());
      setUsage(getUsageCounters());
      setWeeklyQuota(checkWeeklyVideoQuota());
    };
    const handleQuotaChange = () => {
      setWeeklyQuota(checkWeeklyVideoQuota());
    };
    window.addEventListener('creatorflow_plan_changed', handlePlanChange);
    window.addEventListener('creatorflow_weekly_quota_changed', handleQuotaChange);
    return () => {
      window.removeEventListener('creatorflow_plan_changed', handlePlanChange);
      window.removeEventListener('creatorflow_weekly_quota_changed', handleQuotaChange);
    };
  }, []);

  const planMeta = PLAN_DEFINITIONS[currentPlan];
  const channelLimit = getLimit('channels', currentPlan);
  const isFree = currentPlan === 'free';
  const isMax = currentPlan === 'max';

  const handleAction = () => {
    if (onManagePlan) {
      onManagePlan();
    } else {
      window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
    }
  };

  return (
    <div className={`p-4 rounded-lg border border-black/[0.08] bg-white shadow-xs select-none ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#eeeae3] text-[#d4a017] flex items-center justify-center font-bold text-xs">
            {isMax ? <Zap className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-sm font-semibold text-[#1a1a1a]">
                CreatorFlow {planMeta.name}
              </span>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[#eeeae3] text-[#1a1a1a] rounded">
                {planMeta.badge}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleAction}
          className="text-[11px] font-mono uppercase font-semibold text-[#d4a017] hover:text-[#b8890f] hover:underline cursor-pointer"
        >
          {isFree ? 'Upgrade' : 'Manage'}
        </button>
      </div>

      {/* Real Usage Meters */}
      <div className="space-y-1.5 pt-2 border-t border-black/[0.04] text-[11px] font-mono text-neutral-600">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">{isFree ? 'Weekly Quota:' : 'Video Quota:'}</span>
          <span className="font-medium text-[#1a1a1a]">
            {weeklyQuota.used} / {weeklyQuota.limit === 'unlimited' ? '∞' : weeklyQuota.limit} {isFree ? 'videos/wk' : 'this month'}
          </span>
        </div>
        {weeklyQuota.resetsInFormatted && weeklyQuota.used > 0 && (
          <div className="flex items-center justify-between text-[10px] text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded">
            <span>Next reset:</span>
            <span className="font-semibold">{weeklyQuota.resetsInFormatted}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Channel Slots:</span>
          <span className="font-medium text-[#1a1a1a]">
            1 / {channelLimit === 'unlimited' ? '∞' : channelLimit} active
          </span>
        </div>
      </div>
    </div>
  );
};
