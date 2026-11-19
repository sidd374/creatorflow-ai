import { RecommendedVideoIdea, BuilderTab } from './index';

export type WorkflowStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type DeviceType = 
  | 'Phone' 
  | 'Laptop' 
  | 'Desktop PC' 
  | 'Phone and Laptop' 
  | 'Camera' 
  | 'Gaming setup' 
  | 'Microphone' 
  | 'Drawing tablet' 
  | 'Other';

export type PresentationStyleType = 
  | 'Face on camera' 
  | 'Voice-over + visuals' 
  | 'Faceless' 
  | 'Screen recording' 
  | 'Gameplay' 
  | 'Whiteboard/drawing' 
  | 'Text-based' 
  | 'Mixed format';

export type RecordingCapabilityType = 
  | 'Camera footage' 
  | 'Phone footage' 
  | 'Screen recordings' 
  | 'Voice recording' 
  | 'Gameplay' 
  | 'Drawings' 
  | 'Animations' 
  | 'Photos' 
  | 'Existing video clips' 
  | 'None yet';

export type ExistingAssetType = 
  | 'My own footage' 
  | 'Photos' 
  | 'Screen recordings' 
  | 'Voice recording' 
  | 'Music' 
  | 'Logo/branding' 
  | 'Existing clips' 
  | 'Nothing yet';

export type VideoTypeOption = 
  | 'Educational' 
  | 'Tutorial' 
  | 'Story' 
  | 'List' 
  | 'Explainer' 
  | 'Review' 
  | 'Comparison' 
  | 'News/Commentary' 
  | 'Documentary' 
  | 'Entertainment' 
  | 'Shorts' 
  | 'Other';

export type ProductionLevelType = 'Simple' | 'Clean & Professional' | 'High Quality' | 'Advanced';

export type PrimaryPriorityType = 
  | 'Speed' 
  | 'Quality' 
  | 'Simplicity' 
  | 'Lowest cost' 
  | 'Learning' 
  | 'Growth' 
  | 'Experimenting' 
  | 'Professional appearance';

export type SecondaryPriorityType = 
  | 'Easy editing' 
  | 'Strong storytelling' 
  | 'Better visuals' 
  | 'Better audio' 
  | 'Consistency';

export type VideoBudgetType = 
  | '₹0 — Completely Free' 
  | 'Low Budget' 
  | 'Flexible Budget' 
  | 'Premium Tools';

export type AIAssistanceType = 
  | 'No AI' 
  | 'AI for Planning' 
  | 'AI for Creation' 
  | 'AI Everywhere';

export interface VideoCreationBrief {
  availableDevices: DeviceType[];
  presentationStyle: PresentationStyleType[];
  recordingCapabilities: RecordingCapabilityType[];
  existingAssets: ExistingAssetType[];
  existingAssetsDetail?: string;
  videoType: VideoTypeOption;
  preferredDuration: string;
  productionLevel: ProductionLevelType;
  primaryPriority: PrimaryPriorityType;
  secondaryPriorities: SecondaryPriorityType[];
  videoBudget: VideoBudgetType;
  aiAssistance: AIAssistanceType;
  characterCast?: 'single' | 'multi' | 'none';
  customCharacters?: CharacterDefinition[];
  createdAt: string;
  updatedAt: string;
}

export type CreationMethodType = 
  | 'ai_animation' 
  | 'ai_image_to_video' 
  | 'faceless' 
  | 'whiteboard' 
  | 'talking_head' 
  | 'screen_recording' 
  | 'gameplay' 
  | 'documentary' 
  | 'manual_editing' 
  | 'other'
  | 'free' 
  | 'paid' 
  | 'fast' 
  | 'pro' 
  | 'ai_assisted' 
  | 'manual';

export interface ToolWorkflowProfile {
  id: string;
  name: string;
  generationMode: 'text_to_video' | 'image_to_video' | 'screen_capture' | 'whiteboard_svg' | 'timeline_editor' | 'voice_generator' | 'hybrid';
  acceptsTextPrompt: boolean;
  acceptsReferenceImage: boolean;
  acceptsCharacterReference: boolean;
  acceptsImageInput: boolean;
  supportsImageToVideo: boolean;
  supportsTextToVideo: boolean;
  supportsCameraInstructions: boolean;
  supportsDurationControl: boolean;
  supportsVoice: boolean;
  supportsDialogue: boolean;
  supportsAudio: boolean;
  supportsSceneGeneration: boolean;
  supportsNegativePrompt: boolean;
  recommendedPromptStructure: string;
  requiredInputs: string[];
  outputWorkflow: string[];
}

