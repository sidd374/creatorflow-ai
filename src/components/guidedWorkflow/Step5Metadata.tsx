import React, { useState } from 'react';
import { WorkflowMetadata } from '../../types/guidedWorkflow';
import { Copy, Check, Sparkles, MessageSquare, Image, AlignLeft, Type, AlertCircle } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface Step5MetadataProps {
  metadata: WorkflowMetadata;
  onUpdateMetadata: (meta: WorkflowMetadata) => void;
  isShort: boolean;
  onContinue: () => void;
}

type MetaTab = 'Title' | 'Description' | 'Thumbnail' | 'Pinned Comment';

export const Step5Metadata: React.FC<Step5MetadataProps> = ({
  metadata,
  onUpdateMetadata,
  isShort,
  onContinue,
}) => {
  const [activeTab, setActiveTab] = useState<MetaTab>('Title');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast('Copied', `${label} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleTitleChange = (newTitle: string) => {
    onUpdateMetadata({
      ...metadata,
      selectedTitle: newTitle,
      titleCharCount: newTitle.length,
      titleFeedback: newTitle.length > 70 
        ? 'Title exceeds 70 characters and may truncate on mobile feeds.' 
        : 'Optimal length under 70 characters with high search readability.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 8 of 11 — Packaging
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Video Publishing Package
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          High-CTR packaging tailored to convert impressions into clicks and subscribers.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-black/[0.08] shadow-xs">
        <div className="flex border-b border-black/[0.06] overflow-x-auto">
          {[
            { id: 'Title' as MetaTab, label: 'Title', icon: Type },
            { id: 'Description' as MetaTab, label: 'Description', icon: AlignLeft },
            { id: 'Thumbnail' as MetaTab, label: 'Thumbnail Brief', icon: Image },
            { id: 'Pinned Comment' as MetaTab, label: 'Pinned Comment', icon: MessageSquare },
          ].map((t) => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-3 px-4 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[#d4a017] text-[#1a1a1a] bg-[#f8f7f4] font-semibold'
                    : 'border-transparent text-neutral-500 hover:text-[#1a1a1a] hover:bg-stone-50/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#d4a017]' : 'text-neutral-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* 1. TITLE TAB */}
          {activeTab === 'Title' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold">
                    Primary YouTube Title
                  </label>
                  <span className={`font-mono text-xs ${metadata.titleCharCount > 70 ? 'text-rose-600 font-bold' : 'text-neutral-400'}`}>
                    {metadata.titleCharCount} / 100 characters
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={metadata.selectedTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full p-3.5 pr-20 bg-[#f8f7f4] border border-black/[0.12] text-sm font-serif font-normal text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(metadata.selectedTitle, 'title', 'Title')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white border border-black/[0.08] font-mono text-xs text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 shadow-2xs"
                  >
                    {copiedKey === 'title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>

                <div className="text-xs text-neutral-500 font-mono flex items-center gap-1.5 pt-1">
                  <span className="text-[#d4a017]">✓</span>
                  <span>{metadata.titleFeedback}</span>
                </div>
              </div>

              {/* Title Alternatives */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06]">
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold block">
                  Tested Angle Alternatives:
                </span>
                <div className="space-y-2">
                  {metadata.titleAlternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-black/[0.06] hover:border-black/[0.2] flex items-center justify-between gap-3 text-xs text-neutral-800"
                    >
                      <span className="font-serif text-sm">{alt}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTitleChange(alt)}
                          className="font-mono text-[10px] uppercase text-[#d4a017] hover:underline"
                        >
                          Use this
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(alt, `alt_${idx}`, 'Alternative title')}
                          className="p-1 text-neutral-400 hover:text-[#1a1a1a]"
                        >
                          {copiedKey === `alt_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. DESCRIPTION TAB */}
          {activeTab === 'Description' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <div className="text-xs text-neutral-500 font-mono">
                  Full YouTube Studio Description
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(metadata.description.formattedText, 'desc', 'Description')}
                  className="px-3 py-1 bg-[#1a1a1a] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Full Description</span>
                </button>
              </div>

              <textarea
                value={metadata.description.formattedText}
                onChange={(e) => onUpdateMetadata({
                  ...metadata,
                  description: {
                    ...metadata.description,
                    formattedText: e.target.value,
                  },
                })}
                className="w-full p-4 bg-[#f8f7f4] border border-black/[0.12] text-xs font-mono text-neutral-800 leading-relaxed min-h-[220px] focus:outline-none focus:border-[#d4a017]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-600 pt-2">
                <div className="p-3 bg-stone-50 border border-black/[0.05]">
                  <strong className="font-mono text-[10px] uppercase text-neutral-500 block mb-1">Opening Hook:</strong>
                  <p>{metadata.description.opening}</p>
                </div>
                <div className="p-3 bg-stone-50 border border-black/[0.05]">
                  <strong className="font-mono text-[10px] uppercase text-neutral-500 block mb-1">Call to Action:</strong>
                  <p>{metadata.description.callToAction}</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. THUMBNAIL BRIEF */}
          {activeTab === 'Thumbnail' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-5 bg-[#f8f7f4] border border-black/[0.07] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                    Overlay Text Suggestion
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(metadata.thumbnailBrief.overlayText, 'thumb_txt', 'Thumbnail text')}
                    className="font-mono text-xs text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1"
                  >
                    {copiedKey === 'thumb_txt' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Text</span>
                  </button>
                </div>

                <div className="font-serif text-3xl font-normal text-[#1a1a1a] bg-white p-4 border border-black/[0.08] text-center tracking-wider">
                  "{metadata.thumbnailBrief.overlayText}"
                </div>

                <div className="space-y-2 text-xs text-neutral-700 pt-2">
                  <div>
                    <strong className="font-mono text-[10px] uppercase text-neutral-500 block">Composition:</strong>
                    <p>{metadata.thumbnailBrief.compositionGuide}</p>
                  </div>

                  <div>
                    <strong className="font-mono text-[10px] uppercase text-neutral-500 block">Focal Point & Expression:</strong>
                    <p>{metadata.thumbnailBrief.focalPoint} &bull; {metadata.thumbnailBrief.facialExpression}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <strong className="font-mono text-[10px] uppercase text-neutral-500">Color Palette:</strong>
                    <div className="flex items-center gap-1.5">
                      {metadata.thumbnailBrief.colorPalette.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-none border border-black/[0.1] shadow-2xs"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. PINNED COMMENT */}
          {activeTab === 'Pinned Comment' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  Community Engagement Comment
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(metadata.pinnedComment, 'pin', 'Pinned comment')}
                  className="px-3 py-1 bg-[#1a1a1a] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {copiedKey === 'pin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Comment</span>
                </button>
              </div>

              <div className="p-4 bg-[#f8f7f4] border border-black/[0.07] text-xs sm:text-sm text-neutral-800 leading-relaxed font-sans">
                "{metadata.pinnedComment}"
              </div>

              <div className="text-[11px] text-neutral-500 font-mono italic">
                Tip: Pin this comment within the first 10 minutes of publishing and heart top responses to boost initial engagement signals.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
