/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Video Model Adapters
 * Encapsulates model-specific syntax rules, technical parameter formatting,
 * duration boundaries, and negative prompt handling.
 *
 * Supported verified models:
 * - Runway Gen-3 Alpha
 * - OpenAI Sora
 * - Kling AI (1.5)
 * - Luma Dream Machine
 * - Pika 2.0
 * - Hailuo AI (MiniMax)
 * - Leonardo AI (2-Stage Image-to-Video)
 * - Google Flow
 */

import { StructuredVideoScene } from './visualPlanning';
import { AIVideoToolProfile } from '../../../types/guidedWorkflow';
import { getAIVideoToolProfile } from '../../aiVideoToolProfiles';

export interface FormattedModelPrompt {
  modelId: string;
  modelName: string;
  promptText: string;
  negativePrompt?: string;
  imagePrompt?: string;
  motionPrompt?: string;
  clipDurationSeconds: number;
  aspectRatio: string;
  cameraChoreography: string;
  lightingDescription: string;
  observableAction: string;
  narrativePhase: string;
  compatibilityNotes: string[];
  parameters: Record<string, any>;
}

export interface ModelPromptFormatOptions {
  modelIdOrName?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  characterLockToken?: string;
  requestedDurationSeconds?: number;
  includeAudioCue?: boolean;
}