export interface AIVideoToolProfile {
  toolId: string;
  name: string;
  id?: string; // Backwards compatibility alias
  category?: 'ai_video_generation';
  officialUrl?: string;

  generationModes: (
    | 'text-to-video'
    | 'image-to-video'
    | 'reference-to-video'
    | 'character-video'
    | 'text_to_video'
    | 'image_to_video'
    | 'character_reference'
    | 'story_to_video'
  )[];

  maxClipDurationSeconds: number;

  supportsCharacterConsistency: boolean;
  requiresCharacterPrompt: boolean;
  supportsCharacterReference: boolean;

  supportsStyleReference: boolean;

  supportsAudioGeneration: boolean;
  supportsDialogue: boolean;
  supportsSoundEffects: boolean;
  supportsMusic: boolean;

  supportsCameraInstructions: boolean;
  supportsMotionInstructions: boolean;
  supportsNegativePrompt: boolean;

  promptStrategy:
    | 'single-complete-prompt'
    | 'structured-prompt'
    | 'image-plus-motion'
    | 'tool-specific';

  requiresSeparateAssembly: boolean;

  // Additional metadata & compatibility
  freeAvailability?: 'free' | 'free_tier' | 'paid' | 'unknown';
  browserSupport?: boolean;
  desktopSupport?: boolean;
  bestFor?: string[];
  negativePromptTemplate?: string;
  promptSyntaxGuidance?: string;
  recommendedAspectRatios?: string[];
}

export interface VideoClipPrompt {
  clipNumber: number;
  timeRange: string; // e.g. "00:00–00:10"
  durationSeconds: number;
  title: string;
  narrativePhase: 'Hook' | 'Introduction' | 'Development' | 'Climax' | 'Payoff' | 'Outro';
  beginningState: string;
  action: string;
  development: string;
  endingState: string;
  // The primary complete video prompt for single-complete-prompt tools:
  videoPrompt: string;
  // Separate image and motion prompts for image-plus-motion tools:
  imagePrompt?: string;
  motionPrompt?: string;
  negativePrompt?: string;
  charactersPresent?: string[];
  primaryCharacter?: string;
  speakingCharacter?: string;
  continuityLock?: string;
  cameraMovement?: string;
  lighting?: string;
  environment?: string;
  spokenText?: string;
  isAudioIntegrated: boolean;
}

export interface VideoClipPackage {
  toolId: string;
  toolName: string;
  totalDurationSeconds: number;
  maxClipDurationSeconds: number;
  totalClipsCount: number;
  promptStrategy:
    | 'single-complete-prompt'
    | 'structured-prompt'
    | 'image-plus-motion'
    | 'tool-specific';
  requiresSeparateAssembly: boolean;
  supportsAudioGeneration: boolean;
  supportsCharacterReference: boolean;
  supportsNegativePrompt: boolean;
  masterCharacterPrompts?: Record<string, string>;
  masterReferencePrompts?: Record<string, string>;
  clips: VideoClipPrompt[];
  assemblyInstructions: string[];
}

export interface WorkflowToolInfo {
  id: string;
  name: string;
  bestFor: string;
  cost: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  worksOn: string[];
  advantages: string[];
  limitations: string[];
  whatYouWillUseItFor: string[];
  whyFitsVideo: string;
  isVerifiedFreeTier?: boolean;
  providerUrl?: string;
  toolCategory?: 'ai_generator' | 'voice_audio' | 'editing_assembly' | 'screen_capture' | 'whiteboard' | 'design';
  generationType?: 'Text → Video' | 'Image → Video' | 'Text & Image → Video' | 'Audio/Voice' | 'Timeline Assembly';
  workflowProfile?: ToolWorkflowProfile;
  aiProfile?: AIVideoToolProfile;
}

export interface WorkflowScriptSection {
  id: string;
  type: 'Hook' | 'Introduction' | 'Main Point 1' | 'Main Point 2' | 'Main Point 3' | 'Conclusion' | 'CTA';
  title: string;
  text: string;
  durationSec: number;
  deliveryTip: string;
}

export interface WorkflowVisualItem {
  id: string;
  timeRange: string;
  spokenSnippet: string;
  whatToShow: string;
  onScreenText: string;
}

export interface WorkflowVoicePlan {
  source: 'Own Voice' | 'AI Voice' | 'Text Only';
  tone: string;
  pace: string;
  emphasisNotes: string;
  recordingTips: string[];
}

export interface WorkflowEditingPlan {
  toolName: string;
  steps: string[];
}

