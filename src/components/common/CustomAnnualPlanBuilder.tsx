import React, { useState } from 'react';
import { Check, Sparkles, Sliders, ShieldCheck, ArrowRight, HelpCircle, Layers, X, Send, Info } from 'lucide-react';
import { 
  CustomAnnualConfig, 
  DEFAULT_CUSTOM_ANNUAL_CONFIG, 
  calculateCustomAnnualPlan, 
  saveStoredCustomAnnualConfig, 
  setStoredPlan 
} from '../../lib/planEntitlements';
import { isAuthorizedOwner, getCurrentAccount, getAuthIdToken } from '../../lib/auth';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { trackEvent } from '../../lib/analyticsService';

export const CustomAnnualPlanBuilder: React.FC = () => {
  const [config, setConfig] = useState<CustomAnnualConfig>(DEFAULT_CUSTOM_ANNUAL_CONFIG);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const { toast } = useToast();

  const isDev = import.meta.env.DEV;
  const isOwner = isAuthorizedOwner();
  const account = getCurrentAccount();

  const planSummary = calculateCustomAnnualPlan(config);

  const creationStyles: Array<{ id: CustomAnnualConfig['creationStyle']; label: string; desc: string }> = [
    { id: 'AI Animation', label: 'AI Animation', desc: 'Character keyframes, motion prompts, and stylized scenes' },
    { id: 'Faceless', label: 'Faceless Channel', desc: 'Stock B-roll, dynamic text overlays, and voice-driven hooks' },
    { id: 'Talking Head', label: 'Talking Head', desc: 'Authority teleprompter scripts, pacing cues, and B-roll callouts' },
    { id: 'Whiteboard', label: 'Whiteboard / Explainer', desc: 'Hand-drawn sketch concepts, analogies, and conceptual pacing' },
    { id: 'Screen Recording', label: 'Screen & Tutorial', desc: 'Software walkthroughs, step-by-step clicks, and UI zooms' },
    { id: 'Documentary', label: 'Documentary / Video Essay', desc: 'Multi-chapter research arcs, narrative tension, and archive b-roll' },
    { id: 'Shorts', label: 'Shorts & Reels Focus', desc: 'Sub-60s retention loops, rapid pattern interrupts, and sound cues' },
  ];

  const availableCapabilities = [
    'Strategy & Series Planning',
    'Advanced Scripts (Full Duration)',
    'AI Workflow Generators',
    'Character & Style Consistency',
    'High-CTR Thumbnail Strategy',
    'Voice & Audio Direction',
    'Analytics Intelligence',
    'Expanded Multilingual Engine',
    'Multiple Channel Management',
  ];

  const usageTiers: Array<{ id: CustomAnnualConfig['usageTier']; label: string; volume: string }> = [
    { id: 'Starter', label: 'Starter', volume: '10 Creation Kits / month' },
    { id: 'Active', label: 'Active', volume: '35 Creation Kits / month' },
    { id: 'High Volume', label: 'High Volume', volume: '90 Creation Kits / month' },
    { id: 'Studio', label: 'Studio Scale', volume: '250 Creation Kits / month' },
  ];

  const channelOptions = [1, 2, 3, 5, 10];

  const toggleCapability = (cap: string) => {
    setConfig((prev) => {
      const exists = prev.capabilities.includes(cap);
      const nextCaps = exists
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap];
      return { ...prev, capabilities: nextCaps };
    });
  };

  const handleBuildPlan = () => {
    saveStoredCustomAnnualConfig(config);
    trackEvent('custom_annual_configured', {
      properties: {
        creationStyle: config.creationStyle,
        annualPrice: planSummary.annualPrice,
        channelsCount: config.channelsCount,
      },
    });

    const inquiryRecord = {
      accountId: account?.id || 'anonymous_user',
      email: account?.email || 'unverified',
      creationStyle: config.creationStyle,
      channelsCount: config.channelsCount,
      usageTier: config.usageTier,
      capabilities: config.capabilities,
      annualPrice: planSummary.annualPrice,
      monthlyEquivalent: planSummary.monthlyEquivalent,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem('creatorflow_custom_inquiries_v3');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(inquiryRecord);
      localStorage.setItem('creatorflow_custom_inquiries_v3', JSON.stringify(existing));
    } catch {
      // ignore
    }

    setShowConfirmationModal(true);
  };

  const handleDevQuickActivate = async () => {
    if (!isDev || !isOwner || !account) {
      toast('Action Restricted', 'Direct plan activation is disabled. Subscriptions require verified billing.', 'error');
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
          planId: 'custom_annual',
          status: 'active',
          cadence: 'yearly',
          customConfig: {
            ...config,
            annualPrice: planSummary.annualPrice,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast('Activation Rejected', err.message || 'Server denied custom plan activation.', 'error');
        return;
      }

      setStoredPlan('custom_annual');
      setShowConfirmationModal(false);
      toast(
        'Custom Annual Plan Activated (Dev Test)',
        `Testing custom configuration (₹${planSummary.annualPrice.toLocaleString()}/yr) for ${config.creationStyle} with ${config.channelsCount} channel(s).`,
        'success'
      );
    } catch {
      toast('Network Error', 'Could not reach server to activate dev test subscription.', 'error');
    }
  };

  return (
    <div className="bg-[#f8f7f4] border border-black/[0.08] rounded-xl p-6 sm:p-10 shadow-xs select-none">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-10">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Tailored Architecture &bull; Annual Only
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Build CreatorFlow around the way YOU create.
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 mt-2 font-sans">
          Select your creation style, required intelligence modules, and production scale. 
          Deterministic and transparent pricing with guaranteed annual savings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Primary Creation Style */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold block mb-3">
              1. Select Primary Creation Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {creationStyles.map((style) => {
                const isSelected = config.creationStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setConfig({ ...config, creationStyle: style.id })}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-white ring-1 ring-[#1a1a1a] shadow-xs'
                        : 'border-black/[0.08] bg-white/60 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-base font-semibold text-[#1a1a1a]">{style.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#d4a017]" />}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-snug">{style.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Capability Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold">
                2. Choose Intelligence & Production Modules
              </label>
              <span className="text-[10px] font-mono text-neutral-400">₹300/yr per module</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableCapabilities.map((cap) => {
                const isChecked = config.capabilities.includes(cap);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={`p-2.5 rounded-md border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isChecked
                        ? 'border-[#1a1a1a] bg-white font-semibold text-[#1a1a1a] shadow-xs'
                        : 'border-black/[0.06] bg-white/50 hover:bg-white text-neutral-600'
                    }`}
                  >
                    <span>{cap}</span>
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white' : 'border-neutral-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-[#d4a017]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Production Volume */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold block mb-3">
              3. Monthly Production Capacity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {usageTiers.map((tier) => {
                const isSelected = config.usageTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setConfig({ ...config, usageTier: tier.id })}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-white ring-1 ring-[#1a1a1a] shadow-xs font-semibold'
                        : 'border-black/[0.08] bg-white/60 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-serif font-bold text-[#1a1a1a]">{tier.label}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{tier.volume}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Number of Channel Slots */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold block mb-3">
              4. YouTube Channels Managed
            </label>
            <div className="flex items-center gap-2">
              {channelOptions.map((count) => {
                const isSelected = config.channelsCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfig({ ...config, channelsCount: count })}
                    className={`flex-1 py-2 rounded-md border text-center text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white font-bold shadow-xs'
                        : 'border-black/[0.08] bg-white hover:bg-[#eeeae3] text-neutral-700'
                    }`}
                  >
                    {count} {count === 1 ? 'Channel' : 'Channels'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Summary Card (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="bg-white border border-black/[0.08] shadow-sm rounded-lg sticky top-24">
            <CardContent className="p-6 sm:p-7 space-y-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4a017] font-semibold block">
                  Deterministic Summary
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a] mt-0.5">
                  Your Custom CreatorFlow Plan
                </h3>
              </div>

              {/* Price Display */}
              <div className="pb-4 border-b border-black/[0.06] flex items-baseline justify-between">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-normal text-[#1a1a1a]">
                      ₹{planSummary.annualPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">/ year</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#d4a017] block mt-0.5">
                    ≈ ₹{planSummary.monthlyEquivalent}/mo effective (Billed Annually)
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#eeeae3] text-[#1a1a1a] px-2 py-0.5 rounded font-semibold border border-[#ded8cd]">
                  Annual Only
                </span>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                  Cost Breakdown:
                </span>
                <ul className="space-y-1.5 text-xs text-neutral-600 font-sans">
                  {planSummary.breakdown.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-xs">
                      <span>{item.label}</span>
                      <span className="font-mono text-[#1a1a1a]">₹{item.cost.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Inclusions */}
              <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                  Plan Inclusions:
                </span>
                <ul className="space-y-1.5 text-xs text-neutral-700">
                  {planSummary.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleBuildPlan}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full font-mono text-xs uppercase tracking-wider shadow-xs"
              >
                Build My Custom Plan
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deterministic pricing &bull; Switch anytime</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Custom Annual Confirmation Modal */}
      {showConfirmationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowConfirmationModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full border border-black/[0.08] shadow-2xl p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4a017] font-semibold block">
                  Tailored Plan Configured
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a] mt-0.5">
                  Custom Architecture Saved
                </h3>
              </div>
              <button 
                onClick={() => setShowConfirmationModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#f8f7f4] rounded-lg border border-black/[0.06] space-y-2 font-mono text-xs">
              <div className="flex items-baseline justify-between text-[#1a1a1a]">
                <span>Annual Quote:</span>
                <span className="font-bold text-base">₹{planSummary.annualPrice.toLocaleString()}/yr</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Monthly Equivalent:</span>
                <span>≈ ₹{planSummary.monthlyEquivalent}/mo</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500 text-[11px] pt-1 border-t border-black/[0.04]">
                <span>Style & Scale:</span>
                <span>{config.creationStyle} &bull; {config.channelsCount} Channel{config.channelsCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-neutral-700 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Custom Provisioning Process</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                Your custom architecture configuration has been recorded. Because custom plans involve tailored module routing and custom quotas, our team provisions account keys directly upon invoice verification.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowConfirmationModal(false)}
                className="w-full font-mono text-xs uppercase tracking-wider"
              >
                Done (Configuration Saved)
              </Button>

              {isDev && isOwner && (
                <button
                  type="button"
                  onClick={handleDevQuickActivate}
                  className="w-full py-2 px-3 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase tracking-wider font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>[Dev Test] Activate Custom Annual Plan Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
