/**
 * CreatorFlow AI — AI Video Clip Engine
 * 
 * Implements story-aware clip splitting, character continuity preservation,
 * and tool-specific prompt generation based on the selected AI video tool's profile.
 * 
 * Core Principle:
 * Selected Tool → Tool Capability Profile → Required Prompt Structure → Production Kit
 */

import {
  AIVideoToolProfile,
  VideoClipPackage,
  VideoClipPrompt,
  CharacterBible,
  StyleBible,
  ScenePlan,
  ScriptPackage,
} from '../types/guidedWorkflow';

export interface GenerateClipPackageParams {
  toolProfile: AIVideoToolProfile;
  totalDurationSeconds: number;
  topic: string;
  subject: string;
  scriptPackage: ScriptPackage;
  characterBible?: CharacterBible;
  styleBible?: StyleBible;
  scenePlan?: ScenePlan[];
  isMultiCharacter: boolean;
  creationMethod?: string;
  aspectRatio?: '16:9' | '9:16';
}

/**
 * Parses user brief or idea duration strings into total seconds.
 * e.g. "30 sec" -> 30, "45 sec" -> 45, "60 sec" -> 60, "2 min" -> 120, "5 min" -> 300
 */
export function parseDurationToSeconds(durationStr?: string, isShort?: boolean): number {
  if (!durationStr) return isShort ? 45 : 300;
  const lower = durationStr.toLowerCase().trim();

  // Seconds match (e.g. "30 sec", "45s", "60 seconds", "35 sec")
  const secMatch = lower.match(/(\d+)\s*(?:s|sec|second)/);
  if (secMatch) {
    const val = parseInt(secMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Minutes match (e.g. "2 min", "5 mins", "10 minute")
  const minMatch = lower.match(/(\d+)\s*(?:m|min|minute)/);
  if (minMatch) {
    const val = parseInt(minMatch[1], 10);
    if (!isNaN(val) && val > 0) return val * 60;
  }

  // Short fallback
  if (lower.includes('short')) return 45;
  return isShort ? 45 : 300;
}

/**
 * Formats seconds into MM:SS timestamp format.
 */
export function formatTimeCode(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates the complete, tool-tailored VideoClipPackage.
 */
export function generateToolVideoClipPackage(params: GenerateClipPackageParams): VideoClipPackage {
  const {
    toolProfile,
    totalDurationSeconds,
    topic,
    subject,
    scriptPackage,
    characterBible,
    styleBible,
    scenePlan,
    isMultiCharacter,
    aspectRatio = '16:9',
  } = params;

  const maxClip = Math.max(2, toolProfile.maxClipDurationSeconds || 10);
  const totalClipsCount = Math.max(1, Math.ceil(totalDurationSeconds / maxClip));

  // Determine character cast & references
  const characters = characterBible?.characters || [];
  const primaryChar = characters[0];
  const secondaryChar = isMultiCharacter && characters.length > 1 ? characters[1] : undefined;
  const tertiaryChar = isMultiCharacter && characters.length > 2 ? characters[2] : undefined;

  // Build Master Character Prompts (reusable locked identities)
  const masterCharacterPrompts: Record<string, string> = {};
  const masterReferencePrompts: Record<string, string> = {};

  characters.forEach((char) => {
    const charName = char.name;
    const lockDescription = `${char.name} (${char.role || 'Creator'}), ${char.appearance || 'friendly energetic creator'}, face: ${char.face || 'distinctive expressive facial features'}, hair: ${char.hair || 'short textured hair'}, clothing: ${char.clothing || 'modern casual creator attire'}, colors: ${char.colors || 'charcoal and warm accents'}, style: ${char.visualConsistencyRules?.join(', ') || 'Pixar-meets-Anime 3D stylized fidelity'}.`;
    
    masterCharacterPrompts[charName] = `CHARACTER MASTER PROMPT — [${charName.toUpperCase()}]:
Character Name: ${char.name}
Role: ${char.role || 'Protagonist'}
Personality: ${char.personality || 'Curious and articulate'}
Appearance Lock: ${char.appearance || 'Medium build, expressive eyes, warm demeanor'}
Face: ${char.face || 'Defined features, consistent jawline'}
Hairstyle: ${char.hair || 'Textured natural hair'}
Clothing: ${char.clothing || 'Casual studio pullover'}
Colors: ${char.colors || 'Charcoal, dark slate with warm accents'}
Visual Style: ${styleBible?.visualStyle || 'High-coherence stylized 3D animation, studio lighting'}
Consistency Rules: Maintain identical facial anatomy, hairstyle, and wardrobe across all generated clips. Avoid random color or clothing changes.`;

    // Generate Character Reference Prompt ONLY if tool supports/benefits from reference images
    if (toolProfile.supportsCharacterReference) {
      masterReferencePrompts[charName] = `CHARACTER REFERENCE PROMPT — [${charName.toUpperCase()}]:
Full turnaround character concept sheet of ${char.name}, front view, 3/4 view, and profile view. ${char.appearance}, wearing ${char.clothing}, neutral light gray studio background, symmetrical relaxed posture, highly detailed character model sheet, soft studio key light, 8k resolution, cinematic 3D digital render.`;
    }
  });

  // Collect script narration beats to distribute across clips
  const narrationBeats: string[] = [];
  if (scriptPackage.hook) narrationBeats.push(scriptPackage.hook);
  if (scriptPackage.introduction) narrationBeats.push(scriptPackage.introduction);
  if (scriptPackage.mainSections && scriptPackage.mainSections.length > 0) {
    scriptPackage.mainSections.forEach((s) => {
      if (s.narration) narrationBeats.push(s.narration);
    });
  }
  if (scriptPackage.payoff) narrationBeats.push(scriptPackage.payoff);
  if (scriptPackage.CTA) narrationBeats.push(scriptPackage.CTA);

  // Narrative Arc Plan Generator for totalClipsCount
  const clips: VideoClipPrompt[] = [];

  for (let i = 0; i < totalClipsCount; i++) {
    const clipNumber = i + 1;
    const startSec = i * maxClip;
    const endSec = Math.min((i + 1) * maxClip, totalDurationSeconds);
    const clipDuration = endSec - startSec;
    const timeRange = `${formatTimeCode(startSec)}–${formatTimeCode(endSec)}`;

    // Story-aware narrative phase assignment
    let narrativePhase: VideoClipPrompt['narrativePhase'];
    let phaseTitle: string;
    let beginningState: string;
    let action: string;
    let development: string;
    let endingState: string;
    let cameraMovement: string;
    let lighting: string;
    let environment: string;
    let charactersInClip: string[] = [];
    let speakingCharInClip: string | undefined = undefined;

    // Determine characters present in this clip
    if (isMultiCharacter && secondaryChar) {
      if (i === 0) {
        // Opening clip: Primary character hooks the viewer
        charactersInClip = [primaryChar.name];
        speakingCharInClip = primaryChar.name;
      } else if (i === totalClipsCount - 1) {
        // Closing clip: Both characters summarize together
        charactersInClip = [primaryChar.name, secondaryChar.name];
        speakingCharInClip = primaryChar.name;
      } else if (i % 2 === 1) {
        // Alternating / joint interaction
        charactersInClip = [primaryChar.name, secondaryChar.name];
        speakingCharInClip = secondaryChar.name;
      } else {
        charactersInClip = [primaryChar.name, secondaryChar.name];
        speakingCharInClip = primaryChar.name;
      }
    } else if (primaryChar) {
      charactersInClip = [primaryChar.name];
      speakingCharInClip = primaryChar.name;
    }

    // Determine story progression across clips
    const progressRatio = totalClipsCount === 1 ? 0.5 : i / (totalClipsCount - 1);

    if (progressRatio === 0) {
      narrativePhase = 'Hook';
      phaseTitle = 'Opening Hook & Pattern Interrupt';
      beginningState = `${primaryChar ? primaryChar.name : 'The creator'} enters the modern creative studio workspace, noticing a compelling anomaly on the central monitor.`;
      action = `${primaryChar ? primaryChar.name : 'The protagonist'} steps swiftly toward the workstation and points directly toward the core challenge of ${subject}.`;
      development = `A dynamic visual graph of ${subject} illuminates the screen, instantly commanding the viewer's attention.`;
      endingState = `The problem is clearly established on screen as ${primaryChar ? primaryChar.name : 'the presenter'} turns toward camera with focused energy.`;
      cameraMovement = 'Dramatic slow push-in from medium shot to tight close-up';
      lighting = 'High-contrast studio lighting with warm golden key light and subtle cyan rim light';
      environment = 'High-tech creative studio with clean minimalist wooden desk and ambient display monitors';
    } else if (progressRatio <= 0.3) {
      narrativePhase = 'Introduction';
      phaseTitle = 'Framework Context & Setup';
      beginningState = `Continuing from the hook, the workstation display shifts to reveal the fundamental structure of ${subject}.`;
      action = isMultiCharacter && secondaryChar
        ? `${secondaryChar.name} joins ${primaryChar.name} at the console, opening the master blueprint document.`
        : `${primaryChar ? primaryChar.name : 'The presenter'} initiates the step-by-step framework walkthrough on the interactive tablet.`;
      development = 'Holographic schematic layers expand outward, illustrating the core principles in clear visual hierarchy.';
      endingState = 'The viewer clearly grasps why conventional methods fail and why this approach succeeds.';
      cameraMovement = 'Smooth lateral tracking shot panning left-to-right across the workstation';
      lighting = 'Warm balanced 5200K interior studio lighting, soft diffused shadows';
      environment = 'Modern creator laboratory with architectural sketchboards and organized production gear';
    } else if (progressRatio <= 0.7) {
      narrativePhase = 'Development';
      phaseTitle = `Core Execution — Phase ${i}`;
      beginningState = `Building on the framework, ${primaryChar ? primaryChar.name : 'the team'} begins executing the primary demonstration of ${subject}.`;
      action = isMultiCharacter && secondaryChar
        ? `${primaryChar.name} demonstrates the primary workflow while ${secondaryChar.name} monitors the real-time output metrics on the tablet.`
        : `${primaryChar ? primaryChar.name : 'The creator'} meticulously performs the core workflow, highlighting the critical nuances.`;
      development = `The process yields an immediate visible transformation, proving the effectiveness of the strategy on ${subject}.`;
      endingState = 'A high-impact breakthrough metric or visual milestone is achieved, signaling readiness for the climax.';
      cameraMovement = 'Slow orbital camera move maintaining focus on the hands and active workspace';
      lighting = 'Vibrant cinematic studio lighting, crisp key illumination on active tools';
      environment = 'Focused workstation environment with ambient backlight and active glowing visual telemetry';
    } else if (progressRatio < 1.0) {
      narrativePhase = 'Climax';
      phaseTitle = 'Turning Point & Breakthrough';
      beginningState = `The demonstration reaches its critical turning point as the full power of ${subject} becomes undeniable.`;
      action = isMultiCharacter && secondaryChar
        ? `${secondaryChar.name} points excitedly to the finalized result as ${primaryChar.name} executes the concluding step.`
        : `${primaryChar ? primaryChar.name : 'The creator'} executes the final step with decisive confidence.`;
      development = 'The complete completed roadmap or model crystallizes on the main display with vivid clarity.';
      endingState = 'The core lesson is conclusively proven and ready for immediate viewer implementation.';
      cameraMovement = 'Cinematic low-angle dolly push-in emphasizing accomplishment';
      lighting = 'Bright triumphant studio illumination with golden rim lighting accents';
      environment = 'Polished master studio with clean lines and radiant display backdrop';
    } else {
      narrativePhase = 'Payoff';
      phaseTitle = 'Payoff & Actionable Next Steps';
      beginningState = `With the goal achieved, ${primaryChar ? primaryChar.name : 'the presenter'} steps forward to address the viewer directly.`;
      action = isMultiCharacter && secondaryChar
        ? `Both ${primaryChar.name} and ${secondaryChar.name} face the camera with supportive, confident smiles, offering a welcoming gesture.`
        : `${primaryChar ? primaryChar.name : 'The creator'} addresses the camera with genuine encouragement and a clear call to action.`;
      development = 'A concise recap summary card slides smoothly into the lower third of the frame.';
      endingState = 'The video concludes on a high-energy, memorable note leaving the viewer empowered to take action.';
      cameraMovement = 'Gentle pull-back to comfortable medium shot, establishing warm personal connection';
      lighting = 'Warm flattering portrait lighting with soft background bokeh';
      environment = 'Inviting modern creator lounge with warm ambient lighting';
    }

    // Select spoken snippet for this clip
    const spokenIndex = Math.min(i, narrationBeats.length - 1);
    const spokenText = narrationBeats[spokenIndex] || `Mastering ${subject} requires understanding this critical phase.`;

    // Continuity Lock Token
    const charContinuityToken = charactersInClip.length > 0
      ? `Maintain locked character appearances: ${charactersInClip.map(cName => {
          const c = characters.find(ch => ch.name.toLowerCase() === cName.toLowerCase());
          return c ? `${c.name} (${c.clothing || 'casual studio attire'}, ${c.hair || 'textured hair'})` : cName;
        }).join(' and ')}. Identical facial structure, colors, and art style across clips.`
      : 'Maintain consistent visual aesthetic, color palette, and environmental design.';

    // Construct tool-specific prompt based on toolProfile.promptStrategy
    let videoPrompt = '';
    let imagePrompt: string | undefined = undefined;
    let motionPrompt: string | undefined = undefined;
    let negativePrompt: string | undefined = undefined;

    if (toolProfile.supportsNegativePrompt) {
      negativePrompt = toolProfile.negativePromptTemplate || 'distorted face, blurry, inconsistent clothing, extra limbs, low resolution, flickering, text watermark';
    }

    if (toolProfile.promptStrategy === 'image-plus-motion') {
      // Stage 1 Image Prompt
      imagePrompt = `Scene ${clipNumber} Keyframe Image: ${charContinuityToken} ${beginningState} ${environment}. ${lighting}. Shot framing: ${cameraMovement}. Highly detailed cinematic digital 3D illustration, 8k resolution, aspect ratio ${aspectRatio}.`;
      // Stage 2 Motion Prompt
      motionPrompt = `Motion Prompt: ${action} ${development} ${endingState}. Camera direction: ${cameraMovement}. Motion intensity moderate (4/10), natural realistic character movement, seamless temporal consistency.`;
      // Combined representation for reference
      videoPrompt = `${imagePrompt}\n\n[MOTION DIRECTIVE]:\n${motionPrompt}`;
    } else {
      // Strategy: single-complete-prompt (Google Flow, Kling AI, Luma Dream Machine, Runway Gen-3, Pika 2.0, Hailuo)
      if (toolProfile.toolId === 'kling_ai') {
        videoPrompt = `High-fidelity cinematic sequence, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera: ${cameraMovement}. Environment: ${environment}. Lighting: ${lighting}. Masterful physical dynamics, high temporal stability, photorealistic 3D render --duration ${clipDuration}s --cfg_scale 0.5`;
      } else if (toolProfile.toolId === 'google_flow') {
        videoPrompt = `Cinematic 3D animation, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera movement: ${cameraMovement}. Setting: ${environment}. Lighting: ${lighting}. 8k high temporal coherence, smooth Pixar-meets-Anime stylization --duration ${clipDuration}s`;
      } else if (toolProfile.toolId === 'runway_gen3') {
        videoPrompt = `Director Mode: ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera: ${cameraMovement}. Environment: ${environment}, ${lighting}. Photorealistic motion, cinematic depth of field, 1080p 60fps.`;
      } else if (toolProfile.toolId === 'luma_dream_machine') {
        videoPrompt = `Dynamic 3D camera sweep, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Continuous smooth keyframe transition, ${cameraMovement}, volumetric studio lighting, photorealistic rendering.`;
      } else if (toolProfile.toolId === 'pika_art') {
        videoPrompt = `3D stylized animation, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Subtle integrated sound effect cues: crisp ambient hum, console click. Camera: ${cameraMovement}. Setting: ${environment}, ${lighting}. Smooth motion.`;
      } else if (toolProfile.toolId === 'sora') {
        videoPrompt = `Cinematic continuous shot, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera: ${cameraMovement}. Environment: ${environment}. Lighting: ${lighting}. Natural physical simulation of light reflections, fabric, and realistic weight, photorealistic 4k fidelity.`;
      } else if (toolProfile.toolId === 'hailuo_ai') {
        videoPrompt = `Cinematic master shot, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera: ${cameraMovement}. Setting: ${environment}. Natural physical motion, expressive character gestures, cinematic warm lighting.`;
      } else {
        // General single complete prompt
        videoPrompt = `Cinematic video sequence, ${charContinuityToken} ${beginningState} ${action} ${development} ${endingState}. Camera: ${cameraMovement}. Environment: ${environment}. Lighting: ${lighting}. Smooth motion, high visual coherence.`;
      }
    }

    clips.push({
      clipNumber,
      timeRange,
      durationSeconds: clipDuration,
      title: `Clip ${clipNumber.toString().padStart(2, '0')} — ${timeRange}: ${phaseTitle}`,
      narrativePhase,
      beginningState,
      action,
      development,
      endingState,
      videoPrompt: videoPrompt.trim(),
      imagePrompt,
      motionPrompt,
      negativePrompt,
      charactersPresent: charactersInClip,
      primaryCharacter: charactersInClip[0] || (primaryChar ? primaryChar.name : undefined),
      speakingCharacter: speakingCharInClip,
      continuityLock: charContinuityToken,
      cameraMovement,
      lighting,
      environment,
      spokenText,
      isAudioIntegrated: Boolean(toolProfile.supportsAudioGeneration && (toolProfile.supportsDialogue || toolProfile.supportsSoundEffects)),
    });
  }

  // Build concise 5-step assembly instructions
  const assemblyInstructions = [
    `1. Generate Clips 01–${totalClipsCount.toString().padStart(2, '0')} in ${toolProfile.name} using each clip prompt above.`,
    `2. Import all generated MP4 clips into your timeline editor (e.g. CapCut or DaVinci Resolve) in exact chronological order.`,
    `3. Review clip transitions (00:00 through ${formatTimeCode(totalDurationSeconds)}) to verify character continuity and seamless visual flow.`,
    toolProfile.supportsAudioGeneration
      ? `4. Synchronize the video audio track and balance volume levels with background music (-20dB).`
      : `4. Import your external voiceover narration track (${formatTimeCode(totalDurationSeconds)}) and align the spoken lines with corresponding scene actions.`,
    `5. Add on-screen captions or text overlays where needed and export the final 1080p video ready for YouTube.`,
  ];

  return {
    toolId: toolProfile.toolId,
    toolName: toolProfile.name,
    totalDurationSeconds,
    maxClipDurationSeconds: maxClip,
    totalClipsCount,
    promptStrategy: toolProfile.promptStrategy,
    requiresSeparateAssembly: toolProfile.requiresSeparateAssembly,
    supportsAudioGeneration: toolProfile.supportsAudioGeneration,
    supportsCharacterReference: toolProfile.supportsCharacterReference,
    supportsNegativePrompt: toolProfile.supportsNegativePrompt,
    masterCharacterPrompts: Object.keys(masterCharacterPrompts).length > 0 ? masterCharacterPrompts : undefined,
    masterReferencePrompts: Object.keys(masterReferencePrompts).length > 0 ? masterReferencePrompts : undefined,
    clips,
    assemblyInstructions,
  };
}
