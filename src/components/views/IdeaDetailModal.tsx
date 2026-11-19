import React, { useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  Target, 
  Users, 
  Check, 
  ArrowRight, 
  Bookmark, 
  Calendar, 
  ShieldCheck,
  Compass
} from 'lucide-react';
import { VideoIdea, RecommendedVideoIdea } from '../../types';
import { Button } from '../ui/Button';

interface IdeaDetailModalProps {
  idea: VideoIdea | RecommendedVideoIdea | null;
  onClose: () => void;
  onBuild: (idea: VideoIdea | RecommendedVideoIdea) => void;
  onSave?: (idea: VideoIdea | RecommendedVideoIdea) => void;
  onAddToPlanner?: (idea: VideoIdea | RecommendedVideoIdea) => void;
}

export const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({
  idea,
  onClose,
  onBuild,
  onSave,
  onAddToPlanner,
}) => {
  useEffect(() => {
    if (!idea) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [idea, onClose]);

  if (!idea) return null;

  const title = idea.title;
  const format = idea.format;
  const goal = 'primaryGoal' in idea ? idea.primaryGoal : ('goal' in idea ? (idea as any).goal : 'Audience Growth');
  const audience = idea.targetAudience || 'Beginner & Growing Creators';
  const difficulty = idea.difficulty;
  const time = 'estimatedTime' in idea ? (idea as any).estimatedTime : ('estimatedMinutes' in idea ? `${(idea as any).estimatedMinutes} minutes` : '45 minutes');
  const score = idea.creatorFitScore;
  const reasons = 'reasonForFit' in idea && idea.reasonForFit ? idea.reasonForFit : ('whyThisIdea' in idea ? (idea as any).whyThisIdea : []);
  const angle = 'angle' in idea && idea.angle ? idea.angle : ('suggestedAngle' in idea ? (idea as any).suggestedAngle : 'Practical Step-by-Step Breakdown');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-detail-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded">
              Video Idea Strategy
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              {score}/100 CreatorFit
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
            aria-label="Close detail modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Idea Title */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 leading-snug tracking-tight">
              "{title}"
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Structured concept calibrated to your creator profile and production capabilities.
            </p>
          </div>

          {/* Strategy Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Format</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5">{format}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Primary Goal</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5 truncate">{goal}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Audience</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5 truncate">{audience}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Difficulty</div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">{difficulty}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Est. Production Time</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5">{time}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">CreatorFit Score</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5">{score} / 100</div>
            </div>
          </div>

          {/* Why This Idea Fits You */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-2">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Why this idea fits your creator profile:</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-neutral-600">
              {reasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-neutral-400 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Angle */}
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 space-y-1.5">
            <div className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-rose-600" />
              <span>Recommended Angle</span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">
              {angle}
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 order-2 sm:order-1 transition-colors"
          >
            ← Back to Ideas
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {onAddToPlanner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddToPlanner(idea);
                  onClose();
                }}
                leftIcon={<Calendar className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Add to Planner
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onBuild(idea);
                onClose();
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs"
            >
              Build This Video
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
