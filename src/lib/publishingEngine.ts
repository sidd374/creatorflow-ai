import { 
  CreatorProfile, 
  VideoProject, 
  VideoPublishingData, 
  ChapterItem, 
  ThumbnailBrief, 
  ThumbnailTextOption, 
  PublishUploadSettings 
} from '../types';
import { analyzeTopic } from './topicAnalyzer';
import { getLanguagePack } from './languagePatterns';

export interface TitleQualityResult {
  status: 'Good' | 'Needs review';
  charCount: number;
  score: number;
  issues: string[];
  strengths: string[];
}

export interface DescriptionQualityResult {
  status: 'Good' | 'Needs review';
  wordCount: number;
  hasHook: boolean;
  hasCallToAction: boolean;
  hasChapters: boolean;
  notes: string[];
}

export interface PublishingReadinessReport {
  scorePct: number;
  isReadyToPublish: boolean;
  requiredCompleted: number;
  requiredTotal: number;
  recommendedCompleted: number;
  recommendedTotal: number;
  optionalCompleted: number;
  optionalTotal: number;
  missingRequired: string[];
  items: Array<{
    id: string;
    label: string;
    type: 'Required' | 'Recommended' | 'Optional';
    isComplete: boolean;
    hint: string;
  }>;
}

/**
 * Deterministic Title Quality Checker
 */
export function evaluateTitleQuality(title: string): TitleQualityResult {
  const trimmed = title.trim();
  const charCount = trimmed.length;
  const issues: string[] = [];
  const strengths: string[] = [];
  let score = 85;

  if (!trimmed) {
    return {
      status: 'Needs review',
      charCount: 0,
      score: 0,
      issues: ['Title cannot be empty.'],
      strengths: [],
    };
  }

  // Length check
  if (charCount < 20) {
    issues.push('Title is very short; consider clarifying the viewer benefit or outcome.');
    score -= 15;
  } else if (charCount > 75) {
    issues.push('Title is over 75 characters and may be truncated on mobile YouTube displays.');
    score -= 10;
  } else {
    strengths.push('Optimal character length for mobile and desktop YouTube feeds.');
  }

  // Excessive punctuation
  if (/([!?$]{2,})/.test(trimmed)) {
    issues.push('Contains excessive punctuation (!!, ??, $$); YouTube may flag this as spammy.');
    score -= 15;
  }

  // All-caps check (more than 3 words in caps)
  const words = trimmed.split(/\s+/).filter(Boolean);
  const allCapsWords = words.filter(w => w.length > 2 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));
  if (allCapsWords.length > 2) {
    issues.push('Contains multiple ALL CAPS words; consider standard title case for trust.');
    score -= 10;
  } else {
    strengths.push('Balanced capitalization that reads naturally.');
  }

  // Misleading / extreme clickbait patterns
  const extremeWords = ['100% GUARANTEED', 'YOU WILL DIE', 'WILL BLOW YOUR BRAIN', 'FREE MONEY NO EFFORT'];
  if (extremeWords.some(ew => trimmed.toUpperCase().includes(ew))) {
    issues.push('Contains extreme clickbait phrasing which can hurt long-term viewer retention.');
    score -= 20;
  }

  // Positive clarity checks
  if (/^(How to|Why|What|The|Top|7|5|10|Secret|Beginner)/i.test(trimmed)) {
    strengths.push('Strong hook keyword at the beginning of the title.');
    score += 5;
  }

  const finalScore = Math.max(20, Math.min(100, score));
  const status = issues.length === 0 || finalScore >= 75 ? 'Good' : 'Needs review';

  return {
    status,
    charCount,
    score: finalScore,
    issues,
    strengths: strengths.slice(0, 3),
  };
}

/**
 * Deterministic Description Quality Checker
 */
