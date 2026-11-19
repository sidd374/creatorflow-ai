/**
 * CreatorFlow AI — Phase 3I.3 Production Requirement Engine
 * Determines everything required to actually create a video with a selected workflow and tool.
 * 
 * Generates structured ProductionKit including:
 * - Script Package
 * - Character Bible (for animation / story workflows)
 * - Style Bible
 * - Scene Plan & Ordered Scene Prompts
 * - Animation Motion Prompts
 * - Voice Direction Package
 * - Asset Requirements Checklist
 * - Tool-Specific Click-by-Click Editing Plan
 * - Thumbnail Package
 * - End-to-End Creation Checklist
 * 
 * ₹0 Local Rule-Based Engine (Deterministic, Zero External API dependencies).
 */

import {
  ProductionKit,
  ProductionWorkflowStage,
  ProductionRequirement,
  ScriptPackage,
  CharacterBible,
  CharacterDefinition,
  StyleBible,
  ScenePlan,
  ImagePrompt,
  AnimationPrompt,
  VoicePackage,
  AssetRequirement,
  EditingPlan,
  ThumbnailPackage,
  TopicIntent,
  VideoCreationBrief,
  WorkflowToolInfo,
  CreationMethodType,
  VideoClipPackage,
} from '../types/guidedWorkflow';
import { CreatorProfile, RecommendedVideoIdea } from '../types';
import { canAccess } from './planEntitlements';
import { getAIVideoToolProfile } from './aiVideoToolProfiles';
import { generateToolVideoClipPackage, parseDurationToSeconds } from './aiVideoClipEngine';
import { getIsolatedProductionKit, saveIsolatedProductionKit } from './accountStorage';

export interface ProductionEngineParams {
  topic: string;
  topicIntent: TopicIntent;
  selectedIdea: RecommendedVideoIdea;
  creatorProfile: CreatorProfile;
  brief: VideoCreationBrief;
  creationMethod: CreationMethodType | string;
  selectedTool: WorkflowToolInfo | null;
  characterCast?: 'single' | 'multi' | 'none';
  customCharacters?: CharacterDefinition[];
}

export const PRODUCTION_KIT_STORAGE_KEY = 'creatorflow_production_kit_v1';

export function getStoredProductionKit(): ProductionKit | null {
  if (typeof window === 'undefined') return null;
  try {
    return getIsolatedProductionKit() as ProductionKit | null;
  } catch {
    return null;
  }
}

