/**
 * CreatorFlow AI — Tool Search & Recommendation Engine
 * Strictly maps creation methods to real tool categories (AI Video Generation, Voice & Audio, Editing & Assembly, Screen Capture, Whiteboard).
 * Prioritizes verified free-tier options for ₹0 budget creators with transparent capability tags.
 */

import { WorkflowToolInfo, VideoCreationBrief, CreationMethodType, AIVideoToolProfile } from '../types/guidedWorkflow';
import { AI_VIDEO_TOOL_PROFILES } from './aiVideoToolProfiles';

interface SearchToolParams {
  brief?: VideoCreationBrief;
  creationBrief?: VideoCreationBrief;
  device?: string;
  videoType?: string;
  creationMethod?: CreationMethodType;
  format?: 'Short' | 'Long-form';
  experienceLevel?: string;
}

export function searchAndRecommendTools(params: SearchToolParams): WorkflowToolInfo[] {
  const brief = params.creationBrief || params.brief;
  const { creationMethod = 'ai_animation', format = 'Long-form', experienceLevel = 'Beginner' } = params;
  
  const devices = brief?.availableDevices || [(params.device as any) || 'Laptop'];
  const presentationStyles = brief?.presentationStyle || ['Faceless'];
  const videoType = brief?.videoType || params.videoType || 'Educational';
  const isShort = format === 'Short' || brief?.videoType === 'Shorts' || (brief?.preferredDuration && brief.preferredDuration.includes('sec'));
  const isMobileOnly = devices.length === 1 && devices[0] === 'Phone';
  const isBudgetZero = brief?.videoBudget === '₹0 — Completely Free';

  // Comprehensive Catalog of Verified Creator Tools
  const ALL_TOOLS: WorkflowToolInfo[] = [
    // ---------------------------------------------------------
    // 1. AI VIDEO & ANIMATION GENERATION TOOLS (Primary Generators)
    // ---------------------------------------------------------
    {
      id: 'google_flow',
      name: 'Google Flow',
      bestFor: 'Cinematic AI scene generation & prompt-to-video',
      cost: 'Free tier / Generative AI preview',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'Phone'],
      advantages: [
        'Fast high-coherence scene generation from natural language prompts',
        'Built-in style preservation and fluid camera movements',
        'Runs directly in cloud browser without requiring heavy local GPU hardware',
      ],
      limitations: [
        'Requires Google account sign-in',
        'Generation queue length varies during peak hours',
      ],
      whatYouWillUseItFor: [
        'Generate Scene 1 to Scene 5 master animation clips',
        'Apply consistent Pixar-meets-Anime 3D styling prompts',
        'Render smooth 1080p camera push-ins and tracking shots',
      ],
      whyFitsVideo: 'Recommended because you selected AI Animation, your budget is ₹0, and your project requires scene-based AI video generation without expensive hardware.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://labs.google',
      toolCategory: 'ai_generator',
      generationType: 'Text & Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.google_flow,
      workflowProfile: {
        id: 'google_flow',
        name: 'Google Flow',
        generationMode: 'text_to_video',
        acceptsTextPrompt: true,
        acceptsReferenceImage: true,
        acceptsCharacterReference: true,
        acceptsImageInput: true,
        supportsImageToVideo: true,
        supportsTextToVideo: true,
        supportsCameraInstructions: true,
        supportsDurationControl: true,
        supportsVoice: false,
        supportsDialogue: false,
        supportsAudio: false,
        supportsSceneGeneration: true,
        supportsNegativePrompt: true,
        recommendedPromptStructure: 'Cinematic 3D animation scene, [CHARACTER CONSISTENCY], [ENVIRONMENT], [ACTION], [CAMERA DIRECTION], [LIGHTING], 8k render --motion 4',
        requiredInputs: ['Structured scene prompts', 'Character consistency block', 'Aspect ratio (16:9)'],
        outputWorkflow: ['Download MP4 clips for each scene', 'Import into CapCut or timeline editor for voice sync'],
      },
    },
    {
      id: 'runway_gen3',
      name: 'Runway Gen-3 Alpha',
      bestFor: 'High-fidelity cinematic motion & camera director control',
      cost: 'Free tier available (125 one-time credits)',
      difficulty: 'Medium',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'iOS'],
      advantages: [
        'Director Mode with precise camera pan, tilt, zoom, and roll controls',
        'Industry-leading physical motion fidelity and subtle character facial gestures',
        'Motion Brush allows animating specific scene elements while keeping background stable',
      ],
      limitations: [
        'Free credits are finite; ongoing high-volume generation requires standard plan ($12/mo)',
        'Video generation length limited to 5s or 10s per generation request',
      ],
      whatYouWillUseItFor: [
        'Generate dynamic scene animations from character reference images',
        'Execute slow cinematic dolly and crane movements',
        'Create visual hook scenes with high emotional resonance',
      ],
      whyFitsVideo: 'Matches your AI animation goal with unmatched motion realism. Provides free credits to generate your primary story scenes directly from prompt blocks.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://runwayml.com',
      toolCategory: 'ai_generator',
      generationType: 'Text & Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.runway_gen3,
      workflowProfile: {
        id: 'runway_gen3',
        name: 'Runway Gen-3 Alpha',
        generationMode: 'image_to_video',
        acceptsTextPrompt: true,
        acceptsReferenceImage: true,
        acceptsCharacterReference: true,
        acceptsImageInput: true,
        supportsImageToVideo: true,
        supportsTextToVideo: true,
        supportsCameraInstructions: true,
        supportsDurationControl: true,
        supportsVoice: false,
        supportsDialogue: false,
        supportsAudio: false,
        supportsSceneGeneration: true,
        supportsNegativePrompt: true,
        recommendedPromptStructure: 'Focal action description, [CAMERA MOVEMENT], cinematic lighting, smooth motion, high detail',
        requiredInputs: ['Master character seed image', 'Scene motion prompt', 'Camera movement settings'],
        outputWorkflow: ['Generate scene 1 clip (5s)', 'Extend or generate scene 2 clip', 'Export 1080p MP4'],
      },
    },
    {
      id: 'kling_ai',
      name: 'Kling AI',
      bestFor: 'High coherence text-to-video & realistic physics',
      cost: 'Free tier with daily login credits (66 credits/day)',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'Mobile Web'],
      advantages: [
        'Generous free daily refill credits—ideal for ₹0 budget creators',
        'Superior character anatomy preservation and natural body movements',
        'Generates up to 10-second continuous scenes with smooth motion',
      ],
      limitations: [
        'Standard queue processing on free tier takes 2-4 minutes per generation',
        'Watermark in bottom corner on standard free tier (easily cropped or framed)',
      ],
      whatYouWillUseItFor: [
        'Render full-length scene animations for each section of your script',
        'Generate character interactions and educational diagram explanations',
        'Create high-retention visual hooks from text prompts',
      ],
      whyFitsVideo: 'Ideal for ₹0 budget creators because of its recurring daily free credits. Allows generating full educational animation videos over multiple sessions.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://klingai.com',
      toolCategory: 'ai_generator',
      generationType: 'Text & Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.kling_ai,
      workflowProfile: {
        id: 'kling_ai',
        name: 'Kling AI',
        generationMode: 'text_to_video',
        acceptsTextPrompt: true,
        acceptsReferenceImage: true,
        acceptsCharacterReference: true,
        acceptsImageInput: true,
        supportsImageToVideo: true,
        supportsTextToVideo: true,
        supportsCameraInstructions: true,
        supportsDurationControl: true,
        supportsVoice: false,
        supportsDialogue: false,
        supportsAudio: false,
        supportsSceneGeneration: true,
        supportsNegativePrompt: true,
        recommendedPromptStructure: '3D stylized animation, [CHARACTER CONSISTENCY], [ACTION], [ENVIRONMENT], 5200K studio warm lighting, 1080p high quality --cfg_scale 0.5',
        requiredInputs: ['Direct scene prompt text', 'Negative prompt', 'Aspect ratio 16:9'],
        outputWorkflow: ['Paste scene prompt', 'Select 5s / 10s duration', 'Download generated MP4'],
      },
    },
    {
      id: 'luma_dream_machine',
      name: 'Luma Dream Machine',
      bestFor: 'Rapid 3D camera sweeps & photorealistic motion',
      cost: 'Free tier available (30 free generations/month)',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'iOS'],
      advantages: [
        'Extremely fast generation turnaround (under 90 seconds)',
        'Fluid 3D camera transitions and seamless visual flow between keyframes',
        'Simple intuitive interface with zero prompt engineering friction',
      ],
      limitations: [
        'Monthly free quota limits total trial scenes to 30 generations',
        'Occasional morphing artifacts on rapid hand or finger movements',
      ],
      whatYouWillUseItFor: [
        'Generate rapid establishing shots and environment reveals',
        'Animate master character keyframes into smooth 5-second video sequences',
        'Create high-tempo visual transitions between script chapters',
      ],
      whyFitsVideo: 'Fastest way to test your scene prompts and generate 3D animated camera sweeps for educational chapter transitions.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://lumalabs.ai/dream-machine',
      toolCategory: 'ai_generator',
      generationType: 'Text & Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.luma_dream_machine,
    },
    {
      id: 'pika_art',
      name: 'Pika 2.0',
      bestFor: 'Idea-to-video with sound effects & stylized animation',
      cost: 'Free tier available (250 initial credits + 30 daily credits)',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'Discord'],
      advantages: [
        'Built-in sound effect (Pikaffects) generation synchronized to movement',
        'Pre-configured animation styles (3D Animation, Anime, Cinematic, Claymation)',
        'Region modification tool allows modifying specific scene details',
      ],
      limitations: [
        'Watermark on free generation exports',
        'Outputs generated in 720p on free tier (upscalable via CapCut)',
      ],
      whatYouWillUseItFor: [
        'Generate animated character gestures with automatic sound effects',
        'Produce 3D stylized educational scenes with consistent lighting',
        'Animate scene illustrations for YouTube Shorts or long-form b-roll',
      ],
      whyFitsVideo: 'Combines stylized 3D animation rendering with automatic sound effect generation to save production time.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://pika.art',
      toolCategory: 'ai_generator',
      generationType: 'Text & Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.pika_art,
    },
    {
      id: 'leonardo_ai',
      name: 'Leonardo AI + Motion',
      bestFor: 'Character reference sheets & image-to-video motion',
      cost: 'Free tier (150 daily tokens replenished every 24 hours)',
      difficulty: 'Medium',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'Mobile App'],
      advantages: [
        'Consistent Character feature preserves identical face, hair, and clothing across poses',
        'Generates both master character reference images and animated motion video clips',
        'Generous 150 daily token allowance that never expires',
      ],
      limitations: [
        'Requires two-step workflow (Generate Image first, then Click Animate Motion)',
        'Motion length is 4 seconds per token generation',
      ],
      whatYouWillUseItFor: [
        'Generate master character reference sheet for Alex the Creator',
        'Create high-resolution scene keyframes with identical clothing and styling',
        'Convert keyframes into motion clips with custom motion strength (1-10)',
      ],
      whyFitsVideo: 'The best ₹0 tool for maintaining rock-solid character consistency across every scene in your AI animation story.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://leonardo.ai',
      toolCategory: 'ai_generator',
      generationType: 'Image → Video',
      aiProfile: AI_VIDEO_TOOL_PROFILES.leonardo_ai,
    },

    // ---------------------------------------------------------
    // 2. VOICE & AUDIO GENERATION (Secondary Tools)
    // ---------------------------------------------------------
    {
      id: 'elevenlabs',
      name: 'ElevenLabs AI Voice',
      bestFor: 'Hyper-realistic AI narration, natural inflection & tone',
      cost: 'Free tier available (10,000 characters/month ≈ 10 mins audio)',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Laptop', 'Desktop PC', 'Phone'],
      advantages: [
        'Studio-grade emotional delivery, natural breathing pauses, and articulate pacing',
        'Over 100+ high-quality community voices for educational and explainer content',
        'Supports voice speed tuning (0.8x to 1.2x) and stability controls',
      ],
      limitations: [
        'Free quota allows ~10 minutes of narration per month',
        'Attribution required on free tier',
      ],
      whatYouWillUseItFor: [
        'Paste your 5-minute video narration script',
        'Select warm, authoritative educator voice (e.g. Adam or Rachel)',
        'Export master MP3 track for your timeline video editor',
      ],
      whyFitsVideo: 'Provides broadcast-quality AI voiceover for your faceless animation video with zero recording equipment needed.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://elevenlabs.io',
      toolCategory: 'voice_audio',
      generationType: 'Audio/Voice',
    },
    {
      id: 'audacity',
      name: 'Audacity',
      bestFor: 'Free vocal cleanup, noise reduction & audio mastering',
      cost: '100% Free & Open Source (GPLv3) — Zero paywalls',
      difficulty: 'Easy',
      worksOn: ['Windows', 'Mac', 'Linux'],
      advantages: [
        'One-click Noise Reduction filter removes fan noise, room hum, and hiss',
        'Loudness Normalization guarantees YouTube-compliant -14 LUFS volume',
        '100% offline with zero account or cloud dependencies',
      ],
      limitations: [
        'Audio only; does not handle video timelines',
      ],
      whatYouWillUseItFor: [
        'Clean up microphone recordings or AI voice tracks',
        'Normalize dialogue loudness to -6dB peak and master audio track',
        'Export pristine 320kbps MP3 or WAV audio',
      ],
      whyFitsVideo: 'Completely free vocal mastering tool that ensures your voiceover is crisp, balanced, and loud enough for YouTube.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://www.audacityteam.org',
      toolCategory: 'voice_audio',
      generationType: 'Audio/Voice',
    },

    // ---------------------------------------------------------
    // 3. EDITING & TIMELINE ASSEMBLY (Assembly Tools)
    // ---------------------------------------------------------
    {
      id: 'capcut',
      name: 'CapCut',
      bestFor: 'Timeline assembly, B-roll sync & animated auto-captions',
      cost: 'Free / Free tier — verify current provider terms',
      difficulty: 'Easy',
      worksOn: ['Mobile (iOS/Android)', 'Windows', 'Mac', 'Web Browser'],
      advantages: [
        'Instant speech-to-text auto captions with animated presets',
        'Effortless timeline snapping to stitch generated AI animation clips together',
        'Built-in copyright-safe sound effects, transitions, and audio ducking',
      ],
      limitations: [
        'Certain advanced transition packs marked "Pro" require subscription',
      ],
      whatYouWillUseItFor: [
        'Import generated AI animation video clips (Scene 1 through Scene 5)',
        'Synchronize voiceover audio track with animated scene clips',
        'Add auto-captions, background music (-22dB), and sound effects',
        'Export master 1080p 60fps MP4 file for YouTube upload',
      ],
      whyFitsVideo: 'The fastest, easiest timeline editor to assemble your generated AI video clips, add automated captions, and finalize your master video.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://www.capcut.com',
      toolCategory: 'editing_assembly',
      generationType: 'Timeline Assembly',
    },
    {
      id: 'davinci_resolve',
      name: 'DaVinci Resolve',
      bestFor: 'Professional-grade timeline cutting, color grading & Fairlight audio',
      cost: 'Free Core Edition — No subscriptions',
      difficulty: 'Advanced',
      worksOn: ['Windows', 'Mac', 'Linux'],
      advantages: [
        'Hollywood-standard editing suite with professional Fairlight multi-track audio mixing',
        'Unmatched color correction tools to unify lighting across AI-generated clips',
        'Zero export watermarks and full 4K output capabilities in free edition',
      ],
      limitations: [
        'Demands dedicated GPU hardware and modern laptop/PC',
        'Steeper learning curve than lightweight mobile editors',
      ],
      whatYouWillUseItFor: [
        'Assemble complex multi-layer animation scenes with custom color grading',
        'Master multi-track sound effects and ambient lo-fi music tracks',
        'Export lossless master video file',
      ],
      whyFitsVideo: 'For creators wanting broadcast-quality color harmony and studio-grade audio mixing without software subscriptions.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://www.blackmagicdesign.com/products/davinciresolve',
      toolCategory: 'editing_assembly',
      generationType: 'Timeline Assembly',
    },
    {
      id: 'shotcut',
      name: 'Shotcut',
      bestFor: '100% Free Open-Source desktop video editing',
      cost: '100% Free & Open Source (GPLv3) — Zero subscriptions',
      difficulty: 'Medium',
      worksOn: ['Windows', 'Mac', 'Linux'],
      advantages: [
        'Completely free with zero paywalls, zero ads, and zero feature limits',
        'No watermark, exports up to 4K resolutions with full codec control',
        'Lightweight offline performance without needing internet or cloud logins',
      ],
      limitations: [
        'UI requires familiarization with timeline tracks and filter stacking',
      ],
      whatYouWillUseItFor: [
        'Assemble generated scene clips and synchronize voiceover',
        'Apply color grading and audio normalization filters',
        'Export high-bitrate YouTube-compliant MP4 master',
      ],
      whyFitsVideo: 'Shotcut guarantees you never hit an unexpected export paywall or surprise subscription. It is completely free forever.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://shotcut.org',
      toolCategory: 'editing_assembly',
      generationType: 'Timeline Assembly',
    },
    {
      id: 'kdenlive',
      name: 'Kdenlive',
      bestFor: 'Flexible non-linear video editing for mid-range PCs',
      cost: '100% Free & Open Source',
      difficulty: 'Medium',
      worksOn: ['Windows', 'Linux', 'Mac'],
      advantages: [
        'Highly versatile timeline with keyframe animations',
        'Runs smoothly on budget laptops where heavier suites stutter',
        'Zero watermarks and complete codec freedom',
      ],
      limitations: [
        'Fewer instant social media templates compared to CapCut',
      ],
      whatYouWillUseItFor: [
        'Stitch generated AI clips with custom transitions',
        'Keyframe zooms on important visual elements',
        'Render clean MP4 for YouTube',
      ],
      whyFitsVideo: 'A dependable free editor for laptops that runs without heavy GPU demands.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://kdenlive.org',
      toolCategory: 'editing_assembly',
      generationType: 'Timeline Assembly',
    },

    // ---------------------------------------------------------
    // 4. SCREEN CAPTURE, WHITEBOARD & DESIGN
    // ---------------------------------------------------------
    {
      id: 'obs_studio',
      name: 'OBS Studio',
      bestFor: 'Free screen recording, presentations & webcam capture',
      cost: '100% Free & Open Source — No restrictions',
      difficulty: 'Medium',
      worksOn: ['Windows', 'Mac', 'Linux'],
      advantages: [
        'High-resolution zero-lag screen recording for tutorial demos',
        'Separate audio tracks for microphone and system audio to ease editing',
        'Custom scene configurations (picture-in-picture webcam + full screen)',
      ],
      limitations: [
        'Only records media—does not edit or cut footage',
      ],
      whatYouWillUseItFor: [
        'Record your computer screen while demonstrating tools or slides',
        'Capture clear synchronized microphone commentary',
        'Produce clean 60fps footage ready for timeline editing',
      ],
      whyFitsVideo: 'Essential for walkthroughs and screen-recorded tutorials. It provides pristine capture with zero watermarks.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://obsproject.com',
      toolCategory: 'screen_capture',
      generationType: 'Timeline Assembly',
    },
    {
      id: 'videoscribe',
      name: 'VideoScribe',
      bestFor: 'Whiteboard drawing & animated SVG explainer videos',
      cost: 'Free Trial Available / Paid Subscription',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Windows', 'Mac'],
      advantages: [
        'Thousands of hand-drawn vector illustrations and icons',
        'Automatic hand-drawing animation effect synchronized to voiceover',
        'Custom font drawing and camera pan/zoom across infinite canvas',
      ],
      limitations: [
        'Free trial includes watermark on exported videos',
      ],
      whatYouWillUseItFor: [
        'Draw visual flowcharts and educational concept diagrams',
        'Synchronize hand-drawn sketches with spoken script points',
        'Export complete whiteboard animation video',
      ],
      whyFitsVideo: 'Dedicated software for whiteboard animation explainers with automatic hand-drawn motion.',
      isVerifiedFreeTier: false,
      providerUrl: 'https://www.videoscribe.co',
      toolCategory: 'whiteboard',
      generationType: 'Timeline Assembly',
    },
    {
      id: 'canva',
      name: 'Canva',
      bestFor: 'High-CTR thumbnail design & presentation slides',
      cost: 'Free tier available — verify current provider terms',
      difficulty: 'Easy',
      worksOn: ['Web Browser', 'Mobile (iOS/Android)', 'Desktop'],
      advantages: [
        'Thousands of YouTube thumbnail templates optimized for mobile feed readability',
        'Drag-and-drop text effects, outline strokes, and color swatches',
        'Works seamlessly across phone and computer with instant cloud saving',
      ],
      limitations: [
        'One-click background remover requires Canva Pro',
      ],
      whatYouWillUseItFor: [
        'Design 1280x720 16:9 thumbnail for long-form videos',
        'Add bold 3-word title text with high visual contrast',
        'Export crisp JPEG/PNG thumbnail under 2MB for YouTube Studio',
      ],
      whyFitsVideo: 'The fastest, zero-cost way to build YouTube thumbnails with high contrast and readable fonts.',
      isVerifiedFreeTier: true,
      providerUrl: 'https://www.canva.com',
      toolCategory: 'design',
      generationType: 'Timeline Assembly',
    },
  ];

  // Tailored scoring and filtering based on exact creation method
  return ALL_TOOLS.filter((tool) => {
    // If device is strictly phone, filter out desktop-only software
    if (isMobileOnly) {
      return tool.worksOn.some(w => w.includes('Mobile') || w.includes('Web'));
    }
    return true;
  }).sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Hard Constraint: Creation Method Matching
    const isAIWorkflow = creationMethod === 'ai_animation' || creationMethod === 'ai_image_to_video' || creationMethod === 'ai_assisted';
    const isScreenWorkflow = creationMethod === 'screen_recording';
    const isWhiteboardWorkflow = creationMethod === 'whiteboard';
    const isFacelessWorkflow = creationMethod === 'faceless';
    const isTalkingHeadWorkflow = creationMethod === 'talking_head';

    if (isAIWorkflow) {
      // Primary AI Generators MUST rank highest
      if (a.toolCategory === 'ai_generator') scoreA += 30;
      if (b.toolCategory === 'ai_generator') scoreB += 30;

      // Google Flow & Kling AI given top priority for free/free-tier ₹0 budget
      if (a.id === 'google_flow' || a.id === 'kling_ai' || a.id === 'runway_gen3') scoreA += 10;
      if (b.id === 'google_flow' || b.id === 'kling_ai' || b.id === 'runway_gen3') scoreB += 10;

      // Voice tools secondary
      if (a.toolCategory === 'voice_audio') scoreA += 10;
      if (b.toolCategory === 'voice_audio') scoreB += 10;

      // Editors tertiary
      if (a.toolCategory === 'editing_assembly') scoreA += 5;
      if (b.toolCategory === 'editing_assembly') scoreB += 5;
    } else if (isScreenWorkflow) {
      if (a.id === 'obs_studio') scoreA += 30;
      if (b.id === 'obs_studio') scoreB += 30;
      if (a.toolCategory === 'editing_assembly') scoreA += 15;
      if (b.toolCategory === 'editing_assembly') scoreB += 15;
    } else if (isWhiteboardWorkflow) {
      if (a.toolCategory === 'whiteboard') scoreA += 30;
      if (b.toolCategory === 'whiteboard') scoreB += 30;
      if (a.toolCategory === 'editing_assembly') scoreA += 10;
      if (b.toolCategory === 'editing_assembly') scoreB += 10;
    } else if (isFacelessWorkflow) {
      if (a.id === 'capcut' || a.id === 'elevenlabs') scoreA += 20;
      if (b.id === 'capcut' || b.id === 'elevenlabs') scoreB += 20;
    } else if (isTalkingHeadWorkflow) {
      if (a.id === 'capcut' || a.id === 'audacity') scoreA += 20;
      if (b.id === 'capcut' || b.id === 'audacity') scoreB += 20;
    }

    // Budget Scoring: Boost free tier if user has ₹0 budget
    if (isBudgetZero) {
      if (a.isVerifiedFreeTier) scoreA += 8;
      if (b.isVerifiedFreeTier) scoreB += 8;
      if (a.cost.includes('100% Free') || a.cost.includes('daily')) scoreA += 4;
      if (b.cost.includes('100% Free') || b.cost.includes('daily')) scoreB += 4;
    }

    return scoreB - scoreA;
  });
}
