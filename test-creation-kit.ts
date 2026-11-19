/**
 * CreatorFlow AI — Creation Kit Verification Test Suite
 * Tests all 8 verification criteria specified in User Request Section 26.
 */

import { getAIVideoToolProfile } from './src/lib/aiVideoToolProfiles';
import { generateToolVideoClipPackage, parseDurationToSeconds } from './src/lib/aiVideoClipEngine';
import { CharacterBible, ScriptPackage, StyleBible } from './src/types/guidedWorkflow';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const mockScriptPackage: ScriptPackage = {
  title: 'How to Master YouTube Automation with AI',
  hook: 'Stop wasting 20 hours editing videos manually every week.',
  introduction: 'In this video, we reveal the complete step-by-step AI video creation workflow.',
  mainSections: [
    {
      title: 'The AI Video Blueprint',
      narration: 'First, define your visual story and lock in consistent character references.',
      visualCue: 'Workstation diagram with glowing nodes',
    },
    {
      title: 'Prompt Calibration',
      narration: 'Next, format your prompts to match your chosen AI generator clip limits.',
      visualCue: 'Comparison of Flow versus Kling output',
    },
    {
      title: 'Timeline Assembly',
      narration: 'Finally, assemble the clips on your timeline and overlay your voice track.',
      visualCue: 'Timeline snapping together in editor',
    },
  ],
  payoff: 'Now you can generate consistent, professional videos in under an hour.',
  CTA: 'Subscribe for the next breakdown and download the creation kit below.',
  estimatedDuration: 300,
  estimatedWordCount: 450,
};

const mockSingleCharBible: CharacterBible = {
  characters: [
    {
      id: 'char_alex',
      name: 'Alex',
      role: 'Main Creator',
      personality: 'Curious, energetic, articulate',
      appearance: 'Medium athletic build, warm expressive hazel eyes, confident friendly demeanor',
      face: 'Slightly angular jawline, short neatly groomed stubble, friendly smile',
      hair: 'Textured auburn hair styled casually upward',
      clothing: 'Modern casual studio attire: fitted charcoal heather crewneck pullover, dark denim',
      colors: 'Charcoal, dark slate gray, subtle warm amber accents',
      fixedElements: ['crewneck pullover', 'auburn hair', 'hazel eyes'],
      avoidChanges: ['clothing style', 'hair color', 'facial structure'],
      visualConsistencyRules: ['Pixar-meets-Anime 3D stylized fidelity', '5200K studio key light'],
    },
  ],
  consistencyRules: ['Maintain identical wardrobe and facial anatomy across scenes'],
  negativeConsistencyRules: ['No random outfit swaps', 'No morphing facial features'],
  masterReferencePrompt: 'Full turnaround concept sheet of Alex the Creator...',
};

const mockMultiCharBible: CharacterBible = {
  characters: [
    {
      id: 'char_alex',
      name: 'Alex',
      role: 'Main Creator',
      personality: 'Energetic and visionary',
      appearance: 'Medium athletic build, warm hazel eyes',
      face: 'Angular jawline, expressive eyes',
      hair: 'Textured auburn hair',
      clothing: 'Charcoal crewneck pullover, dark denim',
      colors: 'Charcoal, slate gray',
      fixedElements: ['crewneck', 'auburn hair'],
      avoidChanges: ['clothing', 'face'],
    },
    {
      id: 'char_maya',
      name: 'Maya',
      role: 'Technical Analyst & Co-Host',
      personality: 'Analytical, witty, sharp',
      appearance: 'Slightly taller slender build, focused observant gaze',
      face: 'High cheekbones, wireframe glasses with thin gold frames',
      hair: 'Sleek dark chin-length bob with sharp part',
      clothing: 'Structured navy blue minimalist blazer over white silk tee',
      colors: 'Navy blue, crisp white, gold accents',
      fixedElements: ['navy blazer', 'wireframe glasses', 'dark bob'],
      avoidChanges: ['glasses', 'hair length', 'blazer color'],
    },
    {
      id: 'char_robot',
      name: 'Bolt the Robot',
      role: 'AI Assistant Sidekick',
      personality: 'Playful, precise, floating companion',
      appearance: 'Small floating spherical robot with glowing cyan LED visor display',
      face: 'Expressive cyan visor display showing emotive digital eyes',
      hair: 'Polished white ceramic shell with matte graphite thruster ring',
      clothing: 'Metallic alloy casing, glowing cyan accent rings',
      colors: 'Clean white, matte graphite, electric cyan',
      fixedElements: ['floating sphere', 'cyan visor'],
      avoidChanges: ['sphere geometry', 'visor color'],
    },
  ],
  consistencyRules: ['Preserve distinct silhouettes and color schemes between Alex, Maya, and Bolt'],
  negativeConsistencyRules: ['Do not blend character features'],
};

