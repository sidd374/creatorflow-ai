import React from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { PricingPlan } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface PricingCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
  isCurrent?: boolean;
  onSelect: (plan: PricingPlan) => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isAnnual,
  isCurrent = false,
  onSelect,
}) => {
  const price = isAnnual
    ? Math.round(plan.priceYearly / 12)
    : plan.priceMonthly;

  const isCreator = plan.id === 'creator';
  const isMax = plan.id === 'max';

  return (
    <Card
      className={`relative flex flex-col h-full bg-white transition-all duration-200 ${
        isCreator
          ? 'border-[#1a1a1a] shadow-[0_20px_40px_rgba(0,0,0,0.06)] ring-2 ring-[#1a1a1a]'
          : isMax
          ? 'border-[#d4a017] shadow-[0_20px_40px_rgba(212,160,23,0.06)] ring-1 ring-[#d4a017]'
          : 'border-black/[0.08] shadow-xs'
      }`}
    >
      {isCreator && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-[#f8f7f4] text-[10px] font-mono tracking-widest uppercase px-3 py-1 shadow-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#d4a017]" />
          <span>{plan.badge || 'Most Popular'}</span>
        </div>
      )}

      {isMax && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d4a017] text-white text-[10px] font-mono tracking-widest uppercase px-3 py-1 shadow-xs flex items-center gap-1 font-bold">
          <Zap className="w-3 h-3" />
          <span>Creator Powerhouse</span>
        </div>
      )}

      <CardContent className="p-6 sm:p-7 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">{plan.name}</h3>
            {plan.position && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] rounded font-semibold">
                {plan.position}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1 min-h-[36px] leading-relaxed font-sans">{plan.tagline}</p>
        </div>

        <div className="mb-5 pb-5 border-b border-black/[0.06] flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-serif font-normal text-[#1a1a1a] tracking-tight">
            {plan.currencySymbol}{price}
          </span>
          <span className="text-xs text-neutral-500 font-sans">
            / month
          </span>
          {isAnnual && plan.priceMonthly > 0 && (
            <span className="text-[11px] text-[#d4a017] font-mono ml-auto font-semibold">
              Billed ₹{plan.priceYearly}/yr
            </span>
          )}
        </div>

        <div className="flex-1 mb-6">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 block mb-2.5">
            What's included:
          </span>
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-neutral-600 leading-snug">
                <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant={isCreator || isMax ? 'primary' : 'outline'}
          size="md"
          className="w-full font-mono text-xs uppercase tracking-wider"
          disabled={isCurrent}
          onClick={() => onSelect(plan)}
        >
          {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Start Creating' : 'Request Early Access'}
        </Button>
        {!isCurrent && plan.id !== 'free' && (
          <p className="text-[10px] text-neutral-500 font-mono text-center mt-2.5 leading-tight">
            Preparing secure payments. Join the early-access list to be notified.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