export function evaluateDescriptionQuality(desc: string): DescriptionQualityResult {
  const words = desc.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const notes: string[] = [];

  const hasHook = desc.length > 40;
  const hasCallToAction = /subscribe|comment|let me know|thoughts|reply/i.test(desc);
  const hasChapters = /\b\d{1,2}:\d{2}\b/.test(desc);

  if (wordCount < 25) {
    notes.push('Description is brief. Adding a short summary helps search ranking.');
  } else if (wordCount > 350) {
    notes.push('Description is comprehensive. Ensure key info is in the first 2 lines.');
  } else {
    notes.push('Concise and readable length.');
  }

  // Keyword stuffing check
  const tagBlockMatches = (desc.match(/#[a-zA-Z0-9_]+/g) || []).length;
  if (tagBlockMatches > 8) {
    notes.push('More than 8 hashtags detected; YouTube ignores excess tags.');
  }

  const status = wordCount >= 20 ? 'Good' : 'Needs review';

  return {
    status,
    wordCount,
    hasHook,
    hasCallToAction,
    hasChapters,
    notes,
  };
}

/**
 * Deterministically generates YouTube Description
 */
export function generatePublishingDescription(
  project: VideoProject,
  profile: CreatorProfile,
  chapters?: ChapterItem[]
): string {
  const title = project.selectedTitle || project.topic;
  const hook = project.selectedHook || '';
  const sections = project.scriptSections || [];
  const isShort = project.format.includes('Short');
  const goal = profile.primaryGoal || 'grow your channel';

  // Opening paragraph
  const opening = hook 
    ? `${hook} In this video, you'll learn exactly how to approach ${project.topic.toLowerCase()} with clear, practical steps.`
    : `Everything you need to know about ${title.toLowerCase()}. In this video, we break down the practical steps to help you ${goal.toLowerCase()}.`;

  // Key takeaways bullet points
  const bulletLines: string[] = [];
  if (sections.length > 0) {
    sections.slice(1, 5).forEach((sec) => {
      const summary = sec.text.split(/[.!?]/)[0]?.trim();
      if (summary && summary.length > 10) {
        bulletLines.push(`• ${summary}`);
      }
    });
  }

  if (bulletLines.length === 0) {
    bulletLines.push(`• Core fundamentals of ${project.topic}`);
    bulletLines.push(`• Common mistakes beginner creators make`);
    bulletLines.push(`• Practical action steps you can apply today`);
  }

  // Chapters list if long-form and chapters exist
  let chapterText = '';
  if (!isShort && chapters && chapters.length > 1) {
    chapterText = `\n\nTIMESTAMPS / CHAPTERS:\n` + chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
  }

  // CTA
  const cta = isShort
    ? `\n\nSubscribe for daily creator tips! What was your biggest takeaway from this video? Let me know in the comments.`
    : `\n\nIf this was helpful, remember to like and subscribe for more ${profile.channelTopic || 'creator'} guides. Drop a comment below with your current channel goal!`;

  const main = `\n\nWHAT WE COVER:\n${bulletLines.join('\n')}`;

  return `${opening}${main}${chapterText}${cta}`.trim();
}

/**
 * Deterministically generates Keywords & Tags
 */
export function generatePublishingKeywords(
  project: VideoProject,
  profile: CreatorProfile
): { primary: string[]; related: string[]; longTail: string[] } {
  const topicProfile = analyzeTopic(project.topic);
  const titleWords = (project.selectedTitle || project.topic)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'your', 'have', 'more'].includes(w));

  const primary: string[] = [
    project.topic.toLowerCase(),
    titleWords.slice(0, 3).join(' '),
    `${project.topic.toLowerCase()} tutorial`,
    `${project.topic.toLowerCase()} guide`,
    `${project.topic.toLowerCase()} 2026`,
  ].filter(Boolean);

  const related: string[] = [
    `${project.topic.toLowerCase()} tips`,
    `${project.topic.toLowerCase()} for beginners`,
    `${profile.creatorStyle.toLowerCase()} ${project.format.toLowerCase()}`,
    `${profile.channelTopic.toLowerCase()}`,
    `how to ${project.topic.toLowerCase()}`,
  ];

  const longTail: string[] = [
    `how to ${project.topic.toLowerCase()} step by step`,
    `${project.topic.toLowerCase()} explained simply`,
    `best way to ${project.topic.toLowerCase()} for new creators`,
    `${project.topic.toLowerCase()} complete breakdown`,
  ];

  return {
    primary: Array.from(new Set(primary)).slice(0, 5),
    related: Array.from(new Set(related)).slice(0, 5),
    longTail: Array.from(new Set(longTail)).slice(0, 4),
  };
}

