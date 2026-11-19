import React from 'react';
import { Sparkles, Compass, Wrench, Package, BarChart3, HelpCircle } from 'lucide-react';

interface AssistantQuickActionsProps {
  currentPage: string;
  onSelectAction: (actionText: string) => void;
  disabled?: boolean;
  isFirstOpen?: boolean;
}

export const AssistantQuickActions: React.FC<AssistantQuickActionsProps> = ({
  currentPage,
  onSelectAction,
  disabled = false,
  isFirstOpen = false,
}) => {
  const getContextualActions = () => {
    if (isFirstOpen) {
      return [
        { label: '💡 Recommend Next Idea', query: 'Recommend next video idea for my channel' },
        { label: '🎣 Draft Hook & Script', query: 'Draft hook and script' },
        { label: '🎬 Plan Storyboard', query: 'Plan scenes and storyboard' },
        { label: '🎥 Format Video Prompts', query: 'Generate video prompts for my model' },
        { label: '📝 Prepare SEO & Voice', query: 'Prepare SEO, voiceover, captions and thumbnail' },
        { label: '💾 Save Project', query: 'Save project to workspace' },
      ];
    }

    switch (currentPage) {
      case 'dashboard':
        return [
          { label: 'What should I do next?', query: 'What should I do next?' },
          { label: 'Analyze my topic', query: 'How does topic analysis work in CreatorFlow?' },
          { label: 'Explain my plan', query: 'What features are available in my current plan?' },
          { label: 'Why was this idea recommended?', query: 'Why was this idea recommended for my channel?' },
        ];
      case 'ideas':
        return [
          { label: 'Pick the best idea', query: 'Which idea in my list has the highest CreatorFit score?' },
          { label: 'Which is easiest?', query: 'Which of these ideas has the lowest production difficulty?' },
          { label: 'Why this recommendation?', query: 'Why was this idea recommended for my channel?' },
          { label: 'Which method fits me?', query: 'Which creation method fits my device and time budget?' },
        ];
      case 'guided-workflow':
        return [
          { label: 'What do I do first?', query: 'What do I do first in this step?' },
          { label: 'Explain this step', query: 'Can you explain this workflow step and what to configure?' },
          { label: 'Which tool fits me?', query: 'Which tool fits my device and budget best?' },
          { label: 'Show free options', query: 'Are there free tool options for this workflow?' },
        ];
      case 'builder':
        return [
          { label: 'What do I do first?', query: 'What do I do first with my Creation Kit?' },
          { label: 'Explain Creation Kit', query: 'Explain my Creation Kit and dependency order.' },
          { label: 'Scene prompt guidance', query: 'How should I structure my scene prompts in AI tools?' },
          { label: 'Publishing checklist', query: 'What do I need before publishing this video?' },
        ];
      case 'analytics':
        return [
          { label: 'What worked?', query: 'What worked well in my recorded videos?' },
          { label: 'What should I improve?', query: 'What needs improvement in my CTR and retention?' },
          { label: 'What should I make next?', query: 'Based on my analytics, what should I make next?' },
        ];
      default:
        return [
          { label: 'What should I do next?', query: 'What should I do next?' },
          { label: 'Explain this page', query: 'Explain this page and how to use it.' },
          { label: 'Which tool should I use?', query: 'Which tool should I use for YouTube creation?' },
          { label: 'Explain my Creation Kit', query: 'Explain my Creation Kit and dependency order.' },
        ];
    }
  };

  const actions = getContextualActions();

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold px-0.5">
        <span>Suggested Actions:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectAction(act.query)}
            className="text-[11px] font-sans text-neutral-700 bg-[#f8f7f4] hover:bg-[#eeeae3] hover:text-[#1a1a1a] border border-black/[0.08] px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-50 text-left shrink-0"
          >
            {act.label}
          </button>
        ))}
      </div>
    </div>
  );
};
