/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Visual Planning Engine
 * Decomposes user video requirements into structured, observable visual plans
 * before constructing model-specific prose.
 *
 * Principle:
 * "Observable Action Over Decorative Fluff"
 * - Converts unfilmable internal thoughts into concrete physical actions.
 * - Explicitly models spatial depth (Foreground, Middle ground, Background).
 * - Calibrates lighting temperature (Kelvin), camera lenses, and movement.
 */

import { StructuredTopicUnderstanding } from '../topicUnderstanding';
import { CreativeStrategyType } from '../types';

export interface SpatialComposition {
  foreground: string;
  middleGround: string;
  background: string;
  subjectFraming: 'extreme_close_up' | 'close_up' | 'medium_shot' | 'medium_wide' | 'wide_establishing';
  lensFocalLength: '24mm_wide' | '35mm_cinematic' | '50mm_natural' | '85mm_portrait' | '100mm_macro';
}

export interface LightingAtmosphere {
  style: string;
  keyLight: string;
  rimLight: string;
  colorTemperatureKelvin: number; // e.g. 3200 (warm), 5200 (balanced daylight), 6500 (cool tech)
  atmosphereTone: string;
  shadowQuality: 'soft_diffused' | 'crisp_dramatic' | 'ambient_wrap';
}

export interface CameraChoreography {
  movement: 'slow_push_in' | 'lateral_tracking' | 'orbital_sweep' | 'tilt_up_reveal' | 'crane_down' | 'static_locked';
  angle: 'eye_level' | 'low_angle_heroic' | 'high_angle_overview' | 'dutch_slight';
  speed: 'slow_deliberate' | 'fluid_cinematic' | 'dynamic_snappy';
  transitionCue?: string;
  description: string;
}

export interface ObservableActionSequence {
  beginningState: string;
  observableAction: string;
  physicalInteraction: string;
  endingState: string;
  actingEmotionPhysicalized: string; // How the internal state is expressed physically
}

export interface StructuredVideoScene {
  sceneId: string;
  sceneIndex: number;
  narrativePhase: 'Hook' | 'Introduction' | 'Development' | 'Climax' | 'Payoff';
  strategy: CreativeStrategyType;
  title: string;
  composition: SpatialComposition;
  lighting: LightingAtmosphere;
  camera: CameraChoreography;
  actionSequence: ObservableActionSequence;
  characterTokens: string[];
  environmentDetails: string;
  audioAtmosphereCue?: string;
  intendedDurationSeconds: number;
}

/**
 * Maps unfilmable mental / emotional abstractions to observable physical actions
 */
export const UNFILMABLE_TO_OBSERVABLE_MAP: Record<string, string> = {
  'thinks deeply': 'rests hand on chin, eyes scanning the illuminated monitor with focused intensity',
  'understands the concept': 'nods decisively, rapidly typing key parameters into the interactive terminal',
  'feels overwhelmed': 'slumps slightly back in chair, exhaling as hands hover above cluttered notes',
  'feels confident': 'stands upright, delivering a firm gesture toward the glowing benchmark chart',
  'realizes the mistake': 'freezes mid-keystroke, eyes widening as finger taps the highlighted error code',
  'likes the result': 'breaks into an authentic smile, turning the tablet screen outward to reveal the metric',
  'ponders the future': 'looks up from workstation toward the studio window bathed in morning golden light',
  'gets inspired': 'snatches stylus immediately and draws a rapid circle around the central node',
};

/**
 * Scans an action description and translates any unfilmable cognitive expressions
 */