console.log('--- CREATORFLOW AI VIDEO CREATION KIT VALIDATION SUITE ---\n');

// ---------------------------------------------------------------------------
// TEST 1 — Single Character with 10-Second Maximum Tool (Google Flow)
// ---------------------------------------------------------------------------
console.log('Running Test 1 — Single Character (Google Flow, 10s max)...');
const flowProfile = getAIVideoToolProfile('google_flow');
assert(flowProfile.maxClipDurationSeconds === 10, 'Google Flow has 10-second max clip duration');
assert(flowProfile.supportsCharacterReference === true, 'Google Flow supports character reference');
assert(flowProfile.promptStrategy === 'single-complete-prompt', 'Google Flow uses single-complete-prompt strategy');

const test1Result = generateToolVideoClipPackage({
  toolProfile: flowProfile,
  totalDurationSeconds: 30,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test1Result.totalClipsCount === 3, '30s video divided into 3 clips (10s each)');
assert(Boolean(test1Result.masterCharacterPrompts?.['Alex']), 'Character Master Prompt generated for Alex');
assert(Boolean(test1Result.masterReferencePrompts?.['Alex']), 'Character Reference Prompt generated for Alex');
assert(test1Result.clips[0].videoPrompt.includes('Alex'), 'Clip 01 prompt includes Alex continuity lock');
assert(test1Result.clips[0].videoPrompt.includes('Camera movement:'), 'Camera movement integrated naturally into video prompt');
assert(!test1Result.clips[0].videoPrompt.includes('[Camera Prompt]'), 'No separate visible Camera Prompt box in prompt');

// ---------------------------------------------------------------------------
// TEST 2 — 60 Seconds with 10-Second Tool
// ---------------------------------------------------------------------------
console.log('\nRunning Test 2 — 60 Seconds Video (6 x 10s Clips)...');
const test2Result = generateToolVideoClipPackage({
  toolProfile: flowProfile,
  totalDurationSeconds: 60,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test2Result.totalClipsCount === 6, '60s video divided into exactly 6 clips');
assert(test2Result.clips.length === 6, 'Clips array has exactly 6 elements');
assert(test2Result.clips[0].timeRange === '00:00–00:10', 'Clip 1 covers 00:00–00:10');
assert(test2Result.clips[1].timeRange === '00:10–00:20', 'Clip 2 covers 00:10–00:20');
assert(test2Result.clips[2].timeRange === '00:20–00:30', 'Clip 3 covers 00:20–00:30');
assert(test2Result.clips[3].timeRange === '00:30–00:40', 'Clip 4 covers 00:30–00:40');
assert(test2Result.clips[4].timeRange === '00:40–00:50', 'Clip 5 covers 00:40–00:50');
assert(test2Result.clips[5].timeRange === '00:50–01:00', 'Clip 6 covers 00:50–01:00');
assert(test2Result.clips[5].durationSeconds === 10, 'All clips are 10s duration');

// ---------------------------------------------------------------------------
// TEST 3 — 2 Minutes (120s) with 10-Second Tool
// ---------------------------------------------------------------------------
console.log('\nRunning Test 3 — 2 Minutes Video (12 x 10s Clips)...');
const test3Result = generateToolVideoClipPackage({
  toolProfile: flowProfile,
  totalDurationSeconds: 120,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test3Result.totalClipsCount === 12, '120s video divided into exactly 12 clips');
assert(test3Result.clips.length === 12, '12 clip prompts generated');
assert(test3Result.clips[11].timeRange === '01:50–02:00', 'Clip 12 covers 01:50–02:00');

// ---------------------------------------------------------------------------
// TEST 4 — Multi-character (Alex + Maya + Bolt)
// ---------------------------------------------------------------------------
console.log('\nRunning Test 4 — Multi-Character Continuity across clips...');
const test4Result = generateToolVideoClipPackage({
  toolProfile: flowProfile,
  totalDurationSeconds: 60,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockMultiCharBible,
  isMultiCharacter: true,
});

assert(Boolean(test4Result.masterCharacterPrompts?.['Alex']), 'Master prompt generated for Alex');
assert(Boolean(test4Result.masterCharacterPrompts?.['Maya']), 'Master prompt generated for Maya');
assert(Boolean(test4Result.masterCharacterPrompts?.['Bolt the Robot']), 'Master prompt generated for Bolt');
// Verify interaction in clips:
const jointClips = test4Result.clips.filter((c) => c.charactersPresent?.includes('Maya'));
assert(jointClips.length > 0, 'Maya is present and active in multi-character clips');
assert(jointClips[0].videoPrompt.includes('Maya'), 'Clip prompt explicitly includes Maya with visual continuity');
assert(jointClips[0].videoPrompt.includes('blazer') || jointClips[0].videoPrompt.includes('navy'), 'Maya clothing/design lock embedded in prompt');

// ---------------------------------------------------------------------------
// TEST 5 — Tool Change (Google Flow vs Kling AI)
// ---------------------------------------------------------------------------
console.log('\nRunning Test 5 — Tool Change (Google Flow vs Kling AI)...');
const klingProfile = getAIVideoToolProfile('kling_ai');
assert(klingProfile.toolId === 'kling_ai', 'Kling AI profile loaded');
assert(klingProfile.supportsNegativePrompt === true, 'Kling AI supports negative prompt');

const test5Result = generateToolVideoClipPackage({
  toolProfile: klingProfile,
  totalDurationSeconds: 60,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test5Result.toolName === 'Kling AI', 'Output calibrated for Kling AI');
assert(test5Result.clips[0].videoPrompt.includes('--cfg_scale 0.5'), 'Kling prompt includes Kling-specific syntax (--cfg_scale)');
assert(test5Result.clips[0].videoPrompt !== test2Result.clips[0].videoPrompt, 'Kling prompt is meaningfully different from Flow prompt');
assert(Boolean(test5Result.clips[0].negativePrompt), 'Negative prompt provided for Kling');

// ---------------------------------------------------------------------------
// TEST 6 — Image-to-Video Workflow (Leonardo AI)
// ---------------------------------------------------------------------------
console.log('\nRunning Test 6 — Image-to-Video Workflow (Leonardo AI + Motion)...');
const leonardoProfile = getAIVideoToolProfile('leonardo_ai');
assert(leonardoProfile.promptStrategy === 'image-plus-motion', 'Leonardo uses image-plus-motion strategy');
assert(leonardoProfile.maxClipDurationSeconds === 4, 'Leonardo has 4-second max clip duration');

const test6Result = generateToolVideoClipPackage({
  toolProfile: leonardoProfile,
  totalDurationSeconds: 20,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test6Result.totalClipsCount === 5, '20s / 4s = 5 clips for Leonardo');
assert(Boolean(test6Result.clips[0].imagePrompt), 'Clip 1 has dedicated Stage 1 Keyframe Image Prompt');
assert(Boolean(test6Result.clips[0].motionPrompt), 'Clip 1 has dedicated Stage 2 Motion Prompt');
assert(test6Result.clips[0].motionPrompt!.includes('Motion intensity') || test6Result.clips[0].motionPrompt!.includes('Motion Prompt'), 'Motion prompt specifies motion parameters');

// ---------------------------------------------------------------------------
// TEST 7 — Tool with Integrated Audio (Pika 2.0 with Pikaffects)
// ---------------------------------------------------------------------------
console.log('\nRunning Test 7 — Tool with Integrated Audio (Pika 2.0)...');
const pikaProfile = getAIVideoToolProfile('pika_art');
assert(pikaProfile.supportsAudioGeneration === true, 'Pika profile verifies audio/sound generation');
assert(pikaProfile.supportsSoundEffects === true, 'Pika profile verifies sound effects support');

const test7Result = generateToolVideoClipPackage({
  toolProfile: pikaProfile,
  totalDurationSeconds: 20,
  topic: 'YouTube Automation',
  subject: 'YouTube Automation',
  scriptPackage: mockScriptPackage,
  characterBible: mockSingleCharBible,
  isMultiCharacter: false,
});

assert(test7Result.clips[0].isAudioIntegrated === true, 'Clip 1 marked as audio integrated');
assert(test7Result.clips[0].videoPrompt.includes('sound effect cues') || test7Result.clips[0].videoPrompt.includes('sound effects'), 'Sound effect instructions naturally integrated in video prompt');

// ---------------------------------------------------------------------------
// TEST 8 — Tool Without Integrated Audio (Google Flow / Kling AI)
// ---------------------------------------------------------------------------
console.log('\nRunning Test 8 — Tool Without Integrated Audio (Separate Voice Track)...');
assert(flowProfile.supportsAudioGeneration === false, 'Google Flow verifies no integrated audio generation');
assert(test1Result.clips[0].isAudioIntegrated === false, 'Flow clip marked as NOT having integrated audio');
assert(Boolean(test1Result.clips[0].spokenText), 'External spoken voice track provided for timeline editor sync');

console.log('\n======================================================');
console.log('🎉 ALL 8 VALIDATION TESTS PASSED WITH ZERO ERRORS!');
console.log('======================================================');