export function saveStoredProductionKit(kit: ProductionKit): void {
  if (typeof window === 'undefined') return;
  try {
    saveIsolatedProductionKit(kit);
    localStorage.removeItem(PRODUCTION_KIT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to save ProductionKit to account-isolated storage:', err);
  }
}

/**
 * Main Engine Entrypoint: Generates a complete tool-specific ProductionKit
 */
export function generateProductionKit(params: ProductionEngineParams): ProductionKit {
  const {
    topic,
    topicIntent,
    selectedIdea,
    creatorProfile,
    brief,
    creationMethod,
    selectedTool,
  } = params;

  const coreTopic = topicIntent?.coreTopic || topic;
  const subject = topicIntent?.subject || coreTopic;
  const title = selectedIdea?.title || `How to Master ${subject}`;
  const presentationFormat = topicIntent?.presentationFormat || selectedIdea?.presentationFormat || brief.presentationStyle[0] || 'Whiteboard Animation';
  const isShort = selectedIdea?.format === 'Short' || (selectedIdea?.format !== 'Long-form' && (brief.videoType === 'Shorts' || presentationFormat === 'Shorts' || brief.preferredDuration?.includes('sec')));
  const toolName = selectedTool?.name || 'CapCut';
  const toolId = selectedTool?.id || 'capcut';

  // Determine Primary Workflow Category
  const isAIAnimation = 
    creationMethod === 'ai_animation' ||
    creationMethod === 'ai_image_to_video' ||
    creationMethod === 'ai_assisted' ||
    selectedTool?.toolCategory === 'ai_generator' ||
    /ai.*animat|runway|luma|kling|pika|midjourney|google.*flow|flow|leonardo|hailuo/i.test(creationMethod) ||
    /ai.*animat|runway|luma|kling|pika|google.*flow|flow|leonardo/i.test(presentationFormat) ||
    /runway|luma|kling|pika|google.*flow|flow|kling|leonardo|hailuo/i.test(toolName);
  const isWhiteboard = !isAIAnimation && (creationMethod === 'whiteboard' || /whiteboard/i.test(presentationFormat) || /videoscribe|doodly/i.test(toolName));
  const isScreenRecording = !isAIAnimation && (creationMethod === 'screen_recording' || /screen/i.test(presentationFormat) || /obs|loom|camtasia/i.test(toolName));
  const isTalkingHead = !isAIAnimation && (creationMethod === 'talking_head' || /talking head|face on camera/i.test(presentationFormat));
  const isDocumentary = !isAIAnimation && (creationMethod === 'documentary' || /documentary/i.test(presentationFormat));
  const isGameplay = !isAIAnimation && (creationMethod === 'gameplay' || /gameplay|gaming/i.test(presentationFormat));
  const isFaceless = !isAIAnimation && !isWhiteboard && (creationMethod === 'faceless' || /faceless|voice-over/i.test(presentationFormat));

  // Determine Character Cast & Multi-Character Mode
  const explicitNone = params.characterCast === 'none' || brief.characterCast === 'none';
  const explicitSingle = params.characterCast === 'single' || brief.characterCast === 'single';
  const explicitMulti = params.characterCast === 'multi' || brief.characterCast === 'multi' || (params.customCharacters && params.customCharacters.length > 1) || (brief.customCharacters && brief.customCharacters.length > 1);

  const canUseMultiCharacter = canAccess('multi_character_planning');

  const needsCharacterBible = !explicitNone && !isScreenRecording && !isGameplay && (
    isAIAnimation || isDocumentary || isTalkingHead || brief.presentationStyle.includes('Mixed format') || explicitSingle || explicitMulti
  );

  const isMultiCharacter = needsCharacterBible && (
    explicitMulti || (canUseMultiCharacter && !explicitSingle && (isAIAnimation || brief.presentationStyle.includes('Mixed format')))
  );

  // 1. Script Package
  const scriptPackage = buildScriptPackage({
    title,
    subject,
    coreTopic,
    isShort,
    presentationFormat,
    creatorProfile,
    brief,
    isMultiCharacter,
  });

  // 2. Character Bible (Generated for animation, storytelling, or character-driven formats)
  const characterBible = needsCharacterBible
    ? buildCharacterBible(subject, isAIAnimation, isMultiCharacter, params.customCharacters || brief.customCharacters)
    : undefined;

  // 3. Style Bible (For visual/AI workflows)
  const styleBible = (isAIAnimation || isWhiteboard || isDocumentary)
    ? buildStyleBible(presentationFormat, subject)
    : undefined;

  // 4. Scene Planner
  const scenePlan = buildScenePlan({
    scriptPackage,
    subject,
    presentationFormat,
    isAIAnimation,
    isWhiteboard,
    isScreenRecording,
    isDocumentary,
    isShort,
    characterBible,
    styleBible,
    toolName,
    isMultiCharacter,
  });

  // 5. Image & Animation Prompts (For AI / Visual tool workflows)
  const imagePrompts: ImagePrompt[] = isAIAnimation
    ? scenePlan.map((scene) => {
        // Collect consistency notes for characters present in this scene
        const charNotes = scene.charactersPresent && characterBible?.characters
          ? scene.charactersPresent
              .map(cName => {
                const char = characterBible.characters.find(c => c.name.toLowerCase().includes(cName.toLowerCase()) || cName.toLowerCase().includes(c.name.toLowerCase()));
                return char ? `${char.name}: ${char.consistencyBlock || ''}` : '';
              })
              .filter(Boolean)
              .join(' | ')
          : characterBible?.consistencyBlock;

        return {
          id: `img_prompt_${scene.sceneNumber}`,
          sceneNumber: scene.sceneNumber,
          title: `Scene ${scene.sceneNumber} Master Image (${scene.charactersPresent?.join(', ') || 'Visual'})`,
          prompt: scene.imagePrompt || '',
          aspectRatio: isShort ? '9:16' : '16:9',
          tool: /midjourney/i.test(toolName) ? 'Midjourney v6' : 'AI Image Generator',
          referenceRequired: Boolean(characterBible),
          consistencyNote: charNotes,
        };
      })
    : [];

  const animationPrompts: AnimationPrompt[] = isAIAnimation
    ? scenePlan.map((scene) => ({
        id: `anim_prompt_${scene.sceneNumber}`,
        sceneNumber: scene.sceneNumber,
        title: `Scene ${scene.sceneNumber} Motion Animation`,
        prompt: scene.animationPrompt || '',
        motionIntensity: isShort ? 'High (6/10)' : 'Moderate (4/10)',
        cameraMovement: scene.camera || 'Slow cinematic push-in',
        durationSeconds: scene.durationSeconds,
        tool: toolName,
        inputImageId: `img_prompt_${scene.sceneNumber}`,
      }))
    : [];

  // 6. Voice Package
  const voicePackage = buildVoicePackage({
    scriptPackage,
    brief,
    isAIAnimation,
    isMultiCharacter,
    characterBible,
  });

  // 7. Asset Checklist
  const assetChecklist = buildAssetChecklist({
    isAIAnimation,
    isWhiteboard,
    isScreenRecording,
    isTalkingHead,
    isDocumentary,
    isShort,
    toolName,
  });

  // 8. Editing Plan
  const editingPlan = buildEditingPlan({
    toolName,
    isShort,
    presentationFormat,
  });

  // 9. Thumbnail Package
  const thumbnailPackage = buildThumbnailPackage({
    title,
    subject,
    isAIAnimation,
    isShort,
  });

  // 10. AI Video Tool-Specific Clip Package (When AI Video Generation is used)
  const totalDurationSeconds = parseDurationToSeconds(brief.preferredDuration, isShort);
  const toolProfile = getAIVideoToolProfile(toolId || toolName);

  const videoClipPackage: VideoClipPackage | undefined = isAIAnimation
    ? generateToolVideoClipPackage({
        toolProfile,
        totalDurationSeconds,
        topic,
        subject,
        scriptPackage,
        characterBible,
        styleBible,
        scenePlan,
        isMultiCharacter: Boolean(isMultiCharacter),
        creationMethod: String(creationMethod || 'ai_animation'),
        aspectRatio: isShort ? '9:16' : '16:9',
      })
    : undefined;

  // 11. Master Requirements List
  const requirements = buildRequirementsList({
    scriptPackage,
    characterBible,
    styleBible,
    scenePlan,
    imagePrompts,
    animationPrompts,
    voicePackage,
    assetChecklist,
    editingPlan,
    thumbnailPackage,
    videoClipPackage,
    toolName,
    isAIAnimation,
    isWhiteboard,
    isScreenRecording,
  });

  // 12. Workflow Stages
  const workflowStages = buildWorkflowStages({
    requirements,
    isAIAnimation,
    isWhiteboard,
    isScreenRecording,
    isTalkingHead,
  });

  const kit: ProductionKit = {
    id: `prod_kit_${Date.now()}`,
    method: String(creationMethod || 'Standard Production'),
    selectedToolId: toolId,
    selectedToolName: toolName,
    workflowStages,
    requirements,
    scriptPackage,
    characterBible,
    styleBible,
    scenePlan,
    imagePrompts: imagePrompts.length > 0 ? imagePrompts : undefined,
    animationPrompts: animationPrompts.length > 0 ? animationPrompts : undefined,
    voicePackage,
    assetChecklist,
    editingPlan,
    thumbnailPackage,
    videoClipPackage,
    completionPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveStoredProductionKit(kit);
  return kit;
}

// -------------------------------------------------------------
// SUB-BUILDERS
// -------------------------------------------------------------

function buildScriptPackage(params: {
  title: string;
  subject: string;
  coreTopic: string;
  isShort: boolean;
  presentationFormat: string;
  creatorProfile: CreatorProfile;
  brief: VideoCreationBrief;
  isMultiCharacter?: boolean;
}): ScriptPackage {
  const { title, subject, isShort, isMultiCharacter } = params;

  if (isShort) {
    if (isMultiCharacter) {
      return {
        title,
        hook: `ALEX: "Stop making this costly ${subject.toLowerCase()} mistake right now!"\nMAYA: "Here is the exact 3-step shortcut that actually compounds your results."`,
        introduction: `ALEX: "Most creators waste months doing it the slow way."\nMAYA: "We tested every method so you don't have to."`,
        mainSections: [
          {
            title: 'Step 1: The Core Foundation',
            speaker: 'Alex',
            narration: `ALEX: "First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point."`,
            visualCue: 'Alex at holographic board highlighting single key metric icon.',
            dialogueAssignments: [
              { character: 'Alex', line: 'First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point.' },
            ],
          },
          {
            title: 'Step 2: The Breakthrough Move',
            speaker: 'Maya',
            narration: `MAYA: "Second: apply the proven retention framework. Notice how top creators structure pattern interrupts every 15 seconds."`,
            visualCue: 'Maya showing high-contrast retention curve on tablet screen.',
            dialogueAssignments: [
              { character: 'Maya', line: 'Second: apply the proven retention framework. Notice how top creators structure pattern interrupts every 15 seconds.' },
            ],
          },
          {
            title: 'Step 3: Instant Execution',
            speaker: 'Alex & Maya',
            narration: `ALEX: "Third: execute today without waiting for perfection."\nMAYA: "You already have the ₹0 tools you need."`,
            visualCue: 'Alex and Maya side-by-side with animated green checkmark checklist.',
            dialogueAssignments: [
              { character: 'Alex', line: 'Third: execute today without waiting for perfection.' },
              { character: 'Maya', line: 'You already have the ₹0 tools you need.' },
            ],
          },
        ],
        payoff: `ALEX: "Do this consistently for 30 days and watch your metrics compound."`,
        CTA: `MAYA: "Subscribe for weekly ${subject.toLowerCase()} blueprints and save this Short!"`,
        estimatedDuration: 45,
        estimatedWordCount: 130,
      };
    }

    return {
      title,
      hook: `If you are trying to master ${subject.toLowerCase()}, stop making this one costly mistake right now.`,
      introduction: `Most creators waste months doing it the slow way. Here is the exact 3-step shortcut that actually works.`,
      mainSections: [
        {
          title: 'Step 1: The Core Foundation',
          speaker: 'Alex',
          narration: `First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point.`,
          visualCue: 'Rapid zoom cut with bold on-screen headline.',
          dialogueAssignments: [
            { character: 'Alex', line: 'First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point.' },
          ],
        },
        {
          title: 'Step 2: The Breakthrough Move',
          speaker: 'Alex',
          narration: `Second: apply the proven framework. Notice how top creators structure this exact step for maximum retention.`,
          visualCue: 'High-contrast graphic demonstration or screen highlight.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Second: apply the proven framework. Notice how top creators structure this exact step for maximum retention.' },
          ],
        },
        {
          title: 'Step 3: Instant Execution',
          speaker: 'Alex',
          narration: `Third: execute today without waiting for perfection. You already have the tools you need.`,
          visualCue: 'Callout checklist with green checkmarks appearing.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Third: execute today without waiting for perfection. You already have the tools you need.' },
          ],
        },
      ],
      payoff: `Do this consistently for 30 days and you will see immediate momentum.`,
      CTA: `Subscribe for weekly ${subject.toLowerCase()} blueprints and save this Short!`,
      estimatedDuration: 45,
      estimatedWordCount: 120,
    };
  }

  const is5Step = /5-step|5 step|5 reasons|5 mistakes|5 tips/i.test(title);
  
  if (is5Step) {
    if (isMultiCharacter) {
      return {
        title,
        hook: `ALEX: "Most beginner creators struggle with ${subject.toLowerCase()} because they follow outdated advice and overcomplicate the basics."\nMAYA: "In this breakdown, Alex and I are sharing the exact 5-step growth system that actually gets views and subscribers from scratch."`,
        introduction: `ALEX: "Whether you have zero subscribers today or you are stuck trying to break through the algorithm, these 5 steps give you a predictable, repeatable framework."`,
        mainSections: [
          {
            title: 'Step 1: The Core Value Anchor (Choosing Your Niche Angle)',
            speaker: 'Alex',
            narration: `ALEX: "Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad."`,
            visualCue: 'Alex at holographic board highlighting target audience avatar while Maya reviews audience data.',
            dialogueAssignments: [
              { character: 'Alex', line: 'Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad.' },
              { character: 'Maya', line: 'Exactly—when you narrow your focus to one clear problem, viewers instantly recognize why they should subscribe.' },
            ],
          },
          {
            title: 'Step 2: High-CTR Packaging (Title & Thumbnail Synergy)',
            speaker: 'Alex & Maya',
            narration: `ALEX: "Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches."\nMAYA: "Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait."`,
            visualCue: 'Split screen showing cluttered vs clean high-contrast thumbnail mockups with Alex and Maya discussing.',
            dialogueAssignments: [
              { character: 'Alex', line: 'Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches.' },
              { character: 'Maya', line: 'Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait.' },
            ],
          },
          {
            title: 'Step 3: The 30-Second Retention Hook',
            speaker: 'Maya & Alex',
            narration: `MAYA: "Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations."\nALEX: "State the problem immediately, preview the payoff, and start delivering value in the first ten seconds."`,
            visualCue: 'Animated retention line graph showing Maya tracing the curve with stylus while Alex nods.',
            dialogueAssignments: [
              { character: 'Maya', line: 'Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations.' },
              { character: 'Alex', line: 'State the problem immediately, preview the payoff, and start delivering value in the first ten seconds.' },
            ],
          },
          {
            title: 'Step 4: Systematic Delivery & Pacing',
            speaker: 'Maya',
            narration: `MAYA: "Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration."`,
            visualCue: 'Maya demonstrating video timeline cuts, audio ducking to -22dB, and B-roll markers.',
            dialogueAssignments: [
              { character: 'Maya', line: 'Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration.' },
            ],
          },
          {
            title: 'Step 5: The Analytics Feedback Loop',
            speaker: 'Alex & Maya',
            narration: `ALEX: "Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio."\nMAYA: "Make one 5% improvement in every new upload, and let compounding do the heavy lifting."`,
            visualCue: 'Alex and Maya side-by-side observing green upward trendlines in studio analytics.',
            dialogueAssignments: [
              { character: 'Alex', line: 'Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio.' },
              { character: 'Maya', line: 'Make one 5% improvement in every new upload, and let compounding do the heavy lifting.' },
            ],
          },
        ],
        payoff: `ALEX: "By executing these five steps in order, you turn video creation from random guesswork into a clear, compounding growth engine."`,
        CTA: `ALEX: "If you want to master every phase of your creator journey, smash that subscribe button and hit the bell icon!"\nMAYA: "And tell us in the comments: which step are you implementing first?"`,
        estimatedDuration: 300,
        estimatedWordCount: 780,
      };
    }

    return {
      title,
      hook: `Most beginner creators struggle with ${subject.toLowerCase()} because they follow outdated advice and overcomplicate the basics. In this video, I'm breaking down the exact 5-step growth system that actually gets views and subscribers from scratch.`,
      introduction: `Whether you have zero subscribers today or you are stuck trying to break through the algorithm, these 5 steps give you a predictable, repeatable framework.`,
      mainSections: [
        {
          title: 'Step 1: The Core Value Anchor (Choosing Your Niche Angle)',
          speaker: 'Alex',
          narration: `Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad. When you narrow your focus to one clear problem, viewers instantly recognize why they should subscribe.`,
          visualCue: 'Animation of Alex highlighting a clear target audience avatar on a modern holographic board.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad. When you narrow your focus to one clear problem, viewers instantly recognize why they should subscribe.' },
          ],
        },
        {
          title: 'Step 2: High-CTR Packaging (Title & Thumbnail Synergy)',
          speaker: 'Alex',
          narration: `Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches. Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait.`,
          visualCue: 'Split screen showing cluttered vs clean high-contrast thumbnail mockups.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches. Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait.' },
          ],
        },
        {
          title: 'Step 3: The 30-Second Retention Hook',
          speaker: 'Alex',
          narration: `Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations. State the problem immediately, preview the payoff, and start delivering value in the first ten seconds.`,
          visualCue: 'Animated retention line graph showing the difference between steep dropoff vs strong flat retention.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations. State the problem immediately, preview the payoff, and start delivering value in the first ten seconds.' },
          ],
        },
        {
          title: 'Step 4: Systematic Delivery & Pacing',
          speaker: 'Alex',
          narration: `Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration.`,
          visualCue: 'Timeline animation showing visual cutaways, sound effect markers, and chapter transitions.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration.' },
          ],
        },
        {
          title: 'Step 5: The Analytics Feedback Loop',
          speaker: 'Alex',
          narration: `Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio. Make one 5% improvement in every new upload, and let compounding do the heavy lifting.`,
          visualCue: 'Alex at laptop happily observing green upward trendlines in YouTube Analytics.',
          dialogueAssignments: [
            { character: 'Alex', line: 'Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio. Make one 5% improvement in every new upload, and let compounding do the heavy lifting.' },
          ],
        },
      ],
      payoff: `By executing these five steps in order, you turn video creation from random guesswork into a clear, compounding growth engine.`,
      CTA: `If you want to master every phase of your creator journey, smash that subscribe button, hit the bell icon, and tell me in the comments: which step are you implementing first?`,
      estimatedDuration: 300,
      estimatedWordCount: 750,
    };
  }

  // Generic Long-form Narrative
  if (isMultiCharacter) {
    return {
      title,
      hook: `ALEX: "Most people struggle with ${subject.toLowerCase()} because they follow outdated advice."\nMAYA: "In this breakdown, we are sharing the exact systematic framework that actually produces results."`,
      introduction: `ALEX: "Whether you are starting from complete scratch or looking to accelerate your growth, this practical roadmap eliminates the guesswork."`,
      mainSections: [
        {
          title: 'Section 1: The Critical Foundation & Common Traps',
          speaker: 'Alex',
          narration: `ALEX: "Before diving into tactics, let's understand why traditional approaches fail. When beginners attempt ${subject.toLowerCase()}, they usually overwhelm themselves with unnecessary complexity. The key is simplifying your core workflow."`,
          visualCue: 'Visual problem breakdown diagram on screen with Alex explaining.',
          dialogueAssignments: [
            { character: 'Alex', line: `Before diving into tactics, let's understand why traditional approaches fail. When beginners attempt ${subject.toLowerCase()}, they usually overwhelm themselves with unnecessary complexity.` },
            { character: 'Maya', line: 'And simplicity is what allows consistency. Over-engineering your setup before you validate your audience is the fastest way to burn out.' },
          ],
        },
        {
          title: 'Section 2: The Step-by-Step Blueprint',
          speaker: 'Maya & Alex',
          narration: `MAYA: "Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing the highest-leverage actions."\nALEX: "Notice the compounding effect as each piece connects."`,
          visualCue: 'Step-by-step flowchart animation with Maya presenting and Alex annotating.',
          dialogueAssignments: [
            { character: 'Maya', line: 'Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing the highest-leverage actions.' },
            { character: 'Alex', line: 'Notice the compounding effect as each piece connects.' },
          ],
        },
        {
          title: 'Section 3: Real-World Execution & Pro Tips',
          speaker: 'Maya',
          narration: `MAYA: "Now let's look at practical implementation. You don't need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional-grade results faster."`,
          visualCue: 'Demonstration of before/after transformation or workflow checklist.',
          dialogueAssignments: [
            { character: 'Maya', line: "Now let's look at practical implementation. You don't need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional-grade results faster." },
          ],
        },
      ],
      payoff: `ALEX: "By applying this framework, you bypass months of frustration and build authentic, repeatable momentum."`,
      CTA: `MAYA: "If this gave you clarity, hit the like button, subscribe to the channel, and drop your biggest question in the comments below!"`,
      estimatedDuration: 300,
      estimatedWordCount: 720,
    };
  }

  return {
    title,
    hook: `Most people struggle with ${subject.toLowerCase()} because they follow outdated advice. In this video, I'm breaking down the exact step-by-step system that actually produces results.`,
    introduction: `Whether you are starting from complete scratch or looking to accelerate your growth, this practical roadmap eliminates the guesswork.`,
    mainSections: [
      {
        title: 'Section 1: The Critical Foundation & Common Traps',
        speaker: 'Alex',
        narration: `Before diving into tactics, let's understand why traditional approaches fail. When beginners attempt ${subject.toLowerCase()}, they usually overwhelm themselves with unnecessary complexity. The key is simplifying your core workflow.`,
        visualCue: 'Visual problem breakdown diagram or introductory slide overview.',
        dialogueAssignments: [
          { character: 'Alex', line: `Before diving into tactics, let's understand why traditional approaches fail. When beginners attempt ${subject.toLowerCase()}, they usually overwhelm themselves with unnecessary complexity. The key is simplifying your core workflow.` },
        ],
      },
      {
        title: 'Section 2: The Step-by-Step Blueprint',
        speaker: 'Alex',
        narration: `Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing the highest-leverage actions. Notice the compounding effect as each piece connects.`,
        visualCue: 'Step-by-step flowchart animation or live screen demonstration.',
        dialogueAssignments: [
          { character: 'Alex', line: 'Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing the highest-leverage actions. Notice the compounding effect as each piece connects.' },
        ],
      },
      {
        title: 'Section 3: Real-World Execution & Pro Tips',
        speaker: 'Alex',
        narration: `Now let's look at practical implementation. You don't need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional-grade results faster.`,
        visualCue: 'Demonstration of before/after transformation or workflow checklist.',
        dialogueAssignments: [
          { character: 'Alex', line: 'Now let\'s look at practical implementation. You don\'t need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional-grade results faster.' },
        ],
      },
    ],
    payoff: `By applying this framework, you bypass months of frustration and build authentic, repeatable momentum.`,
    CTA: `If this gave you clarity, hit the like button, subscribe to the channel, and drop your biggest question in the comments below!`,
    estimatedDuration: 300,
    estimatedWordCount: 700,
  };
}

