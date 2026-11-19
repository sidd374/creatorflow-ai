import { 
  CreatorProfile, 
  VideoProject, 
  ToolRecommendation, 
  ToolCategory,
  ProductionPlanStep,
  RequiredAssetItem 
} from '../types';
import { CREATOR_TOOLS_DATA, TOOL_CATEGORIES_META, CategoryMeta } from '../data/creatorToolsData';

export interface ScoredTool extends ToolRecommendation {
  fitScore: number;
  matchLevel: 'Best match' | 'Strong match' | 'Good match';
  reasons: string[];
  instructions: string[];
  isRecommendedForStack: boolean;
  tier: 'Best Free' | 'Best Value' | 'Best Premium' | 'Free Option';
}

export interface RecommendedStackItem {
  categoryKey: string;
  categoryName: ToolCategory;
  iconName: string;
  recommendedTool: ScoredTool;
  isCustomSelected: boolean;
  isRequiredForVideo: boolean;
}

export interface ProductionReadinessResult {
  scorePct: number;
  completedItemsCount: number;
  totalItemsCount: number;
  breakdown: Array<{
    id: string;
    label: string;
    isComplete: boolean;
    hint: string;
  }>;
}

/**
 * Deterministically scores and ranks tools for a specific CreatorProfile and VideoProject
 */