/**
 * Deterministically generates Hashtags
 */
export function generatePublishingHashtags(
  project: VideoProject,
  profile: CreatorProfile
): { primary: string[]; secondary: string[] } {
  const cleanTopic = project.topic
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  const isShort = project.format.includes('Short');

  const primary = [
    `#${cleanTopic || 'CreatorGuide'}`,
    isShort ? '#Shorts' : '#YouTubeTips',
    '#ContentCreator',
  ];

  const secondary = [
    `#${profile.primaryGoal.replace(/[^\w]/g, '') || 'ChannelGrowth'}`,
    `#${profile.channelTopic.replace(/[^\w]/g, '') || 'CreatorTips'}`,
    isShort ? '#ShortsFeed' : '#VideoProduction',
  ];

  return {
    primary: Array.from(new Set(primary)),
    secondary: Array.from(new Set(secondary)),
  };
}

/**
 * Deterministically generates Thumbnail Concept & Text Options
 */
export function generatePublishingThumbnail(
  project: VideoProject,
  profile: CreatorProfile
): {
  brief: ThumbnailBrief;
  textOptions: ThumbnailTextOption[];
  recommendedText: string;
  prompt: string;
} {
  const title = project.selectedTitle || project.topic;
  const isShort = project.format.includes('Short');

  const brief: ThumbnailBrief = {
    mainVisual: `High-contrast close-up shot focused on ${project.topic.toLowerCase()}`,
    subject: `Creator face with focused, engaged expression or focal diagram`,
    emotion: `Curiosity and focused determination`,
    background: `Dark moody studio workspace with soft amber / rose rim light`,
    composition: `Rule of thirds: focal subject on right half, bold high-contrast text on left`,
    contrast: `Bright white and amber elements over deep dark background`,
    visualHierarchy: `1. Punchy 3-word text hook → 2. Focal expression / icon → 3. Subtle background depth`,
    textPlacement: `Left side, stacked in 2 bold lines, avoiding the bottom-right timestamp badge`,
    lighting: `Soft frontal keylight with distinctive edge backlight`,
    style: `Clean, modern YouTube aesthetic (high clarity, zero visual clutter)`,
    colorDirection: `Deep charcoal background (#121212) with vibrant yellow (#FACC15) and white accents`,
  };

  const words = title.split(' ').filter(w => w.length > 2);
  const firstWord = words[0] || 'START';
  const secondWord = words[1] || 'HERE';

  const textOptions: ThumbnailTextOption[] = [
    {
      id: 'opt-1',
      text: 'START HERE',
      reason: 'Ultra-clear beginner starting point that signals simplicity.',
      isRecommended: true,
    },
    {
      id: 'opt-2',
      text: 'THE SECRET',
      reason: 'Classic curiosity trigger that motivates high click-through.',
    },
    {
      id: 'opt-3',
      text: '0 TO 1,000',
      reason: 'Concrete milestone that directly addresses channel growth.',
    },
    {
      id: 'opt-4',
      text: 'NEVER DO THIS',
      reason: 'Negative frame that urges viewers to avoid painful beginner mistakes.',
    },
  ];

  const prompt = `YouTube thumbnail graphic for "${title}". High-contrast, hyper-clean creator aesthetic. ${brief.mainVisual}, with ${brief.emotion}, set against ${brief.background}. Vibrant rim lighting, 8k resolution, crisp commercial YouTube style, wide 16:9 ratio, no small unreadable text.`;

  return {
    brief,
    textOptions,
    recommendedText: textOptions[0].text,
    prompt,
  };
}

/**
 * Deterministically generates Pinned Comment
 */
export function generatePublishingPinnedComment(
  project: VideoProject,
  profile: CreatorProfile
): string {
  const topic = project.topic.toLowerCase();
  const goal = profile.primaryGoal.toLowerCase();

  return `Quick question for you: What is the single biggest obstacle holding you back from ${goal} right now? Drop your honest thought below — I reply to every comment! 👇`;
}

/**
 * Deterministically generates Chapters from Script Sections
 */