export interface WorkflowAssets {
  required: string[];
  optional: string[];
}

export interface WorkflowAIPrompts {
  imagePrompt: string;
  videoPrompt: string;
  voicePrompt: string;
  musicPrompt: string;
  thumbnailPrompt: string;
}

export interface WorkflowMetadata {
  selectedTitle: string;
  titleAlternatives: string[];
  titleCharCount: number;
  titleFeedback: string;
  description: {
    opening: string;
    summary: string;
    keyPoints: string[];
    callToAction: string;
    formattedText: string;
  };
  thumbnailBrief: {
    focalPoint: string;
    facialExpression: string;
    overlayText: string;
    compositionGuide: string;
    colorPalette: string[];
  };
  pinnedComment: string;
}

export interface WorkflowDiscovery {
  keywords: string[];
  hashtags: string[];
  tags: string[];
}

export interface WorkflowYoutubeSettings {
  visibility: 'Public' | 'Unlisted' | 'Private' | 'Schedule';
  audience: 'Not made for kids' | 'Made for kids';
  category: string;
  language: string;
  captionsCertification: string;
  commentsSetting: string;
  license: 'Standard YouTube License' | 'Creative Commons - Attribution';
  allowEmbedding: boolean;
  publishToSubscriptions: boolean;
}

export interface TopicIntent {
  rawInput: string;
  coreTopic: string;
  subject: string;
  intent: string;
  audience?: string;
  requestedFormat?: string;
  presentationFormat?: string;
  topicKeywords: string[];
  excludedInterpretations: string[];
}

export type ProductionRequirementType =
  | 'script'
  | 'prompt'
  | 'asset'
  | 'instruction'
  | 'setting'
  | 'reference'
  | 'checklist';

export interface ProductionRequirement {
  id: string;
  stage: string;
  type: ProductionRequirementType;
  title: string;
  content: string;
  required: boolean;
  copyable: boolean;
  completed: boolean;
  toolSpecific?: boolean;
  usedInTool?: string;
  order: number;
  whyNeeded?: string;
}

export interface ProductionWorkflowStage {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  completed: boolean;
  requirementIds: string[];
}

export interface ScriptPackage {
  title: string;
  hook: string;
  introduction: string;
  mainSections: {
    title: string;
    narration: string;
    visualCue?: string;
    dialogue?: string;
    speaker?: string;
    dialogueAssignments?: { character: string; line: string }[];
  }[];
  payoff?: string;
  CTA?: string;
  estimatedDuration: number;
  estimatedWordCount: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  role: string;
  narrativePurpose?: string;
  personality: string;
  ageRange?: string;
  appearance: string;
  face: string;
  hair: string;
  clothing: string;
  accessories?: string[];
  colors: string;
  bodyProportions?: string;
  voiceDescription?: string;
  speakingStyle?: string;
  emotionalTraits?: string[];
  relationshipToOtherCharacters?: string;
  visualConsistencyRules?: string[];
  facialTraits?: string;
  props?: string[];
  fixedElements: string[];
  avoidChanges: string[];
  referencePrompt?: string;
  masterCharacterPrompt?: string;
  consistencyBlock?: string;
}

export interface CharacterBible {
  characters: CharacterDefinition[];
  consistencyRules: string[];
  negativeConsistencyRules: string[];
  masterReferencePrompt?: string;
  consistencyBlock?: string;
  masterCharacterPrompts?: Record<string, string>;
  consistencyBlocks?: Record<string, string>;
  interactionRules?: string[];
}

export interface StyleBible {
  visualStyle: string;
  renderingStyle: string;
  colorDirection: string;
  lighting: string;
  environmentStyle: string;
  cameraLanguage: string;
  consistencyRules: string[];
  negativeRules: string[];
  masterStylePrompt?: string;
}

export interface ScenePlan {
  sceneNumber: number;
  durationSeconds: number;
  purpose: string;
  narration?: string;
  dialogue?: string;
  characters?: string[];
  charactersPresent?: string[];
  primaryCharacter?: string;
  speakingCharacter?: string;
  interactingCharacters?: string[];
  characterActions?: Record<string, string>;
  characterExpressions?: Record<string, string>;
  characterRelationships?: string;
  dialogueAssignments?: { character: string; line: string }[];
  characterContinuityNotes?: string;
  environment: string;
  action: string;
  camera: string;
  framing: string;
  lighting: string;
  transition?: string;
  onScreenText?: string;
  soundEffects?: string[];
  musicDirection?: string;
  imagePrompt?: string;
  animationPrompt?: string;
  continuityNotes?: string;
}

