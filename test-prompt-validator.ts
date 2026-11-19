/**
 * CreatorFlow AI — Phase 4 Prompt Validation & Voice Audit Test Suite
 */

import { validatePromptForExport, sanitizePromptForExport } from './src/lib/promptValidator';
import { generateToolVideoClipPackage } from './src/lib/aiVideoClipEngine';
import { getAIVideoToolProfile } from './src/lib/aiVideoToolProfiles';
import { getDefaultVoiceSettings } from './src/lib/scriptEngine';

function assert(cond: boolean, message: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — PHASE 4 VERIFICATION SUITE');
  console.log('================================================================');

  // 1. Clean prompt passes
  const goodPrompt =
    'A calm desk studio shot framing a notebook, warm 5200K key light illuminating handwritten outlines, slow deliberate push-in towards the page.';
  const goodCheck = validatePromptForExport(goodPrompt, { toolId: 'google_flow', kind: 'video_clip' });
  assert(goodCheck.valid && goodCheck.status === 'ready', 'Clean cinematic prompt validates as ready');

  // 2. Empty prompt is blocked
  const emptyCheck = validatePromptForExport('   ', { kind: 'video_clip' });
  assert(!emptyCheck.valid && emptyCheck.status === 'blocked', 'Empty prompt is blocked cleanly');
  assert(emptyCheck.errors.some((e) => e.code === 'empty_prompt'), 'Empty prompt reports empty_prompt code');

  // 3. Too short prompt blocked
  const shortCheck = validatePromptForExport('hi', { kind: 'image_keyframe' });
  assert(!shortCheck.valid && shortCheck.errors.some((e) => e.code === 'too_short'), 'Too-short keyframe prompt flagged as error');

  // 4. Unresolved placeholders detected and sanitized
  const placeholderPrompt =
    'Studio desk shot showcasing [INSERT TOPIC], [CHARACTER CONSISTENCY], {{lighting}}, and TODO check camera framing.';
  const phCheck = validatePromptForExport(placeholderPrompt, { toolId: 'kling_ai', kind: 'video_clip' });
  assert(!phCheck.valid, 'Prompt with unresolved placeholders marks valid: false');
  assert(phCheck.errors.some((e) => e.code === 'unresolved_placeholder'), 'Detects bracketed and curly placeholders');
  assert(
    !phCheck.sanitizedPreview.includes('[INSERT') &&
      !phCheck.sanitizedPreview.includes('{{lighting}}') &&
      !phCheck.sanitizedPreview.includes('TODO'),
    'Sanitizer strips unresolved placeholders cleanly'
  );

  // 5. Runway Gen-3 negative prompt flag rejection & deterministic sanitize
  const runwayNegPrompt =
    'Tracking shot through morning fog over dark pine trees, soft rim light --no text watermark, blurry face';
  const runwayCheck = validatePromptForExport(runwayNegPrompt, { toolId: 'runway_gen3', kind: 'video_clip' });
  assert(!runwayCheck.valid, 'Runway Gen-3 flags inline --no negative flag as disallowed syntax');
  assert(
    runwayCheck.errors.some((e) => e.code === 'disallowed_syntax'),
    'Reports disallowed_syntax for tools without negative prompt support'
  );
  const runwayCleaned = sanitizePromptForExport(runwayNegPrompt, { toolId: 'runway_gen3' });
  assert(!runwayCleaned.includes('--no'), 'Runway sanitizePromptForExport strips --no syntax deterministically');
  assert(runwayCleaned.includes('Tracking shot through morning fog'), 'Sanitizer preserves legitimate scene directions');

  // Same prompt for Kling AI (which supports negative syntax) should not raise disallowed_syntax
  const klingCheck = validatePromptForExport(runwayNegPrompt, { toolId: 'kling_ai', kind: 'video_clip' });
  assert(
    !klingCheck.errors.some((e) => e.code === 'disallowed_syntax'),
    'Kling AI does not falsely block valid inline directives'
  );

  // 6. Conflicting camera directives and dangling endings
  const conflictedPrompt = 'Medium shot of presenter with zoom in rapidly while zoom out slowly, featuring';
  const conflictCheck = validatePromptForExport(conflictedPrompt, { toolId: 'google_flow', kind: 'video_clip' });
  assert(
    conflictCheck.warnings.some((w) => w.code === 'conflicting_camera'),
    'Detects conflicting camera directions (zoom in + zoom out)'
  );
  assert(
    conflictCheck.warnings.some((w) => w.code === 'truncated_ending'),
    'Detects trailing incomplete connector ("featuring")'
  );
  assert(
    !conflictCheck.sanitizedPreview.endsWith('featuring'),
    'Sanitizer trims dangling trailing connectors cleanly'
  );

  // 7. End-to-end verification on generated aiVideoClipEngine output
  const runwayProfile = getAIVideoToolProfile('runway_gen3');
  const pkg = generateToolVideoClipPackage({
    toolProfile: runwayProfile,
    totalDurationSeconds: 10,
    topic: 'How to design crisp thumbnails',
    subject: 'thumbnail design',
    scriptPackage: {
      title: 'How to design crisp thumbnails',
      hook: 'Stop making thumbnails look cluttered.',
      introduction: 'Keep one clear subject and three bold words.',
      mainSections: [
        {
          title: 'Single Subject Composition',
          narration: 'Zoom in tight on the main reaction or object.',
          visualCue: 'Close-up presenter holding tablet',
        },
      ],
      estimatedDuration: 10,
      estimatedWordCount: 24,
    },
    styleBible: {
      visualStyle: 'Minimalist studio lighting',
      renderingStyle: 'Photorealistic daylight',
      colorDirection: 'Warm stone background',
      lighting: 'Soft diffused key light',
      environmentStyle: 'Clean studio desk setup',
      cameraLanguage: 'Smooth tripod framing',
      consistencyRules: [],
      negativeRules: [],
    },
    scenePlan: [
      {
        sceneNumber: 1,
        durationSeconds: 10,
        purpose: 'Hook demonstration',
        narration: 'Stop making thumbnails look cluttered.',
        environment: 'Clean warm studio desk setup',
        action: 'Presenter taps tablet screen displaying high-contrast layout',
        camera: 'Smooth push-in at eye level',
        framing: 'Medium close-up',
        lighting: 'Soft diffused key light',
      },
    ],
    isMultiCharacter: false,
  });
  assert(pkg.clips.length > 0, 'Generated video clip package for validation integration test');
  const generatedCheck = validatePromptForExport(pkg.clips[0].videoPrompt, {
    toolId: 'runway_gen3',
    kind: 'video_clip',
  });
  assert(generatedCheck.valid, 'Generated Runway Gen-3 clip prompt passes pre-copy validation cleanly');

  // 8. Voice plan default integrity (no empty emphasis or notes)
  const voiceDefaults = getDefaultVoiceSettings([
    {
      id: 'sec-1',
      label: 'HOOK',
      timeRange: '0:00-0:05',
      text: 'Never rush your first keyframe when teaching beginners.',
      wordCount: 8,
    },
  ]);
  assert(
    voiceDefaults.source === 'Your Own Voice' &&
      Boolean(voiceDefaults.customNotes && voiceDefaults.customNotes.length > 10),
    'Default voice delivery guide is complete and structured without browser mic dependencies'
  );

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 4 TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