export function getRecommendedTools(
  profile: CreatorProfile,
  project: VideoProject
): ScoredTool[] {
  const isBudgetZero = profile.monthlyBudget.includes('₹0') || profile.monthlyBudget.includes('$0') || profile.monthlyBudget.toLowerCase().includes('zero');
  const isShort = project.format.includes('Short');
  const experience = profile.experienceLevel;
  const devices = profile.availableDevices || [];
  const hasLowSpec = devices.some(d => d.toLowerCase().includes('low-spec') || d.toLowerCase().includes('older') || d.toLowerCase().includes('budget'));
  const hasMobile = devices.some(d => d.toLowerCase().includes('mobile') || d.toLowerCase().includes('phone'));
  const hasDesktop = devices.some(d => d.toLowerCase().includes('desktop') || d.toLowerCase().includes('high'));
  const isTimeConstrained = profile.dailyTimeAvailable.includes('< 1') || profile.dailyTimeAvailable.includes('1–2');
  const voiceSource = project.voiceSettings?.source || 'Your Own Voice';

  // Scan visual plan for visual types
  const visualTypes = (project.visualPlan || []).map(v => v.visualType);
  const needsScreenRecording = visualTypes.some(t => t.toLowerCase().includes('screen'));
  const needsStockFootage = visualTypes.some(t => t.toLowerCase().includes('stock') || t.toLowerCase().includes('b-roll'));

  return CREATOR_TOOLS_DATA.map((tool) => {
    let score = 65; // Base starting score
    const reasons: string[] = [];

    // 1. BUDGET FIT LOGIC
    if (isBudgetZero) {
      if (tool.availability === 'Free') {
        score += 24;
        reasons.push('100% free tool with zero subscription cost or paywalls');
      } else if (tool.freeTier) {
        score += 15;
        reasons.push('Generous free tier fits your ₹0 budget without paying');
      } else {
        score -= 40; // Penalize paid-only tools for ₹0 creators
      }
    } else {
      // Creator has a budget
      if (tool.paidAvailable) {
        score += 12;
      }
      if (tool.freeTier) {
        score += 8;
        reasons.push('Cost-effective with option to start on free tier');
      }
    }

    // 2. DEVICE FIT LOGIC
    if (hasLowSpec) {
      if (tool.demandsHardware) {
        score -= 28;
      } else if (tool.deviceSupport.includes('Browser') || tool.deviceSupport.includes('Low-spec laptop')) {
        score += 16;
        reasons.push('Lightweight workflow that runs smoothly on your laptop');
      }
    } else if (hasMobile && !hasDesktop) {
      if (tool.deviceSupport.includes('Mobile')) {
        score += 20;
        reasons.push('Full mobile support matches your primary recording setup');
      } else {
        score -= 20;
      }
    } else if (hasDesktop) {
      score += 6;
      if (tool.demandsHardware) {
        reasons.push('Takes full advantage of your desktop computer performance');
      }
    }

    // 3. SKILL LEVEL FIT LOGIC
    if (experience === 'Beginner') {
      if (tool.difficulty === 'Easy') {
        score += 18;
        reasons.push('Clean and simple interface suited for your beginner skill level');
      } else if (tool.difficulty === 'Medium') {
        score += 2;
      } else if (tool.difficulty === 'Advanced') {
        score -= 25;
      }
    } else if (experience === 'Some experience' || experience === 'Comfortable') {
      if (tool.difficulty === 'Medium' || tool.difficulty === 'Easy') {
        score += 14;
        reasons.push('Balanced workflow providing control without needless complexity');
      } else {
        score += 8;
      }
    } else {
      // Advanced
      if (tool.difficulty === 'Advanced') {
        score += 20;
        reasons.push('Advanced pro-grade capabilities suited for your experience');
      } else {
        score += 10;
      }
    }

    // 4. TIME FIT LOGIC
    if (isTimeConstrained) {
      if (tool.difficulty === 'Easy' || tool.id.includes('capcut') || tool.id.includes('canva') || tool.id.includes('loom')) {
        score += 12;
        reasons.push('Fast turnaround helps you finish within your 1–2 hours/day');
      } else if (tool.difficulty === 'Advanced') {
        score -= 15;
      }
    }

    // 5. FORMAT FIT LOGIC
    if (isShort) {
      if (tool.id.includes('capcut') || tool.id.includes('submagic') || tool.id.includes('phone') || tool.bestFor.toLowerCase().includes('shorts')) {
        score += 16;
        reasons.push('Optimized vertical 9:16 workflow for YouTube Shorts');
      }
    } else {
      // Long-form
      if (tool.id.includes('obs') || tool.id.includes('shotcut') || tool.id.includes('audacity') || tool.id.includes('canva')) {
        score += 12;
        reasons.push('Reliable multi-track handling for full-length YouTube videos');
      }
    }

    // 6. VOICE SOURCE FIT
    if (tool.categoryKey === 'voice') {
      if (voiceSource === 'Your Own Voice') {
        if (tool.id === 'tool-audacity' || tool.id === 'tool-phone-recorder') {
          score += 24;
          reasons.push('Designed for recording and polishing your own vocal track');
        } else if (tool.id === 'tool-elevenlabs') {
          score -= 25; // Don't recommend AI voice if creator uses own voice
        }
      } else if (voiceSource === 'AI Voice') {
        if (tool.id === 'tool-elevenlabs') {
          score += 28;
          reasons.push('High-realism AI narration matching your voice preference');
        } else {
          score -= 15;
        }
      }
    }

    // 7. VISUAL REQUIREMENTS FIT
    if (tool.categoryKey === 'screenRecording' && needsScreenRecording) {
      score += 15;
      reasons.push('Matches screen recording cues planned in your visual storyboard');
    }
    if (tool.categoryKey === 'stockFootage' && needsStockFootage) {
      score += 12;
      reasons.push('Provides royalty-free B-roll clips for your visual beats');
    }

    // Ensure reasons has 3-4 factual items
    if (reasons.length < 3) {
      reasons.push(`Directly supports your goal to ${profile.primaryGoal.toLowerCase()}`);
    }
    if (reasons.length < 3) {
      reasons.push(`Compatible with your target ${project.format} format`);
    }

    // Deduplicate and slice 3-4 reasons
    const uniqueReasons = Array.from(new Set(reasons)).slice(0, 4);

    // Clamp score
    const clampedScore = Math.min(99, Math.max(35, score));

    // Determine match tier
    let matchLevel: 'Best match' | 'Strong match' | 'Good match' = 'Good match';
    if (clampedScore >= 85) matchLevel = 'Best match';
    else if (clampedScore >= 70) matchLevel = 'Strong match';

    // Tier badge
    let tier: 'Best Free' | 'Best Value' | 'Best Premium' | 'Free Option' = 'Free Option';
    if (tool.availability === 'Free') {
      tier = 'Best Free';
    } else if (tool.freeTier) {
      tier = 'Best Value';
    } else {
      tier = 'Best Premium';
    }

    // Generate dynamic tool instructions for this specific project
    const dynamicInstructions = generateProjectToolInstructions(tool, project, profile);

    return {
      ...tool,
      fitScore: clampedScore,
      matchLevel,
      reasons: uniqueReasons,
      instructions: dynamicInstructions,
      isRecommendedForStack: false,
      tier,
    };
  });
}

