import React, { useEffect } from 'react';
import { Sparkles, ArrowRight, X, Compass, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkipTour: () => void;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onStartTour,
  onSkipTour,
}) => {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkipTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSkipTour]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-heading"
      aria-describedby="welcome-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#faf9f5] border border-black/[0.12] shadow-2xl p-6 sm:p-8 space-y-6 text-[#1a1a1a] font-sans">
        {/* Subtle decorative gold top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4a017] via-[#f3c64f] to-[#d4a017]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onSkipTour}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
          aria-label="Close welcome modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-mono font-medium text-neutral-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#d4a017]" />
          <span>YouTube Creator Studio</span>
        </div>

        {/* Heading & Description */}
        <div className="space-y-3">
          <h2
            id="welcome-modal-heading"
            className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] tracking-tight leading-tight"
          >
            Welcome to CreatorFlow AI!
          </h2>
          <p
            id="welcome-modal-description"
            className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans"
          >
            Your complete workspace for planning, creating, and publishing better YouTube content. Let’s take a quick tour so you know exactly where everything is.
          </p>
        </div>

        {/* Highlights Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-1">
          <div className="flex items-start gap-2.5 p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
            <span>CTR-engineered titles, hooks &amp; scripts</span>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
            <span>Shot-by-shot multi-clip Creation Kits</span>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
            <span>Curated Daily Content Radar opportunities</span>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
            <span>Real internal production telemetry</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={onSkipTour}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer text-center"
          >
            Explore on My Own
          </button>
          <Button
            variant="primary"
            size="md"
            onClick={onStartTour}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider px-6 h-11 shadow-xs cursor-pointer"
          >
            Start Guided Tour
          </Button>
        </div>
      </div>
    </div>
  );
};
