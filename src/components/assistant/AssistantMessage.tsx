import React from 'react';
import { AssistantMessage as IAssistantMessage } from '../../lib/assistantStorage';
import { Sparkles, User as UserIcon } from 'lucide-react';

interface AssistantMessageProps {
  message: IAssistantMessage;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-2.5 items-start ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
          isAssistant
            ? 'bg-[#1a1a1a] text-[#d4a017]'
            : 'bg-[#eeeae3] text-[#1a1a1a] border border-[#ded8cd]'
        }`}
      >
        {isAssistant ? <Sparkles className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
      </div>

      <div
        className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed font-sans shadow-2xs ${
          isAssistant
            ? 'bg-white text-neutral-800 border border-black/[0.08]'
            : 'bg-[#1a1a1a] text-white'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-[9px] font-mono mt-1 text-right ${
            isAssistant ? 'text-neutral-400' : 'text-neutral-300/80'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