/**
 * Generate customized, concrete instructions for using a tool for THIS specific video
 */
function generateProjectToolInstructions(
  tool: ToolRecommendation,
  project: VideoProject,
  profile: CreatorProfile
): string[] {
  const isShort = project.format.includes('Short');
  const title = project.selectedTitle || project.topic;
  const durationLabel = project.durationLabel || (isShort ? '60s' : '3m');

  if (tool.categoryKey === 'editing') {
    return [
      `Create a new project and set the canvas to ${isShort ? '9:16 vertical (1080x1920)' : '16:9 widescreen (1920x1080)'}.`,
      `Import your recorded narration and drop it on the primary audio track.`,
      `Trim silent pauses to keep total duration right around ${durationLabel}.`,
      `Follow the visual plan: place B-roll and screen captures over corresponding spoken lines.`,
      `Apply ${project.editingSettings?.captionStyle || 'Clean'} style captions and adjust background music to -20dB.`,
      `Export in 1080p MP4 ready for YouTube upload.`,
    ];
  }

  if (tool.categoryKey === 'voice') {
    if (tool.id === 'tool-elevenlabs') {
      return [
        `Open ElevenLabs and select a voice style matching your ${project.voiceSettings?.tone || 'Friendly'} tone.`,
        `Paste your ${project.scriptSections?.length || 4} finalized script sections.`,
        `Set speed to ${project.voiceSettings?.pace === 'Slow' ? '0.9x' : project.voiceSettings?.pace === 'Fast' ? '1.15x' : '1.0x'}.`,
        `Download the audio file and save as "voice_track.mp3" in your project folder.`,
      ];
    }
    return [
      `Set up your microphone in a quiet room with pillows or curtains to absorb echo.`,
      `Read the hook: "${project.selectedHook || 'Your opening line'}" with immediate energy.`,
      `Record your ${project.scriptSections?.length || 4} script sections in order, speaking with a ${project.voiceSettings?.tone || 'Friendly'} tone.`,
      `Run a quick noise-reduction filter to clear background room hiss.`,
      `Export a clean WAV/MP3 master track for your video editor.`,
    ];
  }

  if (tool.categoryKey === 'screenRecording') {
    return [
      `Set your screen resolution to 1080p and close private browser tabs.`,
      `Review your visual plan timestamps for screen recording moments.`,
      `Record the demonstration smoothly without erratic mouse movement.`,
      `Save recordings into an assets folder labeled with section numbers.`,
    ];
  }

  if (tool.categoryKey === 'thumbnail') {
    return [
      `Open a blank 1280x720 canvas in ${tool.name}.`,
      `Add a high-contrast focal visual related to "${title.split(' ').slice(0, 4).join(' ')}".`,
      `Add 3 to 5 words of bold punchy text that sparks curiosity without repeating the exact title.`,
      `Ensure text remains legible when zoomed out to phone size (test at 15% preview zoom).`,
      `Download as PNG/JPEG under 2MB.`,
    ];
  }

  if (tool.categoryKey === 'captions') {
    return [
      `Import your rough cut video into ${tool.name}.`,
      `Run automatic subtitle transcription in ${profile.preferredLanguage || 'English'}.`,
      `Choose a ${project.editingSettings?.captionStyle || 'Clean'} font with a high-contrast background stroke.`,
      `Verify spelling on key technical terms and creator keywords.`,
      `Export with embedded captions.`,
    ];
  }

  if (tool.categoryKey === 'music') {
    return [
      `Search for a ${project.editingSettings?.musicStyle || 'Subtle'} track that matches your content tone.`,
      `Check license to confirm 100% royalty-free commercial YouTube clearance.`,
      `Import into your timeline below the voice track and lower volume to -20dB to -24dB so vocals remain front and center.`,
    ];
  }

  // Fallback to base instructions
  return tool.instructions || [
    `Open ${tool.name} and configure project settings for "${title}".`,
    `Execute the required step following your video storyboard.`,
    `Export or save assets directly into your project folder.`,
  ];
}

