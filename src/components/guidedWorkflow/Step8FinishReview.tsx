import React from 'react';
import { CreatorWorkflowState } from '../../types/guidedWorkflow';
import { Check, Send, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Award, Trophy } from 'lucide-react';

interface Step8FinishReviewProps {
  workflowState: CreatorWorkflowState;
  onFinish: () => void;
  onBack: () => void;
}

export const Step8FinishReview: React.FC<Step8FinishReviewProps> = ({
  workflowState,
  onFinish,
  onBack,
}) => {
  const { metadata, script, selectedTool, selectedIdea, isVideoCreated } = workflowState;

  const checklistItems = [
    { label: 'Content Filmed & Edited', status: isVideoCreated, detail: `${script.durationFormatted} runtime` },
    { label: 'Title Selected & Evaluated', status: Boolean(metadata.selectedTitle), detail: `${metadata.titleCharCount} characters` },
    { label: 'Description Ready', status: Boolean(metadata.description.formattedText), detail: 'Hook + summary + CTA' },
    { label: 'Thumbnail Concept Planned', status: Boolean(metadata.thumbnailBrief.overlayText), detail: `"${metadata.thumbnailBrief.overlayText}"` },
    { label: 'Search Keywords Ready', status: workflowState.discovery.keywords.length > 0, detail: `${workflowState.discovery.keywords.length} terms` },
    { label: 'Hashtags Ready', status: workflowState.discovery.hashtags.length > 0, detail: `${workflowState.discovery.hashtags.length} tags` },
    { label: 'YouTube Upload Settings Reviewed', status: true, detail: `${workflowState.youtubeSettings.visibility} · ${workflowState.youtubeSettings.category}` },
  ];

  const allPassed = checklistItems.every((item) => item.status);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 11 of 11 — Verification & Launch
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Finish & Creator Progress
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          Review your complete production package and confirm your creator progress milestones.
        </p>
      </div>

      {/* Package Summary Card */}
      <div className="bg-white border border-black/[0.08] p-6 space-y-6 shadow-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
            Video Summary
          </span>
          <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
            {metadata.selectedTitle}
          </h3>
          <div className="text-xs font-mono text-neutral-600 mt-1 flex flex-wrap items-center gap-3">
            <span>Format: {selectedIdea?.format || 'Video'}</span>
            <span>&bull;</span>
            <span>Tool: {selectedTool?.name || 'Editor'}</span>
            <span>&bull;</span>
            <span>Est. Runtime: {script.durationFormatted}</span>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="space-y-2 pt-4 border-t border-black/[0.06]">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
            Publishing Readiness Checklist
          </span>

          <div className="divide-y divide-black/[0.05] border border-black/[0.06] bg-[#f8f7f4]">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-none flex items-center justify-center shrink-0 ${
                    item.status ? 'bg-[#1a1a1a] text-[#f8f7f4]' : 'bg-neutral-200 text-neutral-400'
                  }`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-[#1a1a1a]">{item.label}</span>
                </div>

                <span className="font-mono text-[11px] text-neutral-500">
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Confirmation Banner */}
        <div className="p-4 bg-[#eeeae3] border border-[#e2ddd4] flex items-center gap-3">
          <Trophy className="w-5 h-5 text-[#d4a017] shrink-0" />
          <div className="text-xs text-neutral-800">
            <strong className="font-semibold text-neutral-900 block font-serif text-sm">
              Your video is ready for publishing.
            </strong>
            Completing this guided flow updates your real creator progress graph and unlocks your milestone achievements.
          </div>
        </div>

        {/* Finish Actions */}
        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={onFinish}
            className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-md"
          >
            <span>Finish & Save to Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
