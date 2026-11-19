import React, { useRef, useEffect } from 'react';
import { X, Sparkles, RotateCcw, ShieldCheck, Cpu, AlertCircle } from 'lucide-react';
import { AssistantMessage as IAssistantMessage } from '../../lib/assistantStorage';
import { AssistantProviderMode, ASSISTANT_PROVIDER_LABELS } from '../../lib/assistantProvider';
import { AssistantMessage } from './AssistantMessage';
import { AssistantInput } from './AssistantInput';
import { AssistantQuickActions } from './AssistantQuickActions';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface AssistantPanelProps {
  messages: IAssistantMessage[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
  isLoading: boolean;
  currentPage: string;
  providerMode?: AssistantProviderMode;
  onChangeProviderMode?: (mode: AssistantProviderMode) => void;
  cloudError?: { code?: string; message: string } | null;
  onRetryCloud?: () => void;
  onSwitchToLocal?: () => void;
  onDismissError?: () => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  messages,
  onSendMessage,
  onClearHistory,
  onClose,
  isLoading,
  currentPage,
  providerMode = 'local',
  onChangeProviderMode,
  cloudError,
  onRetryCloud,
  onSwitchToLocal,
  onDismissError,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, cloudError]);

  return (
    <aside
      aria-label="CreatorFlow AI assistant panel"
      className="fixed z-50 bottom-20 right-3 lg:bottom-6 lg:right-6 w-[calc(100vw-24px)] sm:w-[380px] h-[min(70vh,580px)] sm:h-[580px] bg-white rounded-xl border border-black/[0.12] shadow-2xl flex flex-col overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* 1. Header */}
      <header className="p-3 px-4 bg-[#f8f7f4] border-b border-black/[0.08] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] text-[#d4a017] flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-sm font-semibold text-[#1a1a1a] leading-none">
                  CreatorFlow AI
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-neutral-500 font-sans mt-0.5 leading-none">
                {ASSISTANT_PROVIDER_LABELS[providerMode]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={onClearHistory}
                title="Clear conversation"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close Assistant"
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Explicit Engine Toggle */}
        {onChangeProviderMode && (
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-neutral-200/70 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => onChangeProviderMode('local')}
              className={`py-1 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                providerMode === 'local'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Cpu className="w-3 h-3 text-rose-500" />
              <span>Local Engine</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeProviderMode('cloud')}
              className={`py-1 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                providerMode === 'cloud'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gemini Cloud</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-neutral-50/50">
        {messages.map((msg) => (
          <AssistantMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-[#d4a017] flex items-center justify-center shrink-0 text-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-white rounded-lg p-3 py-2.5 text-xs text-neutral-500 border border-black/[0.08] shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#d4a017] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#d4a017] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#d4a017] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] ml-1 font-mono text-neutral-400">Thinking...</span>
            </div>
          </div>
        )}

        {cloudError && !isLoading && (
          <div className="space-y-2">
            {cloudError.code === 'MISSING_API_KEY' ||
            cloudError.code === 'INVALID_API_KEY' ||
            cloudError.code === 'QUOTA_EXCEEDED' ||
            cloudError.code === 'RATE_LIMIT_EXCEEDED' ? (
              <div className="space-y-2">
                <ByokConnectionGate
                  compact
                  errorCode={cloudError.code}
                  message={cloudError.message}
                  onConnected={onRetryCloud}
                />
                {onSwitchToLocal && (
                  <button
                    type="button"
                    onClick={onSwitchToLocal}
                    className="w-full px-3 py-1.5 rounded bg-neutral-900 text-white font-semibold text-[11px] hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Or Switch to Offline Local Engine
                  </button>
                )}
              </div>
            ) : (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[11px]">Gemini Cloud Unavailable</div>
                      <p className="text-[11px] text-rose-900 mt-0.5 leading-snug">{cloudError.message}</p>
                    </div>
                  </div>
                  {onDismissError && (
                    <button
                      type="button"
                      onClick={onDismissError}
                      aria-label="Dismiss cloud error"
                      className="text-rose-400 hover:text-rose-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {onRetryCloud && (
                    <button
                      type="button"
                      onClick={onRetryCloud}
                      className="px-2.5 py-1 rounded bg-white border border-rose-300 text-rose-900 font-semibold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Retry Cloud
                    </button>
                  )}
                  {onSwitchToLocal && (
                    <button
                      type="button"
                      onClick={onSwitchToLocal}
                      className="px-2.5 py-1 rounded bg-[#1a1a1a] text-white font-semibold text-[11px] hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Switch to Offline Local Engine
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Footer with Quick Actions & Input */}
      <footer className="p-3.5 bg-white border-t border-black/[0.08] space-y-2.5 shrink-0">
        <AssistantQuickActions
          currentPage={currentPage}
          onSelectAction={onSendMessage}
          disabled={isLoading}
          isFirstOpen={messages.length <= 1}
        />
        <AssistantInput onSendMessage={onSendMessage} isLoading={isLoading} />
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 px-0.5">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Grounded in CreatorFlow Context</span>
          </span>
          <span>{ASSISTANT_PROVIDER_LABELS[providerMode]}</span>
        </div>
      </footer>
    </aside>
  );
};