export function generatePublishingChapters(
  project: VideoProject
): ChapterItem[] {
  const isShort = project.format.includes('Short');
  if (isShort) {
    return []; // No chapters for Shorts
  }

  const sections = project.scriptSections || [];
  if (sections.length < 2) {
    return [
      { id: 'ch-0', timestamp: '00:00', seconds: 0, title: 'Introduction' },
      { id: 'ch-1', timestamp: '01:00', seconds: 60, title: 'Core Strategy' },
      { id: 'ch-2', timestamp: '02:30', seconds: 150, title: 'Action Steps & Next Moves' },
    ];
  }

  let accumulatedSeconds = 0;
  return sections.map((sec, idx) => {
    // If first, always 00:00
    const secSeconds = idx === 0 ? 0 : accumulatedSeconds;
    const mins = Math.floor(secSeconds / 60);
    const remainder = secSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;

    // Clean title from label or first words
    let chapterName = sec.label.replace(/POINT\s*\d*:?/i, '').replace(/HOOK:?/i, 'Introduction').trim();
    if (!chapterName || chapterName === 'Introduction') {
      if (idx === 0) chapterName = 'Introduction';
      else chapterName = `Step ${idx}: ${sec.text.split(/[.!?]/)[0]?.slice(0, 30) || 'Key Point'}`;
    }

    // Estimate seconds based on wordCount (roughly 2.3 words per second)
    const duration = Math.max(20, Math.round(sec.wordCount / 2.3));
    accumulatedSeconds += duration;

    return {
      id: `ch-${sec.id || idx}`,
      timestamp: formatted,
      seconds: secSeconds,
      title: chapterName,
    };
  });
}

/**
 * Deterministic Default Upload Settings
 */
export function getDefaultUploadSettings(
  project: VideoProject,
  profile: CreatorProfile
): PublishUploadSettings {
  const isShort = project.format.includes('Short');

  return {
    platform: 'YouTube',
    contentType: isShort ? 'Short' : 'Long-form',
    visibility: 'Public',
    audience: 'Not made for kids',
    language: profile.preferredLanguage || 'English',
    category: 'Education',
    captions: 'Auto-generated',
    comments: 'Hold potentially inappropriate',
    license: 'Standard YouTube License',
    embedding: true,
  };
}

/**
 * Computes Real Publishing Readiness
 */