function buildCharacterBible(
  subject: string,
  isAIAnimation: boolean,
  isMultiCharacter?: boolean,
  customCharacters?: CharacterDefinition[]
): CharacterBible {
  // If custom characters provided, enrich them and build multi-character bible
  if (customCharacters && customCharacters.length > 0) {
    const enriched = customCharacters.map((char) => {
      const refPrompt = char.referencePrompt || char.masterCharacterPrompt ||
        `Master 3D character reference sheet for ${char.name}: ${char.role}, ${char.ageRange || 'early 20s'}, ${char.appearance}, ${char.clothing}, ${char.hair}, ${char.personality}, 3-quarter view, neutral background, cinematic studio lighting, highly detailed 3D Pixar-meets-Anime animation style, 8k render --ar 16:9 --no distortion, photorealistic faces, messy lines`;
      
      const masterPrompt = char.masterCharacterPrompt ||
        `Use the exact same character identity throughout every scene: ${char.name}, ${char.ageRange || 'early 20s'}, ${char.face}, ${char.hair}, ${char.clothing}, consistent 3D stylized animation render across all camera angles.`;

      const block = char.consistencyBlock ||
        `[CHARACTER IDENTITY: ${char.name}, ${char.role}, ${char.face}, ${char.hair}, ${char.clothing}, identical facial traits and clothing across all frames]`;

      return {
        ...char,
        referencePrompt: refPrompt,
        masterCharacterPrompt: masterPrompt,
        consistencyBlock: block,
      };
    });

    const masterMap: Record<string, string> = {};
    const blockMap: Record<string, string> = {};
    enriched.forEach(c => {
      masterMap[c.id] = c.masterCharacterPrompt!;
      masterMap[c.name] = c.masterCharacterPrompt!;
      blockMap[c.id] = c.consistencyBlock!;
      blockMap[c.name] = c.consistencyBlock!;
    });

    return {
      characters: enriched,
      consistencyRules: [
        'Always maintain identical clothing and color palette specified in each character definition.',
        'Keep distinct hairstyles, accessories, and eye shapes for every character across all scenes.',
        'Maintain 3D stylized rendering lighting consistent with the Style Bible.',
      ],
      negativeConsistencyRules: [
        'Do not merge or swap clothing between characters.',
        'Do not introduce different hairstyles, glasses, or facial hair not defined in the bible.',
        'Do not switch from 3D stylized animation to live-action photorealism.',
      ],
      masterReferencePrompt: enriched[0]?.referencePrompt,
      consistencyBlock: enriched[0]?.consistencyBlock,
      masterCharacterPrompts: masterMap,
      consistencyBlocks: blockMap,
      interactionRules: enriched.length > 1 ? [
        `${enriched[0].name} drives core demonstration while ${enriched[1].name} provides analytical nuance and dialogue counterpoint.`,
        'Position speakers on the active side of the frame with listeners turned attentively toward the speaker.',
        'Maintain eye contact and responsive facial expressions during multi-character dialogue.',
      ] : undefined,
    };
  }

  // Built-in Character 1: Alex the Creator (Protagonist)
  const alex: CharacterDefinition = {
    id: 'char_alex',
    name: 'Alex the Creator',
    role: 'Protagonist / Main Creator',
    narrativePurpose: 'Drives the overarching lesson, delivers the core insight, demonstrates steps with high energy and practical clarity.',
    personality: 'Curious, determined, analytical, energetic, relatable teacher.',
    ageRange: 'Early 20s',
    appearance: 'Young modern creator, warm approachable demeanor, expressive eyes, modern casual streetwear aesthetic.',
    face: 'Friendly oval face, warm amber skin tone, slight smile, clean styled eyebrows.',
    hair: 'Dark brown textured hair, short on sides, slight natural wave on top.',
    clothing: 'Charcoal minimalist hoodie with rolled-up sleeves over a clean white crewneck shirt, navy denim trousers.',
    accessories: ['Minimalist black wristwatch'],
    props: ['Modern slim laptop', 'Minimalist notepad and stylus', 'Warm ceramic coffee mug'],
    colors: 'Charcoal (#2D3748), Warm Amber (#D4A017), Clean White (#FFFFFF).',
    bodyProportions: 'Slim athletic build, proportional stylized anime/pixar aesthetic.',
    voiceDescription: 'Energetic, warm, articulate 20s creator voice with clear projection.',
    speakingStyle: 'Conversational, motivating, structured, uses vivid analogies.',
    emotionalTraits: ['Optimistic', 'Encouraging', 'Focused'],
    relationshipToOtherCharacters: 'Collaborative peer and dynamic teammate with Maya; balances Maya’s analytical critique with practical execution.',
    visualConsistencyRules: [
      'Always maintain identical clothing: Charcoal hoodie over white collar.',
      'Always keep identical dark brown textured hairstyle.',
      'Maintain 3D stylized rendering lighting consistent with the Style Bible.',
    ],
    fixedElements: [
      'Charcoal hoodie with white crewneck collar visible',
      'Textured short dark brown hair',
      'Expressive amber-warm eye highlights',
    ],
    avoidChanges: [
      'Do not change clothing color or style across scenes',
      'Do not change hairstyle or eye color',
      'Do not age or alter facial structure',
      'Do not add heavy beard or glasses to Alex',
    ],
    referencePrompt: `Master 3D character reference sheet for Alex the Creator: young modern digital creator in early 20s, friendly expressive face, warm amber skin tone, short textured dark brown hair, charcoal grey minimalist hoodie over white crewneck shirt, navy denim trousers, slim athletic build, 3-quarter view, neutral background, cinematic studio lighting, highly detailed 3D Pixar-meets-Makoto-Shinkai animation style, 8k render --ar 16:9 --no distortion, photorealistic faces, messy lines`,
    masterCharacterPrompt: `Use the exact same character identity throughout every scene: Alex the Creator, early 20s, friendly expressive face, warm amber skin tone, short textured dark brown hair, charcoal minimalist hoodie over white crewneck, navy denim trousers, consistent 3D stylized animation render across all camera angles.`,
    consistencyBlock: `[CHARACTER IDENTITY: Alex the Creator, early 20s, friendly expressive face, dark brown textured short hair, charcoal hoodie over white crewneck, identical facial traits and clothing across all frames]`,
  };

  // If single-character mode, return Alex only!
  if (!isMultiCharacter) {
    return {
      characters: [alex],
      consistencyRules: [
        'Always maintain identical clothing: Charcoal hoodie over white collar.',
        'Always keep identical dark brown textured hairstyle.',
        'Maintain 3D stylized rendering lighting consistent with the Style Bible.',
      ],
      negativeConsistencyRules: [
        'Do not introduce different clothing, glasses, or facial hair.',
        'Do not switch from 3D stylized animation to live-action photorealism.',
      ],
      masterReferencePrompt: alex.referencePrompt,
      consistencyBlock: alex.consistencyBlock,
      masterCharacterPrompts: { [alex.id]: alex.masterCharacterPrompt!, [alex.name]: alex.masterCharacterPrompt! },
      consistencyBlocks: { [alex.id]: alex.consistencyBlock!, [alex.name]: alex.consistencyBlock! },
    };
  }

  // Built-in Character 2: Maya (Co-Host)
  const maya: CharacterDefinition = {
    id: 'char_maya',
    name: 'Maya',
    role: 'Co-Host / Analytical Counterpart',
    narrativePurpose: 'Questions assumptions, introduces data-driven retention nuance, challenges Alex to provide concrete evidence, and synthesizes viewer takeaways.',
    personality: 'Analytical, witty, sharp, thoughtful with dry humor and quick intelligence.',
    ageRange: 'Early 20s',
    appearance: 'Young modern woman, olive/warm undertone, expressive analytical hazel eyes, sleek black bob haircut with side part, minimalist wire-rim glasses.',
    face: 'Angular refined face, warm olive undertone, intelligent expressive hazel eyes, minimalist rose-gold wire-rim glasses.',
    hair: 'Sleek jet-black chin-length bob with clean side-part.',
    clothing: 'Emerald green structured overshirt jacket over fine-knit black turtleneck, tailored beige chinos.',
    accessories: ['Minimalist rose-gold wire-rim glasses', 'Silver geometric stud earrings'],
    props: ['Digital tablet with magnetic stylus', 'Matte charcoal travel tumbler'],
    colors: 'Deep Emerald (#1A4731), Matte Black (#111827), Warm Beige (#E2DDD4).',
    bodyProportions: 'Slim refined build, proportional stylized anime/pixar aesthetic.',
    voiceDescription: 'Crisp, witty, articulate 20s voice with slight analytical cadence and warm resonance.',
    speakingStyle: 'Direct, incisive, data-grounded, asks probing questions then affirms proven solutions.',
    emotionalTraits: ['Analytical', 'Witty', 'Perceptive', 'Encouraging'],
    relationshipToOtherCharacters: 'Trusted co-host and intellectual foil to Alex; grounds big ideas into systematic frameworks.',
    visualConsistencyRules: [
      'Always maintain emerald green structured overshirt over black turtleneck.',
      'Always keep sleek black bob haircut and wire-rim glasses.',
      'Keep beige chinos and tablet prop consistent across frames.',
    ],
    fixedElements: [
      'Emerald green overshirt over black turtleneck',
      'Sleek black chin-length bob haircut',
      'Minimalist wire-rim glasses',
      'Expressive hazel eyes',
    ],
    avoidChanges: [
      'Do not remove wire-rim glasses',
      'Do not change hairstyle or color to long or curly',
      'Do not change emerald overshirt to hoodies or t-shirts',
      'Do not alter facial shape or eye color',
    ],
    referencePrompt: `Master 3D character reference sheet for Maya: young modern female creator in early 20s, sharp intelligent face, warm olive undertone, expressive hazel eyes, minimalist wire-rim glasses, sleek jet-black chin-length bob with side part, emerald green structured overshirt jacket over black turtleneck, tailored beige chinos, slim build, 3-quarter view, neutral background, cinematic studio lighting, highly detailed 3D Pixar-meets-Makoto-Shinkai animation style, 8k render --ar 16:9 --no distortion, photorealistic faces, messy lines`,
    masterCharacterPrompt: `Use the exact same character identity throughout every scene: Maya, early 20s, sharp intelligent face, sleek jet-black bob haircut, minimalist wire-rim glasses, emerald green structured overshirt over black turtleneck, beige chinos, consistent 3D stylized animation render across all camera angles.`,
    consistencyBlock: `[CHARACTER IDENTITY: Maya, early 20s, analytical hazel eyes, sleek black bob haircut, wire-rim glasses, emerald green overshirt over black turtleneck, identical facial traits and clothing across all frames]`,
  };

  return {
    characters: [alex, maya],
    consistencyRules: [
      'Always maintain identical clothing specified for each character (Alex: Charcoal hoodie; Maya: Emerald overshirt).',
      'Keep distinct hairstyles and facial features across all scenes (Alex: textured brown; Maya: sleek black bob with glasses).',
      'Maintain 3D stylized rendering lighting consistent with the Style Bible.',
    ],
    negativeConsistencyRules: [
      'Never swap outfits or traits between Alex and Maya.',
      'Never remove Maya’s wire-rim glasses or change Alex’s hairstyle.',
      'Do not switch from 3D stylized animation to live-action photorealism.',
    ],
    masterReferencePrompt: alex.referencePrompt,
    consistencyBlock: alex.consistencyBlock,
    masterCharacterPrompts: {
      [alex.id]: alex.masterCharacterPrompt!,
      [alex.name]: alex.masterCharacterPrompt!,
      [maya.id]: maya.masterCharacterPrompt!,
      [maya.name]: maya.masterCharacterPrompt!,
    },
    consistencyBlocks: {
      [alex.id]: alex.consistencyBlock!,
      [alex.name]: alex.consistencyBlock!,
      [maya.id]: maya.consistencyBlock!,
      [maya.name]: maya.consistencyBlock!,
    },
    interactionRules: [
      'Alex delivers energetic practical examples while Maya contributes analytical data points and testing takeaways.',
      'When Alex speaks, Maya listens attentively with expressive nods or analytical gestures with her tablet stylus.',
      'When Maya demonstrates technical frameworks, Alex actively validates with supportive affirmations and audience callouts.',
      'Both characters share the screen in Scenes 2, 3, and 5 with clear visual staging and distinct eyelines.',
    ],
  };
}

function buildStyleBible(presentationFormat: string, subject: string): StyleBible {
  if (/whiteboard/i.test(presentationFormat)) {
    return {
      visualStyle: 'Clean Minimalist Digital Whiteboard',
      renderingStyle: 'Crisp vector line art on off-white canvas with amber and slate accents',
      colorDirection: 'Off-white background (#F8F7F4), Charcoal ink lines (#1A1A1A), Warm Gold accent highlights (#D4A017)',
      lighting: 'Even, bright ambient studio lighting without harsh shadows',
      environmentStyle: 'Digital whiteboard workspace, structured flowcharts, hand-drawn icons',
      cameraLanguage: 'Smooth 2D pans and localized zooms onto active drawing clusters',
      consistencyRules: [
        'Use consistent 3px line weight for all illustrations',
        'Use consistent amber highlight color for key takeaways',
        'Maintain legible handwritten-style typography for text callouts',
      ],
      negativeRules: [
        'No 3D photorealistic elements',
        'No cluttered background gradients or distracting textures',
      ],
      masterStylePrompt: 'Clean minimalist vector whiteboard illustration on off-white canvas, crisp charcoal ink linework (#1A1A1A), warm amber gold accent markers (#D4A017), educational flowchart breakdown, 8k resolution vector styling',
    };
  }

  return {
    visualStyle: 'Cinematic 3D Stylized Modern Animation',
    renderingStyle: 'Warm Pixar-meets-Anime rendering with soft volumetric lighting and crisp depth of field',
    colorDirection: 'Rich slate navy, warm amber gold keylights, soft emerald accent glow',
    lighting: 'Three-point studio lighting with warm golden rim-light and soft diffused fill',
    environmentStyle: 'Cozy modern creator studio, uncluttered wooden desk, soft blurred ambient background',
    cameraLanguage: 'Cinematic 35mm and 50mm lenses, smooth tracking shots, gentle slow pushes',
    consistencyRules: [
      'All scenes must share the same 3D stylized lighting temperature (5200K warm)',
      'Backgrounds must maintain soft bokeh depth-of-field',
      'All materials must have tactile, clean stylized textures',
    ],
    negativeRules: [
      'No hyper-realistic uncanny-valley textures',
      'No harsh flash photography lighting',
      'No distorted proportions or blurry artifacts',
    ],
    masterStylePrompt: 'Visual Style Reference: Modern 3D stylized cinematic animation, warm Pixar-meets-Anime rendering aesthetic, 5200K warm three-point golden keylight and slate navy fill, clean depth of field bokeh, tactile clean textures, 8k resolution, highly detailed render --no photorealistic uncanny faces, harsh flash, blurry artifacts',
  };
}

