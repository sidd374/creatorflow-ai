import React, { useState, useEffect } from 'react';
import {
  WorkflowScriptSection,
  WorkflowVisualItem,
  WorkflowVoicePlan,
  WorkflowEditingPlan,
  WorkflowAssets,
  WorkflowToolInfo,
  ProductionKit,
  ProductionRequirement,
  ScenePlan,
  ImagePrompt,
  AnimationPrompt,
  VideoClipPackage,
  VideoClipPrompt,
} from '../../types/guidedWorkflow';
import { 
  FileText, 
  Eye, 
  Mic, 
  Scissors, 
  Package, 
  Copy, 
  Check, 
  RotateCw, 
  Edit3, 
  CheckCircle2, 
  ArrowRight, 
  Info,
  Clock,
  Sparkles,
  Layers,
  Layout,
  User,
  Palette,
  Film,
  Volume2,
  Image as ImageIcon,
  CheckSquare,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronRight,
  Terminal,
  Lock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { regenerateSingleSection } from '../../lib/guidedWorkflowStorage';
import { unlockAchievement } from '../../lib/achievementEngine';
import { canAccess, incrementUsage } from '../../lib/planEntitlements';
import { LockedStateCard } from '../common/LockedStateCard';
import { useToast } from '../ui/Toast';
import { AI_VIDEO_TOOL_PROFILES, getAIVideoToolProfile, getAllAIVideoToolProfiles } from '../../lib/aiVideoToolProfiles';
import { generateToolVideoClipPackage } from '../../lib/aiVideoClipEngine';
import { saveStoredProductionKit } from '../../lib/productionRequirementEngine';
import { trackAdminEvent } from '../../lib/adminAnalyticsService';
import { trackEvent } from '../../lib/analyticsService';
import { validatePromptForExport, PromptKind } from '../../lib/promptValidator';

interface Step4CreationKitProps {
  scriptSections: WorkflowScriptSection[];
  onUpdateSections: (sections: WorkflowScriptSection[]) => void;
  visualPlan: WorkflowVisualItem[];
  onUpdateVisualPlan: (plan: WorkflowVisualItem[]) => void;
  voicePlan: WorkflowVoicePlan;
  onUpdateVoicePlan: (plan: WorkflowVoicePlan) => void;
  editingPlan: WorkflowEditingPlan;
  assets: WorkflowAssets;
  selectedTool: WorkflowToolInfo | null;
  productionKit?: ProductionKit;
  onUpdateProductionKit?: (kit: ProductionKit) => void;
  topic: string;
  isShort: boolean;
  isVideoCreated: boolean;
  onMarkVideoCreated: (created: boolean) => void;
  onContinue: () => void;
}

type KitTab = 
  | 'Overview' 
  | 'Video Clips'
  | 'Script' 
  | 'Characters' 
  | 'Style' 
  | 'Scenes' 
  | 'Prompts' 
  | 'Voice' 
  | 'Assets' 
  | 'Editing' 
  | 'Thumbnail' 
  | 'Checklist';

export const Step4CreationKit: React.FC<Step4CreationKitProps> = ({
  scriptSections,
  onUpdateSections,
  visualPlan,
  onUpdateVisualPlan,
  voicePlan,
  onUpdateVoicePlan,
  editingPlan,
  assets,
  selectedTool,
  productionKit,
  onUpdateProductionKit,
  topic,
  isShort,
  isVideoCreated,
  onMarkVideoCreated,
  onContinue,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [completedReqs, setCompletedReqs] = useState<Record<string, boolean>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [collapsedClips, setCollapsedClips] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const toolName = selectedTool?.name || productionKit?.selectedToolName || 'Google Flow';

  // Resolve active AI video clip package from production kit or fallback generation
  const activeClipPackage: VideoClipPackage | undefined = productionKit?.videoClipPackage || (
    productionKit?.scriptPackage ? generateToolVideoClipPackage({
      toolProfile: getAIVideoToolProfile(productionKit?.selectedToolId || selectedTool?.id || 'google_flow'),
      totalDurationSeconds: isShort ? 45 : 300,
      topic,
      subject: productionKit.scriptPackage.title || topic,
      scriptPackage: productionKit.scriptPackage,
      characterBible: productionKit.characterBible,
      styleBible: productionKit.styleBible,
      scenePlan: productionKit.scenePlan,
      isMultiCharacter: Boolean(productionKit.characterBible?.characters && productionKit.characterBible.characters.length > 1),
      aspectRatio: isShort ? '9:16' : '16:9',
    }) : undefined
  );

  const [activeTab, setActiveTab] = useState<KitTab>(activeClipPackage ? 'Video Clips' : 'Overview');

  useEffect(() => {
    trackAdminEvent('creation_kit_opened', {
      tool: toolName,
      hasClipPackage: Boolean(activeClipPackage),
      clipsCount: activeClipPackage?.clips.length || 0,
    });
    trackAdminEvent('feature_used', { featureId: 'creation_kit' });
    trackAdminEvent('feature_used', { featureId: 'ai_video_prompt_generator' });
    trackEvent('creation_kit_created', {
      feature: 'creation_kit',
      properties: {
        tool: toolName,
        clipsCount: activeClipPackage?.clips.length || 0,
      },
    });
  }, []);

  // Handle instantaneous tool switching and prompt kit regeneration
  const handleSwitchTool = (newToolId: string) => {
    if (!productionKit || !productionKit.scriptPackage) return;
    const newProfile = getAIVideoToolProfile(newToolId);
    const totalDuration = activeClipPackage?.totalDurationSeconds || (isShort ? 45 : 300);

    const newClipPackage = generateToolVideoClipPackage({
      toolProfile: newProfile,
      totalDurationSeconds: totalDuration,
      topic,
      subject: productionKit.scriptPackage.title || topic,
      scriptPackage: productionKit.scriptPackage,
      characterBible: productionKit.characterBible,
      styleBible: productionKit.styleBible,
      scenePlan: productionKit.scenePlan,
      isMultiCharacter: Boolean(productionKit.characterBible?.characters && productionKit.characterBible.characters.length > 1),
      aspectRatio: isShort ? '9:16' : '16:9',
    });

    const updatedKit: ProductionKit = {
      ...productionKit,
      selectedToolId: newProfile.toolId,
      selectedToolName: newProfile.name,
      videoClipPackage: newClipPackage,
      updatedAt: new Date().toISOString(),
    };

    saveStoredProductionKit(updatedKit);
    if (onUpdateProductionKit) {
      onUpdateProductionKit(updatedKit);
    }
    toast(
      `Switched to ${newProfile.name} ✓`,
      `Creation Kit regenerated for ${newProfile.name} with ${newClipPackage.totalClipsCount} clips (max ${newProfile.maxClipDurationSeconds}s/clip).`,
      'success'
    );
  };

  const handleToggleClip = (clipNum: number) => {
    setCollapsedClips((prev) => ({ ...prev, [clipNum]: !prev[clipNum] }));
  };

  const handleExpandAllClips = () => {
    setCollapsedClips({});
  };

  const handleCollapseAllClips = () => {
    if (!activeClipPackage) return;
    const all: Record<number, boolean> = {};
    activeClipPackage.clips.forEach((c) => { all[c.clipNumber] = true; });
    setCollapsedClips(all);
  };

  const handleCopyAllClips = () => {
    if (!activeClipPackage) return;
    if (!canAccess('copy_all_clips')) {
      toast(
        'Upgrade to Pro for Copy All Clips',
        'Copying the entire multi-clip prompt package in 1 click is a Pro feature. Free users can copy clips individually.',
        'info'
      );
      window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
      return;
    }

    let sanitizedCount = 0;
    const clipsText = activeClipPackage.clips.map((clip) => {
      const header = `CLIP ${clip.clipNumber} of ${activeClipPackage.totalClipsCount} (${clip.durationSeconds}s) [${clip.title}]`;
      const imgCheck = clip.imagePrompt
        ? validatePromptForExport(clip.imagePrompt, { toolId: activeClipPackage.toolId, kind: 'image_keyframe' })
        : null;
      const motCheck = clip.motionPrompt
        ? validatePromptForExport(clip.motionPrompt, { toolId: activeClipPackage.toolId, kind: 'motion' })
        : null;
      const vidCheck = clip.videoPrompt
        ? validatePromptForExport(clip.videoPrompt, { toolId: activeClipPackage.toolId, kind: 'video_clip' })
        : null;

      if (
        (imgCheck && imgCheck.sanitizedPreview !== clip.imagePrompt?.trim()) ||
        (motCheck && motCheck.sanitizedPreview !== clip.motionPrompt?.trim()) ||
        (vidCheck && vidCheck.sanitizedPreview !== clip.videoPrompt?.trim())
      ) {
        sanitizedCount++;
      }

      const stage1 = imgCheck?.sanitizedPreview ? `STAGE 1 (Keyframe Image Prompt):\n${imgCheck.sanitizedPreview}` : '';
      const stage2 = motCheck?.sanitizedPreview ? `STAGE 2 (Motion Prompt):\n${motCheck.sanitizedPreview}` : '';
      const direct = vidCheck?.sanitizedPreview ? `PROMPT:\n${vidCheck.sanitizedPreview}` : '';
      return `${header}\n${stage1 ? stage1 + '\n' : ''}${stage2 ? stage2 + '\n' : ''}${direct ? direct + '\n' : ''}`;
    }).join('\n----------------------------------------\n\n');

    const fullPackage = `CREATORFLOW AI — ALL VIDEO CLIPS FOR ${activeClipPackage.toolName.toUpperCase()}\nTOTAL CLIPS: ${activeClipPackage.totalClipsCount}\nMAX CLIP DURATION: ${activeClipPackage.maxClipDurationSeconds}s\n\n${clipsText}`;

    navigator.clipboard.writeText(fullPackage);
    setCopiedKey('all_clips');
    trackEvent('prompt_copied', {
      feature: 'creation_kit',
      properties: { label: 'All Clips Package', count: activeClipPackage.totalClipsCount, tool: activeClipPackage.toolName },
    });
    toast(
      'Copied All Clips ✓',
      sanitizedCount > 0
        ? `All ${activeClipPackage.totalClipsCount} scene prompts validated & auto-cleaned for ${activeClipPackage.toolName}.`
        : `All ${activeClipPackage.totalClipsCount} scene prompts copied to clipboard.`,
      'success'
    );
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopy = (
    text: string,
    key: string,
    label: string,
    validateKind?: PromptKind
  ) => {
    let textToCopy = text;
    let wasAutoCleaned = false;

    if (validateKind) {
      const check = validatePromptForExport(text, {
        toolId: activeClipPackage?.toolId || selectedTool?.id,
        kind: validateKind,
      });

      if (!check.valid && !check.sanitizedPreview) {
        toast('Prompt Incomplete', check.errors[0]?.message || `${label} cannot be empty.`, 'error');
        return;
      }

      if (check.sanitizedPreview && check.sanitizedPreview !== text.trim()) {
        textToCopy = check.sanitizedPreview;
        wasAutoCleaned = true;
      } else if (check.warnings.length > 0) {
        toast('Prompt Notice', check.warnings[0].message, 'info');
      }
    }

    if (!textToCopy.trim()) {
      toast('Nothing to Copy', `${label} currently has no text.`, 'error');
      return;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    trackEvent('prompt_copied', {
      feature: 'creation_kit',
      properties: { label, tool: activeClipPackage?.toolName || toolName, autoCleaned: wasAutoCleaned },
    });
    toast(
      'Copied to Clipboard ✓',
      wasAutoCleaned
        ? `${label} validated, syntax-cleaned, and copied for ${activeClipPackage?.toolName || toolName}.`
        : `${label} ready to paste into ${activeClipPackage?.toolName || toolName}.`,
      'success'
    );
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleReqComplete = (id: string) => {
    setCompletedReqs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });
  };

  const handleMarkVideoCreated = () => {
    onMarkVideoCreated(true);
    unlockAchievement('ach_first_video_created', 'First Video Created', `Successfully marked video created with ${activeClipPackage?.toolName || toolName}.`);
    toast('Video Marked as Created ✓', 'Great work! Video state updated to Ready. Ready for metadata packaging.', 'success');
  };

  // Determine which tabs are relevant to this workflow
  const availableTabs: KitTab[] = ['Overview'];
  if (activeClipPackage) {
    availableTabs.push('Video Clips');
  }
  availableTabs.push('Script');
  if (productionKit?.characterBible) availableTabs.push('Characters');
  if (productionKit?.styleBible) availableTabs.push('Style');
  if (productionKit?.scenePlan && productionKit.scenePlan.length > 0) availableTabs.push('Scenes');
  if (productionKit?.imagePrompts && !activeClipPackage) availableTabs.push('Prompts');
  availableTabs.push('Voice', 'Assets', 'Editing', 'Thumbnail', 'Checklist');

  const totalWords = scriptSections.reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);
  const totalSecs = scriptSections.reduce((sum, s) => sum + s.durationSec, 0);
  const formattedDuration = `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
            Step 7 of 11 — Production Framework
          </span>
          <span className="text-neutral-300">&bull;</span>
          <span className="font-mono text-xs text-neutral-500">
            Tailored for {toolName}
          </span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Your Video Creation Kit
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl mx-auto">
          Every script line, character prompt, visual cue, and click-by-click assembly step required to produce this video with {toolName}.
        </p>
      </div>

      {/* Completion Status & Mark Created Action Banner */}
      <div className={`p-4 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isVideoCreated 
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-xs' 
          : 'bg-[#eeeae3] border-[#e2ddd4] text-[#1a1a1a]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 flex items-center justify-center rounded-none font-bold text-sm ${
            isVideoCreated ? 'bg-emerald-600 text-white' : 'bg-[#1a1a1a] text-white'
          }`}>
            {isVideoCreated ? '✓' : '⚡'}
          </div>
          <div>
            <div className="font-serif text-base font-normal">
              {isVideoCreated ? 'Video Successfully Created ✓' : 'Production in Progress'}
            </div>
            <div className="text-xs text-neutral-600">
              {isVideoCreated 
                ? 'Your video file is recorded/rendered and ready for YouTube metadata packaging.' 
                : `Copy the requirements below into ${toolName} to assemble your master video.`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {!isVideoCreated ? (
            <button
              type="button"
              onClick={handleMarkVideoCreated}
              className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>I Created My Video</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMarkVideoCreated(false)}
              className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900 underline px-2 py-1"
            >
              Undo Creation Mark
            </button>
          )}
        </div>
      </div>

      {/* AI Video Creation Kit Calibration & Switcher Bar */}
      {activeClipPackage && (
        <div className="bg-[#1a1a1a] text-white p-4 border border-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Tool</span>
              <span className="text-white font-bold text-sm flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#d4a017]" />
                {activeClipPackage.toolName}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Video Length</span>
              <span className="text-white font-bold">{activeClipPackage.totalDurationSeconds}s ({isShort ? 'Short' : 'Long-form'})</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Clip Limit</span>
              <span className="text-white font-bold">{activeClipPackage.maxClipDurationSeconds}s max</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Clips</span>
              <span className="text-[#d4a017] font-bold text-sm">{activeClipPackage.totalClipsCount} clips</span>
            </div>
          </div>

          {/* Quick Tool Switcher */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-neutral-400 font-semibold shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-[#d4a017]" />
              <span>Switch AI Video Tool:</span>
            </span>
            <select
              value={activeClipPackage.toolId}
              onChange={(e) => handleSwitchTool(e.target.value)}
              className="bg-[#2a2a2a] hover:bg-[#333] border border-neutral-700 text-white font-mono text-xs py-1.5 px-2.5 focus:border-[#d4a017] focus:outline-none cursor-pointer"
            >
              {getAllAIVideoToolProfiles().map((t) => (
                <option key={t.toolId} value={t.toolId}>
                  {t.name} (max {t.maxClipDurationSeconds}s)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border border-black/[0.08] shadow-xs">
        <div className="flex border-b border-black/[0.06] overflow-x-auto">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 font-mono text-xs uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[#d4a017] text-[#1a1a1a] bg-[#f8f7f4] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-[#1a1a1a] hover:bg-stone-50/50'
                }`}
              >
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & PIPELINE FLOW */}
        {activeTab === 'Overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">Production Method</span>
                <div className="font-serif text-lg text-[#1a1a1a] font-normal">{productionKit?.method || 'Standard Guided'}</div>
                <div className="text-xs text-neutral-600">Runtime: {formattedDuration} ({isShort ? '9:16 Vertical' : '16:9 Landscape'})</div>
              </div>

              <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">Primary Tool</span>
                <div className="font-serif text-lg text-[#1a1a1a] font-normal">{toolName}</div>
                <div className="text-xs text-neutral-600">{selectedTool?.cost || 'Free / Free Tier verified'}</div>
              </div>

              <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">Voice & Audio</span>
                <div className="font-serif text-lg text-[#1a1a1a] font-normal">{voicePlan.source}</div>
                <div className="text-xs text-neutral-600">{voicePlan.tone} &bull; {voicePlan.pace}</div>
              </div>
            </div>

            {/* Visual Pipeline Dependency Map */}
            <div className="border-t border-black/[0.06] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Production Sequence & Prerequisite Flow</span>
                </h3>
                <span className="font-mono text-[11px] text-neutral-400">Step-by-Step Dependency Chain</span>
              </div>

              {/* Dynamic Pipeline Dependency Chain */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2 text-center text-xs font-mono">
                {(() => {
                  const isAI = /ai.*animat|runway|luma|kling|pika/i.test(productionKit?.method || '') || Boolean(productionKit?.characterBible);
                  const isScreen = /screen/i.test(productionKit?.method || '');
                  const isWhiteboard = /whiteboard/i.test(productionKit?.method || '');

                  if (isAI) {
                    return [
                      { step: '1. Story & Script', tool: 'CreatorFlow', desc: '5-Step Narration' },
                      { step: '2. Character Bible', tool: 'Alex Reference', desc: 'Consistency Seed' },
                      { step: '3. Scene Plan', tool: 'Visual Storyboard', desc: 'Framing & Action' },
                      { step: '4. Scene Prompts', tool: 'Midjourney / Kling', desc: 'Render Images' },
                      { step: '5. Motion Video', tool: toolName, desc: 'Camera Animation' },
                      { step: '6. AI Voice & Sync', tool: 'ElevenLabs / Mic', desc: 'Audio Pacing' },
                      { step: '7. Soundscape', tool: 'SFX & Music', desc: 'Audio Ducking' },
                      { step: '8. Assembly & Cut', tool: toolName, desc: 'Timeline Sync' },
                      { step: '9. Thumbnail', tool: 'High-CTR Visual', desc: '1280x720 Graphic' },
                      { step: '10. Master Export', tool: toolName, desc: '1080p 60fps Ready' },
                    ];
                  }

                  if (isScreen) {
                    return [
                      { step: '1. Script & Plan', tool: 'CreatorFlow', desc: 'Action Breakdown' },
                      { step: '2. Display Setup', tool: 'OBS / Loom', desc: 'Clean 1080p Screen' },
                      { step: '3. UI Walkthrough', tool: 'Target Software', desc: 'Click-by-Click' },
                      { step: '4. Zoom Callouts', tool: toolName, desc: 'Cursor Focus' },
                      { step: '5. Audio Mastering', tool: 'Vocal Track', desc: '-6dB Target' },
                      { step: '6. Master Export', tool: toolName, desc: 'Ready for YouTube' },
                    ];
                  }

                  if (isWhiteboard) {
                    return [
                      { step: '1. Script & Hook', tool: 'CreatorFlow', desc: 'Educational Flow' },
                      { step: '2. Board Layout', tool: 'Canvas Map', desc: 'Drawing Sequence' },
                      { step: '3. Vector SVGs', tool: 'SVG Library', desc: 'Hand-drawn Icons' },
                      { step: '4. Drawing Sync', tool: toolName, desc: 'Voice Alignment' },
                      { step: '5. Highlight Fills', tool: 'Amber Highlights', desc: 'Key Callouts' },
                      { step: '6. Master Export', tool: toolName, desc: 'Render Video' },
                    ];
                  }

                  return [
                    { step: '1. Script Package', tool: 'CreatorFlow', desc: 'Retention Hook' },
                    { step: '2. Voice Recording', tool: 'Microphone', desc: 'Clean Dialogue' },
                    { step: '3. Stock & B-Roll', tool: 'Curated Assets', desc: 'Visual Cuts' },
                    { step: '4. Dynamic Text', tool: toolName, desc: 'Auto-captions' },
                    { step: '5. Sound Design', tool: 'Music Ducking', desc: '-22dB Background' },
                    { step: '6. Master Export', tool: toolName, desc: 'Final Video' },
                  ];
                })().map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                    <div className="font-bold text-[#1a1a1a] text-[11px]">{item.step}</div>
                    <div className="text-[10px] text-[#d4a017] uppercase font-semibold">{item.tool}</div>
                    <div className="text-[10px] text-neutral-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Button to Script */}
            <div className="pt-2 flex justify-between items-center border-t border-black/[0.06]">
              <span className="text-xs text-neutral-500">Ready to start? Begin by copying your approved script.</span>
              <button
                type="button"
                onClick={() => setActiveTab('Script')}
                className="px-4 py-2 bg-[#1a1a1a] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#d4a017] transition-colors flex items-center gap-1.5"
              >
                <span>View Full Script</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SCRIPT PACKAGE */}
        {activeTab === 'Script' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  Production Script
                </h3>
                <span className="font-mono text-xs text-neutral-500">
                  {totalWords} words &bull; ~{formattedDuration} spoken runtime at normal cadence
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullText = scriptSections.map((s) => `${s.title}:\n${s.text}`).join('\n\n');
                  handleCopy(fullText, 'full_script', 'Complete Script');
                }}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                {copiedKey === 'full_script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'full_script' ? 'Copied Full Script' : 'Copy Full Script'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {scriptSections.map((sec) => (
                <div key={sec.id} className="bg-[#f8f7f4] border border-black/[0.08] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-[#1a1a1a]">
                      {sec.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(sec.text, sec.id, sec.title)}
                      className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-[#1a1a1a] flex items-center gap-1"
                    >
                      {copiedKey === sec.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === sec.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-neutral-800 font-sans leading-relaxed whitespace-pre-wrap">
                    {sec.text}
                  </p>

                  <div className="pt-2 border-t border-black/[0.05] text-[11px] text-neutral-500 font-sans flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-[#d4a017] shrink-0" />
                    <span><strong>Delivery Tip:</strong> {sec.deliveryTip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CHARACTER BIBLE */}
        {activeTab === 'Characters' && (
          canAccess('character_bible') && productionKit?.characterBible ? (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                      Character Consistency Bible
                    </h3>
                    {productionKit.characterBible.characters.length > 1 && (
                      <span className="font-mono text-[10px] uppercase tracking-wider bg-[#d4a017]/15 text-[#b3860d] border border-[#d4a017]/30 px-2 py-0.5 font-bold">
                        MAX Multi-Character Cast ({productionKit.characterBible.characters.length} Active)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Maintains visual identity, facial features, and wardrobe continuity across all generated scenes to prevent appearance drift.
                  </p>
                </div>
              </div>

              {productionKit.characterBible.characters.map((char) => {
                const charRefPrompt = char.referencePrompt || char.masterCharacterPrompt || productionKit.characterBible?.masterReferencePrompt || '';
                const charConsistencyBlock = char.consistencyBlock || productionKit.characterBible?.consistencyBlock || '';

                return (
                  <div key={char.id} className="bg-[#f8f7f4] border border-black/[0.08] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#d4a017]" />
                        <span className="font-serif text-lg text-[#1a1a1a]">{char.name}</span>
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-white border border-black/[0.08] text-neutral-600">
                          {char.role}
                        </span>
                      </div>
                      {char.ageRange && (
                        <span className="font-mono text-[10px] text-neutral-400">
                          {char.ageRange}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div><strong>Face & Hair:</strong> {char.face}, {char.hair}</div>
                      <div><strong>Clothing & Colors:</strong> {char.clothing} ({char.colors})</div>
                      <div><strong>Personality:</strong> {char.personality}</div>
                      <div><strong>Props:</strong> {char.props?.join(', ') || 'None'}</div>
                      {char.voiceDescription && (
                        <div><strong>Vocal Identity:</strong> {char.voiceDescription}</div>
                      )}
                      {char.relationshipToOtherCharacters && (
                        <div><strong>Cast Dynamics:</strong> {char.relationshipToOtherCharacters}</div>
                      )}
                    </div>

                    {/* Master Character Reference Prompt */}
                    <div className="border-t border-black/[0.06] pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">
                          Master Reference Sheet Prompt for {char.name}:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(charRefPrompt, `char_ref_${char.id}`, `${char.name} Reference Prompt`, 'character')}
                          className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === `char_ref_${char.id}` ? 'Copied' : 'Copy Prompt'}</span>
                        </button>
                      </div>

                      <pre className="p-3 bg-[#1a1a1a] text-neutral-200 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {charRefPrompt}
                      </pre>
                    </div>

                    {/* Reusable Consistency Block */}
                    <div className="p-3 bg-[#eeeae3] border border-[#e2ddd4] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-700 font-bold block">
                          Reusable Consistency Block for {char.name}:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(charConsistencyBlock, `char_block_${char.id}`, `${char.name} Consistency Block`)}
                          className="font-mono text-[10px] uppercase text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{copiedKey === `char_block_${char.id}` ? 'Copied' : 'Copy Block'}</span>
                        </button>
                      </div>
                      <code className="text-[11px] font-mono text-[#1a1a1a] block">
                        {charConsistencyBlock}
                      </code>
                    </div>
                  </div>
                );
              })}

              {/* Multi-Character Interaction Rules (when 2+ characters exist) */}
              {productionKit.characterBible.interactionRules && productionKit.characterBible.interactionRules.length > 0 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                    Multi-Character Interaction & Continuity Rules:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-amber-950 font-sans leading-relaxed">
                    {productionKit.characterBible.interactionRules.map((rule, idx) => (
                      <li key={idx}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <LockedStateCard
                feature="character_bible"
                customTitle="Character Consistency Bible"
                customDescription="Generate master appearance reference prompts and character consistency blocks to maintain identical character traits across AI video tools."
              />
            </div>
          )
        )}

        {/* TAB 4: STYLE BIBLE */}
        {activeTab === 'Style' && (
          canAccess('style_bible') && productionKit?.styleBible ? (
            <div className="p-6 space-y-6">
              <div className="space-y-1 border-b border-black/[0.06] pb-3">
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  Visual Style Bible
                </h3>
                <p className="text-xs text-neutral-500">
                  Guarantees color temperature, camera framing, and lighting remain cohesive from first to final frame.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Visual Style</span>
                  <div className="font-serif text-base text-[#1a1a1a]">{productionKit.styleBible.visualStyle}</div>
                  <p className="text-xs text-neutral-600">{productionKit.styleBible.renderingStyle}</p>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Color Direction</span>
                  <div className="font-serif text-base text-[#1a1a1a]">{productionKit.styleBible.colorDirection}</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Lighting & Atmosphere</span>
                  <p className="text-xs text-neutral-700">{productionKit.styleBible.lighting}</p>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Camera Language</span>
                  <p className="text-xs text-neutral-700">{productionKit.styleBible.cameraLanguage}</p>
                </div>
              </div>

              {/* Master Style Prompt */}
              {productionKit.styleBible.masterStylePrompt && (
                <div className="border-t border-black/[0.06] pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">
                      Master Style Reference Prompt:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(productionKit.styleBible?.masterStylePrompt || '', 'master_style', 'Master Style Prompt', 'style')}
                      className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'master_style' ? 'Copied' : 'Copy Style Prompt'}</span>
                    </button>
                  </div>

                  <pre className="p-3.5 bg-[#1a1a1a] text-neutral-200 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {productionKit.styleBible.masterStylePrompt}
                  </pre>
                </div>
              )}

              <div className="p-4 bg-[#eeeae3] border border-[#e2ddd4] space-y-2 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-700 font-bold block">
                  Consistency Rules:
                </span>
                <ul className="list-disc list-inside space-y-1 text-neutral-800">
                  {productionKit.styleBible.consistencyRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <LockedStateCard
                feature="style_bible"
                customTitle="Visual Style Bible"
                customDescription="Lock in rendering prompts, color palettes, and lighting language to maintain aesthetic cohesion throughout your entire video production."
              />
            </div>
          )
        )}

        {/* TAB 5: SCENES */}
        {activeTab === 'Scenes' && productionKit?.scenePlan && (
          <div className="p-6 space-y-6">
            <div className="space-y-1 border-b border-black/[0.06] pb-3">
              <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                Chronological Scene Plan
              </h3>
              <p className="text-xs text-neutral-500">
                Chronological storyboard connecting each visual moment directly with spoken pacing.
              </p>
            </div>

            <div className="space-y-4">
              {productionKit.scenePlan.map((scene) => (
                <div key={scene.sceneNumber} className="bg-[#f8f7f4] border border-black/[0.08] p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white bg-[#1a1a1a] px-2 py-0.5">
                        Scene {scene.sceneNumber}
                      </span>
                      <span className="font-serif text-lg text-[#1a1a1a]">{scene.purpose}</span>
                    </div>
                    <span className="font-mono text-xs text-neutral-500">
                      Duration: {scene.durationSeconds}s &bull; Framing: {scene.framing}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div><strong>Action:</strong> {scene.action}</div>
                    <div><strong>Environment:</strong> {scene.environment}</div>
                    <div><strong>Camera:</strong> {scene.camera}</div>
                    <div><strong>Lighting:</strong> {scene.lighting}</div>
                  </div>

                  {/* Multi-Character Presence Badges */}
                  {scene.charactersPresent && scene.charactersPresent.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="font-mono text-[10px] uppercase text-neutral-400 font-semibold">
                        Cast in Scene:
                      </span>
                      {scene.charactersPresent.map((cName) => (
                        <span key={cName} className="font-mono text-[10px] bg-white border border-black/[0.08] px-2 py-0.5 text-neutral-800 font-medium">
                          {cName}
                        </span>
                      ))}
                      {scene.speakingCharacter && (
                        <span className="font-mono text-[10px] text-neutral-400 ml-1">
                          (Speaking: {scene.speakingCharacter})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dialogue Turn Assignments */}
                  {scene.dialogueAssignments && scene.dialogueAssignments.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                        Dialogue Turn Breakdown:
                      </span>
                      <div className="space-y-1">
                        {scene.dialogueAssignments.map((d, dIdx) => (
                          <div key={dIdx} className="p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-800 flex items-start gap-2">
                            <span className="font-mono text-[10px] uppercase font-bold text-[#b3860d] shrink-0 pt-0.5">
                              {d.character}:
                            </span>
                            <span className="font-sans leading-relaxed">"{d.line}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : scene.narration ? (
                    <div className="p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-700">
                      <span className="font-mono text-[10px] uppercase text-neutral-400 block">Spoken Line:</span>
                      "{scene.narration}"
                    </div>
                  ) : null}

                  {/* Character Continuity Lock */}
                  {scene.characterContinuityNotes && (
                    <div className="p-2 bg-[#eeeae3] border border-[#e2ddd4] text-[11px] text-neutral-700 font-mono">
                      <strong>Continuity Lock:</strong> {scene.characterContinuityNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5.5: VIDEO CLIPS (TOOL-SPECIFIC AI VIDEO CREATION KIT) */}
        {(activeTab === 'Video Clips' || (activeTab === 'Prompts' && activeClipPackage)) && activeClipPackage && (
          <div className="p-6 space-y-8">
            {/* Header & Tool Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
                    Tool-Calibrated Engine
                  </span>
                  <span className="text-neutral-300">&bull;</span>
                  <span className="font-mono text-xs text-neutral-500">
                    {activeClipPackage.promptStrategy === 'image-plus-motion' ? 'Image → Video Workflow' : 'Direct Text → Video'}
                  </span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
                  Video Prompts for {activeClipPackage.toolName}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Auto-divided into {activeClipPackage.totalClipsCount} continuous story clips calibrated to {activeClipPackage.toolName}&apos;s {activeClipPackage.maxClipDurationSeconds}s clip duration limit.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyAllClips}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={canAccess('copy_all_clips') ? 'Copy all scene prompts in single clipboard block' : 'Upgrade to Pro to copy all clips in 1 click'}
                >
                  {copiedKey === 'all_clips' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied All Clips</span>
                    </>
                  ) : (
                    <>
                      {canAccess('copy_all_clips') ? (
                        <Copy className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#d4a017]" />
                      )}
                      <span>Copy All {activeClipPackage.totalClipsCount} Clips</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExpandAllClips}
                  className="px-3 py-1.5 border border-black/[0.1] bg-white hover:bg-[#eeeae3] font-mono text-[10px] uppercase tracking-wider text-neutral-700 cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAllClips}
                  className="px-3 py-1.5 border border-black/[0.1] bg-white hover:bg-[#eeeae3] font-mono text-[10px] uppercase tracking-wider text-neutral-700 cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* 1. CHARACTER SETUP */}
            {activeClipPackage.masterCharacterPrompts && Object.keys(activeClipPackage.masterCharacterPrompts).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#d4a017]" />
                    <h4 className="font-serif text-xl font-normal text-[#1a1a1a]">
                      Character Setup
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-neutral-400">
                    Visual Continuity Lock
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(activeClipPackage.masterCharacterPrompts).map(([charName, masterPrompt]) => {
                    const refPrompt = activeClipPackage.masterReferencePrompts?.[charName];

                    return (
                      <div key={charName} className="bg-[#f8f7f4] border border-black/[0.08] p-5 space-y-4">
                        {/* Master Character Prompt */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold flex items-center gap-2">
                              <span>Character Master Prompt — {charName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(masterPrompt, `char_master_${charName}`, `${charName} Master Prompt`, 'character')}
                              className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedKey === `char_master_${charName}` ? 'Copied' : 'Copy Master Prompt'}</span>
                            </button>
                          </div>
                          <pre className="p-3.5 bg-white border border-black/[0.08] text-neutral-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                            {masterPrompt}
                          </pre>
                        </div>

                        {/* Character Reference Prompt (Displayed ONLY if tool supports character reference) */}
                        {activeClipPackage.supportsCharacterReference && refPrompt && (
                          <div className="pt-3 border-t border-black/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-[#d4a017]" />
                                <span>Character Reference Sheet Prompt — {charName}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(refPrompt, `char_ref_${charName}`, `${charName} Reference Prompt`, 'character')}
                                className="font-mono text-xs text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer font-semibold uppercase tracking-wider"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedKey === `char_ref_${charName}` ? 'Copied' : 'Copy Reference Prompt'}</span>
                              </button>
                            </div>
                            <pre className="p-3 bg-[#eeeae3] border border-[#e2ddd4] text-neutral-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                              {refPrompt}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. VIDEO CLIPS (CHRONOLOGICAL STORY-AWARE CLIPS) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#d4a017]" />
                  <h4 className="font-serif text-xl font-normal text-[#1a1a1a]">
                    Video Clips ({activeClipPackage.totalClipsCount} Segment Breakdown)
                  </h4>
                </div>
                <span className="font-mono text-xs text-neutral-500">
                  Total Duration: {activeClipPackage.totalDurationSeconds}s &bull; Max Clip: {activeClipPackage.maxClipDurationSeconds}s
                </span>
              </div>

              <div className="space-y-3">
                {activeClipPackage.clips.map((clip) => {
                  const isCollapsed = Boolean(collapsedClips[clip.clipNumber]);

                  return (
                    <div
                      key={clip.clipNumber}
                      className="bg-[#f8f7f4] border border-black/[0.08] transition-all overflow-hidden"
                    >
                      {/* Clip Header Bar (Clickable to Collapse / Expand) */}
                      <div
                        onClick={() => handleToggleClip(clip.clipNumber)}
                        className="p-4 bg-white hover:bg-stone-50/80 cursor-pointer flex items-center justify-between gap-3 border-b border-black/[0.06]"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="font-mono text-xs font-bold text-white bg-[#1a1a1a] px-2.5 py-0.5">
                            Clip {clip.clipNumber.toString().padStart(2, '0')}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#d4a017]">
                            {clip.timeRange}
                          </span>
                          <span className="text-neutral-300">&bull;</span>
                          <span className="font-serif text-base text-[#1a1a1a] font-medium">
                            {clip.title.split(': ')[1] || clip.title}
                          </span>
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#eeeae3] text-neutral-700 font-semibold border border-[#e2ddd4]">
                            {clip.narrativePhase}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {clip.charactersPresent && clip.charactersPresent.length > 0 && (
                            <div className="hidden md:flex items-center gap-1 font-mono text-[10px] text-neutral-500">
                              <span>Cast:</span>
                              <span className="font-bold text-neutral-800">{clip.charactersPresent.join(', ')}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            className="p-1 text-neutral-400 hover:text-neutral-700"
                            aria-label={isCollapsed ? 'Expand clip' : 'Collapse clip'}
                          >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Clip Content Details */}
                      {!isCollapsed && (
                        <div className="p-5 space-y-4 bg-[#f8f7f4]">
                          {/* Narrative Context Arc */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-white p-3 border border-black/[0.04]">
                            <div>
                              <span className="text-neutral-400 block text-[10px] uppercase">Beginning:</span>
                              <span className="text-neutral-700">{clip.beginningState}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[10px] uppercase">Action:</span>
                              <span className="text-neutral-700">{clip.action}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[10px] uppercase">Development:</span>
                              <span className="text-neutral-700">{clip.development}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[10px] uppercase">Ending State:</span>
                              <span className="text-neutral-700">{clip.endingState}</span>
                            </div>
                          </div>

                          {/* PROMPT SECTION */}
                          {activeClipPackage.promptStrategy === 'image-plus-motion' ? (
                            /* Image-to-Video Mode (e.g. Leonardo AI) */
                            <div className="space-y-4">
                              {/* Stage 1 Image Prompt */}
                              {clip.imagePrompt && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-1.5">
                                      <ImageIcon className="w-3.5 h-3.5 text-[#d4a017]" />
                                      <span>Stage 1: Keyframe Image Prompt (Midjourney / Leonardo):</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(clip.imagePrompt!, `img_prompt_${clip.clipNumber}`, `Clip ${clip.clipNumber} Keyframe Prompt`, 'image_keyframe')}
                                      className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>{copiedKey === `img_prompt_${clip.clipNumber}` ? 'Copied' : 'Copy Image Prompt'}</span>
                                    </button>
                                  </div>
                                  <pre className="p-3 bg-white border border-black/[0.08] text-neutral-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                    {clip.imagePrompt}
                                  </pre>
                                </div>
                              )}

                              {/* Stage 2 Motion Prompt */}
                              {clip.motionPrompt && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-1.5">
                                      <Film className="w-3.5 h-3.5 text-[#d4a017]" />
                                      <span>Stage 2: Motion Prompt (Paste into {activeClipPackage.toolName}):</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(clip.motionPrompt!, `motion_prompt_${clip.clipNumber}`, `Clip ${clip.clipNumber} Motion Prompt`, 'motion')}
                                      className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>{copiedKey === `motion_prompt_${clip.clipNumber}` ? 'Copied' : 'Copy Motion Prompt'}</span>
                                    </button>
                                  </div>
                                  <pre className="p-3 bg-[#eeeae3] border border-[#e2ddd4] text-neutral-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                    {clip.motionPrompt}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Single Complete Video Prompt (Google Flow, Kling, Runway, Luma, Pika, Hailuo) */
                            <div className="space-y-2">
                              {(() => {
                                const clipCheck = validatePromptForExport(clip.videoPrompt, {
                                  toolId: activeClipPackage.toolId,
                                  kind: 'video_clip',
                                });
                                return (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold flex items-center gap-1.5">
                                        <Terminal className="w-3.5 h-3.5 text-[#d4a017]" />
                                        <span>Complete Video Prompt for {activeClipPackage.toolName}:</span>
                                        <span className={`text-[10px] px-2 py-0.5 border font-semibold ${
                                          clipCheck.status === 'ready'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : clipCheck.status === 'warning'
                                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                                              : 'bg-rose-50 text-rose-800 border-rose-200'
                                        }`}>
                                          {clipCheck.status === 'ready'
                                            ? 'Prompt Ready'
                                            : clipCheck.status === 'warning'
                                              ? 'Check Formatting'
                                              : 'Auto-Clean on Copy'}
                                        </span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(clip.videoPrompt, `video_prompt_${clip.clipNumber}`, `Clip ${clip.clipNumber} Video Prompt`, 'video_clip')}
                                        className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>{copiedKey === `video_prompt_${clip.clipNumber}` ? 'Copied' : 'Copy Video Prompt'}</span>
                                      </button>
                                    </div>
                                    {clipCheck.issues.length > 0 && (
                                      <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                                        {clipCheck.issues[0].message}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              <pre className="p-4 bg-[#1a1a1a] text-neutral-100 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-black shadow-inner">
                                {clip.videoPrompt}
                              </pre>
                            </div>
                          )}

                          {/* Negative Prompt (if supported) */}
                          {clip.negativePrompt && (
                            <div className="pt-2 border-t border-black/[0.04] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] uppercase text-neutral-500 font-semibold">
                                  Negative Prompt:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(clip.negativePrompt!, `neg_prompt_${clip.clipNumber}`, 'Negative Prompt')}
                                  className="font-mono text-[10px] uppercase text-neutral-500 hover:text-neutral-900 cursor-pointer"
                                >
                                  <span>{copiedKey === `neg_prompt_${clip.clipNumber}` ? 'Copied' : 'Copy Negative'}</span>
                                </button>
                              </div>
                              <pre className="p-2 bg-white border border-black/[0.06] text-neutral-600 text-[11px] font-mono whitespace-pre-wrap">
                                {clip.negativePrompt}
                              </pre>
                            </div>
                          )}

                          {/* Spoken Narration / External Audio Track */}
                          <div className="pt-2 border-t border-black/[0.04] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase text-neutral-600 font-semibold flex items-center gap-1">
                                <Mic className="w-3 h-3 text-[#d4a017]" />
                                <span>
                                  {clip.isAudioIntegrated 
                                    ? 'Spoken Dialogue (Integrated in Prompt):' 
                                    : 'External Voice Track (Record / Align in Editor):'}
                                </span>
                              </span>
                              {clip.spokenText && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(clip.spokenText!, `spoken_${clip.clipNumber}`, 'Voice Line')}
                                  className="font-mono text-[10px] uppercase text-neutral-500 hover:text-[#1a1a1a] cursor-pointer"
                                >
                                  <span>{copiedKey === `spoken_${clip.clipNumber}` ? 'Copied' : 'Copy Voice Line'}</span>
                                </button>
                              )}
                            </div>
                            <div className="p-2.5 bg-white border border-black/[0.06] text-xs text-neutral-800 italic">
                              &ldquo;{clip.spokenText}&rdquo;
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. ASSEMBLY INSTRUCTIONS */}
            <div className="bg-[#eeeae3] border border-[#e2ddd4] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#d4a017]" />
                  <h4 className="font-serif text-lg font-normal text-[#1a1a1a]">
                    Assembly &amp; Final Cut Workflow
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activeClipPackage.assemblyInstructions.join('\n'), 'assembly_guide', 'Assembly Guide')}
                  className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'assembly_guide' ? 'Copied' : 'Copy Assembly Steps'}</span>
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-800">
                {activeClipPackage.assemblyInstructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-neutral-500 font-bold shrink-0">{idx + 1}.</span>
                    <span>{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PROMPTS (FALLBACK FOR NON-CLIP WORKFLOWS) */}
        {activeTab === 'Prompts' && !activeClipPackage && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  AI Scene Generation Prompts
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ordered prompts with auto-injected character consistency blocks ready to copy directly into {toolName}.
                </p>
              </div>

              <div className="px-3 py-1 bg-[#1a1a1a] text-[#f8f7f4] font-mono text-[10px] uppercase tracking-wider font-semibold self-start sm:self-auto">
                Target Platform: {toolName}
              </div>
            </div>

            <div className="space-y-6">
              {productionKit?.imagePrompts?.map((img, idx) => {
                const animPrompt = productionKit.animationPrompts?.[idx];
                const isImageToVideo = Boolean(animPrompt);

                return (
                  <div key={img.id} className="bg-[#f8f7f4] border border-black/[0.08] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-[#1a1a1a] px-2.5 py-0.5">
                          Scene {img.sceneNumber}
                        </span>
                        <span className="font-serif text-base text-[#1a1a1a]">{img.title}</span>
                      </div>

                      <span className="font-mono text-[10px] uppercase text-neutral-400">
                        {isImageToVideo ? 'Stage 1: Keyframe' : 'Text → Video'}
                      </span>
                    </div>

                    {/* Stage 1: Keyframe / Text-to-Video Scene Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-1.5">
                          <Terminal className="w-3 h-3 text-[#d4a017]" />
                          <span>{isImageToVideo ? 'Scene 1 Keyframe Image Prompt (Midjourney / AI Image):' : `Scene ${img.sceneNumber} Text-to-Video Prompt for ${toolName}:`}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(img.prompt, img.id, img.title, isImageToVideo ? 'image_keyframe' : 'video_clip')}
                          className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === img.id ? 'Copied' : 'Copy Prompt'}</span>
                        </button>
                      </div>

                      <pre className="p-3.5 bg-[#1a1a1a] text-neutral-200 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {img.prompt}
                      </pre>
                    </div>

                    {/* Stage 2: Motion Prompt (For Image-to-Video workflows) */}
                    {animPrompt && (
                      <div className="pt-3 border-t border-black/[0.06] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-1.5">
                            <Film className="w-3 h-3 text-[#d4a017]" />
                            <span>Stage 2: Image-to-Video Motion Prompt (Paste into {toolName}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(animPrompt.prompt, `anim_${idx}`, 'Motion Prompt', 'motion')}
                            className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedKey === `anim_${idx}` ? 'Copied' : 'Copy Motion Prompt'}</span>
                          </button>
                        </div>

                        <pre className="p-3 bg-[#eeeae3] text-[#1a1a1a] text-xs font-mono whitespace-pre-wrap leading-relaxed">
                          {animPrompt.prompt}
                        </pre>

                        <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-3">
                          <span>Camera: {animPrompt.cameraMovement}</span>
                          <span>&bull;</span>
                          <span>Motion Intensity: {animPrompt.motionIntensity}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: VOICE & NARRATION */}
        {activeTab === 'Voice' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  Voiceover & Narration Package
                </h3>
                <span className="font-mono text-xs text-neutral-500">
                  Source: {voicePlan.source} &bull; Tone: {voicePlan.tone} &bull; Pace: {voicePlan.pace}
                </span>
                {productionKit?.voicePackage?.voicePersonality && (
                  <p className="text-xs text-[#b3860d] font-mono mt-1">
                    Vocal Profiles: {productionKit.voicePackage.voicePersonality}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const fallbackNarration =
                    productionKit?.voicePackage?.narrationText?.trim() ||
                    scriptSections.map((s) => `${s.title}:\n${s.text}`).join('\n\n');
                  handleCopy(fallbackNarration, 'voice_narr', 'Voiceover Script', 'script');
                }}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === 'voice_narr' ? 'Copied Narration' : 'Copy Narration Text'}</span>
              </button>
            </div>

            <div className="p-3 bg-white border border-black/[0.06] text-xs text-neutral-600 font-mono">
              Voice Guide: Copy the clean narration script above into your voiceover studio or microphone teleprompter (no in-browser audio recording required).
            </div>

            {/* If dialogue lines exist (Multi-character dialogue) */}
            {productionKit?.voicePackage?.dialogueLines && productionKit.voicePackage.dialogueLines.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-bold block">
                    Speaker Turn Script (Dual Host Handoffs):
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {productionKit.voicePackage.dialogueLines.length} Speaker Turns
                  </span>
                </div>
                <div className="space-y-2">
                  {productionKit.voicePackage.dialogueLines.map((turn, tIdx) => (
                    <div key={tIdx} className="p-3 bg-[#f8f7f4] border border-black/[0.06] flex items-start gap-3">
                      <span className="font-mono text-[11px] uppercase font-bold text-[#b3860d] bg-white border border-black/[0.08] px-2 py-0.5 shrink-0">
                        {turn.character}
                      </span>
                      <p className="text-xs text-neutral-800 font-sans leading-relaxed">
                        "{turn.line}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-3">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-bold block">
                Recording & Vocal Engineering Tips:
              </span>
              <ul className="space-y-1.5 text-xs text-neutral-700">
                {voicePlan.recordingTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#d4a017] shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 8: ASSETS */}
        {activeTab === 'Assets' && (
          <div className="p-6 space-y-6">
            <div className="space-y-1 border-b border-black/[0.06] pb-3">
              <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                Asset Checklist
              </h3>
              <p className="text-xs text-neutral-500">
                Prepare all audio, footage, and graphic files before opening your video editor.
              </p>
            </div>

            <div className="space-y-3">
              {(productionKit?.assetChecklist || []).map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => toggleReqComplete(asset.id)}
                  className={`p-4 border cursor-pointer flex items-start justify-between gap-4 transition-all ${
                    completedReqs[asset.id]
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-[#f8f7f4] border-black/[0.08] hover:border-[#d4a017]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 ${
                      completedReqs[asset.id] ? 'bg-emerald-600 text-white' : 'border border-black/[0.2] bg-white'
                    }`}>
                      {completedReqs[asset.id] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-serif text-base font-normal text-[#1a1a1a]">
                        {asset.name}
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">{asset.description}</p>
                      {asset.sourceRecommendation && (
                        <div className="text-[11px] font-mono text-[#d4a017] mt-1">
                          Source: {asset.sourceRecommendation}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white border border-black/[0.08] text-neutral-600 shrink-0">
                    {asset.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: EDITING PLAN */}
        {activeTab === 'Editing' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  Click-by-Click Editing Plan
                </h3>
                <span className="font-mono text-xs text-neutral-500">
                  Customized workflow steps inside {toolName}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(editingPlan.steps.join('\n'), 'editing_steps', 'Editing Steps')}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Editing Steps</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {editingPlan.steps.map((step, idx) => (
                <div key={idx} className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] text-xs font-sans text-neutral-800 flex items-start gap-3">
                  <span className="font-mono font-bold text-[#d4a017] shrink-0">{idx + 1}.</span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: THUMBNAIL */}
        {activeTab === 'Thumbnail' && productionKit?.thumbnailPackage && (
          <div className="p-6 space-y-6">
            <div className="space-y-1 border-b border-black/[0.06] pb-3">
              <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                High-CTR Thumbnail Package
              </h3>
              <p className="text-xs text-neutral-500">
                Optimized visual composition and bold typography designed to maximize click-through rate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Visual Concept</span>
                <div className="font-serif text-base text-[#1a1a1a]">{productionKit.thumbnailPackage.concept}</div>
                <p className="text-neutral-600">{productionKit.thumbnailPackage.mainVisual}</p>
              </div>

              <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block font-semibold">Overlay Text</span>
                <div className="font-serif text-xl text-[#d4a017] font-bold">"{productionKit.thumbnailPackage.thumbnailText}"</div>
                <p className="text-neutral-600">{productionKit.thumbnailPackage.designInstructions}</p>
              </div>
            </div>

            {productionKit.thumbnailPackage.aiPrompt && (
              <div className="p-4 bg-[#1a1a1a] text-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4a017] font-semibold">
                    AI Thumbnail Art Prompt:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(productionKit.thumbnailPackage?.aiPrompt || '', 'thumb_ai', 'Thumbnail Prompt', 'thumbnail')}
                    className="font-mono text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'thumb_ai' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{productionKit.thumbnailPackage.aiPrompt}</pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 11: END-TO-END CREATION CHECKLIST */}
        {activeTab === 'Checklist' && (
          <div className="p-6 space-y-6">
            <div className="space-y-1 border-b border-black/[0.06] pb-3">
              <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                Production & Publishing Master Checklist
              </h3>
              <p className="text-xs text-neutral-500">
                Track your progress across all three phases of video creation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phase 1 */}
              <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-3">
                <div className="font-mono text-xs font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-black/[0.06] pb-2">
                  1. Before Creating
                </div>
                {[
                  'Script reviewed and copied',
                  'Character reference ready',
                  'Style palette chosen',
                  'Voiceover audio recorded',
                  'Assets gathered',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleReqComplete(`chk_1_${idx}`)}
                    className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"
                  >
                    <div className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                      completedReqs[`chk_1_${idx}`] ? 'bg-emerald-600 text-white' : 'border border-black/[0.2] bg-white'
                    }`}>
                      {completedReqs[`chk_1_${idx}`] && <Check className="w-3 h-3" />}
                    </div>
                    <span className={completedReqs[`chk_1_${idx}`] ? 'line-through text-neutral-400' : ''}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Phase 2 */}
              <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-3">
                <div className="font-mono text-xs font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-black/[0.06] pb-2">
                  2. During Creation
                </div>
                {[
                  'Assemble video timeline in ' + toolName,
                  'Verify character visual consistency',
                  'Trim silent gaps and hesitations',
                  'Balance vocal audio to -3dB peak',
                  'Set background music to -22dB',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleReqComplete(`chk_2_${idx}`)}
                    className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"
                  >
                    <div className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                      completedReqs[`chk_2_${idx}`] ? 'bg-emerald-600 text-white' : 'border border-black/[0.2] bg-white'
                    }`}>
                      {completedReqs[`chk_2_${idx}`] && <Check className="w-3 h-3" />}
                    </div>
                    <span className={completedReqs[`chk_2_${idx}`] ? 'line-through text-neutral-400' : ''}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Phase 3 */}
              <div className="p-4 bg-[#f8f7f4] border border-black/[0.08] space-y-3">
                <div className="font-mono text-xs font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-black/[0.06] pb-2">
                  3. Before Publishing
                </div>
                {[
                  'Watch full exported MP4 video',
                  'Check captions & spelling',
                  'Finalize high-CTR Title',
                  'Generate high-contrast Thumbnail',
                  'Review YouTube upload settings',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleReqComplete(`chk_3_${idx}`)}
                    className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"
                  >
                    <div className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                      completedReqs[`chk_3_${idx}`] ? 'bg-emerald-600 text-white' : 'border border-black/[0.2] bg-white'
                    }`}>
                      {completedReqs[`chk_3_${idx}`] && <Check className="w-3 h-3" />}
                    </div>
                    <span className={completedReqs[`chk_3_${idx}`] ? 'line-through text-neutral-400' : ''}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Step Bar */}
      <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
        <div className="text-xs text-neutral-500 font-mono">
          {isVideoCreated ? 'Status: Video Created ✓' : 'Status: Creation in Progress'}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="px-7 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-md"
        >
          <span>Continue to Video Metadata</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
