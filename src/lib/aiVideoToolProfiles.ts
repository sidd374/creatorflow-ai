/**
 * CreatorFlow AI — AI Video Tool Capability Profiles
 * 
 * Maps each supported AI video generation tool to its verified real-world capabilities:
 * - Maximum clip generation duration
 * - Prompt strategy (single-complete-prompt vs image-plus-motion vs tool-specific)
 * - Character consistency & reference requirements
 * - Audio & sound generation capabilities
 * - Camera, motion, and negative prompt support
 * - Assembly requirements
 * 
 * Strict Principle:
 * Selected Tool → Tool Capability Profile → Required Prompt Structure → Production Kit
 * Do NOT invent capabilities that a tool does not possess.
 */

import { AIVideoToolProfile } from '../types/guidedWorkflow';

export const AI_VIDEO_TOOL_PROFILES: Record<string, AIVideoToolProfile> = {
  google_flow: {
    toolId: 'google_flow',
    name: 'Google Flow',
    id: 'google_flow',
    category: 'ai_video_generation',
    officialUrl: 'https://labs.google',
    generationModes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    maxClipDurationSeconds: 10,
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: false, // Standard Google Flow generates silent video; external audio track required
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true,
    supportsMotionInstructions: true,
    supportsNegativePrompt: true,
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Cinematic AI scenes', 'Educational explainers', 'Rapid visual storytelling'],
    negativePromptTemplate: 'distorted face, inconsistent clothing, extra limbs, low resolution, flickering, text watermark, oversaturated',
    promptSyntaxGuidance: 'Cinematic 3D animation scene, [CHARACTER CONSISTENCY], [ENVIRONMENT], [ACTION], [CAMERA DIRECTION], [LIGHTING], 8k render --motion 4',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  kling_ai: {
    toolId: 'kling_ai',
    name: 'Kling AI',
    id: 'kling_ai',
    category: 'ai_video_generation',
    officialUrl: 'https://klingai.com',
    generationModes: ['text-to-video', 'image-to-video', 'reference-to-video', 'character-video'],
    maxClipDurationSeconds: 10, // Kling standard generation supports up to 10s continuous generation
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: false, // Standard Kling video generator outputs silent footage; external audio required
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true, // Master camera controls: pan, tilt, zoom, horizontal/vertical
    supportsMotionInstructions: true,
    supportsNegativePrompt: true,
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Recurring daily free credits', 'Natural physics', 'Character storytelling'],
    negativePromptTemplate: 'blurry, bad anatomy, deformed hands, duplicate heads, low quality, artifacts, watermark --cfg_scale 0.5',
    promptSyntaxGuidance: '3D stylized animation, [CHARACTER CONSISTENCY], [ACTION], [ENVIRONMENT], 5200K studio warm lighting, 1080p high quality --cfg_scale 0.5',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  runway_gen3: {
    toolId: 'runway_gen3',
    name: 'Runway Gen-3 Alpha',
    id: 'runway_gen3',
    category: 'ai_video_generation',
    officialUrl: 'https://runwayml.com',
    generationModes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    maxClipDurationSeconds: 10, // 5s or 10s generations
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: false, // Standard text-to-video is visual only
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true, // Director Mode: pan, tilt, zoom, dolly, truck
    supportsMotionInstructions: true,
    supportsNegativePrompt: false, // Runway does not use a negative prompt field
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Cinematic motion', 'Camera director control', 'Character acting scenes'],
    promptSyntaxGuidance: 'Director mode: [ACTION], [CAMERA MOVEMENT], cinematic lighting, smooth motion, high detail',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  luma_dream_machine: {
    toolId: 'luma_dream_machine',
    name: 'Luma Dream Machine',
    id: 'luma_dream_machine',
    category: 'ai_video_generation',
    officialUrl: 'https://lumalabs.ai/dream-machine',
    generationModes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    maxClipDurationSeconds: 5, // Generates 5-second continuous clips per request
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true, // Start-frame keyframe image
    supportsStyleReference: true,
    supportsAudioGeneration: false, // No native audio generation in video engine
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true, // Fluid 3D camera sweeps
    supportsMotionInstructions: true,
    supportsNegativePrompt: false,
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Fast generation speed', 'Dynamic camera sweeps', 'Keyframe animation'],
    promptSyntaxGuidance: 'Dynamic 3D camera sweep, [CHARACTER CONSISTENCY], [ACTION], volumetric lighting, photorealistic rendering',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  pika_art: {
    toolId: 'pika_art',
    name: 'Pika 2.0',
    id: 'pika_art',
    category: 'ai_video_generation',
    officialUrl: 'https://pika.art',
    generationModes: ['text-to-video', 'image-to-video'],
    maxClipDurationSeconds: 4, // 4-second base clip generation
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: true, // Pikaffects automatically generates synchronized sound effects!
    supportsDialogue: false, // Does not synthesize spoken dialogue
    supportsSoundEffects: true,
    supportsMusic: false,
    supportsCameraInstructions: true,
    supportsMotionInstructions: true,
    supportsNegativePrompt: true,
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Idea-to-video with sound effects', 'Stylized 3D animation', 'Short-form visual clips'],
    negativePromptTemplate: '-neg blurry, deformed, cartoonish distortions',
    promptSyntaxGuidance: '3D stylized animation, [CHARACTER CONSISTENCY], [ACTION with sound effect cue], cinematic framing, smooth motion',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  leonardo_ai: {
    toolId: 'leonardo_ai',
    name: 'Leonardo AI + Motion',
    id: 'leonardo_ai',
    category: 'ai_video_generation',
    officialUrl: 'https://leonardo.ai',
    generationModes: ['image-to-video', 'reference-to-video', 'character-video'],
    maxClipDurationSeconds: 4, // 4-second motion clip per generation
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true, // Strong Consistent Character reference sheets
    supportsStyleReference: true,
    supportsAudioGeneration: false,
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true,
    supportsMotionInstructions: true,
    supportsNegativePrompt: true,
    promptStrategy: 'image-plus-motion', // Stage 1 Image -> Stage 2 Motion
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Character reference sheets', 'Consistent character keyframes', 'Controlled motion strength'],
    negativePromptTemplate: 'bad anatomy, missing limbs, morphing face, blurry, low resolution',
    promptSyntaxGuidance: 'Stage 1: Generate Master Reference / Keyframe -> Stage 2: Motion Strength (1-10) with subtle camera direction',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  hailuo_ai: {
    toolId: 'hailuo_ai',
    name: 'Hailuo AI (MiniMax)',
    id: 'hailuo_ai',
    category: 'ai_video_generation',
    officialUrl: 'https://hailuoai.video',
    generationModes: ['text-to-video', 'image-to-video'],
    maxClipDurationSeconds: 6, // 6-second clips
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: false,
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true,
    supportsMotionInstructions: true,
    supportsNegativePrompt: false,
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Fluid organic motion', 'Cinematic physical interactions', 'High frame coherence'],
    promptSyntaxGuidance: 'Natural language descriptive prompt with fluid character motion and realistic cinematic lighting',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  heygen: {
    toolId: 'heygen',
    name: 'HeyGen',
    id: 'heygen',
    category: 'ai_video_generation',
    officialUrl: 'https://www.heygen.com',
    generationModes: ['character-video'],
    maxClipDurationSeconds: 120, // Avatar presenter scenes up to 2-5 minutes
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: false, // Avatar is pre-selected
    supportsCharacterReference: false,
    supportsStyleReference: false,
    supportsAudioGeneration: true, // Built-in TTS voiceover and lip sync!
    supportsDialogue: true,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: false,
    supportsMotionInstructions: false,
    supportsNegativePrompt: false,
    promptStrategy: 'tool-specific',
    requiresSeparateAssembly: false,
    freeAvailability: 'free_tier',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Faceless educational videos', 'Talking avatar presenters', 'Complete script-to-video with audio'],
    promptSyntaxGuidance: 'Avatar presentation script with tone, pronunciation, and pacing settings',
    recommendedAspectRatios: ['16:9', '9:16'],
  },

  sora: {
    toolId: 'sora',
    name: 'OpenAI Sora',
    id: 'sora',
    category: 'ai_video_generation',
    officialUrl: 'https://openai.com/sora',
    generationModes: ['text-to-video', 'image-to-video'],
    maxClipDurationSeconds: 20, // Continuous video clips up to 20 seconds
    supportsCharacterConsistency: true,
    requiresCharacterPrompt: true,
    supportsCharacterReference: true,
    supportsStyleReference: true,
    supportsAudioGeneration: false, // Baseline video generation is visual only
    supportsDialogue: false,
    supportsSoundEffects: false,
    supportsMusic: false,
    supportsCameraInstructions: true, // Master cinematic camera movements (pan, crane, tracking, orbital)
    supportsMotionInstructions: true, // Physical world simulation, fabric, fluid, lighting reflection
    supportsNegativePrompt: false, // Sora relies on descriptive natural language, no negative prompt token
    promptStrategy: 'single-complete-prompt',
    requiresSeparateAssembly: true,
    freeAvailability: 'paid',
    browserSupport: true,
    desktopSupport: true,
    bestFor: ['Photorealistic physical simulations', 'Complex scene geometry', 'Continuous 20s cinematic takes'],
    promptSyntaxGuidance: 'Cinematic sequence: [OBSERVABLE ACTION], [CAMERA MOVEMENT & LENS], [LIGHTING & ATMOSPHERE], [PHYSICAL INTERACTION], photorealistic 4k fidelity',
    recommendedAspectRatios: ['16:9', '9:16'],
  },
};

/**
 * Resolves the AIVideoToolProfile for a given tool identifier or name.
 * Defaults deterministically to Google Flow if the tool is unspecified or unknown.
 */
export function getAIVideoToolProfile(toolIdOrName?: string): AIVideoToolProfile {
  if (!toolIdOrName) {
    return AI_VIDEO_TOOL_PROFILES.google_flow;
  }

  const normalized = toolIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Exact ID match
  if (AI_VIDEO_TOOL_PROFILES[normalized]) {
    return AI_VIDEO_TOOL_PROFILES[normalized];
  }

  // Substring match
  if (normalized.includes('sora')) return AI_VIDEO_TOOL_PROFILES.sora;
  if (normalized.includes('kling')) return AI_VIDEO_TOOL_PROFILES.kling_ai;
  if (normalized.includes('flow')) return AI_VIDEO_TOOL_PROFILES.google_flow;
  if (normalized.includes('runway') || normalized.includes('gen3') || normalized.includes('gen_3')) return AI_VIDEO_TOOL_PROFILES.runway_gen3;
  if (normalized.includes('luma') || normalized.includes('dream')) return AI_VIDEO_TOOL_PROFILES.luma_dream_machine;
  if (normalized.includes('pika')) return AI_VIDEO_TOOL_PROFILES.pika_art;
  if (normalized.includes('leonardo')) return AI_VIDEO_TOOL_PROFILES.leonardo_ai;
  if (normalized.includes('hailuo') || normalized.includes('minimax')) return AI_VIDEO_TOOL_PROFILES.hailuo_ai;
  if (normalized.includes('heygen')) return AI_VIDEO_TOOL_PROFILES.heygen;

  // Fallback default
  return AI_VIDEO_TOOL_PROFILES.google_flow;
}

export function getAllAIVideoToolProfiles(): AIVideoToolProfile[] {
  return Object.values(AI_VIDEO_TOOL_PROFILES);
}

export function isAIVideoTool(toolIdOrName?: string): boolean {
  if (!toolIdOrName) return false;
  const lower = toolIdOrName.toLowerCase();
  return (
    lower.includes('flow') ||
    lower.includes('kling') ||
    lower.includes('runway') ||
    lower.includes('luma') ||
    lower.includes('pika') ||
    lower.includes('leonardo') ||
    lower.includes('hailuo') ||
    lower.includes('heygen') ||
    lower.includes('sora') ||
    lower.includes('ai_generator')
  );
}