/**
 * Returns the recommended stack containing the top tool for each required category
 */
export function getRecommendedStack(
  profile: CreatorProfile,
  project: VideoProject,
  scoredTools: ScoredTool[]
): RecommendedStackItem[] {
  const isShort = project.format.includes('Short');
  const voiceSource = project.voiceSettings?.source || 'Your Own Voice';
  const visualTypes = (project.visualPlan || []).map(v => v.visualType);

  const selectedTools = project.selectedTools || {};

  return TOOL_CATEGORIES_META
    .filter((cat) => cat.essentialFor(project.format, voiceSource, visualTypes))
    .map((cat) => {
      const categoryTools = scoredTools
        .filter((t) => t.categoryKey === cat.key)
        .sort((a, b) => b.fitScore - a.fitScore);

      const customSelectedId = selectedTools[cat.key];
      const selectedTool = customSelectedId 
        ? (categoryTools.find(t => t.id === customSelectedId) || categoryTools[0])
        : categoryTools[0];

      return {
        categoryKey: cat.key,
        categoryName: cat.name,
        iconName: cat.iconName,
        recommendedTool: {
          ...selectedTool,
          isRecommendedForStack: true,
        },
        isCustomSelected: Boolean(customSelectedId && customSelectedId !== categoryTools[0]?.id),
        isRequiredForVideo: true,
      };
    });
}

/**
 * Computes Production Readiness based strictly on REAL project completion steps
 */
