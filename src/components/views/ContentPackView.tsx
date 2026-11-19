import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  Download, 
  Sparkles, 
  Tag, 
  Hash, 
  FileText, 
  Smartphone, 
  MessageSquare, 
  Image as ImageIcon,
  Anchor,
  Heading,
  Lightbulb,
  Copy,
  Check,
  Lock
} from 'lucide-react';
import { ContentPack } from '../../types';
import { Button } from '../ui/Button';
import { ResultCard } from '../common/ResultCard';
import { useToast } from '../ui/Toast';
import { canAccess } from '../../lib/planEntitlements';
import { getActiveAccountId } from '../../lib/accountStorage';
import { recordImplicitSignal } from '../../lib/autonomousEngine/personalizationEngine';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface ContentPackViewProps {
  pack: ContentPack;
  isGenerating?: boolean;
  byokError?: {
    code: string;
    message: string;
    pendingRequest: { topic: string; platform: any; language: string; tone: any };
  } | null;
  onRetryPendingPack?: () => void;
  onUseLocalFallback?: () => void;
  onBack: () => void;
  onSaveToggle: (packId: string) => void;
  onRegenerate: () => void;
}

export const ContentPackView: React.FC<ContentPackViewProps> = ({
  pack,
  isGenerating = false,
  byokError = null,
  onRetryPendingPack,
  onUseLocalFallback,
  onBack,
  onSaveToggle,
  onRegenerate,
}) => {
  const [isSaved, setIsSaved] = useState(pack.isSaved || false);
  const [copiedOverlayIdx, setCopiedOverlayIdx] = useState<number | null>(null);
  const [expandedScoreIdx, setExpandedScoreIdx] = useState<number | null>(null);
  const [hasInteractedWithPack, setHasInteractedWithPack] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setHasInteractedWithPack(false);
    setIsSaved(pack.isSaved || false);
  }, [pack.id, pack.isSaved]);

  const accountId = getActiveAccountId();

  const handleRegenerateWithSignal = () => {
    if (!hasInteractedWithPack) {
      recordImplicitSignal(accountId, 'curiosity_mystery', 'regenerated_without_copy', 'content_pack');
    }
    onRegenerate();
  };

  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setHasInteractedWithPack(true);
    onSaveToggle(pack.id);
    toast(
      nextSaved ? 'Saved to Library' : 'Removed from Saved',
      nextSaved ? 'You can access this pack anytime under Saved.' : 'Pack unsaved.',
      'success'
    );
  };

  const handleCopyText = (text: string, label: string, signalAction?: 'copied_title' | 'copied_hook') => {
    navigator.clipboard.writeText(text);
    setHasInteractedWithPack(true);
    if (signalAction) {
      recordImplicitSignal(accountId, signalAction === 'copied_hook' ? 'curiosity_mystery' : 'practical_tutorial', signalAction, 'content_pack');
    }
    toast('Copied to clipboard', `${label} copied to clipboard.`, 'success');
  };

  const handleExportAll = () => {
    const chaptersText = pack.description.timestamps && pack.description.timestamps.length > 0
      ? pack.description.timestamps.map(ts => `${ts.time} ${ts.label}`).join('\n')
      : 'Short-form content — no longform chapters needed.';

    const videoIdeasText = pack.videoIdeas && pack.videoIdeas.length > 0
      ? pack.videoIdeas.map((v, i) => `${i + 1}. [${v.angle}]\nTitle: "${v.title}"\nAngle: ${v.description}`).join('\n\n')
      : '1. Beginner Tutorial\n2. Common Mistakes\n3. 30-Day Challenge\n4. Old vs New Comparison\n5. Advanced Tips';

    const fullText = `CREATORFLOW AI — CONTENT PACK

TOPIC: ${pack.topic}
PLATFORM: ${pack.platform}
LANGUAGE: ${pack.language}
TONE: ${pack.tone}

TITLE IDEAS
${pack.titles.map((t, i) => `${i + 1}. ${t.text} (${t.charCount} chars | CreatorFlow Score: ${t.score || 88}/100 | Formula: ${t.style})`).join('\n')}

RETENTION HOOKS
${pack.hooks.map((h, i) => `Hook ${i + 1} [${h.type}]:\nSPOKEN: "${h.hook}"\nVISUAL: ${h.deliveryTip}\nRETENTION REASON: ${h.retentionReason || 'Pattern interrupt to retain watch time'}`).join('\n\n')}

DESCRIPTION
${pack.description.hookLine}

${pack.description.summary}

${pack.description.valuePoints ? pack.description.valuePoints.join('\n') : ''}

${pack.description.linksPlaceholder}

${pack.description.callToAction}

CHAPTERS
${chaptersText}

KEYWORDS
${pack.keywords.join(', ')}

HASHTAGS
${pack.hashtags.join(' ')}

SHORTS SCRIPT
Title: ${pack.shortsScript.title}
Target Run: ${pack.shortsScript.duration}
Hook: "${pack.shortsScript.hook}"

${pack.shortsScript.body.map(b => `[${b.second}]\nSPOKEN: ${b.audio}\nVISUAL: ${b.visual}`).join('\n\n')}
CTA: "${pack.shortsScript.cta}"

PINNED COMMENT
${pack.pinnedComment.comment}

THUMBNAIL CONCEPT
Overlay Text: "${pack.thumbnailConcept.overlayText}"
Alternative Text Options: ${pack.thumbnailConcept.overlayOptions ? pack.thumbnailConcept.overlayOptions.join(' | ') : 'STOP THIS | 10X FASTER | THE SECRET'}
Composition: ${pack.thumbnailConcept.composition}
Focal Point: ${pack.thumbnailConcept.focalPoint}
Background: ${pack.thumbnailConcept.background || 'High-contrast studio dark slate'}
Visual Contrast: ${pack.thumbnailConcept.visualContrast || 'Vibrant rim lighting against deep background'}
Text Placement: ${pack.thumbnailConcept.textPlacement || 'Top quadrant away from time badge'}
Facial Expression: ${pack.thumbnailConcept.facialExpression}
Color Palette: ${pack.thumbnailConcept.colorPalette.join(', ')}
Psychological Trigger: ${pack.thumbnailConcept.psychologicalTrigger}

VIDEO IDEAS
${videoIdeasText}
`;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CreatorFlow_${pack.topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setHasInteractedWithPack(true);
    recordImplicitSignal(accountId, 'practical_tutorial', 'exported_pack', 'content_pack');
    toast('Pack Exported', 'Full content pack downloaded with all sections as a .txt file.', 'success');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSave}
            leftIcon={
              <Bookmark
                className={`w-3.5 h-3.5 ${isSaved ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-500'}`}
              />
            }
            className="text-xs bg-white h-9"
          >
            {isSaved ? 'Saved' : 'Save Pack'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportAll}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs h-9"
          >
            Export All (.txt)
          </Button>
        </div>
      </div>

      {/* Content Pack Meta Header Card */}
      <div className="p-6 sm:p-7 bg-white rounded-lg border border-black/[0.08] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mb-2 font-mono text-[11px]">
          <span className="font-semibold text-neutral-800 uppercase">{pack.platform} Format</span>
          <span>·</span>
          <span>Language: {pack.language}</span>
          <span>·</span>
          <span>Tone: {pack.tone}</span>
          <span>·</span>
          <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
          {pack.variationSeed !== undefined && pack.variationSeed > 0 && (
            <>
              <span>·</span>
              <span className="text-[#d4a017] font-semibold">Variation #{pack.variationSeed + 1}</span>
            </>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal text-[#1a1a1a] tracking-tight leading-snug">
          {pack.topic}
        </h1>

        {byokError && (
          <div className="mb-4 space-y-2">
            <ByokConnectionGate
              errorCode={byokError.code}
              message={byokError.message}
              onConnected={onRetryPendingPack}
            />
            {onUseLocalFallback && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onUseLocalFallback}
                  className="text-xs font-mono text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                >
                  Or generate offline draft with Local Engine instead
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-sans">
              {pack.aiPowered
                ? `Gemini BYOK Intelligence (${pack.aiModelUsed || 'gemini-4-hydrogen'})`
                : 'Offline Local Generation Blueprint'}
            </span>
            {pack.qualityReport && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                Quality {pack.qualityReport.score}/100{pack.qualityReport.repaired ? ' · Repaired' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerateWithSignal}
              disabled={isGenerating}
              className="text-xs font-semibold text-[#d4a017] hover:text-[#b8890f] uppercase font-mono tracking-wider cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? 'Generating AI Pack…' : 'Regenerate with Gemini ↻'}
            </button>
            <span className="font-mono text-neutral-400 text-[11px]">
              ID: {pack.id}
            </span>
          </div>
        </div>

        {pack.researchSources && pack.researchSources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/[0.05] text-[11px] text-neutral-600 flex flex-wrap items-center gap-2">
            <span className="font-mono uppercase font-bold text-neutral-400">Sources:</span>
            {pack.researchSources.slice(0, 4).map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#d4a017]"
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* GENERATED SECTIONS */}
      <div className="space-y-6">
        {/* 1. TITLE IDEAS */}
        <ResultCard
          title="TITLE IDEAS"
          subtitle="5 distinct formulas with CreatorFlow Score (1-100) estimated from curiosity, specificity & character length"
          badge="5 Variations"
          icon={<Heading className="w-5 h-5 text-neutral-800" />}
          contentToCopy={pack.titles.map((t, i) => `${i + 1}. ${t.text} (CreatorFlow Score: ${t.score || 88}/100)`).join('\n')}
          onRegenerate={handleRegenerateWithSignal}
          onCopy={() => {
            setHasInteractedWithPack(true);
            recordImplicitSignal(accountId, 'curiosity_mystery', 'copied_title', 'content_pack');
          }}
        >
          <div className="space-y-3">
            {pack.titles.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-neutral-200/70 hover:border-neutral-300 bg-stone-50/40 hover:bg-stone-50/80 transition-colors flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs font-bold text-neutral-400 w-5 shrink-0 mt-0.5 sm:mt-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900 leading-snug">
                        {t.text}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                        <span>Formula: {t.style}</span>
                        <span>·</span>
                        <span className="font-mono">{t.charCount} chars</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-neutral-900 bg-white px-2.5 py-1 rounded-md border border-neutral-200 shadow-2xs">
                        CreatorFlow Score: <span className="text-rose-600">{t.score || 88}</span>/100
                      </div>
                      {t.explanations && t.explanations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedScoreIdx(expandedScoreIdx === idx ? null : idx)}
                          className="text-[10px] text-[#d4a017] hover:underline cursor-pointer block mt-1 font-medium ml-auto"
                        >
                          {expandedScoreIdx === idx ? 'Hide Score Breakdown ▲' : 'Why this score? ▼'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expandedScoreIdx === idx && t.explanations && t.explanations.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-neutral-200/60 text-xs text-neutral-600 space-y-1.5 bg-white p-3 rounded-lg border border-neutral-200/50">
                    <div className="font-semibold text-neutral-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
                      <span>Transparent Factor Breakdown:</span>
                      <span className="text-[10px] text-neutral-400 font-mono">100% Deterministic Engine</span>
                    </div>
                    {t.explanations.map((exp, expIdx) => (
                      <div key={expIdx} className="flex items-start gap-1.5 text-[11px] text-neutral-700">
                        <span className="text-emerald-600 font-bold leading-none mt-0.5">•</span>
                        <span>{exp}</span>
                      </div>
                    ))}
                    {t.scoreDisclaimer && (
                      <div className="text-[10px] text-neutral-400 italic pt-1 border-t border-neutral-200/40">
                        {t.scoreDisclaimer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <p className="text-[11px] text-neutral-400 font-mono pt-1">
              Note: CreatorFlow Score is an estimated structural indicator computed deterministically from topic relevance, readability, curiosity vocabulary, and platform boundaries. It does not predict or guarantee views.
            </p>
          </div>
        </ResultCard>

        {/* 2. HOOKS */}
        <ResultCard
          title="RETENTION HOOKS"
          subtitle="3 high-retention formulas (Curiosity, Painful Problem, High-Stakes Promise) with visual suggestions"
          badge="3 Formulas"
          icon={<Anchor className="w-5 h-5 text-neutral-800" />}
          contentToCopy={pack.hooks.map((h, i) => `${h.type}:\nSPOKEN: "${h.hook}"\nVISUAL: ${h.deliveryTip}\nRETENTION REASON: ${h.retentionReason || 'Retention hook'}`).join('\n\n')}
          onRegenerate={handleRegenerateWithSignal}
          onCopy={() => {
            setHasInteractedWithPack(true);
            recordImplicitSignal(accountId, 'curiosity_mystery', 'copied_hook', 'content_pack');
          }}
        >
          <div className="space-y-4">
            {pack.hooks.map((h, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-xl border border-neutral-200/70 bg-stone-50/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {h.type}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">0:00 – 0:05</span>
                </div>

                <blockquote className="text-sm sm:text-base font-semibold text-neutral-900 leading-relaxed pl-3 border-l-2 border-rose-500">
                  "{h.hook}"
                </blockquote>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-white p-3 rounded-lg border border-neutral-200/60">
                    <span className="font-semibold text-neutral-800 block mb-0.5">Visual Suggestion:</span>
                    <span className="text-neutral-600">{h.deliveryTip}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-neutral-200/60">
                    <span className="font-semibold text-neutral-800 block mb-0.5">Retention Reason:</span>
                    <span className="text-neutral-600">{h.retentionReason || 'Forces curiosity gap to prevent opening 15-second drop-off.'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ResultCard>

        {/* 3. DESCRIPTION */}
        <ResultCard
          title="SEO DESCRIPTION & CHAPTERS"
          subtitle="YouTube search-optimized structure with above-the-fold hook, summary, chapters & links placeholder"
          badge="Full Meta"
          icon={<FileText className="w-5 h-5 text-neutral-800" />}
          contentToCopy={`${pack.description.hookLine}\n\n${pack.description.summary}\n\n${pack.description.valuePoints ? pack.description.valuePoints.join('\n') : ''}\n\nTimestamps:\n${pack.description.timestamps.map(ts => `${ts.time} ${ts.label}`).join('\n')}\n\n${pack.description.linksPlaceholder}\n\n${pack.description.callToAction}`}
          onRegenerate={onRegenerate}
        >
          <div className="space-y-4 text-xs sm:text-sm text-neutral-700 bg-stone-50/40 p-5 rounded-2xl border border-neutral-200/70 font-sans">
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Opening Hook Line (Above The Fold)
              </span>
              <p className="font-semibold text-neutral-900 leading-relaxed">
                {pack.description.hookLine}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Video Summary & Core Value
              </span>
              <p className="text-neutral-600 leading-relaxed">
                {pack.description.summary}
              </p>
            </div>

            {pack.description.valuePoints && pack.description.valuePoints.length > 0 && (
              <div className="space-y-1 bg-white p-3.5 rounded-xl border border-neutral-200/60">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  Main Value Points
                </span>
                {pack.description.valuePoints.map((pt, i) => (
                  <div key={i} className="text-neutral-700 text-xs">{pt}</div>
                ))}
              </div>
            )}

            {pack.description.timestamps && pack.description.timestamps.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/70">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  Video Chapters / Timestamps
                </span>
                <div className="space-y-1 font-mono text-xs bg-white p-3.5 rounded-xl border border-neutral-200/60">
                  {pack.description.timestamps.map((ts, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-rose-600 font-semibold">{ts.time}</span>
                      <span className="text-neutral-800">{ts.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-200/70 text-neutral-600 whitespace-pre-line text-xs font-mono bg-white p-3.5 rounded-xl border border-neutral-200/60">
              {pack.description.linksPlaceholder}
            </div>

            <div className="text-xs font-medium text-neutral-800 pt-1">
              {pack.description.callToAction}
            </div>
          </div>
        </ResultCard>

        {/* 4. KEYWORDS */}
        <ResultCard
          title="KEYWORDS & SEARCH TAGS"
          subtitle="10–15 topic-specific keywords, long-tail phrases and question variations for YouTube Studio"
          badge={`${pack.keywords.length} tags`}
          icon={<Tag className="w-5 h-5 text-neutral-800" />}
          contentToCopy={pack.keywords.join(', ')}
          onRegenerate={onRegenerate}
        >
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {pack.keywords.map((kw, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyText(kw, 'Keyword')}
                  className="px-3 py-1.5 bg-neutral-100/90 hover:bg-neutral-200 text-neutral-800 text-xs font-mono rounded-lg border border-neutral-200/70 transition-colors"
                  title="Click to copy individual keyword"
                >
                  {kw}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              Tip: Click any keyword to copy individually, or use the "Copy" button above to grab all comma-separated tags for YouTube Studio.
            </p>
          </div>
        </ResultCard>

        {/* 5. HASHTAGS */}
        <ResultCard
          title="HASHTAGS"
          subtitle="8–12 relevant hashtags mixing broad, niche, topic, and audience categories"
          badge={`${pack.hashtags.length} hashtags`}
          icon={<Hash className="w-5 h-5 text-neutral-800" />}
          contentToCopy={pack.hashtags.join(' ')}
          onRegenerate={onRegenerate}
        >
          <div className="flex flex-wrap gap-2">
            {pack.hashtags.map((ht, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-100 font-mono"
              >
                {ht}
              </span>
            ))}
          </div>
        </ResultCard>

        {/* 6. SHORTS SCRIPT */}
        <ResultCard
          title="VIRAL SHORTS SCRIPT"
          subtitle={`Complete short-form script calibrated by timing: 0-3s Hook, 3-10s Setup, 10-25s Value, 25-35s Payoff, and Looping CTA (${pack.shortsScript.duration})`}
          badge="Shorts & Reels"
          icon={<Smartphone className="w-5 h-5 text-neutral-800" />}
          contentToCopy={`Title: ${pack.shortsScript.title}\nHook: "${pack.shortsScript.hook}"\n\n${pack.shortsScript.body.map(b => `[${b.second}]\nSPOKEN: ${b.audio}\nVISUAL: ${b.visual}`).join('\n\n')}\n\nCTA: "${pack.shortsScript.cta}"`}
          onRegenerate={onRegenerate}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{pack.shortsScript.title}</h4>
                <span className="text-xs text-neutral-400 font-mono">Target Run: {pack.shortsScript.duration}</span>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-900 text-white rounded-xl text-xs space-y-1">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">
                0–3s Hook (First 3 Seconds)
              </span>
              <p className="font-medium text-sm leading-relaxed">
                "{pack.shortsScript.hook}"
              </p>
            </div>

            <div className="space-y-2.5">
              {pack.shortsScript.body.map((beat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-stone-50/50 rounded-xl border border-neutral-200/70 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs"
                >
                  <div className="md:col-span-2 font-mono text-neutral-400 font-semibold">
                    {beat.second}
                  </div>
                  <div className="md:col-span-5 text-neutral-800 font-medium">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">Spoken Audio:</span>
                    {beat.audio}
                  </div>
                  <div className="md:col-span-5 text-neutral-500">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">Visual Direction:</span>
                    {beat.visual}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-neutral-100 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-neutral-700">Seamless Looping CTA:</span>
              <span className="italic text-neutral-600">"{pack.shortsScript.cta}"</span>
            </div>
          </div>
        </ResultCard>

        {/* 7. PINNED COMMENT */}
        <ResultCard
          title="PINNED COMMENT GENERATOR"
          subtitle="Conversation starter and engaging community question tailored to your topic"
          badge="Algorithm Booster"
          icon={<MessageSquare className="w-5 h-5 text-neutral-800" />}
          contentToCopy={pack.pinnedComment.comment}
          onRegenerate={onRegenerate}
        >
          <div className="space-y-3">
            <div className="p-4 bg-stone-50/60 rounded-xl border border-neutral-200/70 text-xs sm:text-sm font-medium text-neutral-900 leading-relaxed whitespace-pre-line">
              {pack.pinnedComment.comment}
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-800">Retention Strategy:</span>
              <span>{pack.pinnedComment.boostTip}</span>
            </div>
          </div>
        </ResultCard>

        {/* 8. THUMBNAIL TEXT & CONCEPT */}
        <ResultCard
          title="THUMBNAIL TEXT & VISUAL CONCEPT"
          subtitle="Short 1–4 word punchy overlay options, composition, contrast, and focal point directions"
          badge="Visual Strategy"
          icon={<ImageIcon className="w-5 h-5 text-neutral-800" />}
          contentToCopy={`Thumbnail Direction:\nOverlay Text: "${pack.thumbnailConcept.overlayText}"\nOptions: ${pack.thumbnailConcept.overlayOptions ? pack.thumbnailConcept.overlayOptions.join(' | ') : 'N/A'}\nComposition: ${pack.thumbnailConcept.composition}\nFocal Point: ${pack.thumbnailConcept.focalPoint}\nBackground: ${pack.thumbnailConcept.background || 'Dark slate studio'}\nVisual Contrast: ${pack.thumbnailConcept.visualContrast || 'High'}\nFacial Expression: ${pack.thumbnailConcept.facialExpression}\nSuggested Placement: ${pack.thumbnailConcept.textPlacement || 'Top-left'}\nColor Palette: ${pack.thumbnailConcept.colorPalette.join(', ')}\nPsychological Trigger: ${pack.thumbnailConcept.psychologicalTrigger}`}
          onRegenerate={onRegenerate}
        >
          <div className="space-y-4">
            {/* 3-5 Short Thumbnail Text Options */}
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                1–4 Word High-CTR Text Options (Click to copy)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(pack.thumbnailConcept.overlayOptions || ['STOP THIS', 'IT WORKED?', 'NEVER DO THIS', '10X FASTER']).map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => {
                      navigator.clipboard.writeText(opt);
                      setCopiedOverlayIdx(oIdx);
                      toast('Copied', `"${opt}" copied.`, 'success');
                      setTimeout(() => setCopiedOverlayIdx(null), 1500);
                    }}
                    className="p-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-center font-bold text-xs sm:text-sm font-mono tracking-tight flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{opt}</span>
                    {copiedOverlayIdx === oIdx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-400 ml-1 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Concept details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-neutral-100">
              <div className="p-4 bg-stone-50/40 rounded-xl border border-neutral-200/70 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Composition & Focal Point
                </span>
                <p className="font-medium text-neutral-900 leading-relaxed">
                  {pack.thumbnailConcept.composition}
                </p>
                <p className="text-neutral-500 text-xs">
                  <span className="font-semibold text-neutral-700">Focal Point:</span> {pack.thumbnailConcept.focalPoint}
                </p>
                <p className="text-neutral-500 text-xs">
                  <span className="font-semibold text-neutral-700">Facial Reaction:</span> {pack.thumbnailConcept.facialExpression}
                </p>
              </div>

              <div className="p-4 bg-stone-50/40 rounded-xl border border-neutral-200/70 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Contrast, Background & Placement
                </span>
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-700">Background:</span> {pack.thumbnailConcept.background || 'Deep slate neutral field with colored rim illumination.'}
                </p>
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-700">Visual Contrast:</span> {pack.thumbnailConcept.visualContrast || 'Sharp separation between foreground subject and background.'}
                </p>
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-700">Text Placement:</span> {pack.thumbnailConcept.textPlacement || 'Top-left or top-center (avoid bottom right).'}
                </p>
                <p className="text-neutral-500 text-xs">
                  <span className="font-semibold text-neutral-700">Psychological Trigger:</span> {pack.thumbnailConcept.psychologicalTrigger}
                </p>
              </div>
            </div>
          </div>
        </ResultCard>

        {/* 9. VIDEO IDEAS GENERATOR (5 RELATED IDEAS) */}
        {pack.videoIdeas && pack.videoIdeas.length > 0 && (
          <ResultCard
            title="RELATED VIDEO IDEAS & SPIN-OFFS"
            subtitle="5 distinct angles (Beginner, Mistakes, 30-Day Challenge, Comparison, Advanced) for future uploads"
            badge="5 Angles"
            icon={<Lightbulb className="w-5 h-5 text-neutral-800" />}
            contentToCopy={pack.videoIdeas.map((v, i) => `${i + 1}. [${v.angle}]\nTitle: "${v.title}"\nDescription: ${v.description}`).join('\n\n')}
            onRegenerate={onRegenerate}
          >
            <div className="space-y-3">
              {pack.videoIdeas.map((idea, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-neutral-200/70 bg-stone-50/40 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">
                      {idea.angle}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 mb-1">
                      "{idea.title}"
                    </h4>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      {idea.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyText(`"${idea.title}"\n${idea.description}`, 'Video Idea')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-white transition-colors self-end sm:self-auto shrink-0"
                    title="Copy this video idea"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </ResultCard>
        )}
      </div>
    </div>
  );
};
