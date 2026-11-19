import React, { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { getStoredPlan, setStoredPlan, PlanId, PLAN_DEFINITIONS } from '../../lib/planEntitlements';
import { isAuthorizedOwner, getCurrentAccount, getAuthIdToken } from '../../lib/auth';
import { useToast } from '../ui/Toast';

export const DevPlanSwitcher: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanId>(() => getStoredPlan());
  const { toast } = useToast();

  // Strictly block DevPlanSwitcher unless running in local dev environment AND signed in as verified Owner
  const isDevEnv = import.meta.env.DEV;
  const isOwner = isAuthorizedOwner();

  useEffect(() => {
    const handlePlanChange = () => {
      setCurrentPlan(getStoredPlan());
    };
    window.addEventListener('creatorflow_plan_changed', handlePlanChange);
    return () => window.removeEventListener('creatorflow_plan_changed', handlePlanChange);
  }, []);

  if (!isDevEnv || !isOwner) {
    return null;
  }

  const handleSwitch = async (planId: PlanId) => {
    const account = getCurrentAccount();
    if (!account) {
      toast('Sign-In Required', 'Must be signed in as Owner to switch dev plans.', 'error');
      return;
    }

    try {
      const idToken = await getAuthIdToken();
      const res = await fetch('/api/dev/set-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          accountId: account.id,
          planId,
          status: 'active',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast('Plan Switch Denied', err.message || 'Server denied dev plan switch.', 'error');
        return;
      }

      setStoredPlan(planId);
      setCurrentPlan(planId);
      toast(
        'Plan Switched (Dev Mode)',
        `Active entitlement switched to ${PLAN_DEFINITIONS[planId].name} (${PLAN_DEFINITIONS[planId].position}).`,
        'info'
      );
    } catch {
      toast('Network Error', 'Failed to reach /api/dev/set-subscription.', 'error');
    }
  };

  const plans: PlanId[] = ['free', 'pro', 'creator', 'max', 'custom_annual'];

  return (
    <div className="p-3 bg-[#eeeae3] border border-[#ded8cd] rounded-lg text-xs font-mono space-y-2 select-none">
      <div className="flex items-center justify-between text-[11px] text-neutral-600">
        <div className="flex items-center gap-1.5 font-bold uppercase text-[#1a1a1a]">
          <Sliders className="w-3.5 h-3.5 text-[#d4a017]" />
          <span>Developer Plan Switcher</span>
        </div>
        <span className="text-[10px] text-neutral-400">Testing Environment</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {plans.map((p) => {
          const isCurrent = currentPlan === p;
          const meta = PLAN_DEFINITIONS[p];
          return (
            <button
              key={p}
              onClick={() => handleSwitch(p)}
              className={`px-2 py-1.5 rounded text-[11px] font-semibold transition-all text-center cursor-pointer ${
                isCurrent
                  ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-xs ring-1 ring-[#1a1a1a]'
                  : 'bg-white text-neutral-700 hover:bg-black/[0.04] border border-black/[0.06]'
              }`}
            >
              <div className="uppercase">{meta.name}</div>
              <div className="text-[9px] opacity-70 font-normal">₹{meta.priceMonthly}/mo</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