function buildScenePlan(params: {
  scriptPackage: ScriptPackage;
  subject: string;
  presentationFormat: string;
  isAIAnimation: boolean;
  isWhiteboard: boolean;
  isScreenRecording: boolean;
  isDocumentary: boolean;
  isShort: boolean;
  characterBible?: CharacterBible;
  styleBible?: StyleBible;
  toolName: string;
  isMultiCharacter?: boolean;
}): ScenePlan[] {
  const { scriptPackage, subject, isShort, isScreenRecording, isWhiteboard, isDocumentary, characterBible, styleBible, toolName, isMultiCharacter } = params;
  const consistency = characterBible?.consistencyBlock || '';

  const chars = characterBible?.characters || [];
  const charA = chars[0];
  const charB = chars[1];
  const hasMultiChar = Boolean(isMultiCharacter && chars.length > 1 && charA && charB);

  const blockA = charA?.consistencyBlock || consistency;
  const blockB = charB?.consistencyBlock || '';
  const nameA = charA?.name || 'Alex the Creator';
  const nameB = charB?.name || 'Maya';

  if (isScreenRecording) {
    return [
      {
        sceneNumber: 1,
        durationSeconds: isShort ? 8 : 30,
        purpose: 'Screen Hook & Initial Setup',
        narration: `In this walkthrough, we are setting up ${subject} correctly from scratch.`,
        environment: 'Primary Software Workspace (Clean 1080p Desktop Display)',
        action: 'Open target application on screen, highlight initial workspace setup, and zoom cursor into the main menu to begin demonstration',
        camera: 'Direct 1:1 screen capture with smooth localized cursor zoom (120%)',
        framing: '16:9 Screen Display Capture',
        lighting: 'Standard UI interface rendering with clean high-contrast cursor highlight',
        transition: 'Smooth cut to configuration panel',
        onScreenText: 'STEP 1: INITIAL SETUP',
        continuityNotes: 'Ensure resolution is locked to 1920x1080 at 60fps without background clutter.',
      },
      {
        sceneNumber: 2,
        durationSeconds: isShort ? 25 : 90,
        purpose: 'Step-by-Step Feature Walkthrough',
        narration: `Here are the exact clicks and settings you need to configure right now.`,
        environment: 'Settings & Core Functionality Panel',
        action: 'Click to demonstrate each core setting sequentially on screen, holding cursor on key buttons for 1 second to ensure viewer clarity',
        camera: 'Screen capture zooming into active dialogue box with yellow cursor highlight ring',
        framing: '16:9 Focused Screen Capture',
        lighting: 'High clarity UI screen capture',
        transition: 'Smooth pan to output demonstration',
        onScreenText: 'STEP 2: CONFIGURE SETTINGS',
        continuityNotes: 'Avoid rapid mouse movements; use smooth deliberate straight-line clicks.',
      },
      {
        sceneNumber: 3,
        durationSeconds: isShort ? 20 : 90,
        purpose: 'Live Execution & Output Verification',
        narration: `Now let's run the process and verify the exact output we get.`,
        environment: 'Live Execution & Results Window',
        action: 'Demonstrate live execution on screen, verify successful results, and point out 2 common configuration mistakes to avoid',
        camera: 'Split-screen or full screen recording with highlight callout box',
        framing: '16:9 Full Screen Capture',
        lighting: 'Clean high contrast',
        transition: 'Smooth zoom out to summary',
        onScreenText: 'STEP 3: EXECUTE & VERIFY',
        continuityNotes: 'Highlight the successful confirmation indicator on screen.',
      },
      {
        sceneNumber: 4,
        durationSeconds: isShort ? 7 : 60,
        purpose: 'Final Result & Export Checklist',
        narration: `And that is how you execute ${subject} seamlessly. Save this video and subscribe for more walkthroughs!`,
        environment: 'Final Output Screen with Key Takeaways Overlay',
        action: 'Show completed output on screen, demonstrate final export button click, and display summary checklist card',
        camera: 'Wide screen view with animated lower-third subscriber reminder',
        framing: '16:9 Screen Capture + Graphic Card',
        lighting: 'Clean UI',
        transition: 'Fade to black',
        onScreenText: 'FINAL EXPORT & CHECKLIST',
        continuityNotes: 'Leave the finished result visible for 3 seconds before end screen.',
      },
    ];
  }

  if (isWhiteboard) {
    return [
      {
        sceneNumber: 1,
        durationSeconds: isShort ? 8 : 30,
        purpose: 'Hand-drawn Problem Hook',
        narration: `Most people fail with ${subject} because of one hidden misconception.`,
        environment: 'Clean White Canvas Workspace',
        action: 'Hand draws bold question mark icon and writes the opening problem statement in bold charcoal ink',
        camera: 'Direct overhead 2D top-down view of whiteboard',
        framing: '16:9 Canvas Top-Down',
        lighting: 'Bright, shadowless studio ambient light across canvas',
        transition: 'Hand clears or pans right to fresh canvas area',
        onScreenText: 'THE CORE PROBLEM',
        continuityNotes: 'Maintain 3px line width and charcoal (#1A1A1A) ink styling.',
      },
      {
        sceneNumber: 2,
        durationSeconds: isShort ? 25 : 90,
        purpose: 'The 3-Step Framework Drawing',
        narration: `Here is the visual 3-pillar framework that solves this permanently.`,
        environment: 'White Canvas with Structured Framework Grid',
        action: 'Hand draws 3 connected flowchart boxes sequentially with arrows, filling key headings with warm amber accent color',
        camera: 'Smooth pan tracking the animated drawing hand',
        framing: '16:9 Focused Canvas',
        lighting: 'Even whiteboard lighting',
        transition: 'Pan down to detailed comparison',
        onScreenText: 'THE 3-STEP BLUEPRINT',
        continuityNotes: 'Draw arrows left-to-right to match reading flow.',
      },
      {
        sceneNumber: 3,
        durationSeconds: isShort ? 20 : 90,
        purpose: 'Dos vs Don\'ts Visual Comparison',
        narration: `Look at the stark difference between what fails and what succeeds.`,
        environment: 'Split Two-Column Whiteboard Canvas',
        action: 'Hand draws red X on left column and green checkmark on right column, sketching simple comparison icons',
        camera: 'Overhead view zooming smoothly between columns as narration compares points',
        framing: '16:9 Canvas Split View',
        lighting: 'Clean even lighting',
        transition: 'Pan right to closing summary',
        onScreenText: 'WRONG WAY vs RIGHT WAY',
        continuityNotes: 'Keep icons minimalist and immediately recognizable.',
      },
      {
        sceneNumber: 4,
        durationSeconds: isShort ? 7 : 60,
        purpose: 'Summary Diagram & Call to Action',
        narration: `Implement this framework today. Subscribe for more illustrated visual breakdowns!`,
        environment: 'Clean Canvas with Summary Star Badge',
        action: 'Hand draws summary star badge, circles the primary takeaway in amber marker, and writes subscribe CTA with arrow',
        camera: 'Wide overhead zoom showing full completed board layout',
        framing: '16:9 Full Canvas Overview',
        lighting: 'Even bright light',
        transition: 'Fade out smoothly',
        onScreenText: 'SUMMARY & ACTION PLAN',
        continuityNotes: 'Full canvas overview remains visible as narration concludes.',
      },
    ];
  }

  if (isShort) {
    if (hasMultiChar) {
      return [
        {
          sceneNumber: 1,
          durationSeconds: 5,
          purpose: 'Visual Hook & Pattern Interrupt',
          narration: `ALEX: "Stop making this costly ${subject.toLowerCase()} mistake right now!"`,
          environment: 'High-contrast studio environment with glowing holographic warning symbol',
          action: `${nameA} looks directly toward viewer with focused urgency, gesturing at problem alert on desk while ${nameB} prepares audience retention diagnostic in background`,
          characters: [nameA],
          charactersPresent: [nameA],
          primaryCharacter: nameA,
          speakingCharacter: nameA,
          dialogueAssignments: [
            { character: nameA, line: `Stop making this costly ${subject.toLowerCase()} mistake right now!` },
          ],
          characterActions: {
            [nameA]: 'Urgent gesture pointing at floating alert icon',
          },
          characterExpressions: {
            [nameA]: 'Passionate, energetic urgency',
          },
          characterContinuityNotes: `${nameA}: ${blockA}. Charcoal minimalist hoodie over white crewneck, textured brown hair.`,
          camera: 'Fast dynamic push-in, 35mm lens, eye level',
          framing: 'Vertical 9:16 Close-Up',
          lighting: 'Dramatic warm amber rim light with dark slate fill',
          transition: 'Fast whip pan to Scene 2',
          onScreenText: 'THE #1 MISTAKE',
          imagePrompt: `Cinematic vertical 9:16 scene: ${blockA} standing in modern creator studio looking shocked at glowing warning alert on desk, dramatic lighting, 8k render --ar 9:16`,
          animationPrompt: `Dynamic slow-motion push-in toward ${nameA}'s face, smooth camera tracking, subtle background bokeh movement --motion 5`,
        },
        {
          sceneNumber: 2,
          durationSeconds: 20,
          purpose: 'The Core Mechanism & Dual Demonstration',
          narration: `ALEX: "First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point."\nMAYA: "Second: apply the proven retention framework. Notice how top creators structure pattern interrupts every 15 seconds."`,
          environment: 'Clean modern desk workspace with glowing holographic blueprint and interactive retention curve',
          action: `${nameA} and ${nameB} side-by-side in studio; ${nameA} points to core foundation metric while ${nameB} demonstrates retention curve on digital tablet with stylus`,
          characters: [nameA, nameB],
          charactersPresent: [nameA, nameB],
          primaryCharacter: nameA,
          speakingCharacter: `${nameA} & ${nameB}`,
          interactingCharacters: [nameA, nameB],
          dialogueAssignments: [
            { character: nameA, line: 'First: eliminate all unnecessary fluff. Focus on one single metric or high-leverage action point.' },
            { character: nameB, line: 'Second: apply the proven retention framework with pattern interrupts every 15 seconds.' },
          ],
          characterActions: {
            [nameA]: 'Points to glowing metric icon with open hand',
            [nameB]: 'Traces retention curve on tablet screen and turns to smile at viewer',
          },
          characterExpressions: {
            [nameA]: 'Energetic, practical, motivating',
            [nameB]: 'Sharp, analytical, witty with engaging confidence',
          },
          characterContinuityNotes: `Dual-character framing: ${nameA} on left in charcoal hoodie (#2D3748); ${nameB} on right in emerald green overshirt (#1A4731) with sleek black bob haircut and wire-rim glasses. Maintain distinct color separation and relative eye-level alignment.`,
          camera: 'Medium shot tracking right smoothly between both presenters',
          framing: 'Vertical 9:16 Medium Two-Shot',
          lighting: 'Warm balanced keylight with vibrant cyan and amber accents',
          transition: 'Smooth zoom to payoff',
          onScreenText: 'STEP 1 → STEP 2',
          imagePrompt: `Cinematic vertical 9:16 two-shot: On left, ${blockA} presenting glowing roadmap milestone; on right, ${blockB} holding digital tablet showing green retention graph, modern studio, balanced soft studio lighting, 8k render --ar 9:16`,
          animationPrompt: `Camera slowly tracks as ${nameA} gestures to floating icon, then pans smoothly as ${nameB} affirms retention curve with confident nod --motion 4`,
        },
        {
          sceneNumber: 3,
          durationSeconds: 20,
          purpose: 'Payoff & Collaborative Call to Action',
          narration: `ALEX: "Do this consistently for 30 days and watch your metrics compound."\nMAYA: "Subscribe for weekly ${subject.toLowerCase()} blueprints and save this Short!"`,
          environment: 'Bright celebratory studio setup with rising analytics chart in background',
          action: `${nameA} and ${nameB} celebrate momentum; ${nameA} smiles giving a confident thumbs-up while ${nameB} gestures downward inviting viewers to subscribe and bookmark`,
          characters: [nameA, nameB],
          charactersPresent: [nameA, nameB],
          primaryCharacter: nameA,
          speakingCharacter: `${nameA} & ${nameB}`,
          interactingCharacters: [nameA, nameB],
          dialogueAssignments: [
            { character: nameA, line: 'Do this consistently for 30 days and watch your metrics compound.' },
            { character: nameB, line: `Subscribe for weekly ${subject.toLowerCase()} blueprints and save this Short!` },
          ],
          characterActions: {
            [nameA]: 'Smiles and gives supportive thumbs-up gesture',
            [nameB]: 'Gestures downward to subscribe banner with friendly invitation',
          },
          characterExpressions: {
            [nameA]: 'Warm, proud, encouraging',
            [nameB]: 'Vibrant, collaborative, welcoming',
          },
          characterContinuityNotes: `Ensure identical wardrobe: ${nameA} in charcoal hoodie over white crewneck collar; ${nameB} in emerald overshirt with black turtleneck and rose-gold wire-rim glasses.`,
          camera: 'Slight low angle looking up with celebratory, inspiring energy',
          framing: 'Vertical 9:16 Medium Close-Up Two-Shot',
          lighting: 'Bright, warm, inspiring golden hour studio lighting',
          transition: 'Fade to black',
          onScreenText: 'SUBSCRIBE FOR MORE',
          imagePrompt: `Cinematic vertical 9:16 two-shot: ${blockA} smiling confidently giving thumbs up alongside ${blockB} gesturing toward subscribe banner, rising green chart in background, golden warm studio light, 8k render --ar 9:16`,
          animationPrompt: `Both characters smile and nod celebrate with natural movements, glowing graph pulses in background --motion 3`,
        },
      ];
    }

    return [
      {
        sceneNumber: 1,
        durationSeconds: 5,
        purpose: 'Visual Hook & Pattern Interrupt',
        narration: `Stop making this costly ${subject.toLowerCase()} mistake!`,
        environment: 'High-contrast studio environment with glowing holographic warning symbol',
        action: 'Protagonist looks directly toward viewer with focused urgency, gesturing at problem graphic',
        camera: 'Fast dynamic push-in, 35mm lens, eye level',
        framing: 'Vertical 9:16 Close-Up',
        lighting: 'Dramatic warm amber rim light with dark slate fill',
        transition: 'Fast whip pan to Scene 2',
        onScreenText: 'THE #1 MISTAKE',
        imagePrompt: `Cinematic vertical 9:16 scene: ${consistency} standing in modern creator studio looking shocked at glowing warning alert on desk, dramatic lighting, 8k render`,
        animationPrompt: `Dynamic slow-motion push-in toward character face, smooth camera tracking, subtle background bokeh movement --motion 5`,
      },
      {
        sceneNumber: 2,
        durationSeconds: 20,
        purpose: 'The Core Mechanism Demonstration',
        narration: `Here is the exact framework you need to execute right now.`,
        environment: 'Clean modern desk workspace with glowing holographic blueprint',
        action: 'Protagonist points to 3 glowing step-by-step milestones floating in air',
        camera: 'Medium shot tracking right smoothly',
        framing: 'Vertical 9:16 Medium Shot',
        lighting: 'Warm balanced keylight with vibrant cyan and amber accents',
        transition: 'Smooth zoom to payoff',
        onScreenText: 'STEP 1 → STEP 2 → STEP 3',
        imagePrompt: `Cinematic vertical 9:16 scene: ${consistency} confidently presenting glowing 3-step digital roadmap diagram in modern studio, soft lighting, 8k render`,
        animationPrompt: `Camera slowly pans around character as glowing icons float and pulse with light --motion 4`,
      },
      {
        sceneNumber: 3,
        durationSeconds: 20,
        purpose: 'Payoff & Call to Action',
        narration: `Do this consistently and watch your results compound. Subscribe for more blueprints!`,
        environment: 'Bright celebratory studio setup with rising analytics chart',
        action: 'Protagonist smiles confidently and gives a supportive thumbs-up gesture',
        camera: 'Slight low angle looking up with inspiring energy',
        framing: 'Vertical 9:16 Medium Close-Up',
        lighting: 'Bright, warm, inspiring golden hour studio lighting',
        transition: 'Fade to black',
        onScreenText: 'SUBSCRIBE FOR MORE',
        imagePrompt: `Cinematic vertical 9:16 scene: ${consistency} smiling confidently with thumbs up, glowing green growth chart in background, golden warm studio light, 8k render`,
        animationPrompt: `Subtle celebratory nodding animation with glowing chart animation in background --motion 3`,
      },
    ];
  }

  const is5Step = /5-step|5 step|5 reasons|5 mistakes|5 tips/i.test(scriptPackage.title);

  if (is5Step) {
    if (hasMultiChar) {
      return [
        {
          sceneNumber: 1,
          durationSeconds: 45,
          purpose: 'Visual Hook & Value Anchor',
          narration: `ALEX: "Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad."\nMAYA: "In this breakdown, Alex and I are sharing the exact 5-step growth system that actually gets views and subscribers from scratch."`,
          environment: 'Modern creative studio workspace with holographic viewer avatar floating above wooden desk',
          action: `${nameA} gestures toward a glowing digital audience avatar highlighting the specific problem to solve, while ${nameB} reviews audience retention data on her tablet`,
          characters: [nameA, nameB],
          charactersPresent: [nameA, nameB],
          primaryCharacter: nameA,
          speakingCharacter: nameA,
          interactingCharacters: [nameA, nameB],
          dialogueAssignments: [
            { character: nameA, line: 'Step one is defining who you are helping and what specific problem your video solves. Most small channels fail because their topics are too broad.' },
            { character: nameB, line: 'Exactly—when you narrow your focus to one clear problem, viewers instantly recognize why they should subscribe.' },
          ],
          characterActions: {
            [nameA]: 'Points to target audience avatar on holographic board with focused enthusiasm',
            [nameB]: 'Cross-references viewer demographic data on digital tablet and nods in affirmation',
          },
          characterExpressions: {
            [nameA]: 'Inspiring teacher demeanor, approachable and focused',
            [nameB]: 'Sharp analytical focus, intelligent and receptive',
          },
          characterContinuityNotes: `Maintain consistent wardrobes: ${nameA} in charcoal hoodie over white collar; ${nameB} in emerald overshirt over black turtleneck with rose-gold wire-rim glasses.`,
          camera: 'Cinematic wide push-in, 35mm lens, smooth dolly track',
          framing: 'Horizontal 16:9 Medium Two-Shot',
          lighting: 'Moody slate fill with 5200K warm golden rim-light',
          transition: 'Smooth swipe to Step 2 packaging demo',
          onScreenText: 'STEP 1: VALUE ANCHOR',
          imagePrompt: `Cinematic 16:9 two-shot: ${blockA} on left pointing at glowing holographic target audience chart, while ${blockB} on right analyzes data on digital tablet, 5200K warm studio lighting, clean bokeh background, 8k resolution, 3D Pixar-meets-Anime style --ar 16:9`,
          animationPrompt: `Camera slowly dollies in as ${nameA} gestures toward glowing chart and ${nameB} reviews tablet data with subtle nod --motion 4`,
        },
        {
          sceneNumber: 2,
          durationSeconds: 60,
          purpose: 'High-CTR Packaging Breakdown',
          narration: `ALEX: "Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches."\nMAYA: "Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait."`,
          environment: 'Creative editing suite showing large studio display with split thumbnail comparison',
          action: `${nameA} and ${nameB} stand beside dual monitor workstation comparing cluttered vs bold high-contrast thumbnail mockups`,
          characters: [nameA, nameB],
          charactersPresent: [nameA, nameB],
          primaryCharacter: nameA,
          speakingCharacter: `${nameA} & ${nameB}`,
          interactingCharacters: [nameA, nameB],
          dialogueAssignments: [
            { character: nameA, line: 'Step two is packaging. Your video can be incredible, but if nobody clicks, nobody watches.' },
            { character: nameB, line: 'Pair a simple, high-contrast visual thumbnail with an intriguing title that creates a curiosity gap without resorting to clickbait.' },
          ],
          characterActions: {
            [nameA]: 'Points to winning thumbnail contrast ratio on left screen',
            [nameB]: 'Annotates curiosity gap headline rule on right screen using stylus',
          },
          characterExpressions: {
            [nameA]: 'Direct, motivating, emphasizing visual impact',
            [nameB]: 'Discerning, witty, focused on viewer psychology',
          },
          characterContinuityNotes: `Dual shot continuity: Ensure wire-rim glasses on ${nameB} reflect subtle studio glow. Keep ${nameA}'s charcoal hoodie and rolled-up sleeves consistent with Scene 1.`,
          camera: 'Medium shot tracking right between both hosts and large monitor',
          framing: 'Horizontal 16:9 Medium Two-Shot',
          lighting: 'Balanced keylight with vibrant amber and cyan monitor glow',
          transition: 'Fast whip zoom to Scene 3',
          onScreenText: 'STEP 2: HIGH-CTR PACKAGING',
          imagePrompt: `Cinematic 16:9 scene: ${blockA} standing beside ${blockB} in studio analyzing high-contrast YouTube thumbnail designs on large glowing screen, amber keylight, 8k render --ar 16:9`,
          animationPrompt: `Smooth lateral tracking shot, characters alternate pointing at monitor as winning thumbnail illuminates with green checkmark --motion 3`,
        },
        {
          sceneNumber: 3,
          durationSeconds: 60,
          purpose: 'The 30-Second Retention Hook',
          narration: `MAYA: "Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations."\nALEX: "State the problem immediately, preview the payoff, and start delivering value in the first ten seconds."`,
          environment: 'Modern analytics studio with animated retention curve projected in 3D air',
          action: `${nameB} takes center stage tracing a glowing 3D retention curve line with digital stylus while ${nameA} observes and nods in agreement`,
          characters: [nameB, nameA],
          charactersPresent: [nameB, nameA],
          primaryCharacter: nameB,
          speakingCharacter: nameB,
          interactingCharacters: [nameB, nameA],
          dialogueAssignments: [
            { character: nameB, line: 'Step three is mastering the opening 30 seconds. Do not waste time on long intros or generic channel animations.' },
            { character: nameA, line: 'State the problem immediately, preview the payoff, and start delivering value in the first ten seconds.' },
          ],
          characterActions: {
            [nameB]: 'Draws ascending retention line in air with luminous stylus',
            [nameA]: 'Nods in agreement and gestures toward payoff marker',
          },
          characterExpressions: {
            [nameB]: 'Authoritative, precise, sharp retention masterclass cadence',
            [nameA]: 'Supportive and encouraging',
          },
          characterContinuityNotes: `${nameB} sleek black bob haircut with clean side-part, wire-rim glasses, emerald overshirt. ${nameA} textured dark brown hair in background.`,
          camera: 'Dynamic 50mm lens push-in focusing on Maya then widening to include Alex',
          framing: 'Horizontal 16:9 Medium Close-Up Two-Shot',
          lighting: 'Inspiring warm golden hour keylight with green retention line glow',
          transition: 'Cross-dissolve to Scene 4 timeline pacing',
          onScreenText: 'STEP 3: 30s RETENTION HOOK',
          imagePrompt: `Cinematic 16:9 scene: ${blockB} standing center confidently tracing glowing 3D green retention curve in studio air with stylus, with ${blockA} observing attentively in background, warm cinematic lighting, 8k render --ar 16:9`,
          animationPrompt: `Camera rotates 15 degrees around ${nameB} as glowing retention line traces through the air with soft light particle trail --motion 4`,
        },
        {
          sceneNumber: 4,
          durationSeconds: 75,
          purpose: 'Systematic Delivery & Pacing',
          narration: `MAYA: "Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration."`,
          environment: 'Dynamic creator timeline workspace with floating timeline tracks and audio waveforms',
          action: `${nameB} demonstrates video timeline cuts, pattern interrupts, and audio ducking to -22dB with swift, articulate hand gestures`,
          characters: [nameB],
          charactersPresent: [nameB],
          primaryCharacter: nameB,
          speakingCharacter: nameB,
          dialogueAssignments: [
            { character: nameB, line: 'Step four is keeping viewers engaged through structured pacing. Break your content into clear micro-sections, use visual pattern interrupts every 15 to 20 seconds, and eliminate any dead air or filler narration.' },
          ],
          characterActions: {
            [nameB]: 'Trims timeline blocks and adjusts waveform audio ducking levels',
          },
          characterExpressions: {
            [nameB]: 'Incisive, focused, efficient production mastery',
          },
          characterContinuityNotes: `${nameB}: Emerald green overshirt over fine black turtleneck, tailored beige chinos, wire-rim glasses.`,
          camera: 'Over-the-shoulder medium shot looking toward glowing timeline blocks',
          framing: 'Horizontal 16:9 Over-The-Shoulder',
          lighting: 'Warm keylight with soft screen bounce fill',
          transition: 'Smooth zoom to finale',
          onScreenText: 'STEP 4: PACING & PATTERN INTERRUPTS',
          imagePrompt: `Cinematic 16:9 scene: Over-the-shoulder view of ${blockB} working at studio editing desk with glowing multi-track video timeline and visual cutaway icons, 8k render --ar 16:9`,
          animationPrompt: `Camera slowly tracks over ${nameB}'s shoulder as timeline blocks slide and lock into place smoothly --motion 3`,
        },
        {
          sceneNumber: 5,
          durationSeconds: 60,
          purpose: 'Analytics Compounding & Call to Action',
          narration: `ALEX: "Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio."\nMAYA: "Make one 5% improvement in every new upload, and let compounding do the heavy lifting."`,
          environment: 'Warm celebratory studio with sunset golden light pouring through window and subscriber growth milestones on wall',
          action: `${nameA} and ${nameB} stand side-by-side observing green upward trendlines in studio analytics, smiling warmly and inviting viewers to subscribe and comment`,
          characters: [nameA, nameB],
          charactersPresent: [nameA, nameB],
          primaryCharacter: nameA,
          speakingCharacter: `${nameA} & ${nameB}`,
          interactingCharacters: [nameA, nameB],
          dialogueAssignments: [
            { character: nameA, line: 'Step five is reviewing what actually worked. Check your Click-Through Rate and Average View Duration in YouTube Studio.' },
            { character: nameB, line: 'Make one 5% improvement in every new upload, and let compounding do the heavy lifting.' },
            { character: nameA, line: 'Smash that subscribe button, hit the bell icon, and tell us in the comments: which step are you implementing first?' },
          ],
          characterActions: {
            [nameA]: 'Smiles directly at camera with supportive thumbs-up gesture',
            [nameB]: 'Smiles and gestures invitingly to comment prompt on desk display',
          },
          characterExpressions: {
            [nameA]: 'Warm, proud, encouraging',
            [nameB]: 'Witty, vibrant, collaborative',
          },
          characterContinuityNotes: `Both characters in full view: ${nameA} in charcoal hoodie, ${nameB} in emerald overshirt and glasses. Flawless visual consistency across entire 5-scene arc.`,
          camera: 'Centered portrait medium close-up two-shot, 50mm prime lens',
          framing: 'Horizontal 16:9 Medium Close-Up Two-Shot',
          lighting: 'Golden hour sunset rim-light with clean frontal fill',
          transition: 'Fade out to YouTube end-screen cards',
          onScreenText: 'STEP 5: COMPOUNDING & SUBSCRIBE',
          imagePrompt: `Cinematic 16:9 two-shot: ${blockA} and ${blockB} standing together smiling warmly into camera with supportive thumbs-up, golden sunset light through studio window, 8k render --ar 16:9`,
          animationPrompt: `Both characters speak directly to camera with friendly smiles, natural breathing and eye blink animation, warm inspiring ending gesture --motion 3`,
        },
      ];
    }

    return [
      {
        sceneNumber: 1,
        durationSeconds: 45,
        purpose: 'Visual Hook & Value Anchor',
        narration: `Most beginner creators struggle with ${subject.toLowerCase()} because they follow outdated advice. Step one is finding your core value anchor.`,
        environment: 'Modern creative studio workspace with holographic viewer avatar floating above wooden desk',
        action: 'Alex gestures toward a glowing digital audience avatar, highlighting the specific problem to solve with focused enthusiasm',
        camera: 'Cinematic wide push-in, 35mm lens, smooth dolly track',
        framing: 'Horizontal 16:9 Medium Shot',
        lighting: 'Moody slate fill with 5200K warm golden rim-light',
        transition: 'Smooth swipe to Step 2 packaging demo',
        onScreenText: 'STEP 1: VALUE ANCHOR',
        imagePrompt: `Cinematic 16:9 scene: ${consistency} standing in modern creator studio pointing at glowing holographic target audience chart, 5200K warm studio lighting, clean bokeh background, 8k resolution, 3D Pixar-meets-Anime style --ar 16:9`,
        animationPrompt: `Camera slowly dollies in as Alex gestures toward glowing chart, subtle natural head nod and expressive eye movement --motion 4`,
      },
      {
        sceneNumber: 2,
        durationSeconds: 60,
        purpose: 'High-CTR Packaging Breakdown',
        narration: `Step two is high-CTR packaging. If nobody clicks, nobody watches. Pair clean contrast visuals with strong curiosity.`,
        environment: 'Creative editing suite showing large studio display with split thumbnail comparison',
        action: 'Alex stands beside a dual monitor comparison showing cluttered vs bold high-contrast thumbnail mockups',
        camera: 'Medium shot tracking right to focus on the winning thumbnail graphic',
        framing: 'Horizontal 16:9 Medium Shot',
        lighting: 'Balanced keylight with vibrant amber and cyan monitor glow',
        transition: 'Fast whip zoom to Scene 3',
        onScreenText: 'STEP 2: HIGH-CTR PACKAGING',
        imagePrompt: `Cinematic 16:9 scene: ${consistency} standing in studio analyzing high-contrast YouTube thumbnail designs on large glowing screen, amber keylight, 8k render --ar 16:9`,
        animationPrompt: `Smooth lateral tracking shot, character points at monitor as winning thumbnail illuminates with green checkmark --motion 3`,
      },
      {
        sceneNumber: 3,
        durationSeconds: 60,
        purpose: 'The 30-Second Retention Hook',
        narration: `Step three is mastering your first thirty seconds. Eliminate slow channel intros and deliver immediate value.`,
        environment: 'Modern analytics studio with animated retention curve projected in 3D air',
        action: 'Alex traces a smooth upward green retention curve line with hand, smiling confidently at camera',
        camera: 'Dynamic 50mm lens push-in, eye-level angle',
        framing: 'Horizontal 16:9 Medium Close-Up',
        lighting: 'Inspiring warm golden hour keylight',
        transition: 'Cross-dissolve to Scene 4 timeline pacing',
        onScreenText: 'STEP 3: 30s RETENTION HOOK',
        imagePrompt: `Cinematic 16:9 scene: ${consistency} confidently tracing a glowing 3D green retention curve graph floating in studio, warm cinematic lighting, 8k render --ar 16:9`,
        animationPrompt: `Camera rotates 15 degrees around character as glowing retention line traces through the air with soft light particle trail --motion 4`,
      },
      {
        sceneNumber: 4,
        durationSeconds: 75,
        purpose: 'Systematic Delivery & Pacing',
        narration: `Step four is structured pacing. Insert visual pattern interrupts every 15 to 20 seconds to keep viewer attention locked.`,
        environment: 'Dynamic creator timeline workspace with floating timeline tracks and audio waveforms',
        action: 'Alex demonstrates video timeline cuts and B-roll markers with swift, articulate hand gestures',
        camera: 'Over-the-shoulder medium shot looking toward glowing timeline blocks',
        framing: 'Horizontal 16:9 Over-The-Shoulder',
        lighting: 'Warm keylight with soft screen bounce fill',
        transition: 'Smooth zoom to finale',
        onScreenText: 'STEP 4: PACING & PATTERN INTERRUPTS',
        imagePrompt: `Cinematic 16:9 scene: Over-the-shoulder view of ${consistency} working at studio editing desk with glowing multi-track video timeline and visual cutaway icons, 8k render --ar 16:9`,
        animationPrompt: `Camera slowly tracks over Alex's shoulder as timeline blocks slide and lock into place smoothly --motion 3`,
      },
      {
        sceneNumber: 5,
        durationSeconds: 60,
        purpose: 'Analytics Compounding & Call to Action',
        narration: `Step five is the analytics feedback loop. Make one small improvement per upload, and let compounding take over. Subscribe for more blueprints!`,
        environment: 'Warm celebratory studio with sunset golden light pouring through window and subscriber growth milestones on wall',
        action: 'Alex smiles warmly directly into camera, giving an encouraging thumbs-up and inviting viewers to subscribe in comments',
        camera: 'Centered portrait medium close-up, 50mm prime lens',
        framing: 'Horizontal 16:9 Medium Close-Up',
        lighting: 'Golden hour sunset rim-light with clean frontal fill',
        transition: 'Fade out to YouTube end-screen cards',
        onScreenText: 'STEP 5: COMPOUNDING & SUBSCRIBE',
        imagePrompt: `Cinematic 16:9 scene: ${consistency} smiling warmly directly into camera with supportive thumbs-up, golden sunset light through studio window, 8k render --ar 16:9`,
        animationPrompt: `Alex speaks directly to camera with friendly smile, natural breathing and eye blink animation, warm inspiring ending gesture --motion 3`,
      },
    ];
  }

  // Long-form 4-scene narrative
  if (hasMultiChar) {
    return [
      {
        sceneNumber: 1,
        durationSeconds: 30,
        purpose: 'Hook & Problem Statement',
        narration: `ALEX: "Most creators struggle with ${subject.toLowerCase()} because they focus on the wrong priorities."\nMAYA: "Before diving into tactics, let's understand why traditional approaches fail."`,
        environment: 'Dimly lit creator desk surrounded by complex analytics graphs and whiteboard notes',
        action: `${nameA} sitting at desk analyzing complex graph while ${nameB} stands beside him pointing to critical dropoff point`,
        characters: [nameA, nameB],
        charactersPresent: [nameA, nameB],
        primaryCharacter: nameA,
        speakingCharacter: `${nameA} & ${nameB}`,
        interactingCharacters: [nameA, nameB],
        dialogueAssignments: [
          { character: nameA, line: `Most creators struggle with ${subject.toLowerCase()} because they focus on the wrong priorities.` },
          { character: nameB, line: 'Before diving into tactics, let\'s understand why traditional approaches fail.' },
        ],
        characterActions: {
          [nameA]: 'Sitting at wooden studio desk looking thoughtfully at confusing graphs',
          [nameB]: 'Stands beside desk with digital tablet pointing out core bottleneck',
        },
        characterExpressions: {
          [nameA]: 'Contemplative, eager to solve puzzle',
          [nameB]: 'Sharp, analytical, discerning',
        },
        characterContinuityNotes: `${nameA}: Charcoal hoodie (#2D3748). ${nameB}: Emerald green overshirt (#1A4731), wire-rim glasses.`,
        camera: 'Cinematic wide shot transitioning into medium two-shot',
        framing: 'Horizontal 16:9 Medium Two-Shot',
        lighting: 'Moody atmospheric blue fill with single warm desk lamp illumination',
        transition: 'Cross-dissolve to Scene 2',
        onScreenText: 'WHY MOST FAIL',
        imagePrompt: `Cinematic 16:9 scene: ${blockA} sitting at wooden studio desk looking thoughtfully at digital graphs alongside ${blockB} standing pointing at screen, atmospheric cinematic lighting, 8k render --ar 16:9`,
        animationPrompt: `Slow cinematic dolly-in toward characters at desk, subtle atmospheric light flicker from screen --motion 4`,
      },
      {
        sceneNumber: 2,
        durationSeconds: 90,
        purpose: 'The Core Blueprint & Systematic Breakdown',
        narration: `MAYA: "Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing highest-leverage actions."\nALEX: "Notice the compounding effect as each piece connects."`,
        environment: 'Bright, organized creative studio with large whiteboard and clean digital screens',
        action: `${nameB} presents step-by-step flowchart while ${nameA} annotates the compounding feedback loop with warm gold marker`,
        characters: [nameB, nameA],
        charactersPresent: [nameB, nameA],
        primaryCharacter: nameB,
        speakingCharacter: `${nameB} & ${nameA}`,
        interactingCharacters: [nameB, nameA],
        dialogueAssignments: [
          { character: nameB, line: 'Here is the core mechanism that changes everything. Step one is establishing your baseline. Step two is systematically executing highest-leverage actions.' },
          { character: nameA, line: 'Notice the compounding effect as each piece connects.' },
        ],
        characterActions: {
          [nameB]: 'Explains flowchart progression with confident hand gestures',
          [nameA]: 'Highlights connection between Step 2 and 3 with gold marker',
        },
        characterExpressions: {
          [nameB]: 'Articulate, confident, data-grounded',
          [nameA]: 'Energetic, practical, confirming',
        },
        characterContinuityNotes: `Maintain identical wardrobe: ${nameA} in charcoal hoodie; ${nameB} in emerald overshirt and glasses.`,
        camera: 'Smooth tracking side-to-side between both presenters',
        framing: 'Horizontal 16:9 Wide Medium Two-Shot',
        lighting: 'Bright 5200K warm three-point studio lighting',
        transition: 'Cut to detailed demonstration',
        onScreenText: 'THE 3-STEP SYSTEM',
        imagePrompt: `Cinematic 16:9 scene: ${blockB} standing in bright modern studio presenting glowing roadmap diagram alongside ${blockA} annotating chart, warm studio lighting, 8k render --ar 16:9`,
        animationPrompt: `Characters gesture smoothly as flowchart icons illuminate sequentially --motion 3`,
      },
      {
        sceneNumber: 3,
        durationSeconds: 90,
        purpose: 'Practical Execution & Pro Tips',
        narration: `MAYA: "Now let's look at practical implementation. You don't need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional results faster."`,
        environment: 'Active working studio showing laptop screen and real-time execution workflow',
        action: `${nameB} demonstrates workflow execution on laptop while ${nameA} observes positive metrics appearing in real time`,
        characters: [nameB, nameA],
        charactersPresent: [nameB, nameA],
        primaryCharacter: nameB,
        speakingCharacter: nameB,
        interactingCharacters: [nameB, nameA],
        dialogueAssignments: [
          { character: nameB, line: 'Now let\'s look at practical implementation. You don\'t need expensive gear or complicated software. By focusing on consistency and clean execution, you achieve professional results faster.' },
        ],
        characterActions: {
          [nameB]: 'Types smoothly on keyboard demonstrating clean workflow execution',
          [nameA]: 'Smiles seeing instant positive confirmation checkmarks',
        },
        characterExpressions: {
          [nameB]: 'Methodical, calm, accomplished',
          [nameA]: 'Delighted and affirming',
        },
        characterContinuityNotes: `Dual shot over-the-shoulder continuity. Maintain color profiles: ${nameB} emerald jacket, ${nameA} charcoal hoodie.`,
        camera: 'Over-the-shoulder shot looking down at glowing laptop screen with both characters visible',
        framing: 'Horizontal 16:9 Over-The-Shoulder Two-Shot',
        lighting: 'Warm keylight with soft screen bounce',
        transition: 'Smooth push to finale',
        onScreenText: 'REAL-WORLD EXECUTION',
        imagePrompt: `Cinematic 16:9 scene: Over-the-shoulder view of ${blockB} working at laptop with ${blockA} looking on, glowing green success analytics on screen, warm lighting, 8k render --ar 16:9`,
        animationPrompt: `Subtle finger typing motion, camera slowly tracks over shoulder --motion 3`,
      },
      {
        sceneNumber: 4,
        durationSeconds: 60,
        purpose: 'Summary Payoff & Call to Action',
        narration: `ALEX: "By applying this framework, you turn creation into a compounding momentum engine."\nMAYA: "Subscribe for weekly breakdowns and drop your biggest question in the comments below!"`,
        environment: 'Warm, inviting studio with sunset golden light pouring through window',
        action: `${nameA} and ${nameB} stand together looking directly into camera with welcoming smiles and inviting gestures`,
        characters: [nameA, nameB],
        charactersPresent: [nameA, nameB],
        primaryCharacter: nameA,
        speakingCharacter: `${nameA} & ${nameB}`,
        interactingCharacters: [nameA, nameB],
        dialogueAssignments: [
          { character: nameA, line: 'By applying this framework, you turn creation into a compounding momentum engine.' },
          { character: nameB, line: 'Subscribe for weekly breakdowns and drop your biggest question in the comments below!' },
        ],
        characterActions: {
          [nameA]: 'Smiles warmly and delivers concluding takeaway',
          [nameB]: 'Gives friendly wave and gestures to subscribe CTA',
        },
        characterExpressions: {
          [nameA]: 'Inspiring, warm, motivating',
          [nameB]: 'Friendly, engaging, welcoming',
        },
        characterContinuityNotes: `Complete visual lock with all preceding scenes: Alex in charcoal hoodie, Maya in emerald overshirt and glasses.`,
        camera: 'Centered medium close-up two-shot, 50mm portrait lens',
        framing: 'Horizontal 16:9 Medium Close-Up Two-Shot',
        lighting: 'Golden hour rim-light with clean frontal fill',
        transition: 'Fade out to end-screen cards',
        onScreenText: 'SUBSCRIBE & COMMENT',
        imagePrompt: `Cinematic 16:9 two-shot: ${blockA} and ${blockB} standing in studio smiling warmly into camera, golden hour sunlight in background, 8k render --ar 16:9`,
        animationPrompt: `Both characters speak directly to camera with natural eye blinks and warm friendly movements --motion 3`,
      },
    ];
  }

  return [
    {
      sceneNumber: 1,
      durationSeconds: 30,
      purpose: 'Hook & Problem Statement',
      narration: `Most creators struggle with ${subject.toLowerCase()} because they focus on the wrong priorities.`,
      environment: 'Dimly lit creator desk surrounded by tangled cables and confusing analytics graphs',
      action: 'Character sitting at desk looking contemplative, analyzing a complex glowing diagram',
      camera: 'Cinematic wide shot transitioning into medium shot',
      framing: 'Horizontal 16:9 Medium Shot',
      lighting: 'Moody atmospheric blue fill with single warm desk lamp illumination',
      transition: 'Cross-dissolve to Scene 2',
      onScreenText: 'WHY MOST FAIL',
      imagePrompt: `Cinematic 16:9 scene: ${consistency} sitting at wooden studio desk looking thoughtfully at confusing digital graphs, atmospheric cinematic lighting, 8k render`,
      animationPrompt: `Slow cinematic dolly-in toward character at desk, subtle atmospheric light flicker from screen --motion 4`,
    },
    {
      sceneNumber: 2,
      durationSeconds: 90,
      purpose: 'The Core Blueprint & Breakdown',
      narration: `Let's break down the foundational system that makes this effortless.`,
      environment: 'Bright, organized creative studio with large whiteboard and clean digital screens',
      action: 'Character stands beside structured flowchart, explaining the core 3 steps with clarity',
      camera: 'Smooth tracking side-to-side',
      framing: 'Horizontal 16:9 Wide Medium',
      lighting: 'Bright 5200K warm three-point studio lighting',
      transition: 'Cut to detailed demonstration',
      onScreenText: 'THE 3-STEP SYSTEM',
      imagePrompt: `Cinematic 16:9 scene: ${consistency} standing in bright modern studio presenting a clean glowing roadmap diagram, warm studio lighting, 8k render`,
      animationPrompt: `Character gestures smoothly to the left as flowchart icons illuminate sequentially --motion 3`,
    },
    {
      sceneNumber: 3,
      durationSeconds: 90,
      purpose: 'Practical Execution & Overcoming Obstacles',
      narration: `When you apply this in practice, here are the critical adjustments to keep you on track.`,
      environment: 'Active working environment showing laptop screen and real-time execution',
      action: 'Character happily typing on laptop, seeing real-time green progress metrics appear',
      camera: 'Over-the-shoulder shot looking down at glowing laptop screen',
      framing: 'Horizontal 16:9 Over-The-Shoulder',
      lighting: 'Warm keylight with soft screen bounce',
      transition: 'Smooth push to finale',
      onScreenText: 'REAL-WORLD EXECUTION',
      imagePrompt: `Cinematic 16:9 scene: Over-the-shoulder view of ${consistency} working at laptop with glowing green success analytics, warm lighting, 8k render`,
      animationPrompt: `Subtle finger typing motion, camera slowly tracks over shoulder --motion 3`,
    },
    {
      sceneNumber: 4,
      durationSeconds: 60,
      purpose: 'Summary Payoff & Call to Action',
      narration: `Start with step one today. Subscribe for weekly creator tutorials and leave a comment!`,
      environment: 'Warm, inviting studio with sunset golden light pouring through window',
      action: 'Character looks directly into camera with welcoming smile and inviting gesture',
      camera: 'Centered medium close-up, 50mm portrait lens',
      framing: 'Horizontal 16:9 Medium Close-Up',
      lighting: 'Golden hour rim-light with clean frontal fill',
      transition: 'Fade out to end-screen cards',
      onScreenText: 'SUBSCRIBE & COMMENT',
      imagePrompt: `Cinematic 16:9 scene: ${consistency} standing in studio smiling warmly into camera, golden hour sunlight in background, 8k render`,
      animationPrompt: `Character speaks directly to camera with natural eye blinks and warm friendly head movement --motion 3`,
    },
  ];
}

