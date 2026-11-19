import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, RotateCw, ArrowRight, AlertCircle, Cpu, ThumbsUp, ThumbsDown, ShieldCheck } from 'lucide-react';
import { Tool, Language, ToneType } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { LanguageSelector } from '../common/LanguageSelector';
import { LANGUAGES } from '../../data/languages';
import { useToast } from '../ui/Toast';
import { generateContentPack } from '../../lib/contentEngine';
import { getCreatorProfile } from '../../lib/creatorStorage';
import {
  getOrCreatePersonalizationProfile,
  recordImplicitSignal,
} from '../../lib/autonomousEngine/personalizationEngine';
import { getActiveAccountId } from '../../lib/accountStorage';
import {
  CloudErrorCategory,
  GENERATION_PROVIDER_LABELS,
} from '../../lib/aiGenerateService';
import {
  executeAutonomousGeneration,
  recordCandidateFeedback,
  AutonomousGenerationResult,
  GenerationTaskType,
  generateVideoPromptCandidates,
  analyzeTopicSemantics,
  planCreativeStrategies,
} from '../../lib/autonomousEngine';
import { reserveVideoSlotServer, releaseVideoSlotServer, consumesWeeklyVideoSlot } from '../../lib/videoQuota';
import { validatePromptForExport } from '../../lib/promptValidator';
import {
  executeIntelligence,
  IntelligenceClientError,
  IntelligenceTaskType,
  IntelligenceExecutionResponse,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface SingleToolModalProps {
  tool: Tool | null;
  onClose: () => void;
  onGoToFullPack: (topic?: string, lang?: string, tone?: ToneType) => void;
}

function mapToolToTask(toolId: string): GenerationTaskType {
  switch (toolId) {
    case 'title-generator':
      return 'titles';
    case 'hook-generator':
      return 'hooks';
    case 'description-generator':
      return 'captions_descriptions';
    case 'keywords-generator':
    case 'hashtag-generator':
      return 'hashtags_keywords';
    case 'shorts-script-generator':
      return 'short_form_script';
    case 'video-ideas-generator':
      return 'content_ideas';
    case 'video-prompt-generator':
      return 'video_prompt';
    default:
      return 'content_pack';
  }
}

function mapToolToIntelligenceTask(toolId: string): IntelligenceTaskType {
  switch (toolId) {
    case 'title-generator':
    case 'description-generator':
    case 'keywords-generator':
    case 'hashtag-generator':
      return 'title_seo';
    case 'thumbnail-text-generator':
      return 'thumbnail_intelligence';
    case 'video-ideas-generator':
      return 'idea_generation';
    case 'shorts-script-generator':
      return 'script_generation';
    default:
      return 'content_pack';
  }
}

function formatIntelligenceToolResult(
  toolId: string,
  res: IntelligenceExecutionResponse
): Array<{ text: string; tag: string }> {
  const data = res.data || {};
  const badgeSuffix = `Gemini (${res.model}) · Quality ${res.qualityReport.score}/100`;

  if (toolId === 'title-generator') {
    const titles: Array<{ text: string; style?: string }> = Array.isArray(data.titles)
      ? data.titles
      : data.finalTitle
      ? [{ text: data.finalTitle, style: 'Primary' }]
      : [];
    if (titles.length > 0) {
      return titles.map((t) => ({
        text: t.text,
        tag: `${t.style || 'High-CTR'} · ${t.text.length} chars · ${badgeSuffix}`,
      }));
    }
  }

  if (toolId === 'description-generator' && data.description) {
    const d = data.description;
    const chapters = Array.isArray(d.timestamps)
      ? d.timestamps.map((ts: any) => `${ts.time} ${ts.label}`).join('\n')
      : '';
    return [
      { text: `${d.hookLine || ''}\n\n${d.summary || ''}`.trim(), tag: `Hook & Summary · ${badgeSuffix}` },
      ...(chapters ? [{ text: chapters, tag: 'Chapters & Timestamps' }] : []),
      ...(d.callToAction ? [{ text: d.callToAction, tag: 'Call to Action' }] : []),
    ];
  }

  if (toolId === 'keywords-generator') {
    const kws = [
      ...(Array.isArray(data.primaryKeywords) ? data.primaryKeywords : []),
      ...(Array.isArray(data.relatedKeywords) ? data.relatedKeywords : []),
      ...(Array.isArray(data.keywords) ? data.keywords : []),
    ].filter(Boolean);
    if (kws.length > 0) {
      return [
        { text: kws.join(', '), tag: `All ${kws.length} Keywords · ${badgeSuffix}` },
        ...kws.slice(0, 5).map((k) => ({ text: String(k), tag: 'Keyword Tag' })),
      ];
    }
  }

  if (toolId === 'hashtag-generator' && Array.isArray(data.hashtags)) {
    return [
      { text: data.hashtags.join(' '), tag: `${data.hashtags.length} Hashtags · ${badgeSuffix}` },
      ...data.hashtags.slice(0, 5).map((h: string) => ({ text: h, tag: 'Hashtag' })),
    ];
  }

  if (toolId === 'thumbnail-text-generator') {
    const opts = Array.isArray(data.thumbnailTextOptions) ? data.thumbnailTextOptions : [];
    const items = opts.map((o: any) => ({
      text: `"${o.text}"${o.reason ? `\n${o.reason}` : ''}`,
      tag: o.isRecommended ? `Recommended Text · ${badgeSuffix}` : 'Overlay Option',
    }));
    if (data.thumbnailBrief) {
      items.push({
        text: `Main Visual: ${data.thumbnailBrief.mainVisual || ''}\nComposition: ${data.thumbnailBrief.composition || ''}\nLighting & Contrast: ${data.thumbnailBrief.contrast || ''}`,
        tag: 'Visual Brief',
      });
    }
    if (items.length > 0) return items;
  }

  if (toolId === 'video-ideas-generator' && Array.isArray(data.ideas)) {
    return data.ideas.map((idea: any) => ({
      text: `"${idea.title}"\n${idea.suggestedAngle || ''}\nGoal: ${idea.goal || ''} · Time: ${idea.estimatedTime || ''}`.trim(),
      tag: `${idea.format || 'Video'} · ${idea.difficulty || 'Easy'} · ${badgeSuffix}`,
    }));
  }

  if (toolId === 'shorts-script-generator' && Array.isArray(data.scriptSections)) {
    return data.scriptSections.map((s: any) => ({
      text: `${s.label || 'SECTION'} (${s.timeRange || ''})\nSPOKEN: ${s.text}\nVISUAL: ${s.visualCue || ''}`,
      tag: `${s.deliveryTip || 'Script Beat'} · ${badgeSuffix}`,
    }));
  }

  if (toolId === 'hook-generator' && Array.isArray(data.hooks)) {
    return data.hooks.map((h: any) => ({
      text: `"${h.hook}"\nVisual: ${h.deliveryTip || ''}`,
      tag: `${h.type || 'Retention Hook'} · ${badgeSuffix}`,
    }));
  }

  if (toolId === 'pinned-comment-generator' && data.pinnedComment) {
    return [
      { text: data.pinnedComment.comment || '', tag: `Pinned Comment · ${badgeSuffix}` },
      ...(data.pinnedComment.boostTip
        ? [{ text: data.pinnedComment.boostTip, tag: 'Retention Boost Tip' }]
        : []),
    ];
  }

  return [
    {
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      tag: badgeSuffix,
    },
  ];
}

export const SingleToolModal: React.FC<SingleToolModalProps> = ({
  tool,
  onClose,
  onGoToFullPack,
}) => {
  const [inputVal, setInputVal] = useState(tool?.placeholderPrompt?.replace('E.g., ', '') || '');
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [selectedTone, setSelectedTone] = useState<ToneType>('Viral');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('google_flow');
  const [selectedEngine, setSelectedEngine] = useState<'autonomous' | 'gemini_flash'>('gemini_flash');
  const [workflowSessionId] = useState(() => `wf_tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [variationSeed, setVariationSeed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [byokGateError, setByokGateError] = useState<{ code: string; message: string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<{
    type: 'rate_limit' | 'error';
    errorCategory?: CloudErrorCategory | 'video_quota';
    message: string;
  } | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiStructuredItems, setAiStructuredItems] = useState<Array<{ text: string; tag: string }>>([]);
  const [aiMeta, setAiMeta] = useState<IntelligenceExecutionResponse | null>(null);
  const [autonomousResult, setAutonomousResult] = useState<AutonomousGenerationResult | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [hasCopiedCurrentSet, setHasCopiedCurrentSet] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tool) {
      setInputVal(tool.placeholderPrompt?.replace('E.g., ', '') || '');
      setErrorBanner(null);
      setByokGateError(null);
      setAiResponse(null);
      setAiStructuredItems([]);
      setAiMeta(null);
      setAutonomousResult(null);
      setHasCopiedCurrentSet(false);
    }
  }, [tool?.id]);

  useEffect(() => {
    if (!tool) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool, onClose]);

  if (!tool) return null;

  const accountId = getActiveAccountId();

  const handleCopy = (text: string, idx: number, strategy?: any) => {
    let payload = text;
    if (tool.id === 'video-prompt-generator') {
      const check = validatePromptForExport(text, { toolId: selectedVideoModel, kind: 'video_clip' });
      if (!check.valid && !check.sanitizedPreview) {
        toast('Prompt Incomplete', check.errors[0]?.message || 'Video prompt is empty.', 'error');
        return;
      }
      if (check.sanitizedPreview && check.sanitizedPreview !== text.trim()) {
        payload = check.sanitizedPreview;
      }
    }

    navigator.clipboard.writeText(payload);
    setCopiedIndex(idx);
    setHasCopiedCurrentSet(true);

    const strategyToLog = strategy || (tool.id === 'hook-generator' ? 'curiosity_mystery' : 'practical_tutorial');
    const implicitAction = tool.id === 'hook-generator' ? 'copied_hook' : 'copied_title';
    recordImplicitSignal(accountId, strategyToLog, implicitAction, mapToolToTask(tool.id));

    toast('Copied to clipboard', 'Item copied to clipboard.', 'success');
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleFeedback = (candidateId: string, strategy: any, action: 'upvoted' | 'downvoted') => {
    recordCandidateFeedback(accountId, strategy, action, tool.id);
    setFeedbackGiven((prev) => ({ ...prev, [candidateId]: action === 'upvoted' ? 'up' : 'down' }));
    toast(
      'Feedback recorded',
      action === 'upvoted'
        ? 'Candidate upvoted! Your CreatorFlow Local Engine will favor this strategy.'
        : 'Candidate downvoted! Strategy weight reduced.',
      'info'
    );
  };

  const handleGenerate = async (seedBump = false, overrideEngine?: 'autonomous' | 'gemini_flash') => {
    const trimmedInput = inputVal.trim();
    if (!trimmedInput) {
      toast('Topic required', 'Enter a video topic to generate results.', 'error');
      return;
    }

    if (seedBump && !hasCopiedCurrentSet) {
      const topStrategy = autonomousResult?.candidates?.[0]?.strategy || 'curiosity_mystery';
      recordImplicitSignal(accountId, topStrategy, 'regenerated_without_copy', mapToolToTask(tool.id));
    }
    setHasCopiedCurrentSet(false);

    const engineToUse = overrideEngine || selectedEngine;
    if (overrideEngine) {
      setSelectedEngine(overrideEngine);
    }

    const nextSeed = seedBump ? variationSeed + 1 : variationSeed;
    setVariationSeed(nextSeed);
    setIsLoading(true);
    setErrorBanner(null);
    setByokGateError(null);

    // Non-video single utilities (title, hook, description, keywords, hashtag, pinned-comment, thumbnail, ideas)
    // do NOT consume weekly 2-video production workflow slots.
    const consumesVideoSlot = consumesWeeklyVideoSlot(tool.id);
    let reservedFreshSlot = false;

    if (consumesVideoSlot) {
      const reservation = await reserveVideoSlotServer({
        workflowId: workflowSessionId,
        topic: trimmedInput,
      });

      if (!reservation.success) {
        setIsLoading(false);
        const countdownText = reservation.resetsInFormatted ? ` (Next slot resets in ${reservation.resetsInFormatted})` : '';
        setErrorBanner({
          type: 'rate_limit',
          errorCategory: 'video_quota',
          message: `${reservation.message || 'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'}${countdownText}`,
        });
        return;
      }
      reservedFreshSlot = !reservation.alreadyReserved;
    }

    if (engineToUse === 'autonomous') {
      try {
        const task = mapToolToTask(tool.id);
        const result = await executeAutonomousGeneration({
          task,
          topic: trimmedInput,
          platform: tool.id === 'shorts-script-generator' ? 'Shorts' : 'YouTube',
          language: selectedLang.name,
          tone: selectedTone,
          variationSeed: nextSeed,
          candidateCount: 4,
          targetModel: selectedVideoModel,
        });

        if (result.success) {
          setAutonomousResult(result);
          toast('Generated', `${tool.title} updated with ${GENERATION_PROVIDER_LABELS.autonomous}.`, 'success');
        } else {
          if (reservedFreshSlot) {
            await releaseVideoSlotServer({ workflowId: workflowSessionId, topic: trimmedInput });
          }
          setErrorBanner({
            type: 'error',
            errorCategory: 'server_error',
            message: result.error || `Failed to generate content with ${GENERATION_PROVIDER_LABELS.autonomous}. No quota was consumed.`,
          });
        }
      } catch (err: any) {
        if (reservedFreshSlot) {
          await releaseVideoSlotServer({ workflowId: workflowSessionId, topic: trimmedInput });
        }
        setErrorBanner({
          type: 'error',
          errorCategory: 'server_error',
          message: err?.message || 'Error executing generation. No quota was consumed.',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const featureGate = tool.id === 'video-prompt-generator' ? 'tool_aware_creation_kits' : undefined;
      const intelTask = mapToolToIntelligenceTask(tool.id);
      const res = await executeIntelligence({
        task: intelTask,
        feature: featureGate,
        bypassCache: seedBump,
        input: {
          topic: trimmedInput,
          prompt: `Tool: ${tool.title} (${tool.category}). Generate production-ready creator results tailored to the creator's profile and topic.`,
          platform: tool.id === 'shorts-script-generator' ? 'Shorts' : 'YouTube',
          language: selectedLang.name,
          tone: selectedTone,
          toolId: tool.id === 'video-prompt-generator' ? selectedVideoModel : tool.id,
          variationSeed: nextSeed,
        },
      });

      const structured = formatIntelligenceToolResult(tool.id, res);
      setAiStructuredItems(structured);
      setAiMeta(res);
      setAiResponse(
        structured.map((item) => `[${item.tag}]\n${item.text}`).join('\n\n')
      );
      setAutonomousResult(null);
      toast(
        'Generated with Gemini BYOK',
        `${tool.title} scored ${res.qualityReport.score}/100 via ${res.model}.`,
        'success'
      );
    } catch (err: any) {
      if (reservedFreshSlot) {
        await releaseVideoSlotServer({ workflowId: workflowSessionId, topic: trimmedInput });
      }
      if (err instanceof IntelligenceClientError) {
        if (err.requiresByok || err.isQuotaExceeded) {
          setByokGateError({ code: err.code, message: err.message });
        } else {
          const category: CloudErrorCategory =
            err.status === 401
              ? 'unauthorized'
              : err.status === 403
              ? 'feature_locked'
              : err.code === 'TIMEOUT'
              ? 'timeout'
              : 'server_error';
          setErrorBanner({
            type: err.status === 403 ? 'rate_limit' : 'error',
            errorCategory: category,
            message: err.message,
          });
        }
        toast('Gemini BYOK Required', err.message, err.requiresByok ? 'info' : 'error');
      } else {
        const fallbackMsg = err?.message || 'Network error contacting Gemini Intelligence Engine. Your quota was not consumed.';
        setErrorBanner({
          type: 'error',
          errorCategory: 'network_error',
          message: fallbackMsg,
        });
        toast('Gemini Cloud Failed', fallbackMsg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate outputs dynamically using the shared content engine
  const getToolOutputs = () => {
    const topicText = inputVal.trim() || tool.placeholderPrompt?.replace('E.g., ', '') || 'How to grow a YouTube channel';

    try {
      const pack = generateContentPack({
        topic: topicText,
        platform: tool.id === 'shorts-script-generator' ? 'Shorts' : 'YouTube',
        language: selectedLang.name,
        tone: selectedTone,
        variationSeed,
        creatorProfile: getCreatorProfile(),
        personalizationProfile: getOrCreatePersonalizationProfile(accountId),
      });

      switch (tool.id) {
        case 'title-generator':
          return pack.titles.map((t) => ({
            text: t.text,
            tag: `${t.style} · Score: ${t.score || 88}/100 · ${t.charCount} chars`,
          }));

        case 'hook-generator':
          return pack.hooks.map((h) => ({
            text: `"${h.hook}"`,
            tag: `${h.type} | Cue: ${h.deliveryTip}`,
          }));

        case 'description-generator':
          return [
            { text: `${pack.description.hookLine}\n\n${pack.description.summary}`, tag: 'Hook & Summary' },
            {
              text: pack.description.timestamps && pack.description.timestamps.length > 0
                ? pack.description.timestamps.map(ts => `${ts.time} ${ts.label}`).join('\n')
                : '00:00 Intro\n01:30 Main Steps\n04:00 Tips',
              tag: 'Chapters & Timestamps',
            },
            { text: pack.description.linksPlaceholder, tag: 'Resource Placeholders' },
          ];

        case 'keywords-generator':
          return [
            { text: pack.keywords.join(', '), tag: `All ${pack.keywords.length} Comma-Separated Keywords for YouTube Studio` },
            ...pack.keywords.slice(0, 5).map(k => ({ text: k, tag: 'Individual Keyword Tag' })),
          ];

        case 'hashtag-generator':
          return [
            { text: pack.hashtags.join(' '), tag: 'All Trending & Categorized Hashtags' },
            ...pack.hashtags.slice(0, 4).map(h => ({ text: h, tag: 'Hashtag' })),
          ];

        case 'shorts-script-generator':
          return [
            { text: `Title: ${pack.shortsScript.title}\nOpening Hook: "${pack.shortsScript.hook}"`, tag: `0-3s Hook (${pack.shortsScript.duration})` },
            ...pack.shortsScript.body.map(b => ({
              text: `SPOKEN: ${b.audio}\nVISUAL: ${b.visual}`,
              tag: `Beat: ${b.second}`,
            })),
            { text: `Looping CTA: "${pack.shortsScript.cta}"`, tag: 'Final Seconds' },
          ];

        case 'pinned-comment-generator':
          return [
            { text: pack.pinnedComment.comment, tag: 'Ready-to-Paste Comment' },
            { text: `Question: ${pack.pinnedComment.engagementQuestion}`, tag: 'Conversation Angle' },
          ];

        case 'thumbnail-text-generator':
          return [
            ...(pack.thumbnailConcept.overlayOptions || ['STOP THIS', 'IT WORKED?', 'NEVER DO THIS', '10X FASTER']).map(opt => ({
              text: `"${opt}"`,
              tag: '1-4 Word High-CTR Overlay Text',
            })),
            { text: `Composition: ${pack.thumbnailConcept.composition}\nFocal Point: ${pack.thumbnailConcept.focalPoint}`, tag: 'Visual Direction' },
          ];

        case 'video-ideas-generator':
          return (pack.videoIdeas || []).map(idea => ({
            text: `"${idea.title}"\n${idea.description}`,
            tag: idea.angle,
          }));

        case 'video-prompt-generator': {
          const semantics = analyzeTopicSemantics(topicText, selectedLang.name);
          const strategies = planCreativeStrategies(semantics, 4, variationSeed).map(s => s.type);
          const vCandidates = generateVideoPromptCandidates(semantics, strategies, selectedVideoModel, 4, variationSeed);
          return vCandidates.map(c => ({
            text: c.displayText,
            tag: `${c.content.modelName} · Score: ${c.scores.totalScore}/100 · ${c.strategy}`,
          }));
        }

        default:
          return [
            { text: `Optimized YouTube strategy for "${topicText}" in ${selectedLang.name}.`, tag: 'Complete Blueprint' },
          ];
      }
    } catch {
      return [
        { text: `Optimized YouTube strategy for "${topicText}" in ${selectedLang.name}.`, tag: 'Ready' },
      ];
    }
  };

  const outputs = getToolOutputs();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl border border-neutral-200/90 shadow-[0_24px_50px_rgba(0,0,0,0.15)] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-neutral-400 uppercase">{tool.category}</span>
              <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                {tool.badge}
              </span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900">{tool.title}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{tool.description}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Input field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700">
              Your Video Topic or Visual Concept:
            </label>
            <Textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={tool.placeholderPrompt || 'Enter your idea...'}
              rows={3}
            />
          </div>

          {/* Model Selector if Video Prompt Tool */}
          {tool.id === 'video-prompt-generator' && (
            <div className="space-y-1.5 p-3.5 bg-neutral-50 rounded-2xl border border-black/[0.06]">
              <label className="text-xs font-semibold text-neutral-900 flex items-center justify-between">
                <span>Target AI Video Model Profile</span>
                <span className="text-[10px] font-mono text-[#d4a017] uppercase font-bold">Model-Aware Rules Active</span>
              </label>
              <select
                value={selectedVideoModel}
                onChange={(e) => setSelectedVideoModel(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 font-medium focus:border-neutral-900 focus:outline-none"
              >
                <option value="google_flow">Google Flow (10s max, 3D animation, Pixar-style)</option>
                <option value="runway_gen3">Runway Gen-3 Alpha (10s max, Director mode, no neg prompt)</option>
                <option value="sora">OpenAI Sora (20s max take, photorealistic physics, 35mm lens)</option>
                <option value="kling_ai">Kling AI 1.5 (10s max, camera controls, --cfg_scale 0.5)</option>
                <option value="luma_dream_machine">Luma Dream Machine (5s max, 3D camera sweeps)</option>
                <option value="pika_art">Pika 2.0 (4s max, Pikaffects audio cues, -camera)</option>
                <option value="hailuo_ai">Hailuo AI / MiniMax (6s max, natural physics acting)</option>
                <option value="leonardo_ai">Leonardo AI (4s max, 2-Stage Keyframe + Motion)</option>
              </select>
            </div>
          )}

          {/* Options row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LanguageSelector
              label="Select Output Language"
              selectedLanguage={selectedLang.name}
              onSelectLanguage={(l) => setSelectedLang(l)}
              variant="popover"
              className="w-full"
            />

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Output Tone
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as ToneType)}
                className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                <option value="Viral">Viral & High Retention</option>
                <option value="Educational">Educational & Deep Dive</option>
                <option value="Professional">Professional & Authoritative</option>
                <option value="Funny">Funny & Relatable</option>
              </select>
            </div>
          </div>

          {/* Engine Selection & Mode Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 block">
              Generation Engine
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedEngine('autonomous')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  selectedEngine === 'autonomous'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-rose-500" />
                <span>{GENERATION_PROVIDER_LABELS.autonomous}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEngine('gemini_flash')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  selectedEngine === 'gemini_flash'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{GENERATION_PROVIDER_LABELS.gemini_flash}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              {selectedEngine === 'autonomous'
                ? '100% deterministic local engine with topic planning, candidate ranking, and instant zero-cost execution.'
                : 'Server-side Gemini Cloud model (subject to plan allowance & 10 requests/hour rate limit).'}
            </p>
          </div>

          {/* Generate & Regenerate Buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleGenerate(false)}
                  isLoading={isLoading}
                  disabled={isLoading}
                  leftIcon={
                    selectedEngine === 'autonomous' ? (
                      <Cpu className="w-4 h-4 text-rose-300" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    )
                  }
                >
                  {isLoading ? 'Generating...' : 'Generate Results'}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleGenerate(true)}
                  isLoading={isLoading}
                  disabled={isLoading}
                  leftIcon={<RotateCw className="w-3.5 h-3.5 text-neutral-600" />}
                  className="text-xs bg-white"
                >
                  {isLoading ? 'Generating...' : 'Regenerate ↻'}
                </Button>
              </div>

              <span className="text-[11px] text-neutral-400 font-mono">
                {selectedEngine === 'autonomous'
                  ? GENERATION_PROVIDER_LABELS.autonomous
                  : GENERATION_PROVIDER_LABELS.gemini_flash}
              </span>
            </div>

            {/* Clean Inline BYOK Connection / Quota Gate */}
            {byokGateError && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <ByokConnectionGate
                  compact
                  errorCode={byokGateError.code}
                  message={byokGateError.message}
                  onConnected={() => handleGenerate(false, 'gemini_flash')}
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setByokGateError(null);
                      handleGenerate(false, 'autonomous');
                    }}
                    leftIcon={<Cpu className="w-3.5 h-3.5" />}
                    className="text-xs bg-white"
                  >
                    Use Offline {GENERATION_PROVIDER_LABELS.autonomous}
                  </Button>
                </div>
              </div>
            )}

            {/* Clean Inline Banner on Cloud or Quota failure — explicit provider recovery */}
            {errorBanner && (
              <div
                className={`p-3.5 rounded-xl border flex flex-col gap-2.5 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  errorBanner.type === 'rate_limit'
                    ? 'bg-amber-50 border-amber-200/90 text-amber-900'
                    : 'bg-rose-50 border-rose-200/90 text-rose-900'
                }`}
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      errorBanner.type === 'rate_limit' ? 'text-amber-600' : 'text-rose-600'
                    }`}
                  />
                  <div className="flex-1">
                    <strong className="block font-semibold mb-0.5">
                      {errorBanner.errorCategory === 'timeout'
                        ? 'Gemini Cloud Timed Out'
                        : errorBanner.errorCategory === 'network_error'
                          ? 'Gemini Cloud Network Error'
                          : errorBanner.errorCategory === 'feature_locked' ||
                              errorBanner.errorCategory === 'quota_exceeded' ||
                              errorBanner.errorCategory === 'video_quota'
                            ? 'Plan Allowance Reached'
                            : errorBanner.type === 'rate_limit'
                              ? 'Hourly Rate Limit Reached'
                              : 'Gemini Cloud Error'}
                    </strong>
                    <span>{errorBanner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer transition-colors"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Explicit recovery controls: never silent fallback */}
                <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                  {(errorBanner.errorCategory === 'video_quota' ||
                    errorBanner.errorCategory === 'quota_exceeded' ||
                    errorBanner.errorCategory === 'feature_locked') && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d4a017] hover:bg-[#b8890f] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Upgrade Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {errorBanner.errorCategory !== 'video_quota' &&
                    errorBanner.errorCategory !== 'feature_locked' &&
                    errorBanner.errorCategory !== 'quota_exceeded' &&
                    errorBanner.errorCategory !== 'unauthorized' &&
                    errorBanner.errorCategory !== 'invalid_key' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerate(false, 'gemini_flash')}
                        leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                        className="text-xs bg-white border-neutral-300 text-neutral-800"
                      >
                        Retry Cloud
                      </Button>
                    )}

                  {errorBanner.errorCategory !== 'video_quota' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerate(false, 'autonomous')}
                      leftIcon={<Cpu className="w-3.5 h-3.5" />}
                      className="text-xs bg-neutral-900 hover:bg-neutral-800 text-white border-none"
                    >
                      Switch to {GENERATION_PROVIDER_LABELS.autonomous}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Output Area */}
          <div className="pt-4 border-t border-neutral-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Generated Results ({aiStructuredItems.length > 0 ? aiStructuredItems.length : autonomousResult?.candidates.length || outputs.length + (aiResponse ? 1 : 0)})
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {aiMeta && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Quality {aiMeta.qualityReport.score}/100 · {aiMeta.model}{aiMeta.cacheHit ? ' · Cached' : ''}
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  Language: {selectedLang.name} · Tone: {selectedTone}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* If server returned structured Gemini BYOK items, show them cleanly */}
              {aiStructuredItems.length > 0 ? (
                <>
                  {aiStructuredItems.map((item, idx) => (
                    <div
                      key={`ai_${idx}`}
                      className="p-4 rounded-xl border-2 border-[#d4a017]/40 bg-amber-50/40 flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#b8890f]">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 leading-relaxed whitespace-pre-line font-sans">
                          {item.text}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(item.text, -100 - idx)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors shrink-0"
                        title="Copy Result"
                      >
                        {copiedIndex === -100 - idx ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                  {aiMeta?.researchBrief?.sources && aiMeta.researchBrief.sources.length > 0 && (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] space-y-1">
                      <span className="font-mono font-bold uppercase text-neutral-500 block">
                        Grounded Web Sources
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {aiMeta.researchBrief.sources.slice(0, 4).map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-700 underline hover:text-[#d4a017]"
                          >
                            {src.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : aiResponse && (
                <div className="p-4 rounded-xl border-2 border-[#d4a017]/40 bg-amber-50/40 flex items-start justify-between gap-3 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#b8890f]">
                        {GENERATION_PROVIDER_LABELS.gemini_flash} Result
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-neutral-900 leading-relaxed whitespace-pre-line font-sans">
                      {aiResponse}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(aiResponse, -1)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors shrink-0"
                    title="Copy Cloud Result"
                  >
                    {copiedIndex === -1 ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Autonomous Engine Candidates */}
              {autonomousResult && autonomousResult.candidates.length > 0 ? (
                autonomousResult.candidates.map((cand, idx) => (
                  <div
                    key={cand.id}
                    className="p-3.5 rounded-xl border border-neutral-200/80 bg-stone-50/50 flex items-start justify-between gap-3 transition-all hover:border-neutral-300"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                          {cand.strategy.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                          Score: {cand.scores.totalScore}/100
                        </span>
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {cand.originalityScore}% Unique
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 leading-relaxed whitespace-pre-line">
                        {cand.displayText}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleFeedback(cand.id, cand.strategy, 'upvoted')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          feedbackGiven[cand.id] === 'up'
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100'
                        }`}
                        title="Upvote strategy (trains engine to favor this)"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(cand.id, cand.strategy, 'downvoted')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          feedbackGiven[cand.id] === 'down'
                            ? 'text-rose-600 bg-rose-50'
                            : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100'
                        }`}
                        title="Downvote strategy (reduces weight)"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(cand.displayText, idx, cand.strategy)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                outputs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-neutral-200/80 bg-stone-50/50 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 leading-relaxed whitespace-pre-line">
                        {item.text}
                      </p>
                      <span className="text-[11px] text-neutral-400 font-mono mt-1 block">
                        {item.tag}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(item.text, idx)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors shrink-0"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span>Want the full complete pack with titles, hooks, description & script?</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onGoToFullPack(inputVal.trim(), selectedLang.name, selectedTone);
            }}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs bg-white"
          >
            Generate Full Content Pack
          </Button>
        </div>
      </div>
    </div>
  );
};
