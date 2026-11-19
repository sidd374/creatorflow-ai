import React, { useState, useEffect } from 'react';
import { Check, HelpCircle, ShieldCheck, Zap, Sparkles, Sliders, Info } from 'lucide-react';
import { PricingPlan } from '../../types';
import { PRICING_PLANS } from '../../data/mockData';
import { PricingCard } from '../common/PricingCard';
import { CustomAnnualPlanBuilder } from '../common/CustomAnnualPlanBuilder';
import { DevPlanSwitcher } from '../common/DevPlanSwitcher';
import { PlanUpgradeModal } from '../common/PlanUpgradeModal';
import { 
  getStoredPlan, 
  setStoredPlan, 
  PlanId, 
  PLAN_DEFINITIONS 
} from '../../lib/planEntitlements';
import { useToast } from '../ui/Toast';
import { trackEvent } from '../../lib/analyticsService';
import { getAuthIdToken, getCurrentAccount } from '../../lib/auth';

interface PricingViewProps {
  onNavigate?: (view: string) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigate }) => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>(() => getStoredPlan());
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<PlanId | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handlePlanChange = () => {
      setCurrentPlanId(getStoredPlan());
    };
    window.addEventListener('creatorflow_plan_changed', handlePlanChange);
    return () => window.removeEventListener('creatorflow_plan_changed', handlePlanChange);
  }, []);

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (plan.id === currentPlanId) {
      toast('Active Plan', `You are currently on the ${plan.name} plan.`, 'info');
      return;
    }

    trackEvent('checkout_started', {
      plan: plan.id,
      properties: { targetPlan: plan.name, isAnnual },
    });

    // If downgrading to free, cancel server subscription authoritatively
    if (plan.id === 'free') {
      const account = getCurrentAccount();
      const idToken = await getAuthIdToken();
      if (account && idToken) {
        try {
          await fetch('/api/subscription/cancel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ accountId: account.id }),
          });
        } catch {
          // non-fatal if offline, still downgrade client UI cache cleanly
        }
      }
      setStoredPlan('free');
      setCurrentPlanId('free');
      trackEvent('subscription_cancelled', {
        plan: 'free',
        properties: { previousPlan: currentPlanId },
      });
      toast(
        'Switched to Free Tier',
        'Your workspace is now on the Free starter tier (3 Creation Kits/mo, 1 active project).',
        'info'
      );
      return;
    }

    // For paid tiers (Pro, Creator, MAX), open the Upgrade / Verification Modal
    // This prevents fake payments and avoids automatically granting paid access on a single button click
    setUpgradeModalPlan(plan.id as PlanId);
  };

  const pricingPlans = PRICING_PLANS;

  const comparisonGroups = [
    {
      category: 'Strategy & Channel Architecture',
      items: [
        { name: 'Daily Content Radar', free: '3 / day (Limited)', pro: '15 / day (Basic)', creator: '30 / day (Advanced)', max: '50 / day (Maximum)' },
        { name: 'Trend Radar', free: '— (Pro+)', pro: 'Basic', creator: 'Advanced Channel Fit', max: 'Maximum Cross-Channel' },
        { name: 'Content Gap Finder', free: '—', pro: '— (Creator+)', creator: 'Advanced Gap Matrix', max: 'Maximum Gap & Format OS' },
        { name: 'Content Planning Depth', free: 'Single Video', pro: 'Weekly Queue', creator: '30-Day Content Planner', max: '90-Day Channel Architecture' },
        { name: 'Series Planner', free: '—', pro: '—', creator: 'Full Multi-Episode Planner', max: 'Advanced Series Architecture' },
        { name: 'Topic Opportunity Scoring', free: 'Basic Intent', pro: 'Audience-Aware (6)', creator: 'Opportunity Scoring', max: 'Maximum Channel Architecture' },
      ],
    },
    {
      category: 'Production & Creation Kit',
      items: [
        { name: 'Creation Kits per Month', free: '3 / month', pro: '25 / month', creator: '75 / month', max: '200 / month' },
        { name: 'Video Creation Quota', free: '2 videos / week (rolling 7 days)', pro: '25 videos / rolling 7 days', creator: '75 videos / rolling 7 days', max: '200 videos / rolling 7 days' },
        { name: 'Script Generation Depth', free: 'Basic (3 parts)', pro: 'Full Duration (10m)', creator: 'Multi-Scene / Multi-Take', max: 'Complex Dependency Tree' },
        { name: 'Visual & Storyboard Planning', free: 'Basic Cues', pro: 'Full Timed Visuals', creator: 'Scene Assets & SFX', max: 'Full Asset Dependency' },
        { name: 'Character & Style Continuity', free: '—', pro: 'Character & Style Bible', creator: 'Multi-Scene Consistency', max: 'Multi-Character Continuity Engine' },
        { name: 'Tool-Specific AI Prompts', free: 'Single Prompt', pro: 'Tool-Specific Prompts', creator: 'Adaptive Tool Stages', max: 'Maximum Depth' },
        { name: 'Copy Generated Prompts', free: 'Gen #1 (Gen #2 Locked)', pro: 'Unlimited One-Click Copy', creator: 'Unlimited One-Click Copy', max: 'Unlimited One-Click Copy' },
        { name: 'Copy All Clips & Export', free: '—', pro: 'Included', creator: 'Included', max: 'Full OS Package Export' },
      ],
    },
    {
      category: 'AI Video Workflows',
      items: [
        { name: 'AI Animation & Motion Keyframes', free: '—', pro: 'Included', creator: 'Full Custom Stages', max: 'Multi-Character Continuity' },
        { name: 'AI Image → Video & Text → Video', free: '—', pro: 'Included', creator: 'Full Custom Stages', max: 'Multi-Character Continuity' },
        { name: 'Faceless & Whiteboard Production', free: '—', pro: 'Included', creator: 'Full Custom Stages', max: 'Full Custom Stages' },
        { name: 'AI Voice Direction & SFX Planning', free: '—', pro: 'Voice Pacing & Tone', creator: 'Full Music & SFX Arc', max: 'Advanced Acoustic Design' },
      ],
    },
    {
      category: 'Analytics & Growth Loops',
      items: [
        { name: 'Next Video Intelligence', free: '1 / day (3 recs)', pro: '3 / day (5 recs)', creator: '5 / day (What Worked / Next)', max: 'Unlimited Cross-Video OS' },
        { name: 'Performance → Growth Loop', free: '—', pro: '—', creator: 'Auto Production Kit', max: 'Multi-Video Pattern Match' },
        { name: 'Manual Studio Analytics Records', free: '3 records', pro: '15 records', creator: '50 records (Trends)', max: '200 records (Pattern OS)' },
        { name: 'Creator Progress Tracking', free: 'Real Activity Log', pro: 'Real Activity Log', creator: 'Full Milestone Tracker', max: 'Full Milestone Tracker' },
      ],
    },
    {
      category: 'Languages & Multi-Channel Scale',
      items: [
        { name: 'Idea Generations Per Topic', free: '3 Ideas', pro: '6 Ideas', creator: '10 Ideas', max: '15 Ideas' },
        { name: 'Supported Languages', free: 'English, Tamil, Tanglish, Hindi + core', pro: 'Core + Regional Presets', creator: 'Core + Regional + Adaptation', max: 'Full Regional + Adaptation' },
        { name: 'Active Video Projects', free: '1 Active', pro: '10 Active', creator: '30 Active', max: '100 Active' },
        { name: 'Channels Managed', free: '1 Channel', pro: '2 Channels', creator: '3 Channels', max: '10 Channels' },
      ],
    },
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20 select-none">
      {/* Crawlable Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-start">
        <a
          href="/"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate('landing');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-mono tracking-wider transition-colors cursor-pointer"
        >
          <span>&larr;</span>
          <span>Back to CreatorFlow AI Overview</span>
        </a>
      </div>

      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4a017] font-semibold block mb-2">
          Predictable & Transparent Investment
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#1a1a1a] tracking-tight mt-1 mb-3">
          Predictable Pricing for Growing Creators
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
          Produce consistent, high-performing YouTube longform and Shorts with zero creative friction. Cancel anytime.
        </p>

        {/* Monthly / Annual Toggle */}
        <div className="mt-8 inline-flex items-center gap-2 p-1.5 bg-[#eeeae3] border border-[#e2ddd4] rounded-md">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded cursor-pointer ${
              !isAnnual
                ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                : 'text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded flex items-center gap-2 cursor-pointer ${
              isAnnual
                ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                : 'text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] text-white bg-[#d4a017] font-mono font-bold px-1.5 py-0.5 rounded-xs">
              SAVE 20%
            </span>
          </button>
        </div>

        {/* Pre-launch Early Access Notice */}
        <div className="mt-6 p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg max-w-xl mx-auto flex items-center justify-center gap-2 text-amber-900 text-xs font-sans text-left sm:text-center">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Pre-Launch Early Access:</strong> We're preparing secure payments for paid plans. Select any plan below to request early access and tell us what you need.
          </span>
        </div>
      </div>

      {/* 4 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isAnnual={isAnnual}
            isCurrent={plan.id === currentPlanId}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* "BUILD YOUR ANNUAL PLAN" CONFIGURABLE BUILDER */}
      <div className="pt-6">
        <CustomAnnualPlanBuilder />
      </div>

      {/* Grouped Feature Comparison Table */}
      <div className="bg-white rounded-lg border border-black/[0.08] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-black/[0.06]">
          <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
            Exhaustive Breakdown
          </span>
          <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
            Compare Plan Capabilities
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-sans">
            Every feature breakdown across Free, Pro, Creator, and MAX tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-[#f8f7f4] border-b border-black/[0.06] font-mono text-[10px] uppercase tracking-wider">
                <th className="p-4 font-semibold text-neutral-600">Feature</th>
                <th className="p-4 font-semibold text-neutral-600 text-center w-28">Free (₹0)</th>
                <th className="p-4 font-semibold text-neutral-900 text-center w-32 bg-black/[0.02]">Pro (₹249)</th>
                <th className="p-4 font-semibold text-[#1a1a1a] text-center w-36 bg-[#eeeae3]/50">Creator (₹499)</th>
                <th className="p-4 font-semibold text-[#d4a017] text-center w-36 bg-black/[0.03]">MAX (₹999)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {comparisonGroups.map((group, gIdx) => (
                <React.Fragment key={gIdx}>
                  <tr className="bg-[#f8f7f4]/80">
                    <td colSpan={5} className="p-3 px-4 font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-600 border-t border-b border-black/[0.06]">
                      {group.category}
                    </td>
                  </tr>
                  {group.items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f7f4] transition-colors">
                      <td className="p-3.5 px-4 font-medium text-neutral-800">{row.name}</td>
                      <td className="p-3.5 text-center font-mono text-neutral-500">{row.free}</td>
                      <td className="p-3.5 text-center font-mono font-medium text-neutral-900 bg-black/[0.01]">
                        {row.pro}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#1a1a1a] bg-[#eeeae3]/20">
                        {row.creator}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#d4a017] bg-black/[0.02]">
                        {row.max}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Developer Plan Switcher for Rapid Testing */}
      <div className="pt-4">
        <DevPlanSwitcher />
      </div>

      {/* Real Plan Upgrade Modal */}
      {upgradeModalPlan && (
        <PlanUpgradeModal
          isOpen={upgradeModalPlan !== null}
          onClose={() => setUpgradeModalPlan(null)}
          targetPlanId={upgradeModalPlan}
          isAnnual={isAnnual}
        />
      )}
    </div>
  );
};