function buildVoicePackage(params: {
  scriptPackage: ScriptPackage;
  brief: VideoCreationBrief;
  isAIAnimation: boolean;
  isMultiCharacter?: boolean;
  characterBible?: CharacterBible;
}): VoicePackage {
  const { scriptPackage, brief, isAIAnimation, isMultiCharacter, characterBible } = params;
  const isAIVoice = brief.aiAssistance === 'AI Everywhere' || brief.aiAssistance === 'AI for Creation' || isAIAnimation;

  const chars = characterBible?.characters || [];
  const char1Name = chars[0]?.name || 'Alex the Creator';
  const char2Name = chars[1]?.name || 'Maya';
  const hasMultiVoice = Boolean(isMultiCharacter && chars.length > 1);

  const dialogueLines: { character: string; line: string }[] = [];
  scriptPackage.mainSections.forEach((sec) => {
    if (sec.dialogueAssignments && sec.dialogueAssignments.length > 0) {
      dialogueLines.push(...sec.dialogueAssignments);
    } else {
      dialogueLines.push({ character: sec.speaker || 'Alex', line: sec.narration });
    }
  });

  if (hasMultiVoice) {
    const characterVoices: Record<string, {
      voiceProfile: string;
      tone: string;
      pace: string;
      speakingStyle: string;
      emotion: string;
    }> = {
      [char1Name]: {
        voiceProfile: isAIVoice ? "ElevenLabs 'Adam' or 'Antony'" : 'Lead Presenter Vocal Track',
        tone: 'Warm, relatable, confident educator',
        pace: 'Moderate (145 WPM)',
        speakingStyle: 'Conversational, motivating, structured analogies',
        emotion: 'Inspiring and encouraging',
      },
      [char2Name]: {
        voiceProfile: isAIVoice ? "ElevenLabs 'Rachel' or 'Sarah'" : 'Co-Host Vocal Track',
        tone: 'Crisp, witty, intelligent analytical counterpart',
        pace: 'Moderate-fast (150 WPM)',
        speakingStyle: 'Direct, incisive, data-grounded with dry humor',
        emotion: 'Sharp, perceptive, collaborative',
      },
    };

    return {
      narrationText: `${scriptPackage.hook}\n\n${scriptPackage.introduction}\n\n` +
        scriptPackage.mainSections.map((s) => `${s.title}:\n${s.narration}`).join('\n\n') +
        `\n\n${scriptPackage.payoff}\n\n${scriptPackage.CTA}`,
      dialogueLines: dialogueLines.length > 0 ? dialogueLines : undefined,
      characterVoices,
      source: isAIVoice ? 'AI Voice' : 'Own Voice',
      voicePersonality: `${char1Name}: Warm, energetic, relatable teacher; ${char2Name}: Crisp, witty, articulate data-grounded co-host`,
      tone: 'Dynamic co-hosted dialogue, conversational banter, high pedagogical retention',
      pace: 'Moderate (145–155 words per minute) with responsive conversational turn-taking',
      emotion: 'Engaging, inspiring, balanced between energetic teaching and analytical rigor',
      emphasisNotes: `Ensure clean acoustic separation between ${char1Name} and ${char2Name}. Insert 0.4s pauses during conversational handoffs.`,
      pronunciationNotes: [
        'Pronounce acronyms clearly letter-by-letter (e.g., C-T-R, O-B-S)',
        'Keep vocal inflection rising on questions and handoffs, falling cleanly on takeaway summaries',
      ],
      pauseMarkersText: `[PAUSE 0.5s] ${scriptPackage.hook} [PAUSE 1.0s]\n\n${scriptPackage.introduction} [PAUSE 0.8s]`,
      recordingTips: [
        `Assign distinct voice profiles (e.g. ElevenLabs 'Adam' or 'Antony' for ${char1Name}, 'Rachel' or 'Sarah' for ${char2Name})`,
        'Use separate audio tracks for each speaker in your DAW/NLE for individual EQ, compression, and loudness normalization to -14 LUFS',
        'Maintain consistent microphone distance (6–8 inches) for both vocal recordings with pop filters',
      ],
    };
  }

  return {
    narrationText: `${scriptPackage.hook}\n\n${scriptPackage.introduction}\n\n` +
      scriptPackage.mainSections.map((s) => `${s.title}:\n${s.narration}`).join('\n\n') +
      `\n\n${scriptPackage.payoff}\n\n${scriptPackage.CTA}`,
    source: isAIVoice ? 'AI Voice' : 'Own Voice',
    voicePersonality: 'Warm, authoritative, articulate educator with conversational confidence',
    tone: 'Confident, friendly, encouraging, zero arrogance',
    pace: 'Moderate (140–150 words per minute)',
    emotion: 'Inspiring, informative, focused',
    emphasisNotes: 'Emphasize actionable step numbers and core contrasts. Insert 0.5s pauses between sections.',
    pronunciationNotes: [
      'Pronounce acronyms clearly letter-by-letter (e.g., C-T-R, O-B-S)',
      'Keep vocal inflection rising slightly on questions, falling cleanly on conclusions',
    ],
    pauseMarkersText: `[PAUSE 0.5s] ${scriptPackage.hook} [PAUSE 1.0s]\n\n${scriptPackage.introduction} [PAUSE 0.8s]`,
    recordingTips: [
      'Speak 6–8 inches away from microphone capsule with pop filter',
      'Record in a carpeted room with soft furnishings to prevent wall echo',
      'Take a deep breath before each section to maintain steady diaphragm projection',
    ],
  };
}

