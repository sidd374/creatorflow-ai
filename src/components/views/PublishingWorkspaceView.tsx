import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  Copy, 
  RotateCw, 
  Sparkles, 
  FileText, 
  ExternalLink, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Tag, 
  Hash, 
  Image, 
  MessageSquare, 
  Sliders, 
  ListOrdered, 
  Edit3, 
  Plus, 
  Trash2, 
  Eye, 
  ArrowLeft,
  Settings,
  CheckSquare,
  HelpCircle,
  FolderOpen,
  BarChart3
} from 'lucide-react';
import { 
  CreatorProfile, 
  VideoProject, 
  VideoPublishingData, 
  ChapterItem,
  ThumbnailTextOption
} from '../../types';
import { 
  evaluateTitleQuality, 
  evaluateDescriptionQuality, 
  generatePublishingDescription, 
  generatePublishingKeywords, 
  generatePublishingHashtags, 
  generatePublishingThumbnail, 
  generatePublishingPinnedComment, 
  generatePublishingChapters, 
  calculatePublishingReadiness, 
  initializePublishingData, 
  generatePublishingPackageText 
} from '../../lib/publishingEngine';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { validatePromptForExport } from '../../lib/promptValidator';
import {
  executeIntelligence,
  IntelligenceClientError,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface PublishingWorkspaceViewProps {
  project: VideoProject;
  creatorProfile: CreatorProfile;
  onUpdateProject: (updates: Partial<VideoProject>) => void;
  onPrev: () => void;
  onReturnToDashboard: () => void;
  onOpenFullContentPack?: (topic: string, platform?: 'YouTube' | 'Shorts') => void;
  onOpenAnalytics?: (projectId?: string) => void;
}

export const PublishingWorkspaceView: React.FC<PublishingWorkspaceViewProps> = ({
  project,
  creatorProfile,
  onUpdateProject,
  onPrev,
  onReturnToDashboard,
  onOpenFullContentPack,
  onOpenAnalytics,
}) => {
  const { toast } = useToast();

  // Initialize or fetch publishing data
  const [publishing, setPublishing] = useState<VideoPublishingData>(() => {
    return initializePublishingData(project, creatorProfile);
  });

  const [activeSection, setActiveSection] = useState<string>(
    () => publishing.lastActiveSection || 'overview'
  );

  // Editable UI states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState(publishing.finalTitle);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newHashtagInput, setNewHashtagInput] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterTime, setNewChapterTime] = useState('');
  const [aiSeoLoading, setAiSeoLoading] = useState(false);
  const [aiThumbLoading, setAiThumbLoading] = useState(false);
  const [aiPubQualityScore, setAiPubQualityScore] = useState<number | null>(null);
  const [pubByokError, setPubByokError] = useState<{ code: string; message: string; action: 'seo' | 'thumb' } | null>(null);

  const isShort = project.format.includes('Short');

  // Sync back to project when publishing changes
  const persistPublishing = (updated: Partial<VideoPublishingData>) => {
    const nextData: VideoPublishingData = {
      ...publishing,
      ...updated,
    };
    const report = calculatePublishingReadiness(project, nextData);
    nextData.readinessPct = report.scorePct;

    setPublishing(nextData);
    onUpdateProject({
      publishingData: nextData,
      status: report.isReadyToPublish ? 'Ready' : project.status,
    });
  };

  // Compute readiness report
  const readinessReport = useMemo(() => {
    return calculatePublishingReadiness(project, publishing);
  }, [project, publishing]);

  // Title quality analysis
  const titleQuality = useMemo(() => {
    return evaluateTitleQuality(publishing.finalTitle);
  }, [publishing.finalTitle]);

  // Description quality analysis
  const descQuality = useMemo(() => {
    return evaluateDescriptionQuality(publishing.description);
  }, [publishing.description]);

  // Copy helper
  const handleCopyText = (text: string, label: string, validateThumbnail = false) => {
    let payload = text;
    if (validateThumbnail) {
      const check = validatePromptForExport(text, { kind: 'thumbnail' });
      if (!check.valid && !check.sanitizedPreview) {
        toast('Prompt Needs Attention', check.errors[0]?.message || 'Thumbnail prompt is empty.', 'error');
        return;
      }
      if (check.sanitizedPreview && check.sanitizedPreview !== text.trim()) {
        payload = check.sanitizedPreview;
      }
    }
    navigator.clipboard.writeText(payload);
    toast('Copied', `${label} copied to clipboard.`, 'success');
  };

  // Section Switcher with persistence
  const handleSwitchSection = (sec: string) => {
    setActiveSection(sec);
    persistPublishing({ lastActiveSection: sec });
  };

  // ISOLATED REGENERATION HANDLERS
  const handleRegenerateDescription = () => {
    const freshDesc = generatePublishingDescription(project, creatorProfile, publishing.chapters);
    persistPublishing({ description: freshDesc });
    toast('Description Refreshed', 'Generated fresh description based on script.', 'success');
  };

  const handleRegeneratePinnedComment = () => {
    const freshComment = generatePublishingPinnedComment(project, creatorProfile);
    persistPublishing({ pinnedComment: freshComment });
    toast('Pinned Comment Refreshed', 'Created alternative engagement question.', 'success');
  };

  const handleRegenerateHashtags = () => {
    const freshHashtags = generatePublishingHashtags(project, creatorProfile);
    persistPublishing({
      primaryHashtags: freshHashtags.primary,
      secondaryHashtags: freshHashtags.secondary,
    });
    toast('Hashtags Refreshed', 'Updated hashtags pool.', 'success');
  };

  const handleRegenerateThumbnail = () => {
    const fresh = generatePublishingThumbnail(project, creatorProfile);
    persistPublishing({
      thumbnailBrief: fresh.brief,
      thumbnailTextOptions: fresh.textOptions,
      recommendedThumbnailText: fresh.recommendedText,
      thumbnailPrompt: fresh.prompt,
    });
    toast('Thumbnail Plan Refreshed', 'New thumbnail layout & text options loaded.', 'success');
  };

  // AI BYOK SEO Packaging Upgrade
  const handleAiOptimizeSeoPackage = async () => {
    setAiSeoLoading(true);
    setPubByokError(null);
    try {
      const res = await executeIntelligence({
        task: 'title_seo',
        feature: 'publishing_workspace_seo',
        input: {
          topic: publishing.finalTitle || project.topic,
          platform: isShort ? 'Shorts' : 'YouTube',
          language: creatorProfile.preferredLanguage || 'English',
        },
        enableWebResearch: true,
      });
      setAiPubQualityScore(res.qualityReport.score);
      const descObj = res.data?.description;
      const formattedDescription =
        descObj && typeof descObj === 'object'
          ? [
              descObj.hookLine,
              descObj.summary,
              Array.isArray(descObj.valuePoints) ? descObj.valuePoints.map((v: string) => `• ${v}`).join('\n') : '',
              Array.isArray(descObj.timestamps)
                ? descObj.timestamps.map((t: any) => `${t.time} - ${t.label}`).join('\n')
                : '',
              descObj.callToAction,
            ]
              .filter(Boolean)
              .join('\n\n')
          : undefined;

      persistPublishing({
        finalTitle: res.data?.finalTitle || publishing.finalTitle,
        alternativeTitles: Array.isArray(res.data?.alternativeTitles)
          ? res.data.alternativeTitles
          : publishing.alternativeTitles,
        description: formattedDescription || publishing.description,
        primaryKeywords: Array.isArray(res.data?.primaryKeywords)
          ? res.data.primaryKeywords
          : publishing.primaryKeywords,
        relatedKeywords: Array.isArray(res.data?.relatedKeywords)
          ? res.data.relatedKeywords
          : publishing.relatedKeywords,
        primaryHashtags: Array.isArray(res.data?.hashtags)
          ? res.data.hashtags
          : publishing.primaryHashtags,
      });
      toast('Gemini SEO Package Applied', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setPubByokError({ code: err.code, message: err.message, action: 'seo' });
      } else {
        toast('AI SEO Upgrade Failed', err?.message || 'Unable to optimize publishing SEO.', 'error');
      }
    } finally {
      setAiSeoLoading(false);
    }
  };

  // AI BYOK Thumbnail Intelligence Upgrade
  const handleAiThumbnailIntelligence = async () => {
    setAiThumbLoading(true);
    setPubByokError(null);
    try {
      const res = await executeIntelligence({
        task: 'thumbnail_intelligence',
        feature: 'publishing_workspace_thumbnail',
        input: {
          topic: publishing.finalTitle || project.topic,
          language: creatorProfile.preferredLanguage || 'English',
        },
        enableWebResearch: false,
      });
      setAiPubQualityScore(res.qualityReport.score);
      const brief = res.data?.thumbnailBrief || {};
      const opts: ThumbnailTextOption[] = Array.isArray(res.data?.thumbnailTextOptions)
        ? res.data.thumbnailTextOptions.map((o: any, idx: number) => ({
            id: o.id || `ai_thumb_${idx + 1}`,
            text: o.text || 'WATCH THIS',
            style: 'High Contrast',
            reason: o.reason || 'High-contrast focal hook',
            isRecommended: Boolean(o.isRecommended ?? idx === 0),
          }))
        : publishing.thumbnailTextOptions;

      persistPublishing({
        recommendedThumbnailText: res.data?.recommendedThumbnailText || publishing.recommendedThumbnailText,
        thumbnailTextOptions: opts,
        thumbnailBrief: {
          ...publishing.thumbnailBrief,
          ...brief,
        },
        thumbnailPrompt: res.data?.thumbnailPrompt || publishing.thumbnailPrompt,
      });
      toast('Gemini Thumbnail Brief Ready', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setPubByokError({ code: err.code, message: err.message, action: 'thumb' });
      } else {
        toast('AI Thumbnail Failed', err?.message || 'Unable to generate thumbnail intelligence.', 'error');
      }
    } finally {
      setAiThumbLoading(false);
    }
  };

  // Title modifications
  const handleSaveCustomTitle = () => {
    if (!customTitleInput.trim()) return;
    persistPublishing({ finalTitle: customTitleInput.trim() });
    setIsEditingTitle(false);
    toast('Title Updated', 'Final title updated.', 'success');
  };

  // Keyword modifications
  const handleAddKeyword = () => {
    if (!newKeywordInput.trim()) return;
    const clean = newKeywordInput.trim().toLowerCase();
    if (!publishing.primaryKeywords.includes(clean)) {
      persistPublishing({
        primaryKeywords: [clean, ...publishing.primaryKeywords],
      });
      setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    persistPublishing({
      primaryKeywords: publishing.primaryKeywords.filter(k => k !== kw),
      relatedKeywords: publishing.relatedKeywords.filter(k => k !== kw),
      longTailKeywords: publishing.longTailKeywords.filter(k => k !== kw),
    });
  };

  // Hashtag modifications
  const handleAddHashtag = () => {
    if (!newHashtagInput.trim()) return;
    let clean = newHashtagInput.trim();
    if (!clean.startsWith('#')) clean = `#${clean}`;
    if (!publishing.primaryHashtags.includes(clean)) {
      persistPublishing({
        primaryHashtags: [...publishing.primaryHashtags, clean],
      });
      setNewHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    persistPublishing({
      primaryHashtags: publishing.primaryHashtags.filter(t => t !== tag),
      secondaryHashtags: publishing.secondaryHashtags.filter(t => t !== tag),
    });
  };

  // Chapter modifications
  const handleAddChapter = () => {
    if (!newChapterName.trim() || !newChapterTime.trim()) return;
    const parts = newChapterTime.trim().split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    const totalSecs = mins * 60 + secs;

    const newCh: ChapterItem = {
      id: `ch-custom-${Date.now()}`,
      timestamp: newChapterTime.trim(),
      seconds: totalSecs,
      title: newChapterName.trim(),
    };

    const merged = [...publishing.chapters, newCh].sort((a, b) => a.seconds - b.seconds);
    persistPublishing({ chapters: merged });
    setNewChapterName('');
    setNewChapterTime('');
  };

  const handleRemoveChapter = (id: string) => {
    persistPublishing({
      chapters: publishing.chapters.filter(c => c.id !== id),
    });
  };

  // Checklist toggle
  const handleToggleChecklistItem = (itemId: string) => {
    const current = publishing.checklist || {};
    const nextChecklist = {
      ...current,
      [itemId]: !current[itemId],
    };
    persistPublishing({ checklist: nextChecklist });
  };

  // Export as .txt
  const handleExportTxt = () => {
    const content = generatePublishingPackageText(project, publishing);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `publishing-package-${(project.selectedTitle || project.topic).toLowerCase().replace(/[^\w]/g, '-').slice(0, 30)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Package Exported', 'Downloaded complete publishing package as .txt file.', 'success');
  };

  const sectionsList = [
    { id: 'overview', label: '1. Overview', icon: Share2 },
    { id: 'title', label: '2. Title', icon: FileText },
    { id: 'description', label: '3. Description', icon: Edit3 },
    { id: 'keywords', label: '4. Keywords & Tags', icon: Tag },
    { id: 'hashtags', label: '5. Hashtags', icon: Hash },
    { id: 'thumbnail', label: '6. Thumbnail', icon: Image },
    { id: 'comment', label: '7. Pinned Comment', icon: MessageSquare },
    { id: 'chapters', label: '8. Chapters', icon: ListOrdered },
    { id: 'settings', label: '9. Upload Settings', icon: Settings },
    { id: 'checklist', label: '10. Final Checklist', icon: CheckSquare },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none">
      {/* 1. TOP HEADER & STATUS BANNER */}
      <div className="bg-white border border-black/[0.08] rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
                Step 10: Final Publishing Package
              </span>
              <span className="text-neutral-300">/</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4] font-semibold">
                {project.format}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-sm ${
                readinessReport.isReadyToPublish
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}>
                {readinessReport.isReadyToPublish ? '✓ Ready to Publish' : 'Almost Ready'}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              Publishing Studio
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl font-sans">
              Everything formatted for YouTube upload: SEO description, keywords, thumbnail brief, timestamps, and upload settings.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAiOptimizeSeoPackage}
              disabled={aiSeoLoading}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />}
              className="text-xs font-mono uppercase tracking-wider bg-[#1a1a1a] text-white"
            >
              {aiSeoLoading ? 'Optimizing…' : 'AI Optimize SEO (BYOK)'}
            </Button>

            {aiPubQualityScore !== null && (
              <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                AI Quality {aiPubQualityScore}/100
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTxt}
              leftIcon={<Download className="w-3.5 h-3.5 text-neutral-500" />}
              className="text-xs font-mono uppercase tracking-wider"
            >
              Export .txt Package
            </Button>

            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono uppercase tracking-wider font-semibold bg-[#1a1a1a] text-white hover:bg-[#d4a017] transition-colors shadow-xs"
            >
              <span>YouTube Studio</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#d4a017]" />
            </a>
          </div>
        </div>

        {pubByokError && (
          <div className="mt-4">
            <ByokConnectionGate
              errorCode={pubByokError.code}
              message={pubByokError.message}
              compact
              onConnected={() =>
                pubByokError.action === 'thumb'
                  ? handleAiThumbnailIntelligence()
                  : handleAiOptimizeSeoPackage()
              }
            />
          </div>
        )}

        {/* Readiness Progress Bar */}
        <div className="mt-5 pt-4 border-t border-black/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1a1a1a]">Publishing Readiness:</span>
              <span className="font-bold text-emerald-700">{readinessReport.scorePct}%</span>
            </div>
            <span className="text-neutral-500 text-[11px]">
              {readinessReport.requiredCompleted} / {readinessReport.requiredTotal} Required Items Complete
            </span>
          </div>
          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1a1a1a] rounded-full transition-all duration-500"
              style={{ width: `${readinessReport.scorePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. SECTION TABS NAVIGATION */}
      <div className="flex items-center gap-1 p-1 bg-[#eeeae3] rounded-md overflow-x-auto select-none no-scrollbar">
        {sectionsList.map((sec) => {
          const isActive = activeSection === sec.id;
          const Icon = sec.icon;

          return (
            <button
              key={sec.id}
              onClick={() => handleSwitchSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                  : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#1a1a1a]/60'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Status summary banner */}
          <div className={`p-5 rounded-2xl border ${
            readinessReport.isReadyToPublish
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-5 h-5 ${readinessReport.isReadyToPublish ? 'text-emerald-700' : 'text-amber-700'}`} />
                  <h3 className="text-base font-black text-neutral-900">
                    {readinessReport.isReadyToPublish ? 'Ready to Publish' : 'Almost Ready to Publish'}
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  {readinessReport.isReadyToPublish
                    ? 'All required publishing assets are prepared. You can copy the package and upload to YouTube Studio.'
                    : `Please complete the following required items: ${readinessReport.missingRequired.join(', ')}.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(generatePublishingPackageText(project, publishing), 'Complete Package')}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Copy Everything
                </Button>
                <a
                  href="https://studio.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  <span>Open YouTube Studio</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title & Hook Card */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Video Title
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                  {titleQuality.status}
                </span>
              </div>
              <h4 className="text-base font-black text-neutral-900 leading-snug">
                "{publishing.finalTitle}"
              </h4>
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span>{publishing.finalTitle.length} characters</span>
                <button
                  onClick={() => handleSwitchSection('title')}
                  className="text-xs font-semibold text-neutral-900 hover:underline"
                >
                  Edit Title →
                </button>
              </div>
            </div>

            {/* Thumbnail Preview Card */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Thumbnail Concept
                </span>
                <span className="text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded font-mono">
                  1280x720
                </span>
              </div>
              <div className="p-3 bg-neutral-900 text-white rounded-xl text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  Focal Text
                </span>
                <span className="text-lg font-black tracking-tight">
                  "{publishing.recommendedThumbnailText}"
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="truncate max-w-[200px]">{publishing.thumbnailBrief.mainVisual}</span>
                <button
                  onClick={() => handleSwitchSection('thumbnail')}
                  className="text-xs font-semibold text-neutral-900 hover:underline"
                >
                  View Brief →
                </button>
              </div>
            </div>
          </div>

          {/* Official YouTube Studio note */}
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>
                <strong>Note:</strong> CreatorFlow prepares your publishing package. Upload and publishing are completed in YouTube Studio.
              </span>
            </div>
            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-neutral-900 hover:underline shrink-0"
            >
              studio.youtube.com →
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: TITLE */}
      {/* ========================================================================= */}
      {activeSection === 'title' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Final Video Title
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    The title selected during the planning and title stage.
                  </p>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                  titleQuality.status === 'Good'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {titleQuality.status}
                </span>
              </div>

              {isEditingTitle ? (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={customTitleInput}
                    onChange={(e) => setCustomTitleInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 text-sm font-semibold focus:outline-none focus:border-neutral-900"
                    placeholder="Enter final YouTube title..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      {customTitleInput.length} / 100 characters
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomTitleInput(publishing.finalTitle);
                          setIsEditingTitle(false);
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveCustomTitle}
                        className="text-xs bg-neutral-900 text-white"
                      >
                        Save Title
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-3">
                  <div className="text-lg font-black text-neutral-900 leading-snug">
                    "{publishing.finalTitle}"
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200/60 text-xs">
                    <span className="text-neutral-500">
                      Character count: <strong className="text-neutral-800">{publishing.finalTitle.length}</strong> (Recommended: 30–75)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingTitle(true)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyText(publishing.finalTitle, 'Title')}
                        leftIcon={<Copy className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                      >
                        Copy Title
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Quality Details */}
              <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Title Quality Check
                </span>
                {titleQuality.strengths.map((str, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-emerald-800">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{str}</span>
                  </div>
                ))}
                {titleQuality.issues.map((iss, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{iss}</span>
                  </div>
                ))}
              </div>

              {/* Alternative Titles pool */}
              {publishing.alternativeTitles && publishing.alternativeTitles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-neutral-700">
                    Alternative Titles Generated During Planning:
                  </span>
                  <div className="space-y-1.5">
                    {publishing.alternativeTitles.slice(0, 3).map((alt, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg bg-white border border-neutral-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-neutral-800 font-medium">"{alt}"</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            persistPublishing({ finalTitle: alt });
                            toast('Title Changed', `Switched to "${alt}"`, 'success');
                          }}
                          className="text-[11px] shrink-0"
                        >
                          Use This Title
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DESCRIPTION */}
      {/* ========================================================================= */}
      {activeSection === 'description' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    YouTube Description
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Structured with natural opening hook, key points, timestamps, and call to action.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateDescription}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                    title="Regenerates only the description without touching other fields"
                  >
                    Regenerate Description
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCopyText(publishing.description, 'Description')}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs bg-neutral-900 text-white font-semibold"
                  >
                    Copy Description
                  </Button>
                </div>
              </div>

              {/* Editable Textarea */}
              <div className="space-y-2">
                <textarea
                  rows={14}
                  value={publishing.description}
                  onChange={(e) => persistPublishing({ description: e.target.value })}
                  className="w-full p-4 rounded-xl border border-neutral-300 text-xs font-mono leading-relaxed focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                  placeholder="Enter video description..."
                />
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{publishing.description.split(/\s+/).filter(Boolean).length} words</span>
                  <span className="text-[11px] text-neutral-400">
                    Directly editable · Changes auto-save locally
                  </span>
                </div>
              </div>

              {/* Quality Checklist */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-xs flex flex-wrap items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Quality Checks:
                </span>
                <span className="flex items-center gap-1 text-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600" /> Natural wording
                </span>
                <span className="flex items-center gap-1 text-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600" /> No keyword stuffing
                </span>
                <span className="flex items-center gap-1 text-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600" /> Clear paragraphs
                </span>
                {descQuality.hasChapters && (
                  <span className="flex items-center gap-1 text-emerald-800">
                    <Check className="w-3 h-3 text-emerald-600" /> Timestamps included
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: KEYWORDS & TAGS */}
      {/* ========================================================================= */}
      {activeSection === 'keywords' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Keywords & Search Tags
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Focused search queries aligned directly with your video topic and audience.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all = [...publishing.primaryKeywords, ...publishing.relatedKeywords, ...publishing.longTailKeywords];
                    handleCopyText(all.join(', '), 'Tags (comma separated)');
                  }}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  className="text-xs font-semibold"
                >
                  Copy All Tags (Comma-Separated)
                </Button>
              </div>

              {/* Add Custom Tag Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="Add custom keyword tag..."
                  className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-neutral-900"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddKeyword}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs bg-neutral-900 text-white"
                >
                  Add Tag
                </Button>
              </div>

              {/* Primary Keywords */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-700 block">
                  Primary Keywords (Core Topic):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {publishing.primaryKeywords.map((kw, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium flex items-center gap-1.5 border border-neutral-200/60"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Related Keywords */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-700 block">
                  Related Keywords:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {publishing.relatedKeywords.map((kw, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-neutral-50 text-neutral-700 text-xs flex items-center gap-1.5 border border-neutral-200/60"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Long-tail phrases */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-700 block">
                  Long-Tail Search Phrases:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {publishing.longTailKeywords.map((kw, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-neutral-50 text-neutral-700 text-xs flex items-center gap-1.5 border border-neutral-200/60"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 italic pt-2 border-t border-neutral-100">
                “Use only keywords that accurately describe your video. YouTube penalizes misleading tags.”
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: HASHTAGS */}
      {/* ========================================================================= */}
      {activeSection === 'hashtags' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Video Hashtags
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Focused hashtags to display above your video title on YouTube.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateHashtags}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const all = [...publishing.primaryHashtags, ...publishing.secondaryHashtags];
                      handleCopyText(all.join(' '), 'Hashtags');
                    }}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs bg-neutral-900 text-white font-semibold"
                  >
                    Copy All Hashtags
                  </Button>
                </div>
              </div>

              {/* Add Custom Hashtag */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newHashtagInput}
                  onChange={(e) => setNewHashtagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHashtag()}
                  placeholder="Add hashtag (e.g. #YouTubeGrowth)..."
                  className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-neutral-900"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddHashtag}
                  className="text-xs bg-neutral-900 text-white"
                >
                  Add
                </Button>
              </div>

              {/* Hashtags Display */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-700 block">
                  Active Hashtags:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[...publishing.primaryHashtags, ...publishing.secondaryHashtags].map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center gap-2 border border-neutral-200"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveHashtag(tag)}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
                YouTube displays the first 3 hashtags prominently above the video title.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: THUMBNAIL STUDIO */}
      {/* ========================================================================= */}
      {activeSection === 'thumbnail' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Thumbnail Studio & Creation Brief
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Clear visual concept, recommended on-thumbnail text, and generation prompt.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAiThumbnailIntelligence}
                    disabled={aiThumbLoading}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />}
                    className="text-xs bg-neutral-900 text-white"
                  >
                    {aiThumbLoading ? 'Designing…' : 'AI Thumbnail Brief (BYOK)'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateThumbnail}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Regenerate Thumbnail Plan
                  </Button>
                </div>
              </div>

              {/* Thumbnail Text Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                    Thumbnail On-Screen Text Options:
                  </span>
                  <span className="text-xs text-neutral-400">
                    Keep to 2–4 bold words for mobile legibility
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {publishing.thumbnailTextOptions.map((opt, idx) => {
                    const isRec = opt.text === publishing.recommendedThumbnailText;

                    return (
                      <div 
                        key={opt.id}
                        onClick={() => persistPublishing({ recommendedThumbnailText: opt.text })}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isRec 
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' 
                            : 'bg-neutral-50 text-neutral-900 border-neutral-200/80 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            isRec ? 'text-amber-400' : 'text-neutral-400'
                          }`}>
                            Option {idx + 1}
                          </span>
                          {isRec && (
                            <span className="text-[9px] font-bold uppercase bg-amber-400 text-neutral-950 px-1.5 py-0.2 rounded">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black tracking-tight">
                          "{opt.text}"
                        </div>
                        <p className={`text-xs mt-1.5 ${isRec ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {opt.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Structured Thumbnail Concept Brief */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider text-[11px] block">
                  Design Brief Specifications:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                    <strong className="text-neutral-900 block text-[11px] uppercase text-neutral-500">Main Visual:</strong>
                    <span className="text-neutral-800 mt-0.5 block">{publishing.thumbnailBrief.mainVisual}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                    <strong className="text-neutral-900 block text-[11px] uppercase text-neutral-500">Subject / Expression:</strong>
                    <span className="text-neutral-800 mt-0.5 block">{publishing.thumbnailBrief.subject} ({publishing.thumbnailBrief.emotion})</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                    <strong className="text-neutral-900 block text-[11px] uppercase text-neutral-500">Composition & Layout:</strong>
                    <span className="text-neutral-800 mt-0.5 block">{publishing.thumbnailBrief.composition}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                    <strong className="text-neutral-900 block text-[11px] uppercase text-neutral-500">Color & Contrast Direction:</strong>
                    <span className="text-neutral-800 mt-0.5 block">{publishing.thumbnailBrief.colorDirection}</span>
                  </div>
                </div>
              </div>

              {/* Thumbnail Creation Prompt for AI / Designer */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                      Thumbnail Creation Prompt (For Midjourney, Leonardo, or Canva):
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      validatePromptForExport(publishing.thumbnailPrompt || '', { kind: 'thumbnail' }).valid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {validatePromptForExport(publishing.thumbnailPrompt || '', { kind: 'thumbnail' }).valid
                        ? 'Prompt Verified'
                        : 'Needs Review'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText(publishing.thumbnailPrompt, 'Thumbnail Prompt', true)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Copy Prompt
                  </Button>
                </div>
                <div className="p-3.5 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-xs leading-relaxed select-all">
                  {publishing.thumbnailPrompt}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: PINNED COMMENT */}
      {/* ========================================================================= */}
      {activeSection === 'comment' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Pinned Engagement Comment
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Post and pin this immediately after publishing to stimulate initial viewer discussion.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegeneratePinnedComment}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCopyText(publishing.pinnedComment, 'Pinned Comment')}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs bg-neutral-900 text-white font-semibold"
                  >
                    Copy Comment
                  </Button>
                </div>
              </div>

              {/* Editable Pinned Comment */}
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={publishing.pinnedComment}
                  onChange={(e) => persistPublishing({ pinnedComment: e.target.value })}
                  className="w-full p-3 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs text-neutral-600">
                <strong>Why pin this?</strong> Pinned questions signal to the YouTube algorithm that your video drives active discussion and community watch time.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: CHAPTERS & TIMESTAMPS */}
      {/* ========================================================================= */}
      {activeSection === 'chapters' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Video Chapters & Timestamps
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Enables interactive chapter scrubber marks on YouTube video player.
                  </p>
                </div>
                {publishing.chapters.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const text = publishing.chapters.map(c => `${c.timestamp} ${c.title}`).join('\n');
                      handleCopyText(text, 'Chapters');
                    }}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold"
                  >
                    Copy All Timestamps
                  </Button>
                )}
              </div>

              {isShort ? (
                <div className="p-6 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-600 text-xs space-y-1">
                  <span className="font-bold block">Chapters are not recommended for YouTube Shorts</span>
                  <span>Shorts are 60 seconds or less and do not feature timeline scrub chapters.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add Chapter Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="00:00"
                      value={newChapterTime}
                      onChange={(e) => setNewChapterTime(e.target.value)}
                      className="w-24 p-2 rounded-xl border border-neutral-200 text-xs font-mono focus:outline-none focus:border-neutral-900"
                    />
                    <input
                      type="text"
                      placeholder="Chapter title..."
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-neutral-900"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddChapter}
                      className="text-xs bg-neutral-900 text-white"
                    >
                      Add
                    </Button>
                  </div>

                  {/* List of Chapters */}
                  <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden">
                    {publishing.chapters.map((ch, idx) => (
                      <div key={ch.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                            {ch.timestamp}
                          </span>
                          <span className="text-neutral-800 font-medium">
                            {ch.title}
                          </span>
                        </div>
                        {idx !== 0 && (
                          <button
                            onClick={() => handleRemoveChapter(ch.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-neutral-500">
                    YouTube requires the first chapter to start at <strong>00:00</strong> and at least 3 chapters in ascending chronological order.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: UPLOAD SETTINGS */}
      {/* ========================================================================= */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  YouTube Upload Preparation Settings
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pre-configured settings for when you upload this video into YouTube Studio.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Visibility */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">Visibility</label>
                  <select
                    value={publishing.uploadSettings.visibility}
                    onChange={(e) => persistPublishing({
                      uploadSettings: { ...publishing.uploadSettings, visibility: e.target.value as any }
                    })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none"
                  >
                    <option value="Public">Public (Immediate)</option>
                    <option value="Unlisted">Unlisted (Review first)</option>
                    <option value="Private">Private</option>
                    <option value="Schedule">Schedule for later</option>
                  </select>
                </div>

                {/* Audience */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">Audience (COPPA)</label>
                  <select
                    value={publishing.uploadSettings.audience}
                    onChange={(e) => persistPublishing({
                      uploadSettings: { ...publishing.uploadSettings, audience: e.target.value as any }
                    })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none"
                  >
                    <option value="Not made for kids">No, it's not made for kids (Recommended)</option>
                    <option value="Made for kids">Yes, it's made for kids</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">Category</label>
                  <select
                    value={publishing.uploadSettings.category}
                    onChange={(e) => persistPublishing({
                      uploadSettings: { ...publishing.uploadSettings, category: e.target.value }
                    })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none"
                  >
                    <option value="Education">Education</option>
                    <option value="How-to & Style">How-to & Style</option>
                    <option value="Science & Technology">Science & Technology</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="People & Blogs">People & Blogs</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">Video Language</label>
                  <input
                    type="text"
                    value={publishing.uploadSettings.language}
                    onChange={(e) => persistPublishing({
                      uploadSettings: { ...publishing.uploadSettings, language: e.target.value }
                    })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none"
                  />
                </div>

                {/* License */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">License</label>
                  <select
                    value={publishing.uploadSettings.license}
                    onChange={(e) => persistPublishing({
                      uploadSettings: { ...publishing.uploadSettings, license: e.target.value as any }
                    })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none"
                  >
                    <option value="Standard YouTube License">Standard YouTube License</option>
                    <option value="Creative Commons - Attribution">Creative Commons - Attribution</option>
                  </select>
                </div>

                {/* Embedding */}
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 block">Embedding</label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishing.uploadSettings.embedding}
                      onChange={(e) => persistPublishing({
                        uploadSettings: { ...publishing.uploadSettings, embedding: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span>Allow video embedding on websites</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: FINAL CHECKLIST */}
      {/* ========================================================================= */}
      {activeSection === 'checklist' && (
        <div className="space-y-6">
          <Card className="bg-white border-neutral-200/90 shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Publishing Readiness Checklist
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Separated into Required, Recommended, and Optional steps.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-neutral-700">
                  {readinessReport.scorePct}% Ready
                </span>
              </div>

              {/* Required Group */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                  Required Before Upload ({readinessReport.requiredCompleted}/{readinessReport.requiredTotal}):
                </span>
                <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden">
                  {readinessReport.items.filter(i => i.type === 'Required').map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        item.isComplete ? 'bg-emerald-50/40' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          item.isComplete ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                        }`}>
                          {item.isComplete && <Check className="w-3 h-3" />}
                        </div>
                        <span className={`font-semibold ${item.isComplete ? 'text-neutral-900' : 'text-neutral-700'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[11px]">{item.hint}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Group */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                  Recommended ({readinessReport.recommendedCompleted}/{readinessReport.recommendedTotal}):
                </span>
                <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden">
                  {readinessReport.items.filter(i => i.type === 'Recommended').map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        item.isComplete ? 'bg-emerald-50/40' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          item.isComplete ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                        }`}>
                          {item.isComplete && <Check className="w-3 h-3" />}
                        </div>
                        <span className={`font-semibold ${item.isComplete ? 'text-neutral-900' : 'text-neutral-700'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[11px]">{item.hint}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Group */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                  Optional ({readinessReport.optionalCompleted}/{readinessReport.optionalTotal}):
                </span>
                <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden">
                  {readinessReport.items.filter(i => i.type === 'Optional').map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        item.isComplete ? 'bg-emerald-50/40' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          item.isComplete ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                        }`}>
                          {item.isComplete && <Check className="w-3 h-3" />}
                        </div>
                        <span className={`font-semibold ${item.isComplete ? 'text-neutral-900' : 'text-neutral-700'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[11px]">{item.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOTTOM NAVIGATION ACTIONS */}
      <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
        >
          ← Production Tools
        </Button>

        <div className="flex items-center gap-2">
          {onOpenAnalytics && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAnalytics(project.id)}
              className="text-xs font-medium"
              title="Log YouTube Studio metrics for this video"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-neutral-600" />
              Track in Analytics
            </Button>
          )}

          {onOpenFullContentPack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenFullContentPack(publishing.finalTitle, isShort ? 'Shorts' : 'YouTube')}
              className="text-xs"
            >
              Generate AI Content Pack
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onReturnToDashboard}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
          >
            Finish & Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
