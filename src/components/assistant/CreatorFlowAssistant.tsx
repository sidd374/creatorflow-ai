import React, { useState, useEffect } from 'react';
import { CreatorProfile, RecommendedVideoIdea, VideoProject, VideoAnalytics } from '../../types';
import { CreatorWorkflowState } from '../../types/guidedWorkflow';
import {
  AssistantMessage as IAssistantMessage,
  getAssistantHistory,
  saveAssistantHistory,
  clearAssistantHistory,
  incrementAssistantUsage,
} from '../../lib/assistantStorage';
import { buildAssistantContext } from '../../lib/assistantContext';
import {
  defaultAssistantProvider,
  AssistantProviderMode,
  AssistantProviderError,
} from '../../lib/assistantProvider';
import { AssistantButton } from './AssistantButton';
import { AssistantPanel } from './AssistantPanel';

interface CreatorFlowAssistantProps {
  currentPage: string;
  creatorProfile?: CreatorProfile | null;
  workflowState?: CreatorWorkflowState | null;
  activeProject?: VideoProject | null;
  activeIdea?: RecommendedVideoIdea | null;
  ideas?: RecommendedVideoIdea[];
  projects?: VideoProject[];
  analyticsList?: VideoAnalytics[];
}

const WELCOME_MESSAGE: IAssistantMessage = {
  id: 'welcome_init',
  role: 'assistant',
  content:
    "Hey! I'm CreatorFlow AI. I can help you understand your strategy, ideas, tools, Creation Kit, and next steps.",
  timestamp: Date.now(),
};

export const CreatorFlowAssistant: React.FC<CreatorFlowAssistantProps> = ({
  currentPage,
  creatorProfile,
  workflowState,
  activeProject,
  activeIdea,
  ideas = [],
  projects = [],
  analyticsList = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [providerMode, setProviderMode] = useState<AssistantProviderMode>('cloud');
  const [messages, setMessages] = useState<IAssistantMessage[]>(() => {
    const saved = getAssistantHistory();
    return saved.length > 0 ? saved : [WELCOME_MESSAGE];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cloudError, setCloudError] = useState<{
    code?: string;
    message: string;
    lastUserText: string;
    pendingMessages: IAssistantMessage[];
  } | null>(null);

  // Save history on changes
  useEffect(() => {
    if (messages.length > 0) {
      saveAssistantHistory(messages);
    }
  }, [messages]);

  const executeAssistantRequest = async (
    conversationMessages: IAssistantMessage[],
    lastUserText: string,
    modeToUse: AssistantProviderMode
  ) => {
    setIsLoading(true);
    setCloudError(null);
    incrementAssistantUsage();

    try {
      const context = buildAssistantContext({
        currentPage,
        creatorProfile,
        workflowState,
        activeProject,
        activeIdea,
        ideas,
        projects,
        analyticsList,
      });

      const replyText = await defaultAssistantProvider.generateResponse(
        conversationMessages,
        context,
        modeToUse
      );

      const assistantMsg: IAssistantMessage = {
        id: `msg_ast_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (modeToUse === 'cloud') {
        const msg =
          err instanceof AssistantProviderError
            ? err.message
            : err?.message || 'Gemini Cloud failed to reply. Your quota was not consumed.';
        const errCode =
          err instanceof AssistantProviderError ? err.code : undefined;
        setCloudError({
          code: errCode,
          message: msg,
          lastUserText,
          pendingMessages: conversationMessages,
        });
      } else {
        const fallbackMsg: IAssistantMessage = {
          id: `msg_ast_${Date.now()}`,
          role: 'assistant',
          content:
            "CreatorFlow Local Engine encountered an issue processing that request. Please rephrase or continue using your workspace tools.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: IAssistantMessage = {
      id: `msg_usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await executeAssistantRequest(nextMessages, text, providerMode);
  };

  const handleRetryCloud = async () => {
    if (!cloudError) return;
    await executeAssistantRequest(cloudError.pendingMessages, cloudError.lastUserText, 'cloud');
  };

  const handleSwitchToLocal = async () => {
    setProviderMode('local');
    if (!cloudError) return;
    await executeAssistantRequest(cloudError.pendingMessages, cloudError.lastUserText, 'local');
  };

  const handleClearHistory = () => {
    clearAssistantHistory();
    setCloudError(null);
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      <AssistantButton onClick={() => setIsOpen(true)} isOpen={isOpen} />
      {isOpen && (
        <AssistantPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onClearHistory={handleClearHistory}
          onClose={() => setIsOpen(false)}
          isLoading={isLoading}
          currentPage={currentPage}
          providerMode={providerMode}
          onChangeProviderMode={(mode) => {
            setProviderMode(mode);
            setCloudError(null);
          }}
          cloudError={cloudError ? { code: cloudError.code, message: cloudError.message } : null}
          onRetryCloud={handleRetryCloud}
          onSwitchToLocal={handleSwitchToLocal}
          onDismissError={() => setCloudError(null)}
        />
      )}
    </>
  );
};