export function getProductionReadiness(
  project: VideoProject
): ProductionReadinessResult {
  const scriptSections = project.scriptSections || [];
  const finalizedSections = scriptSections.filter(s => s.isFinalized).length;
  const hasTitle = Boolean(project.selectedTitle && project.selectedTitle.trim());
  const hasHook = Boolean(project.selectedHook && project.selectedHook.trim());
  const hasScript = scriptSections.length > 0 && (finalizedSections >= Math.min(2, scriptSections.length));
  const hasVisuals = Boolean(project.visualPlan && project.visualPlan.length > 0);
  const hasVoice = Boolean(project.voiceSettings?.source);
  const editingChecklist = project.editingSettings?.checklist || {};
  const hasEditing = Object.values(editingChecklist).filter(Boolean).length >= 2;

  const selectedTools = project.selectedTools || {};
  const hasTools = Object.keys(selectedTools).length >= 2;

  const toolChecklist = project.toolChecklist || {};
  const checkedAssets = Object.values(toolChecklist).filter(Boolean).length;
  const hasAssets = checkedAssets >= 3;

  const breakdown = [
    {
      id: 'step-title',
      label: 'Title Selected',
      isComplete: hasTitle,
      hint: hasTitle ? `"${project.selectedTitle}"` : 'Select a high-CTR title',
    },
    {
      id: 'step-hook',
      label: 'Hook Selected',
      isComplete: hasHook,
      hint: hasHook ? `${project.selectedHookType || 'Hook'} chosen` : 'Select a 5-second retention hook',
    },
    {
      id: 'step-script',
      label: 'Script Beats Finalized',
      isComplete: hasScript,
      hint: `${finalizedSections}/${scriptSections.length} sections finalized`,
    },
    {
      id: 'step-visuals',
      label: 'Visual Plan Configured',
      isComplete: hasVisuals,
      hint: `${project.visualPlan?.length || 0} visual cues mapped`,
    },
    {
      id: 'step-voice',
      label: 'Voice Settings Configured',
      isComplete: hasVoice,
      hint: `${project.voiceSettings?.source || 'Not configured'}`,
    },
    {
      id: 'step-editing',
      label: 'Editing Plan & Styles Set',
      isComplete: hasEditing,
      hint: `${Object.values(editingChecklist).filter(Boolean).length} editing preferences checked`,
    },
    {
      id: 'step-tools',
      label: 'Production Tools Chosen',
      isComplete: hasTools,
      hint: `${Object.keys(selectedTools).length} tools confirmed for stack`,
    },
    {
      id: 'step-assets',
      label: 'Required Assets Prepped',
      isComplete: hasAssets,
      hint: `${checkedAssets} assets checked off before editing`,
    },
  ];

  const completedItemsCount = breakdown.filter(b => b.isComplete).length;
  const totalItemsCount = breakdown.length;
  const scorePct = Math.round((completedItemsCount / totalItemsCount) * 100);

  return {
    scorePct,
    completedItemsCount,
    totalItemsCount,
    breakdown,
  };
}

/**
 * Returns required assets checklist derived from the current video project
 */
export function getRequiredAssets(
  project: VideoProject,
  scoredTools: ScoredTool[]
): RequiredAssetItem[] {
  const isShort = project.format.includes('Short');
  const visualTypes = (project.visualPlan || []).map(v => v.visualType);
  const checklistState = project.toolChecklist || {};

  const getToolName = (categoryKey: string, fallback: string) => {
    const selectedId = project.selectedTools?.[categoryKey];
    if (selectedId) {
      const match = scoredTools.find(t => t.id === selectedId);
      if (match) return match.name;
    }
    const catMatch = scoredTools.find(t => t.categoryKey === categoryKey);
    return catMatch ? catMatch.name : fallback;
  };

  const assets: RequiredAssetItem[] = [
    {
      id: 'asset-script',
      label: 'Finalized Spoken Script',
      description: `Complete script beats for "${project.durationLabel || (isShort ? '60s' : '3m')}" video duration.`,
      category: 'Script',
      isReady: Boolean(checklistState['asset-script'] ?? (project.scriptSections && project.scriptSections.length > 0)),
      sourceTool: 'CreatorFlow Script Builder',
    },
    {
      id: 'asset-voice',
      label: 'Recorded Voiceover Track',
      description: `Clean vocal audio recorded with ${project.voiceSettings?.tone || 'Friendly'} tone and noise removed.`,
      category: 'Voice',
      isReady: Boolean(checklistState['asset-voice']),
      sourceTool: getToolName('voice', 'Audacity / Phone Mic'),
    },
  ];

  // Screen recording if visual plan has screen captures
  if (visualTypes.some(t => t.toLowerCase().includes('screen'))) {
    assets.push({
      id: 'asset-screen',
      label: 'Screen Walkthrough Recordings',
      description: '1080p screen capture clips showing tutorial or browser workflow.',
      category: 'Footage',
      isReady: Boolean(checklistState['asset-screen']),
      sourceTool: getToolName('screenRecording', 'OBS Studio'),
    });
  }

  // Stock footage / B-roll
  assets.push({
    id: 'asset-broll',
    label: 'B-Roll & Cutaway Footage',
    description: `${isShort ? 'Vertical 9:16' : '16:9'} visual clips to support script beats.`,
    category: 'Footage',
    isReady: Boolean(checklistState['asset-broll']),
    sourceTool: getToolName('stockFootage', 'Pexels'),
  });

  // Music track
  assets.push({
    id: 'asset-music',
    label: 'Royalty-Free Background Music',
    description: `${project.editingSettings?.musicStyle || 'Subtle'} audio track clear of copyright claims.`,
    category: 'Audio',
    isReady: Boolean(checklistState['asset-music']),
    sourceTool: getToolName('music', 'YouTube Audio Library'),
  });

  // Thumbnail
  assets.push({
    id: 'asset-thumbnail',
    label: 'High-Contrast Thumbnail Graphic',
    description: '1280x720 thumbnail with legible text and high contrast focal point.',
    category: 'Packaging',
    isReady: Boolean(checklistState['asset-thumbnail']),
    sourceTool: getToolName('thumbnail', 'Canva'),
  });

  // Captions
  assets.push({
    id: 'asset-captions',
    label: 'Synchronized Captions / Subtitles',
    description: `${project.editingSettings?.captionStyle || 'Clean'} style subtitles for mobile viewer retention.`,
    category: 'Editing',
    isReady: Boolean(checklistState['asset-captions']),
    sourceTool: getToolName('captions', 'CapCut Auto-Captions'),
  });

  return assets;
}