function buildAssetChecklist(params: {
  isAIAnimation: boolean;
  isWhiteboard: boolean;
  isScreenRecording: boolean;
  isTalkingHead: boolean;
  isDocumentary: boolean;
  isShort: boolean;
  toolName: string;
}): AssetRequirement[] {
  const list: AssetRequirement[] = [
    {
      id: 'ast_script',
      name: 'Approved Production Script',
      category: 'Reference',
      description: 'Complete word-for-word script with hook, body sections, and CTA',
      required: true,
      isReady: true,
    },
    {
      id: 'ast_voice',
      name: 'Master Audio Voiceover Track (WAV / MP3)',
      category: 'Audio',
      description: 'Clean vocal narration recorded in quiet space or generated via AI voice',
      required: true,
      sourceRecommendation: 'Audacity, Phone Voice Memos, or ElevenLabs',
      isReady: false,
    },
    {
      id: 'ast_music',
      name: 'Background Music Track (-22dB)',
      category: 'Audio',
      description: 'Copyright-safe ambient lofi or upbeat background music track',
      required: false,
      sourceRecommendation: 'YouTube Audio Library (100% Free & Safe)',
      isReady: false,
    },
    {
      id: 'ast_thumbnail',
      name: 'Thumbnail Master (1280x720 or 1080x1920)',
      category: 'Graphics',
      description: 'High-contrast thumbnail visual with bold text overlay',
      required: true,
      sourceRecommendation: 'Canva Free, Photopea, or Photoshop',
      isReady: false,
    },
  ];

  if (params.isAIAnimation) {
    list.push(
      {
        id: 'ast_char_ref',
        name: 'Master Character Reference Sheet',
        category: 'Graphics',
        description: 'Single image reference of Alex the Creator used to seed scene consistency',
        required: true,
        sourceRecommendation: 'Midjourney / AI Image Generator',
        isReady: false,
      },
      {
        id: 'ast_scene_renders',
        name: 'Scene Image Renders (Scenes 1–4)',
        category: 'Graphics',
        description: 'Rendered still frames for every scene prior to video animation',
        required: true,
        sourceRecommendation: 'AI Image Generator',
        isReady: false,
      }
    );
  }

  if (params.isScreenRecording) {
    list.push({
      id: 'ast_screen_captures',
      name: 'Raw Screen Capture Video Clips',
      category: 'Footage',
      description: 'Clean 1080p screen recording of software clicks and demonstrations',
      required: true,
      sourceRecommendation: 'OBS Studio (100% Free Open Source)',
      isReady: false,
    });
  }

  return list;
}

