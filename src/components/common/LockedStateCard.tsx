import React from 'react';
import { Lock, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { FeatureKey, getFeatureValueDescription, getUpgradePlan, PlanId } from '../../lib/planEntitlements';
import { Button } from '../ui/Button';

interface LockedStateCardProps {
  feature: FeatureKey;
  onUpgradeClick?: (targetPlan: PlanId) => void;
  compact?: boolean;
  className?: string;
  customTitle?: string;
  customDescription?: string;
  children?: React.ReactNode;
}

export const LockedStateCard: React.FC<LockedStateCardProps> = ({
  feature,
  onUpgradeClick,
  compact = false,
  className = '',
  customTitle,
  customDescription,
  children,
}) => {
  const meta = getFeatureValueDescription(feature);
  const title = customTitle || meta.title;
  const description = customDescription || meta.description;
  const targetPlan = meta.targetPlan;
  const isMax = targetPlan === 'max';

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick(targetPlan);
    } else {
      window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
    }
  };

  if (compact) {
    return (
      <div className={`p-4 rounded-md border border-dashed border-[#ded8cd] bg-[#f8f7f4] flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-[#eeeae3] text-[#d4a017] flex items-center justify-center shrink-0">
            {isMax ? <Zap className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-semibold text-[#d4a017]">
                {isMax ? `⚡ ${meta.badge}` : `🔒 ${meta.badge}`}
              </span>
              <span className="font-serif text-sm font-normal text-[#1a1a1a] truncate">{title}</span>
            </div>
            <p className="text-[11px] text-neutral-500 truncate mt-0.5">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUpgrade}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="text-[11px] font-mono uppercase tracking-wider shrink-0 h-8"
        >
          {`Upgrade to ${meta.badge}`}
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg border border-black/[0.08] bg-white overflow-hidden shadow-xs ${className}`}>
      {/* Optional Preview background with subtle blur */}
      {children && (
        <div className="filter blur-[1.5px] opacity-40 pointer-events-none select-none p-6">
          {children}
        </div>
      )}

      {/* Overlay Badge & Value Card */}
      <div className={`${children ? 'absolute inset-0 bg-white/85 backdrop-blur-[2px] flex items-center justify-center p-6' : 'p-6 sm:p-8'}`}>
        <div className="text-center max-w-md mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eeeae3] text-[#1a1a1a] border border-[#ded8cd] font-mono text-[10px] uppercase tracking-wider font-semibold">
            {isMax ? <Zap className="w-3 h-3 text-[#d4a017]" /> : <Lock className="w-3 h-3 text-[#d4a017]" />}
            <span>{isMax ? `⚡ Available in ${meta.badge}` : `🔒 Available in ${meta.badge}`}</span>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1a1a1a]">
            {title}
          </h3>

          <p className="text-xs text-neutral-600 leading-relaxed font-sans">
            {description}
          </p>

          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpgrade}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs font-mono uppercase tracking-wider shadow-xs"
            >
              {`Upgrade to ${meta.badge}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