export function calculatePublishingReadiness(
  project: VideoProject,
  publishingData?: VideoPublishingData
): PublishingReadinessReport {
  const data = publishingData || project.publishingData;
  const isShort = project.format.includes('Short');
  const checklist = data?.checklist || {};

  const hasTitle = Boolean((data?.finalTitle || project.selectedTitle)?.trim());
  const hasDescription = Boolean(data?.description?.trim() && data.description.length > 30);
  const hasThumbnail = Boolean(data?.thumbnailBrief?.mainVisual);
  const hasUploadSettings = Boolean(data?.uploadSettings?.visibility);
  const isVideoReviewed = Boolean(checklist['req-video-reviewed']);
  const areCaptionsChecked = Boolean(checklist['req-captions-checked']);

  const hasKeywords = Boolean(data?.primaryKeywords && data.primaryKeywords.length > 0);
  const hasHashtags = Boolean(data?.primaryHashtags && data.primaryHashtags.length > 0);
  const hasPinnedComment = Boolean(data?.pinnedComment?.trim());
  const hasChapters = isShort ? true : Boolean(data?.chapters && data.chapters.length >= 2);

  const isEndScreenDone = Boolean(checklist['opt-endscreen']);
  const isCommunityPostDone = Boolean(checklist['opt-community']);

  const items: Array<{
    id: string;
    label: string;
    type: 'Required' | 'Recommended' | 'Optional';
    isComplete: boolean;
    hint: string;
  }> = [
    {
      id: 'req-title',
      label: 'Final Video Title',
      type: 'Required',
      isComplete: hasTitle,
      hint: hasTitle ? `"${(data?.finalTitle || project.selectedTitle)?.slice(0, 30)}..."` : 'Confirm your video title',
    },
    {
      id: 'req-description',
      label: 'YouTube Description',
      type: 'Required',
      isComplete: hasDescription,
      hint: hasDescription ? `${data?.description.split(' ').length} words ready` : 'Review description summary',
    },
    {
      id: 'req-thumbnail',
      label: 'Thumbnail Plan',
      type: 'Required',
      isComplete: hasThumbnail,
      hint: hasThumbnail ? `Concept: "${data?.recommendedThumbnailText || 'Ready'}"` : 'Prepare thumbnail layout',
    },
    {
      id: 'req-video-reviewed',
      label: 'Final Video Reviewed',
      type: 'Required',
      isComplete: isVideoReviewed,
      hint: isVideoReviewed ? 'Master file checked' : 'Watch exported video on phone',
    },
    {
      id: 'req-captions-checked',
      label: 'Captions & Subtitles Checked',
      type: 'Required',
      isComplete: areCaptionsChecked,
      hint: areCaptionsChecked ? 'Subtitles confirmed' : 'Verify text spelling & timing',
    },
    {
      id: 'req-upload-settings',
      label: 'Upload Settings Set',
      type: 'Required',
      isComplete: hasUploadSettings,
      hint: hasUploadSettings ? `${data?.uploadSettings.visibility} · ${data?.uploadSettings.category}` : 'Check audience & visibility',
    },
    // Recommended
    {
      id: 'rec-keywords',
      label: 'Keywords & Tags',
      type: 'Recommended',
      isComplete: hasKeywords,
      hint: `${(data?.primaryKeywords || []).length} search tags`,
    },
    {
      id: 'rec-hashtags',
      label: 'Hashtags',
      type: 'Recommended',
      isComplete: hasHashtags,
      hint: `${(data?.primaryHashtags || []).length + (data?.secondaryHashtags || []).length} hashtags ready`,
    },
    {
      id: 'rec-pinned-comment',
      label: 'Pinned Comment',
      type: 'Recommended',
      isComplete: hasPinnedComment,
      hint: hasPinnedComment ? 'Engagement question prepped' : 'Draft first comment',
    },
    {
      id: 'rec-chapters',
      label: isShort ? 'Chapters (N/A for Shorts)' : 'Timestamps & Chapters',
      type: 'Recommended',
      isComplete: hasChapters,
      hint: isShort ? 'Shorts skip chapters' : `${data?.chapters?.length || 0} timestamps mapped`,
    },
    // Optional
    {
      id: 'opt-endscreen',
      label: 'End Screen Elements',
      type: 'Optional',
      isComplete: isEndScreenDone,
      hint: 'Next video recommendation',
    },
    {
      id: 'opt-community',
      label: 'Community Post / Teaser',
      type: 'Optional',
      isComplete: isCommunityPostDone,
      hint: 'Teaser on YouTube Community tab',
    },
  ];

  const requiredItems = items.filter(i => i.type === 'Required');
  const recommendedItems = items.filter(i => i.type === 'Recommended');
  const optionalItems = items.filter(i => i.type === 'Optional');

  const requiredCompleted = requiredItems.filter(i => i.isComplete).length;
  const recommendedCompleted = recommendedItems.filter(i => i.isComplete).length;
  const optionalCompleted = optionalItems.filter(i => i.isComplete).length;

  // Weight: Required = 65%, Recommended = 25%, Optional = 10%
  const reqPct = (requiredCompleted / requiredItems.length) * 65;
  const recPct = (recommendedCompleted / recommendedItems.length) * 25;
  const optPct = (optionalCompleted / optionalItems.length) * 10;
  const scorePct = Math.round(reqPct + recPct + optPct);

  const missingRequired = requiredItems.filter(i => !i.isComplete).map(i => i.label);
  const isReadyToPublish = missingRequired.length === 0;

  return {
    scorePct,
    isReadyToPublish,
    requiredCompleted,
    requiredTotal: requiredItems.length,
    recommendedCompleted,
    recommendedTotal: recommendedItems.length,
    optionalCompleted,
    optionalTotal: optionalItems.length,
    missingRequired,
    items,
  };
}

/**
 * Initializes or repairs full publishing data for a project
 */
