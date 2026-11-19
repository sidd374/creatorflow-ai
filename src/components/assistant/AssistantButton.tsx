import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssistantButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AssistantButton: React.FC<AssistantButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open CreatorFlow AI Assistant"
      className="fixed z-40 bottom-20 right-4 lg:bottom-6 lg:right-6 flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f8f7f4] rounded-full border border-black/[0.12] shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group scale-100 hover:scale-105 active:scale-95"
    >
      <div className="w-5 h-5 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[#d4a017] group-hover:rotate-12 transition-transform">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <span className="font-mono text-xs font-semibold tracking-wide text-[#f8f7f4]">
        CreatorFlow AI
      </span>
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
    </button>
  );
};
