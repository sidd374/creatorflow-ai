import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  HelpCircle,
  Compass,
  Layers,
  Wrench,
  BarChart3,
  Radar
} from 'lucide-react';
import { Button } from '../ui/Button';
import { getStoredPlan, PlanId, PLAN_DEFINITIONS } from '../../lib/planEntitlements';
import { TOTAL_TOUR_STEPS, markTourCompleted, saveTourProgress } from '../../lib/guidedTourStorage';

export interface TourStepConfig {
  id: string;
  stepNumber: number;
  selector: string;
  fallbackSelector?: string;
  title: string;
  description: string;
  featureKey?: string;
  preferredPosition?: 'bottom' | 'top' | 'right' | 'left';
  route?: string;
}

interface InteractiveGuidedTourProps {
  isOpen: boolean;
  initialStep?: number;
  currentView: string;
  onNavigate: (view: string) => void;
  onClose: () => void;
  onFinish: () => void;
  userPlan?: PlanId;
}

export const InteractiveGuidedTour: React.FC<InteractiveGuidedTourProps> = ({
  isOpen,
  initialStep = 1,
  currentView,
  onNavigate,
  onClose,
  onFinish,
  userPlan,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(initialStep - 1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'center' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const activePlan = userPlan || getStoredPlan();
  const isPaidPlan = activePlan !== 'free';

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // 8 Exact Tour Steps conforming strictly to brief
  const steps: TourStepConfig[] = [
    {
      id: 'step-dashboard',
      stepNumber: 1,
      selector: '[data-tour="dashboard-overview"]',
      fallbackSelector: '[data-tour="nav-dashboard"]',
      title: 'Your Dashboard',
      description: 'This is your CreatorFlow workspace. Start here to find your projects, creation tools, recommendations, and progress.',
      preferredPosition: 'bottom',
      route: 'dashboard',
    },
    {
      id: 'step-create-content',
      stepNumber: 2,
      selector: '[data-tour="topic-strategist"]',
      fallbackSelector: 'form input[type="text"]',
      title: 'Create Your First Content',
      description: 'Enter a video topic, choose your platform, language, and preferred tone, then generate content ideas and a starting content package.',
      preferredPosition: 'bottom',
      route: 'dashboard',
    },
    {
      id: 'step-titles-hooks-scripts',
      stepNumber: 3,
      selector: '[data-tour="nav-tools"]',
      fallbackSelector: '[data-tour="dashboard-overview"]',
      title: 'Titles, Hooks and Scripts',
      description: 'Develop attention-grabbing title options, opening hooks, video scripts, descriptions, keywords, hashtags, and thumbnail ideas. Review the suggestions and adapt them to your audience.',
      preferredPosition: 'right',
      route: 'dashboard',
    },
    {
      id: 'step-creation-kits',
      stepNumber: 4,
      selector: '[data-tour="next-best-video"]',
      fallbackSelector: '[data-tour="dashboard-overview"]',
      title: 'Creation Kits and Production Workflow',
      description: 'Turn an idea into a more organized production plan. Follow the available steps for your title, hook, script, visuals, voice, editing, and publishing.',
      preferredPosition: 'bottom',
      route: 'dashboard',
    },
    {
      id: 'step-consistency',
      stepNumber: 5,
      selector: '[data-tour="creator-intelligence"]',
      fallbackSelector: '[data-tour="dashboard-overview"]',
      title: 'Character and Style Consistency',
      description: isPaidPlan
        ? 'Keep recurring characters, visual styles, and production instructions organized across your video projects. (Character & Style Bibles are unlocked on your plan).'
        : 'Keep recurring characters, visual styles, and production instructions organized across your video projects. (Character and Style Bibles are included on Pro, Creator, and MAX tiers).',
      preferredPosition: 'bottom',
      route: 'dashboard',
    },
    {
      id: 'step-radar',
      stepNumber: 6,
      selector: '[data-tour="daily-radar"]',
      fallbackSelector: '[data-tour="nav-radar"]',
      title: 'Content Radar and Next Video Intelligence',
      description: 'Explore curated topic ideas, content opportunities, and recommendations for what you could make next. Clearly identify curated data and estimates; never describe them as live trends unless live data is genuinely connected.',
      preferredPosition: 'bottom',
      route: 'dashboard',
    },
    {
      id: 'step-publishing-analytics',
      stepNumber: 7,
      selector: '[data-tour="creator-telemetry"]',
      fallbackSelector: '[data-tour="nav-analytics"]',
      title: 'Publishing Studio and Analytics',
      description: 'Prepare your publishing checklist and available metadata, then review your channel metrics and any clearly labelled estimates to help plan your next upload.',
      preferredPosition: 'top',
      route: 'dashboard',
    },
    {
      id: 'step-plan-help',
      stepNumber: 8,
      selector: '[data-tour="plan-status"]',
      fallbackSelector: '[data-tour="help-tour-button"]',
      title: 'Your Plan and Help',
      description: 'Check which features are included in your plan. You can replay this tour whenever you need help.',
      preferredPosition: 'top',
      route: 'dashboard',
    },
  ];

  const currentStep = steps[currentStepIndex] || steps[0];

  // Safely locate and measure the target DOM element
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;

    let targetEl: HTMLElement | null = document.querySelector(currentStep.selector);
    if (!targetEl && currentStep.fallbackSelector) {
      targetEl = document.querySelector(currentStep.fallbackSelector);
    }

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element smoothly into view if offscreen or partially hidden
      const isVisibleInViewport =
        rect.top >= 80 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 80 &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);

      if (!isVisibleInViewport) {
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }

      // Compute tooltip coordinates
      const tooltipWidth = Math.min(380, window.innerWidth - 32);
      const tooltipHeight = 220; // Estimated height for positioning
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let top = 0;
      let left = Math.max(16, Math.min(rect.left + (rect.width - tooltipWidth) / 2, windowWidth - tooltipWidth - 16));
      let placement: 'top' | 'bottom' | 'center' = 'bottom';

      // Check vertical space
      if (rect.bottom + tooltipHeight + 20 < windowHeight) {
        top = rect.bottom + 14;
        placement = 'bottom';
      } else if (rect.top - tooltipHeight - 20 > 0) {
        top = Math.max(20, rect.top - tooltipHeight - 14);
        placement = 'top';
      } else {
        // Fallback center or mobile bottom sheet
        top = Math.max(20, (windowHeight - tooltipHeight) / 2);
        placement = 'center';
      }

      setTooltipPos({ top, left, placement });
    } else {
      // If target element is not found, fallback to centered overlay
      setTargetRect(null);
      setTooltipPos({
        top: Math.max(40, (window.innerHeight - 240) / 2),
        left: Math.max(16, (window.innerWidth - Math.min(400, window.innerWidth - 32)) / 2),
        placement: 'center',
      });
    }
  }, [isOpen, currentStep, prefersReducedMotion]);

  // Navigate to required view if needed
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep.route && currentView !== currentStep.route) {
      onNavigate(currentStep.route);
    }
  }, [isOpen, currentStep, currentView, onNavigate]);

  // Update target rectangle when step changes, on resize, or on scroll
  useEffect(() => {
    if (!isOpen) return;

    // Small timeout to allow route transition / render settlement
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 150);

    const handleResize = () => updateTargetPosition();
    const handleScroll = () => {
      // Re-measure without re-scrolling
      let targetEl: HTMLElement | null = document.querySelector(currentStep.selector);
      if (!targetEl && currentStep.fallbackSelector) {
        targetEl = document.querySelector(currentStep.fallbackSelector);
      }
      if (targetEl) {
        setTargetRect(targetEl.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, currentStepIndex, updateTargetPosition]);

  // Keyboard navigation handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      saveTourProgress({ lastCompletedStep: nextIdx + 1 });
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    saveTourProgress({ skippedAt: new Date().toISOString() });
    onClose();
  };

  const handleFinish = () => {
    markTourCompleted();
    onFinish();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Guided Tour"
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none font-sans"
    >
      {/* 1. DIMMED BACKDROP WITH ROUNDED SPOTLIGHT HOLE */}
      {targetRect ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
          aria-hidden="true"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              {/* White fills the whole mask (dimmed) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cuts out the spotlight hole */}
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="8"
                ry="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 10, 10, 0.5)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" />
      )}

      {/* 2. SPOTLIGHT HIGHLIGHT BORDER & PULSE RING */}
      {targetRect && (
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="pointer-events-none rounded-lg border-2 border-[#d4a017] shadow-[0_0_20px_rgba(212,160,23,0.45)] transition-all duration-300"
          aria-hidden="true"
        />
      )}

      {/* 3. CONTEXT-AWARE FLOATING TOOLTIP CARD */}
      <div
        ref={tooltipRef}
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          width: 'min(380px, calc(100vw - 32px))',
        }}
        className="absolute z-50 bg-[#faf9f5] border border-black/[0.12] shadow-2xl p-5 space-y-4 text-[#1a1a1a] transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4a017] via-[#f3c64f] to-[#d4a017]" />

        {/* Step Header & Close */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#d4a017] bg-white border border-[#d4a017]/30 px-2 py-0.5">
              Step {currentStep.stepNumber} of {TOTAL_TOUR_STEPS}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
            aria-label="Skip Tour"
            title="Skip Tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Explanation */}
        <div className="space-y-1.5">
          <h3 className="font-serif text-xl font-normal text-[#1a1a1a] leading-snug">
            {currentStep.title}
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed font-sans font-normal">
            {currentStep.description}
          </p>
        </div>

        {/* Plan Awareness Callout for Step 5 */}
        {currentStep.stepNumber === 5 && (
          <div className="p-2.5 bg-white border border-black/[0.08] text-[11px] font-sans flex items-start gap-2">
            <Crown className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] uppercase font-bold text-neutral-700 block">
                {isPaidPlan ? `${PLAN_DEFINITIONS[activePlan]?.name} Active` : 'Feature Plan Status'}
              </span>
              <p className="text-neutral-600 leading-tight">
                {isPaidPlan
                  ? 'Consistent characters, style presets, and multi-scene continuity are active on your account.'
                  : 'Free tier allows core video generation; Character and Style Bibles are unlocked on Pro, Creator, and MAX.'}
              </p>
            </div>
          </div>
        )}

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, idx) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStepIndex
                    ? 'w-5 bg-[#d4a017]'
                    : idx < currentStepIndex
                    ? 'w-1.5 bg-[#1a1a1a]'
                    : 'w-1.5 bg-neutral-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className={`p-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                currentStepIndex === 0
                  ? 'text-neutral-300 cursor-not-allowed'
                  : 'text-neutral-600 hover:text-neutral-900 cursor-pointer'
              }`}
              title="Previous Step (Left Arrow)"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Next Step (Right Arrow)"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 bg-[#d4a017] hover:bg-[#b8890f] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Finish Tour"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