export function initializePublishingData(
  project: VideoProject,
  profile: CreatorProfile
): VideoPublishingData {
  if (project.publishingData && project.publishingData.finalTitle) {
    return project.publishingData;
  }

  const title = project.selectedTitle || project.topic;
  const altTitles = project.reasonForFit || [];
  const chapters = generatePublishingChapters(project);
  const desc = generatePublishingDescription(project, profile, chapters);
  const keywords = generatePublishingKeywords(project, profile);
  const hashtags = generatePublishingHashtags(project, profile);
  const thumb = generatePublishingThumbnail(project, profile);
  const comment = generatePublishingPinnedComment(project, profile);
  const upload = getDefaultUploadSettings(project, profile);

  const initialData: VideoPublishingData = {
    finalTitle: title,
    alternativeTitles: altTitles,
    description: desc,
    primaryKeywords: keywords.primary,
    relatedKeywords: keywords.related,
    longTailKeywords: keywords.longTail,
    primaryHashtags: hashtags.primary,
    secondaryHashtags: hashtags.secondary,
    pinnedComment: comment,
    chapters,
    thumbnailBrief: thumb.brief,
    thumbnailTextOptions: thumb.textOptions,
    recommendedThumbnailText: thumb.recommendedText,
    thumbnailPrompt: thumb.prompt,
    uploadSettings: upload,
    checklist: {
      'req-title': Boolean(title),
      'req-description': true,
      'req-thumbnail': true,
      'req-upload-settings': true,
    },
    lastActiveSection: 'overview',
  };

  const readiness = calculatePublishingReadiness(project, initialData);
  initialData.readinessPct = readiness.scorePct;

  return initialData;
}

/**
 * Generates formatted plain text for the complete publishing package
 */
export function generatePublishingPackageText(
  project: VideoProject,
  data: VideoPublishingData
): string {
  const isShort = project.format.includes('Short');
  const allKeywords = [...(data.primaryKeywords || []), ...(data.relatedKeywords || []), ...(data.longTailKeywords || [])];
  const allHashtags = [...(data.primaryHashtags || []), ...(data.secondaryHashtags || [])];

  return `=====================================================
CREATORFLOW AI - YOUTUBE PUBLISHING PACKAGE
=====================================================
VIDEO TOPIC: ${project.topic}
FORMAT: ${project.format}
DURATION: ${project.durationLabel || `${project.estimatedMinutes}m`}
DATE GENERATED: ${new Date().toLocaleDateString()}
=====================================================

1. VIDEO TITLE
-----------------------------------------------------
${data.finalTitle}


2. DESCRIPTION
-----------------------------------------------------
${data.description}


3. TAGS & KEYWORDS (Paste into YouTube Studio tags box)
-----------------------------------------------------
${allKeywords.join(', ')}


4. HASHTAGS
-----------------------------------------------------
${allHashtags.join(' ')}


5. PINNED COMMENT
-----------------------------------------------------
${data.pinnedComment}


${!isShort && data.chapters && data.chapters.length > 0 ? `6. TIMESTAMPS / CHAPTERS
-----------------------------------------------------
${data.chapters.map(c => `${c.timestamp} ${c.title}`).join('\n')}

` : ''}7. THUMBNAIL PLAN & BRIEF
-----------------------------------------------------
Recommended Text: "${data.recommendedThumbnailText}"
Main Visual: ${data.thumbnailBrief.mainVisual}
Subject: ${data.thumbnailBrief.subject}
Composition: ${data.thumbnailBrief.composition}
Color Direction: ${data.thumbnailBrief.colorDirection}

Design Prompt:
${data.thumbnailPrompt}


8. UPLOAD SETTINGS
-----------------------------------------------------
Platform: ${data.uploadSettings.platform}
Content Type: ${data.uploadSettings.contentType}
Visibility: ${data.uploadSettings.visibility}
Audience: ${data.uploadSettings.audience}
Category: ${data.uploadSettings.category}
Language: ${data.uploadSettings.language}
Captions: ${data.uploadSettings.captions}
Comments: ${data.uploadSettings.comments}
License: ${data.uploadSettings.license}
Embedding Allowed: ${data.uploadSettings.embedding ? 'Yes' : 'No'}

=====================================================
CreatorFlow prepares your publishing package. 
Upload and publishing are completed in YouTube Studio: https://studio.youtube.com
=====================================================
`;
}