function buildEditingPlan(params: {
  toolName: string;
  isShort: boolean;
  presentationFormat: string;
}): EditingPlan {
  const { toolName, isShort } = params;

  return {
    toolName,
    sequenceSteps: [
      `1. Open ${toolName} and create a new project canvas (${isShort ? '9:16 vertical 1080x1920' : '16:9 horizontal 1920x1080'}).`,
      `2. Import your master voiceover track onto Audio Track 1.`,
      `3. Import visual footage / generated scene clips onto Video Track 1.`,
      `4. Align visual scene transitions to sync exactly with voiceover topic milestones.`,
      `5. Trim all dead air, silent gaps, and pauses to maintain energetic forward momentum.`,
      `6. Add auto-captions or text overlay callouts for key step highlights.`,
      `7. Add background music track onto Audio Track 2, ducking its volume down to -22dB.`,
      `8. Apply subtle zooms (105% to 110%) every 4–6 seconds to prevent viewer visual fatigue.`,
      `9. Review the full video from start to finish with headphones.`,
      `10. Export as MP4 at 1080p 60fps (Bitrate: 15–20 Mbps).`,
    ],
    audioSettings: {
      voiceLevel: '-3dB peak, -14 LUFS integrated',
      musicLevel: '-22dB to -26dB under vocal speech',
      sfxLevel: '-12dB peak for subtle transition swooshes',
    },
    exportSettings: {
      resolution: isShort ? '1080 x 1920 (Vertical)' : '1920 x 1080 (Horizontal Full HD)',
      aspectRatio: isShort ? '9:16' : '16:9',
      frameRate: '60 fps',
      format: 'MP4 (H.264 / AAC Audio)',
    },
  };
}