/**
 * Builds the Personalized Production Plan timeline steps
 */
export function generatePersonalizedProductionPlan(
  project: VideoProject,
  profile: CreatorProfile,
  scoredTools: ScoredTool[]
): ProductionPlanStep[] {
  const isShort = project.format.includes('Short');
  const title = project.selectedTitle || project.topic;
  const hook = project.selectedHook || 'Your opening retention hook';
  const durationLabel = project.durationLabel || (isShort ? '60s' : '3m');
  const scriptCount = project.scriptSections?.length || 4;

  const getTool = (key: string, fallback: string): { name: string; category: string } => {
    const selectedId = project.selectedTools?.[key];
    if (selectedId) {
      const tool = scoredTools.find(t => t.id === selectedId);
      if (tool) return { name: tool.name, category: tool.category };
    }
    const best = scoredTools.filter(t => t.categoryKey === key).sort((a, b) => b.fitScore - a.fitScore)[0];
    return best ? { name: best.name, category: best.category } : { name: fallback, category: 'Production' };
  };

  const editingTool = getTool('editing', 'CapCut');
  const voiceTool = getTool('voice', 'Audacity');
  const screenTool = getTool('screenRecording', 'OBS Studio');
  const brollTool = getTool('stockFootage', 'Pexels');
  const captionsTool = getTool('captions', 'CapCut Auto-Captions');
  const musicTool = getTool('music', 'YouTube Audio Library');
  const thumbnailTool = getTool('thumbnail', 'Canva');

  const steps: ProductionPlanStep[] = [
    {
      stepNumber: 1,
      title: 'Finalize Spoken Script Beats',
      toolName: 'CreatorFlow Script Builder',
      toolCategory: 'Script',
      categoryKey: 'script',
      whatToDo: `Review your ${scriptCount} script sections. Ensure the hook leads immediately into the core insight without fluff.`,
      inputNeeded: `Selected title "${title}" and hook "${hook.slice(0, 60)}..."`,
      expectedOutput: `Word-for-word spoken script timed to ${durationLabel}.`,
    },
    {
      stepNumber: 2,
      title: 'Record & Clean Narration',
      toolName: voiceTool.name,
      toolCategory: voiceTool.category,
      categoryKey: 'voice',
      whatToDo: `Record your spoken track with a ${project.voiceSettings?.tone || 'Friendly'} tone at ${project.voiceSettings?.pace || 'Normal'} pace. Apply noise reduction to remove background hum.`,
      inputNeeded: `Finalized script from Step 1.`,
      expectedOutput: `Clean master audio file (WAV or 320kbps MP3).`,
    },
    {
      stepNumber: 3,
      title: 'Capture Screen & Visual Assets',
      toolName: screenTool.name,
      toolCategory: screenTool.category,
      categoryKey: 'screenRecording',
      whatToDo: `Record walkthrough steps and demonstrations at 1080p following your visual storyboard cues.`,
      inputNeeded: `Visual plan timestamps and step-by-step checklist.`,
      expectedOutput: `Folder with labeled screen recordings.`,
    },
    {
      stepNumber: 4,
      title: 'Gather B-Roll & Visual Support',
      toolName: brollTool.name,
      toolCategory: brollTool.category,
      categoryKey: 'stockFootage',
      whatToDo: `Collect ${isShort ? 'vertical' : 'widescreen'} cutaways and illustrations matching the visual directions.`,
      inputNeeded: `List of visual asset cues from CreatorFlow Visuals workspace.`,
      expectedOutput: `5–10 high-resolution B-roll clips and graphics.`,
    },
    {
      stepNumber: 5,
      title: 'Rough Cut Timeline Assembly',
      toolName: editingTool.name,
      toolCategory: editingTool.category,
      categoryKey: 'editing',
      whatToDo: `Import audio narration to the primary track. Slice out gaps and align B-roll on video track 2 to match vocal pace.`,
      inputNeeded: `Vocal track + recorded screen & B-roll footage.`,
      expectedOutput: `Synchronized rough cut hitting target duration of ${durationLabel}.`,
    },
    {
      stepNumber: 6,
      title: 'Generate Animated Captions',
      toolName: captionsTool.name,
      toolCategory: captionsTool.category,
      categoryKey: 'captions',
      whatToDo: `Apply auto-subtitles with ${project.editingSettings?.captionStyle || 'Clean'} style. Highlight key emphasis words to hold mobile viewer attention.`,
      inputNeeded: `Rough cut timeline with clear vocal audio.`,
      expectedOutput: `Synchronized on-screen subtitles.`,
    },
    {
      stepNumber: 7,
      title: 'Mix Background Music & Sound FX',
      toolName: musicTool.name,
      toolCategory: musicTool.category,
      categoryKey: 'music',
      whatToDo: `Drop a ${project.editingSettings?.musicStyle || 'Subtle'} royalty-free track into the background. Lower track volume to -20dB under narration.`,
      inputNeeded: `Royalty-free background track from audio library.`,
      expectedOutput: `Balanced final audio mix with clear dialogue.`,
    },
    {
      stepNumber: 8,
      title: 'Design Eye-Catching Thumbnail',
      toolName: thumbnailTool.name,
      toolCategory: thumbnailTool.category,
      categoryKey: 'thumbnail',
      whatToDo: `Design a 1280x720 thumbnail with 3–5 bold words and high contrast focal point. Ensure readability at mobile size.`,
      inputNeeded: `Title concept and thumbnail focal graphic.`,
      expectedOutput: `High-resolution PNG/JPG thumbnail under 2MB.`,
    },
    {
      stepNumber: 9,
      title: 'Master Export & Mobile Check',
      toolName: editingTool.name,
      toolCategory: editingTool.category,
      categoryKey: 'editing',
      whatToDo: `Export in 1080p MP4. Transfer to your phone and watch once to confirm text and audio readability.`,
      inputNeeded: `Completed timeline with all layers active.`,
      expectedOutput: `Final master MP4 video file.`,
    },
    {
      stepNumber: 10,
      title: 'Publish with CreatorFlow Metadata',
      toolName: 'YouTube Studio',
      toolCategory: 'Publishing',
      categoryKey: 'publishing',
      whatToDo: `Upload video to YouTube Studio. Copy your selected title, retention hook, SEO description, and chapters. Schedule upload.`,
      inputNeeded: `Final video file, thumbnail image, and CreatorFlow Publishing Package.`,
      expectedOutput: `Published or scheduled YouTube video.`,
    },
  ];

  return steps;
}
