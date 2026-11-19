import React, { useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Laptop, 
  AlertTriangle, 
  Layers, 
  DollarSign, 
  Compass, 
  CheckCircle2 
} from 'lucide-react';
import { ScoredTool } from '../../lib/toolRecommendationEngine';
import { Button } from '../ui/Button';

interface ToolDetailModalProps {
  tool: ScoredTool | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ScoredTool) => void;
  isSelected: boolean;
  videoTitle: string;
}

export const ToolDetailModal: React.FC<ToolDetailModalProps> = ({
  tool,
  isOpen,
  onClose,
  onSelectTool,
  isSelected,
  videoTitle,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tool) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-800">
                {tool.category}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                {tool.availability}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                {tool.difficulty} Difficulty
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                {tool.matchLevel}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 flex items-center gap-2">
              <span>{tool.name}</span>
              {isSelected && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Active in Your Stack
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Best for: <strong className="text-neutral-700">{tool.bestFor}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-neutral-800 text-xs sm:text-sm">
          {/* SECTION 1: WHY THIS FITS YOU */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Why This Fits You</span>
            </div>
            <ul className="space-y-1.5 text-xs text-emerald-900">
              {tool.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 2: HOW TO USE THIS TOOL FOR THIS VIDEO */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Action Guide
              </span>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                How to use {tool.name} for "{videoTitle}"
              </h3>
            </div>

            <div className="space-y-2">
              {tool.instructions.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-neutral-700 font-medium leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CORE CAPABILITIES & LIMITATIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
              <span className="font-bold text-neutral-900 uppercase tracking-wider text-[10px]">
                Main Advantage
              </span>
              <p className="text-neutral-600 leading-relaxed">{tool.mainBenefit}</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
              <span className="font-bold text-neutral-900 uppercase tracking-wider text-[10px]">
                Known Limitations
              </span>
              <p className="text-neutral-500 leading-relaxed">{tool.limitations}</p>
            </div>
          </div>

          {/* SECTION 4: HARDWARE & DEVICE COMPATIBILITY */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Laptop className="w-4 h-4 text-neutral-600" />
              <span>Device & System Support</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tool.deviceSupport.map((device, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs">
                  {device}
                </span>
              ))}
            </div>
            {tool.demandsHardware && (
              <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>May require a stronger computer or dedicated GPU for optimal rendering.</span>
              </div>
            )}
          </div>

          {/* SECTION 5: PRICING & OPTIONAL UPGRADES */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 uppercase tracking-wider text-[10px]">
                Pricing & Plan Options
              </span>
              <span className="text-xs font-semibold text-neutral-700">
                {tool.pricingNote}
              </span>
            </div>

            {tool.optionalUpgradeNote ? (
              <p className="text-neutral-600 leading-relaxed">
                {tool.optionalUpgradeNote}
              </p>
            ) : (
              <p className="text-neutral-500">
                This tool is completely free with no paid upgrade tier required.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-3">
          <a
            href={tool.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5 underline decoration-neutral-300"
          >
            <span>Visit Provider Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSelectTool(tool);
                onClose();
              }}
              leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
              className={`text-xs font-semibold ${
                isSelected 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              {isSelected ? 'Selected for Stack' : 'Choose This Tool'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