function buildThumbnailPackage(params: {
  title: string;
  subject: string;
  isAIAnimation: boolean;
  isShort: boolean;
}): ThumbnailPackage {
  const { subject, isAIAnimation } = params;

  return {
    concept: 'High-Curiosity Contrast: Problem vs Immediate Solution',
    mainVisual: 'Expressive creator face on left third looking intently at glowing graphical payoff icon on right third',
    subjectPlacement: 'Left 40% of canvas, eyes looking right toward thumbnail text',
    facialExpression: 'Focused, intrigued, confident',
    background: 'Clean dark slate studio with warm amber spotlight gradient',
    contrastDirection: 'Vibrant amber (#D4A017) text over dark charcoal backdrop for maximum CTR in dark/light mode feeds',
    thumbnailText: 'THE REAL FIX',
    composition: 'Rule of thirds: Subject on left vertical line, bold 3-word text on top right, visual proof icon on bottom right',
    designInstructions: 'Keep text under 4 words. Use heavy sans-serif typography with subtle drop shadow for mobile readability.',
    aiPrompt: isAIAnimation
      ? `YouTube thumbnail art: modern 3D stylized creator looking amazed at glowing golden holographic icon representing ${subject}, dark slate studio background, high contrast, clean typography space on right, 8k render --ar 16:9`
      : undefined,
  };
}

function buildRequirementsList(params: {
  scriptPackage: ScriptPackage;
  characterBible?: CharacterBible;
  styleBible?: StyleBible;
  scenePlan: ScenePlan[];
  imagePrompts: ImagePrompt[];
  animationPrompts: AnimationPrompt[];
  voicePackage: VoicePackage;
  assetChecklist: AssetRequirement[];
  editingPlan: EditingPlan;
  thumbnailPackage: ThumbnailPackage;
  videoClipPackage?: VideoClipPackage;
  toolName: string;
  isAIAnimation: boolean;
  isWhiteboard: boolean;
  isScreenRecording: boolean;
}): ProductionRequirement[] {
  const reqs: ProductionRequirement[] = [];
  let order = 1;

  // 1. Script Requirement
  reqs.push({
    id: 'req_script_full',
    stage: 'Stage 1 — Scripting',
    type: 'script',
    title: 'Complete Video Production Script',
    content: `${params.scriptPackage.hook}\n\n${params.scriptPackage.introduction}\n\n` +
      params.scriptPackage.mainSections.map((s) => `### ${s.title}\n${s.narration}`).join('\n\n') +
      `\n\n### Payoff\n${params.scriptPackage.payoff}\n\n### Call to Action\n${params.scriptPackage.CTA}`,
    required: true,
    copyable: true,
    completed: false,
    order: order++,
    whyNeeded: 'Serves as the master foundation for pacing, visual shot timing, and voiceover.',
  });

  // 2. Character Reference (if applicable)
  if (params.characterBible?.characters && params.characterBible.characters.length > 0) {
    params.characterBible.characters.forEach((char) => {
      reqs.push({
        id: `req_char_ref_prompt_${char.id}`,
        stage: 'Stage 2 — Character Reference',
        type: 'prompt',
        title: `Master Reference Sheet — ${char.name} (${char.role})`,
        content: char.referencePrompt || char.masterCharacterPrompt || params.characterBible!.masterReferencePrompt || '',
        required: true,
        copyable: true,
        completed: false,
        toolSpecific: true,
        usedInTool: 'AI Image Generator (Midjourney / AI Image)',
        order: order++,
        whyNeeded: `Generates the seed reference sheet for ${char.name} to guarantee facial and wardrobe consistency across all scene generations.`,
      });
    });

    if (params.characterBible.characters.length > 1 && params.characterBible.interactionRules) {
      reqs.push({
        id: 'req_char_interaction_rules',
        stage: 'Stage 2 — Character Reference',
        type: 'instruction',
        title: 'Multi-Character Continuity & Interaction Rules',
        content: params.characterBible.interactionRules.map((r, i) => `${i + 1}. ${r}`).join('\n'),
        required: true,
        copyable: true,
        completed: false,
        order: order++,
        whyNeeded: 'Guides shot framing, gaze direction, and visual weight between interacting characters in shared scenes.',
      });
    }
  } else if (params.characterBible?.masterReferencePrompt) {
    reqs.push({
      id: 'req_char_ref_prompt',
      stage: 'Stage 2 — Character Reference',
      type: 'prompt',
      title: 'Master Character Reference Prompt',
      content: params.characterBible.masterReferencePrompt,
      required: true,
      copyable: true,
      completed: false,
      toolSpecific: true,
      usedInTool: 'AI Image Generator (Midjourney / DALL-E)',
      order: order++,
      whyNeeded: 'Generates the primary character seed image to prevent character appearance drifting across scenes.',
    });
  }

  // 3. Style Bible
  if (params.styleBible) {
    reqs.push({
      id: 'req_style_bible',
      stage: 'Stage 3 — Visual Style Identity',
      type: 'reference',
      title: 'Visual Style Guide & Lighting Rules',
      content: `Style: ${params.styleBible.visualStyle}\nRendering: ${params.styleBible.renderingStyle}\nPalette: ${params.styleBible.colorDirection}\nLighting: ${params.styleBible.lighting}\nCamera: ${params.styleBible.cameraLanguage}`,
      required: true,
      copyable: true,
      completed: false,
      order: order++,
      whyNeeded: 'Ensures all scenes maintain the same color temperature, depth of field, and art direction.',
    });
  }

  // 4. Scene Plan & Tool-Specific Prompts
  if (params.videoClipPackage && params.videoClipPackage.clips.length > 0) {
    params.videoClipPackage.clips.forEach((clip) => {
      reqs.push({
        id: `req_clip_${clip.clipNumber}`,
        stage: `Stage 4 — Clip ${clip.clipNumber} Production (${params.toolName})`,
        type: 'prompt',
        title: `${clip.title}`,
        content: clip.videoPrompt,
        required: true,
        copyable: true,
        completed: false,
        toolSpecific: true,
        usedInTool: params.toolName,
        order: order++,
        whyNeeded: `Tool-tailored prompt for Clip ${clip.clipNumber} formatted specifically for ${params.toolName}.`,
      });
    });
  } else {
    params.scenePlan.forEach((scene) => {
      reqs.push({
        id: `req_scene_${scene.sceneNumber}`,
        stage: `Stage 4 — Scene ${scene.sceneNumber} Production`,
        type: scene.imagePrompt ? 'prompt' : 'instruction',
        title: `Scene ${scene.sceneNumber}: ${scene.purpose} (${scene.durationSeconds}s)`,
        content: scene.imagePrompt
          ? `IMAGE PROMPT:\n${scene.imagePrompt}\n\nMOTION PROMPT:\n${scene.animationPrompt}\n\nACTION:\n${scene.action}\n\nCAMERA:\n${scene.camera}`
          : `ACTION:\n${scene.action}\n\nCAMERA:\n${scene.camera}\n\nTEXT OVERLAY:\n${scene.onScreenText || 'None'}\n\nNARRATION:\n${scene.narration || 'Spoken line'}`,
        required: true,
        copyable: Boolean(scene.imagePrompt),
        completed: false,
        toolSpecific: true,
        usedInTool: params.toolName,
        order: order++,
        whyNeeded: `Defines exact visual composition and motion for Scene ${scene.sceneNumber}.`,
      });
    });
  }

  // 5. Voiceover Narration
  reqs.push({
    id: 'req_voice_narration',
    stage: 'Stage 5 — Voiceover & Narration',
    type: 'script',
    title: 'Voiceover Recording & Direction',
    content: `VOICE DIRECTION:\nPersonality: ${params.voicePackage.voicePersonality}\nTone: ${params.voicePackage.tone}\nPace: ${params.voicePackage.pace}\n\nNARRATION SCRIPT:\n${params.voicePackage.narrationText}`,
    required: true,
    copyable: true,
    completed: false,
    usedInTool: params.voicePackage.source === 'AI Voice' ? 'ElevenLabs' : 'Audacity / Phone Mic',
    order: order++,
    whyNeeded: 'Provides clean spoken narration with tone and pacing instructions.',
  });

  // 6. Editing Sequence Plan
  reqs.push({
    id: 'req_editing_plan',
    stage: 'Stage 6 — Timeline Assembly',
    type: 'instruction',
    title: `Click-by-Click Editing Workflow for ${params.toolName}`,
    content: params.editingPlan.sequenceSteps.join('\n'),
    required: true,
    copyable: true,
    completed: false,
    toolSpecific: true,
    usedInTool: params.toolName,
    order: order++,
    whyNeeded: `Step-by-step assembly guide inside ${params.toolName} to build the timeline quickly without errors.`,
  });

  // 7. Thumbnail
  reqs.push({
    id: 'req_thumbnail',
    stage: 'Stage 7 — Thumbnail Design',
    type: 'instruction',
    title: 'High-CTR Thumbnail Brief',
    content: `Main Visual: ${params.thumbnailPackage.mainVisual}\nText Overlay: "${params.thumbnailPackage.thumbnailText}"\nComposition: ${params.thumbnailPackage.composition}\nContrast: ${params.thumbnailPackage.contrastDirection}` +
      (params.thumbnailPackage.aiPrompt ? `\n\nAI Thumbnail Prompt:\n${params.thumbnailPackage.aiPrompt}` : ''),
    required: true,
    copyable: true,
    completed: false,
    usedInTool: 'Canva / Photoshop',
    order: order++,
    whyNeeded: 'High-converting thumbnail visual to ensure high click-through rate.',
  });

  return reqs;
}

function buildWorkflowStages(params: {
  requirements: ProductionRequirement[];
  isAIAnimation: boolean;
  isWhiteboard: boolean;
  isScreenRecording: boolean;
  isTalkingHead: boolean;
}): ProductionWorkflowStage[] {
  const stageNames = Array.from(new Set(params.requirements.map((r) => r.stage)));

  return stageNames.map((name, idx) => {
    const reqIds = params.requirements.filter((r) => r.stage === name).map((r) => r.id);
    return {
      id: `stage_${idx + 1}`,
      title: name,
      description: `Complete all required items in ${name} before moving forward.`,
      order: idx + 1,
      required: true,
      completed: false,
      requirementIds: reqIds,
    };
  });
}