export function formatPromptForModel(
  scene: StructuredVideoScene,
  options: ModelPromptFormatOptions = {}
): FormattedModelPrompt {
  const profile: AIVideoToolProfile = getAIVideoToolProfile(options.modelIdOrName || 'google_flow');
  const aspectRatio = options.aspectRatio || '16:9';
  const charLock = options.characterLockToken || (scene.characterTokens[0] || 'protagonist with consistent appearance');
  
  // Calculate duration respecting model cap
  const maxModelDuration = profile.maxClipDurationSeconds || 10;
  const clipDuration = Math.min(
    options.requestedDurationSeconds || scene.intendedDurationSeconds || maxModelDuration,
    maxModelDuration
  );

  const actionText = `${scene.actionSequence.beginningState} ${scene.actionSequence.observableAction} ${scene.actionSequence.physicalInteraction}`;
  const cameraText = scene.camera.description;
  const lightingText = `${scene.lighting.style}: ${scene.lighting.keyLight}, ${scene.lighting.rimLight} (${scene.lighting.colorTemperatureKelvin}K)`;
  const envText = scene.environmentDetails;

  const compatibilityNotes: string[] = [];

  switch (profile.toolId) {
    // -------------------------------------------------------------
    // RUNWAY GEN-3 ALPHA
    // -------------------------------------------------------------
    case 'runway_gen3': {
      compatibilityNotes.push('Formatted for Runway Gen-3 Director Mode.');
      compatibilityNotes.push('Negative prompts are not supported by Runway Gen-3 and have been excluded.');
      compatibilityNotes.push(`Enforced duration limit: ${clipDuration}s (max ${profile.maxClipDurationSeconds}s).`);

      const promptText = `Director Mode: ${charLock}. ${actionText}. Camera: ${cameraText}. Lighting: ${lightingText}. Environment: ${envText}. Cinematic photorealism, high physical coherence, crisp 1080p 60fps.`;

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt: undefined, // Runway does NOT use negative prompt
        clipDurationSeconds: clipDuration,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          directorMode: true,
          cameraMovement: scene.camera.movement,
          aspectRatio,
          duration: clipDuration,
        },
      };
    }

    // -------------------------------------------------------------
    // OPENAI SORA
    // -------------------------------------------------------------
    case 'sora': {
      compatibilityNotes.push('Formatted for OpenAI Sora continuous high-temporal rendering.');
      compatibilityNotes.push('Negative prompts are not used by Sora; positive natural language description enforced.');
      compatibilityNotes.push(`Duration set to ${clipDuration}s (supported continuous takes up to 20s).`);

      const lensNote = scene.composition.lensFocalLength.replace('_', ' ');
      const framingNote = scene.composition.subjectFraming.replace('_', ' ');

      const promptText = `Cinematic continuous shot (${framingNote}, ${lensNote}): ${charLock}. ${actionText} transitioning into ${scene.actionSequence.endingState}. Camera choreography: ${cameraText}. Lighting and color temperature: ${lightingText}. Spatial staging: Foreground ${scene.composition.foreground}; Background ${scene.composition.background}. Natural physical simulations of light reflections, fabric, and realistic weight. Photorealistic 4k fidelity.`;

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt: undefined, // Sora does NOT use negative prompt parameter
        clipDurationSeconds: clipDuration,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          lensFocalLength: scene.composition.lensFocalLength,
          subjectFraming: scene.composition.subjectFraming,
          aspectRatio,
          duration: clipDuration,
        },
      };
    }

    // -------------------------------------------------------------
    // KLING AI / KLING 1.5
    // -------------------------------------------------------------
    case 'kling_ai': {
      compatibilityNotes.push('Formatted for Kling AI / 1.5 master camera controls and physical dynamics.');
      compatibilityNotes.push(`Negative prompt template active with CFG scale 0.5.`);
      compatibilityNotes.push(`Duration tagged: ${clipDuration}s.`);

      const promptText = `High-fidelity cinematic scene, ${charLock}. ${actionText}. Camera: ${cameraText}. Environment: ${envText}. Lighting: ${lightingText}. Masterful physical dynamics, high temporal stability, photorealistic 3D render --duration ${clipDuration}s --cfg_scale 0.5`;
      const negativePrompt = profile.negativePromptTemplate || 'blurry, bad anatomy, deformed hands, duplicate heads, low quality, artifacts, watermark --cfg_scale 0.5';

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt,
        clipDurationSeconds: clipDuration,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          cfgScale: 0.5,
          duration: `${clipDuration}s`,
          aspectRatio,
        },
      };
    }

    // -------------------------------------------------------------
    // LUMA DREAM MACHINE
    // -------------------------------------------------------------
    case 'luma_dream_machine': {
      compatibilityNotes.push('Formatted for Luma Dream Machine 3D camera sweeps and keyframe interpolation.');
      compatibilityNotes.push('Clip duration strictly capped at 5s.');
      compatibilityNotes.push('Negative prompts omitted (not supported by Dream Machine).');

      const promptText = `Dynamic 3D camera sweep, ${charLock}. ${actionText}. Camera choreography: ${cameraText}. Environment: ${envText}. Lighting: ${lightingText}. Continuous smooth keyframe transition, volumetric studio lighting, photorealistic rendering.`;

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt: undefined,
        clipDurationSeconds: 5,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          continuousKeyframe: true,
          duration: 5,
          aspectRatio,
        },
      };
    }

    // -------------------------------------------------------------
    // PIKA 2.0
    // -------------------------------------------------------------
    case 'pika_art': {
      compatibilityNotes.push('Formatted for Pika 2.0 with integrated Pikaffects audio cues.');
      compatibilityNotes.push('Clip duration capped at 4s.');
      compatibilityNotes.push('Pika camera parameter and negative prompt flags appended.');

      const audioCue = options.includeAudioCue && scene.audioAtmosphereCue
        ? ` Sound cue: [${scene.audioAtmosphereCue}].`
        : '';
      const cameraDirective = scene.camera.movement === 'slow_push_in' ? 'zoom in' : scene.camera.movement === 'lateral_tracking' ? 'pan right' : 'static';

      const promptText = `3D stylized animation, ${charLock}. ${actionText}.${audioCue} Camera: ${cameraText}. Setting: ${envText}, ${lightingText}. -camera ${cameraDirective} -motion 2`;
      const negativePrompt = '-neg blurry, deformed, cartoonish distortions, extra limbs, watermark';

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt,
        clipDurationSeconds: 4,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          cameraFlag: `-camera ${cameraDirective}`,
          motionLevel: 2,
          hasAudioCue: Boolean(audioCue),
        },
      };
    }

    // -------------------------------------------------------------
    // HAILUO AI (MINIMAX)
    // -------------------------------------------------------------
    case 'hailuo_ai': {
      compatibilityNotes.push('Formatted for Hailuo AI (MiniMax) natural physical motion and character acting.');
      compatibilityNotes.push('Clip duration capped at 6s.');
      compatibilityNotes.push('Negative prompts omitted (not supported by Hailuo).');

      const promptText = `Cinematic master shot, ${charLock}. ${actionText}. Physical interaction: ${scene.actionSequence.physicalInteraction}. Camera: ${cameraText}. Setting: ${envText}. Natural physical motion, expressive character gestures, realistic fabric simulation, warm cinematic lighting.`;

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt: undefined,
        clipDurationSeconds: 6,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          duration: 6,
          aspectRatio,
        },
      };
    }

    // -------------------------------------------------------------
    // LEONARDO AI (2-STAGE IMAGE-TO-VIDEO)
    // -------------------------------------------------------------
    case 'leonardo_ai': {
      compatibilityNotes.push('Formatted for Leonardo AI 2-Stage workflow (Stage 1 Keyframe Image -> Stage 2 Motion).');
      compatibilityNotes.push('Clip duration capped at 4s motion generation.');

      const imagePrompt = `Stage 1 Keyframe Image: ${charLock} at ${scene.actionSequence.beginningState} in ${envText}. ${lightingText}. Framing: ${scene.camera.description}. Highly detailed cinematic digital 3D illustration, 8k resolution, aspect ratio ${aspectRatio}.`;
      const motionPrompt = `Stage 2 Motion Prompt: ${actionText} moving smoothly into ${scene.actionSequence.endingState}. Camera direction: ${cameraText}. Motion strength moderate (4/10), high temporal stability.`;
      const negativePrompt = 'bad anatomy, missing limbs, morphing face, blurry, low resolution, extra fingers';

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: `${imagePrompt}\n\n[MOTION DIRECTIVE]:\n${motionPrompt}`,
        imagePrompt,
        motionPrompt,
        negativePrompt,
        clipDurationSeconds: 4,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          twoStageWorkflow: true,
          motionStrength: 4,
          aspectRatio,
        },
      };
    }

    // -------------------------------------------------------------
    // GOOGLE FLOW (LABS) / DEFAULT
    // -------------------------------------------------------------
    case 'google_flow':
    default: {
      compatibilityNotes.push('Formatted for Google Flow with character reference token and cinematic styling.');
      compatibilityNotes.push(`Duration set to ${clipDuration}s with --motion 4.`);

      const promptText = `Cinematic 3D animation sequence: ${charLock}. ${actionText}. Camera movement: ${cameraText}. Setting: ${envText}. Lighting: ${lightingText}. 8k high temporal coherence, smooth Pixar-meets-Anime stylization --motion 4 --duration ${clipDuration}s`;
      const negativePrompt = profile.negativePromptTemplate || 'distorted face, inconsistent clothing, extra limbs, low resolution, flickering, text watermark, oversaturated';

      return {
        modelId: profile.toolId,
        modelName: profile.name,
        promptText: promptText.trim(),
        negativePrompt,
        clipDurationSeconds: clipDuration,
        aspectRatio,
        cameraChoreography: cameraText,
        lightingDescription: lightingText,
        observableAction: scene.actionSequence.observableAction,
        narrativePhase: scene.narrativePhase,
        compatibilityNotes,
        parameters: {
          motionParam: '--motion 4',
          duration: `${clipDuration}s`,
          aspectRatio,
        },
      };
    }
  }
}