export interface ImagePrompt {
  id: string;
  sceneNumber: number;
  title: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  tool: string;
  referenceRequired?: boolean;
  consistencyNote?: string;
}

export interface AnimationPrompt {
  id: string;
  sceneNumber: number;
  title: string;
  prompt: string;
  motionIntensity: string;
  cameraMovement: string;
  durationSeconds: number;
  tool: string;
  inputImageId?: string;
}

export interface VoicePackage {
  narrationText: string;
  dialogueLines?: { character: string; line: string }[];
  characterVoices?: Record<string, {
    voiceProfile: string;
    tone: string;
    pace: string;
    speakingStyle: string;
    emotion: string;
  }>;
  source: 'Own Voice' | 'AI Voice' | 'Text Only';
  voicePersonality: string;
  tone: string;
  pace: string;
  emotion: string;
  emphasisNotes: string;
  pronunciationNotes?: string[];
  pauseMarkersText?: string;
  recordingTips: string[];
}

export interface AssetRequirement {
  id: string;
  name: string;
  category: 'Footage' | 'Audio' | 'Graphics' | 'Software' | 'Reference';
  description: string;
  required: boolean;
  sourceRecommendation?: string;
  isReady: boolean;
}

export interface EditingPlan {
  toolName: string;
  sequenceSteps: string[];
  audioSettings: {
    voiceLevel: string;
    musicLevel: string;
    sfxLevel: string;
  };
  exportSettings: {
    resolution: string;
    aspectRatio: string;
    frameRate: string;
    format: string;
  };
}

export interface ThumbnailPackage {
  concept: string;
  mainVisual: string;
  subjectPlacement: string;
  facialExpression?: string;
  background: string;
  contrastDirection: string;
  thumbnailText: string;
  composition: string;
  designInstructions: string;
  aiPrompt?: string;
}

export interface ProductionKit {
  id: string;
  method: string;
  selectedToolId?: string;
  selectedToolName?: string;
  workflowStages: ProductionWorkflowStage[];
  requirements: ProductionRequirement[];
  scriptPackage?: ScriptPackage;
  characterBible?: CharacterBible;
  styleBible?: StyleBible;
  scenePlan?: ScenePlan[];
  imagePrompts?: ImagePrompt[];
  animationPrompts?: AnimationPrompt[];
  voicePackage?: VoicePackage;
  assetChecklist?: AssetRequirement[];
  editingPlan?: EditingPlan;
  thumbnailPackage?: ThumbnailPackage;
  videoClipPackage?: VideoClipPackage;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorWorkflowState {
  currentStep: WorkflowStepNumber;
  topic: string;
  topicIntent?: TopicIntent;
  creationBrief: VideoCreationBrief;
  strategicAngleRationale?: string;
  analyzedIdeas: RecommendedVideoIdea[];
  selectedIdea: RecommendedVideoIdea | null;
  creationMethod: CreationMethodType | null;
  selectedTool: WorkflowToolInfo | null;
  productionKit?: ProductionKit;
  script: {
    sections: WorkflowScriptSection[];
    durationFormatted: string;
  };
  visualPlan: WorkflowVisualItem[];
  voicePlan: WorkflowVoicePlan;
  editingPlan: WorkflowEditingPlan;
  assets: WorkflowAssets;
  aiPrompts?: WorkflowAIPrompts;
  isVideoCreated: boolean;
  metadata: WorkflowMetadata;
  discovery: WorkflowDiscovery;
  youtubeSettings: WorkflowYoutubeSettings;
  completionChecklist: {
    briefCompleted: boolean;
    topicAnalyzed: boolean;
    ideaSelected: boolean;
    methodChosen: boolean;
    toolSelected: boolean;
    contentCreated: boolean;
    titleSelected: boolean;
    descriptionReady: boolean;
    thumbnailPlanned: boolean;
    keywordsReady: boolean;
    hashtagsReady: boolean;
    youtubeSettingsReviewed: boolean;
  };
  associatedProjectId: string | null;
  workflowId?: string;
  reservationId?: string;
  isFinished: boolean;
  createdAt: string;
  updatedAt: string;
}

// Milestone & Achievement Types
export type AchievementCategory = 'Getting Started' | 'Production' | 'Consistency' | 'Learning';

export interface CreatorAchievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  isUnlocked: boolean;
  unlockedAt: string | null;
  iconName: string;
  milestoneKey: string;
}

export interface CreatorMilestoneEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  milestoneType: string;
}
