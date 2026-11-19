import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface AssistantInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const AssistantInput: React.FC<AssistantInputProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setInput('');
  };

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about strategy, tools, kits..."
        disabled={isLoading || disabled}
        className="w-full bg-[#f8f7f4] border border-black/[0.12] focus:border-[#d4a017] focus:bg-white focus:ring-1 focus:ring-[#d4a017] text-xs text-[#1a1a1a] rounded-lg px-3.5 py-2.5 pr-10 transition-all placeholder:text-neutral-400 font-sans disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading || disabled}
        className="absolute right-1.5 p-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white disabled:opacity-30 transition-all cursor-pointer"
        aria-label="Send message"
      >
        <Send className="w-3.5 h-3.5 text-[#d4a017]" />
      </button>
    </form>
  );
};