export function physicalizeAction(rawAction: string): { physicalized: string; modifications: string[] } {
  let result = rawAction;
  const modifications: string[] = [];

  for (const [unfilmable, observable] of Object.entries(UNFILMABLE_TO_OBSERVABLE_MAP)) {
    const regex = new RegExp(`\\b${unfilmable}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, observable);
      modifications.push(`Replaced abstract "${unfilmable}" with observable physical action: "${observable}".`);
    }
  }

  return { physicalized: result, modifications };
}

/**
 * Builds a structured visual plan for a single video scene conditioned on topic & creative strategy
 */
export function buildStructuredVideoScene(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  sceneIndex: number = 0,
  totalScenes: number = 1,
  characterLockToken?: string,
  targetDurationSeconds: number = 5
): StructuredVideoScene {
  const subject = understanding.subjectNoun || 'creator workflow';
  const actionVerb = understanding.actionVerb || 'demonstrates';

  // Determine narrative phase based on progress ratio
  const ratio = totalScenes === 1 ? 0.5 : sceneIndex / (totalScenes - 1);
  let narrativePhase: StructuredVideoScene['narrativePhase'];
  let title: string;

  if (ratio === 0) {
    narrativePhase = 'Hook';
    title = `Hook: Immediate Visual Interrupt on ${subject}`;
  } else if (ratio <= 0.3) {
    narrativePhase = 'Introduction';
    title = `Setup: Environmental Staging & Problem Context`;
  } else if (ratio <= 0.7) {
    narrativePhase = 'Development';
    title = `Execution: Core Physical Interaction with ${subject}`;
  } else if (ratio < 1.0) {
    narrativePhase = 'Climax';
    title = `Climax: High-Stakes Transformation Milestone`;
  } else {
    narrativePhase = 'Payoff';
    title = `Payoff: Conclusive Result & Empowering Direct Address`;
  }

  // Spatial Composition
  let composition: SpatialComposition;
  if (narrativePhase === 'Hook') {
    composition = {
      foreground: 'Edge of sleek dark workstation desk with glowing numeric telemetry overlay',
      middleGround: `Protagonist standing central, finger pointed directly at anomalous waveform of ${subject}`,
      background: 'Modern creator laboratory with soft ambient monitor grids and subtle atmospheric haze',
      subjectFraming: 'medium_shot',
      lensFocalLength: '35mm_cinematic',
    };
  } else if (narrativePhase === 'Development') {
    composition = {
      foreground: 'Interactive mechanical keyboard and glowing stylus rests on matte desk mat',
      middleGround: `Protagonist actively executing the precise sequence of ${subject}, eyes locked on active canvas`,
      background: 'Floating modular whiteboard sketches and acoustic wooden slat wall with rim illumination',
      subjectFraming: 'close_up',
      lensFocalLength: '50mm_natural',
    };
  } else if (narrativePhase === 'Climax') {
    composition = {
      foreground: 'Clean unobstructed desk edge with subtle lens reflection',
      middleGround: `Protagonist stepping back with open hands, revealing the complete flawless visualization of ${subject}`,
      background: 'Dual vertical displays radiating steady golden completion metrics, crisp architectural depth',
      subjectFraming: 'medium_wide',
      lensFocalLength: '35mm_cinematic',
    };
  } else {
    composition = {
      foreground: 'Minimalist studio table edge with warm ceramic coffee mug',
      middleGround: 'Protagonist turned directly toward the lens with warm open posture and relaxed confident smile',
      background: 'Softly out-of-focus studio bookshelves, warm ambient floor lamp, and subtle indoor foliage',
      subjectFraming: 'medium_shot',
      lensFocalLength: '85mm_portrait',
    };
  }

  // Lighting & Atmosphere
  let lighting: LightingAtmosphere;
  switch (strategy) {
    case 'curiosity_mystery':
      lighting = {
        style: 'High-contrast cinematic chiaroscuro',
        keyLight: 'Directional 4800K softbox at 45 degrees, illuminating left side of face and workstation',
        rimLight: 'Sharp electric cyan edge backlight separating subject from dark backdrop',
        colorTemperatureKelvin: 4800,
        atmosphereTone: 'Focused, suspenseful, intellectual urgency',
        shadowQuality: 'crisp_dramatic',
      };
      break;

    case 'unexpected_contrast':
      lighting = {
        style: 'Dual-tone split lighting',
        keyLight: 'Warm 3200K amber key illumination from screen left',
        rimLight: 'Cool 6500K daylight rim from screen right, accentuating facial edges',
        colorTemperatureKelvin: 4000,
        atmosphereTone: 'High visual tension, revelatory discovery',
        shadowQuality: 'soft_diffused',
      };
      break;

    case 'storytelling_case_study':
    case 'emotional_narrative':
      lighting = {
        style: 'Warm naturalistic studio ambient',
        keyLight: '5200K diffused lantern key light producing gentle wraparound facial tones',
        rimLight: 'Warm golden edge light glancing hair and shoulders',
        colorTemperatureKelvin: 5200,
        atmosphereTone: 'Authentic, documentary realism, intimate craftsmanship',
        shadowQuality: 'soft_diffused',
      };
      break;

    case 'practical_tutorial':
    default:
      lighting = {
        style: 'Clean commercial studio lighting',
        keyLight: 'Balanced 5200K daylight key with circular catchlights in eyes',
        rimLight: 'Clean neutral rim light accentuating shoulders and workspace tools',
        colorTemperatureKelvin: 5200,
        atmosphereTone: 'Crisp, high clarity, energetic, modern tech aesthetic',
        shadowQuality: 'ambient_wrap',
      };
      break;
  }

  // Camera Choreography
  let camera: CameraChoreography;
  if (narrativePhase === 'Hook') {
    camera = {
      movement: 'slow_push_in',
      angle: 'eye_level',
      speed: 'fluid_cinematic',
      description: 'Slow deliberate push-in dolly from medium shot to tight medium close-up, drawing immediate viewer focus',
    };
  } else if (narrativePhase === 'Development') {
    camera = {
      movement: 'lateral_tracking',
      angle: 'eye_level',
      speed: 'slow_deliberate',
      description: 'Smooth lateral tracking shot moving left-to-right across the desk surface following hand motion',
    };
  } else if (narrativePhase === 'Climax') {
    camera = {
      movement: 'orbital_sweep',
      angle: 'low_angle_heroic',
      speed: 'fluid_cinematic',
      description: 'Dynamic 30-degree orbital sweep maintaining subject dead-center while perspective shifts smoothly',
    };
  } else {
    camera = {
      movement: 'static_locked',
      angle: 'eye_level',
      speed: 'slow_deliberate',
      description: 'Locked-off cinema camera on tripod with gentle micro-handheld organic drift, establishing grounded rapport',
    };
  }

  // Action Sequence with Observable Verbs
  let actionSequence: ObservableActionSequence;
  if (narrativePhase === 'Hook') {
    actionSequence = {
      beginningState: `Subject stands poised at clean studio desk, gaze locking onto active screen displaying ${subject}.`,
      observableAction: `Subject reaches forward decisively and taps the glowing central prompt box, triggering a burst of animated data nodes.`,
      physicalInteraction: `Fingertip presses screen surface; animated blue waveform ripples outward across the glass display.`,
      endingState: `Subject turns head sharply toward the camera, jaw set with focused urgency, hand gesturing toward the anomaly.`,
      actingEmotionPhysicalized: 'Alert, laser-focused posture with rapid purposeful finger gestures and steady eye line.',
    };
  } else if (narrativePhase === 'Development') {
    actionSequence = {
      beginningState: `Continuing smoothly, subject holds digital stylus above tablet surface, calibration graph visible.`,
      observableAction: `Subject draws a fluid diagonal curve with the stylus, adjusting parameters and snapping interface sliders into alignment.`,
      physicalInteraction: `Stylus nib glides across matte glass; slider toggles switch from orange alert to vibrant green success states.`,
      endingState: `Subject releases stylus onto dock, leaning back slightly as the workflow compiles without latency.`,
      actingEmotionPhysicalized: 'Calm rhythmic craftsmanship; fluid wrist movements and confident nodding as elements lock into place.',
    };
  } else if (narrativePhase === 'Climax') {
    actionSequence = {
      beginningState: `Subject observes the finalized render sequence completing at 100% on dual vertical monitors.`,
      observableAction: `Subject gestures smoothly with open palm across the completed roadmap of ${subject}, presenting the breakthrough.`,
      physicalInteraction: `Hand sweeps horizontally 2 feet above desk, holographic metrics reflecting in the iris.`,
      endingState: `Full layout illuminates with pristine golden-hour glow, subject smiling with genuine accomplishment.`,
      actingEmotionPhysicalized: 'Triumphant chest expansion, relaxed shoulders, eyes beaming with earned confidence.',
    };
  } else {
    actionSequence = {
      beginningState: `Subject sits comfortably at wooden creator table, hands resting naturally on table edge.`,
      observableAction: `Subject leans forward 10 degrees, gesturing warmly toward viewer while summarizing the core rule of ${subject}.`,
      physicalInteraction: `Right hand opens in welcoming invitation, resting flat on table beside minimalist notepad.`,
      endingState: `Subject maintains warm eye contact into lens, smiling gently as screen subtly fades to clean conclusion.`,
      actingEmotionPhysicalized: 'Warm conversational presence; slow measured breathing and engaging eye contact.',
    };
  }

  return {
    sceneId: `scene_${sceneIndex + 1}_${narrativePhase.toLowerCase()}`,
    sceneIndex,
    narrativePhase,
    strategy,
    title,
    composition,
    lighting,
    camera,
    actionSequence,
    characterTokens: characterLockToken ? [characterLockToken] : ['protagonist with locked creator styling'],
    environmentDetails: composition.background,
    audioAtmosphereCue: 'Subtle high-tech room tone, distant low hum, crisp mechanical tactile click',
    intendedDurationSeconds: targetDurationSeconds,
  };
}
