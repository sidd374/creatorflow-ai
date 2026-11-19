/**
 * CreatorFlow AI — Phase 3I.2 Intelligent Topic Intent & Format Separation Engine
 * Strictly separates:
 * 1. WHAT the video is about = Core Topic / Subject
 * 2. HOW it is presented = Video Format / Presentation Style
 * 3. WHO it is for = Target Audience
 * 4. WHY it is created = Creator Goal
 *
 * ₹0 Local Rule-Based Engine (Zero External APIs, Zero ML dependencies).
 */

import { TopicIntent as GuidedTopicIntent } from '../types/guidedWorkflow';

export type LegacyTopicIntent =
  | 'tutorial'       // "How to grow a YouTube channel"
  | 'recommendation' // "Best AI tools for students"
  | 'explanation'    // "Why AI videos look fake"
  | 'guide'          // "Complete guide to video editing"
  | 'comparison'     // "CapCut vs Premiere Pro"
  | 'list'           // "7 ways to get more YouTube views"
  | 'question'       // "Can AI replace video editors?"
  | 'documentary'    // "History of the internet"
  | 'story'          // "My journey from 0 to 10k"
  | 'general';

export interface SemanticKeywordGroups {
  core: string[];
  intent: string[];
  beginner: string[];
  problem: string[];
  related: string[];
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
  isFormatSubject: boolean;
}

export interface TopicProfile {
  rawTopic: string;
  normalizedTopic: string;
  subject: string;         // e.g. "YouTube Channel", "AI Tools", "Video Editing"
  actionPhrase: string;    // e.g. "grow your YouTube channel", "edit cinematic videos on a phone"
  searchPhrase: string;    // e.g. "how to grow a YouTube channel"
  nounPhrase: string;      // e.g. "YouTube channel growth", "cinematic phone video editing"
  gerundPhrase: string;    // e.g. "growing your YouTube channel", "editing phone videos"
  audience?: string;       // e.g. "students", "beginners", "creators"
  intent: LegacyTopicIntent;
  comparisonA?: string;    // e.g. "CapCut"
  comparisonB?: string;    // e.g. "Premiere Pro"
  issueOrQuestion?: string;// e.g. "look fake", "replace video editors"
  numbers: number[];
  entities: string[];
  keywords: string[];
  semanticGroups: SemanticKeywordGroups;
  detectedNiche: string;
  isTanglishOrTamil: boolean;
  isHindiOrHinglish: boolean;
  topicIntent?: TopicIntent;
}

// Convert common verb infinitives to gerunds ("grow" -> "growing", "edit" -> "editing")
export function toGerund(verb: string): string {
  const v = verb.toLowerCase().trim();
  if (!v) return '';
  if (v.endsWith('ing')) return v;
  if (v === 'make') return 'making';
  if (v === 'write') return 'writing';
  if (v === 'create') return 'creating';
  if (v === 'grow') return 'growing';
  if (v === 'edit') return 'editing';
  if (v === 'build') return 'building';
  if (v === 'start') return 'starting';
  if (v === 'scale') return 'scaling';
  if (v === 'get') return 'getting';
  if (v === 'run') return 'running';
  if (v === 'stop') return 'stopping';
  if (v === 'use') return 'using';
  if (v === 'film') return 'filming';
  if (v === 'learn') return 'learning';
  if (v === 'earn') return 'earning';
  if (v.endsWith('e') && !v.endsWith('ee')) return v.slice(0, -1) + 'ing';
  return v + 'ing';
}

// Capitalize sentence or title cleanly
export function toTitleCase(str: string): string {
  const minor = new Set(['for', 'on', 'in', 'at', 'to', 'a', 'an', 'the', 'and', 'with', 'of', 'vs', 'as', 'into']);
  return str
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && minor.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

interface KnownFormatMeta {
  key: string;
  name: string;
  regex: RegExp;
  exclusion: string[];
}

const KNOWN_FORMATS: KnownFormatMeta[] = [
  {
    key: 'whiteboard',
    name: 'Whiteboard Animation',
    regex: /\b(whiteboard animation|whiteboard explainer|whiteboard video|whiteboard|doodle animation|sketch video|drawing animation)\b/i,
    exclusion: [
      'How to make whiteboard animations',
      'Best whiteboard animation software',
      'Whiteboard animation tutorial',
      'How to draw whiteboard videos',
    ],
  },
  {
    key: 'screen_recording',
    name: 'Screen Recording',
    regex: /\b(screen[- ]recording|screen[- ]capture|screencast|screen tutorial|screen walkthrough|screen demo)\b/i,
    exclusion: [
      'How to record your screen',
      'Best screen recording software',
      'OBS Studio screen record setup tutorial',
    ],
  },
  {
    key: 'talking_head',
    name: 'Talking Head',
    regex: /\b(talking head|face on camera|talking to camera|on[- ]camera)\b/i,
    exclusion: [
      'How to talk on camera',
      'Camera confidence tutorial',
      'Best lighting for talking head',
    ],
  },
  {
    key: 'faceless',
    name: 'Faceless / Voice-over',
    regex: /\b(faceless video|faceless channel|faceless|no camera)\b/i,
    exclusion: [
      'How to start a faceless channel',
      'Best faceless YouTube tools',
      'Faceless channel tutorial',
    ],
  },
  {
    key: 'voiceover',
    name: 'Voice-over + Visuals',
    regex: /\b(voice[- ]over|voiceover narration|voiceover)\b/i,
    exclusion: [
      'How to record voiceovers',
      'Best microphone for voiceover',
      'Voiceover recording tutorial',
    ],
  },
  {
    key: 'documentary',
    name: 'Documentary',
    regex: /\b(mini[- ]documentary|documentary video|docuseries|documentary style|documentary)\b/i,
    exclusion: [
      'How to make a documentary',
      'Documentary filmmaking tutorial',
      'Best documentary editing software',
    ],
  },
  {
    key: 'shorts',
    name: 'Shorts',
    regex: /\b(youtube shorts|shorts video|shorts format|short video|shorts|reels|tiktok)\b/i,
    exclusion: [
      'How to make YouTube Shorts',
      'YouTube Shorts algorithm tutorial',
      'Best Shorts editing app',
    ],
  },
  {
    key: 'gameplay',
    name: 'Gameplay',
    regex: /\b(gameplay video|gameplay walkthrough|gaming playthrough|gameplay|gaming)\b/i,
    exclusion: [
      'How to record gameplay',
      'Best game capture card',
      'Gaming channel setup guide',
    ],
  },
  {
    key: 'slideshow',
    name: 'Slide Presentation',
    regex: /\b(slideshow|slide presentation|presentation video|powerpoint|slide deck)\b/i,
    exclusion: [
      'How to make presentation slides',
      'PowerPoint presentation tutorial',
    ],
  },
  {
    key: 'motion_graphics',
    name: 'Motion Graphics / Animation',
    regex: /\b(motion graphics|2d animation|explainer animation|animated video)\b/i,
    exclusion: [
      'How to animate in After Effects',
      'Motion graphics tutorial',
      'Best animation software',
    ],
  },
];

/**
 * Extract structured TopicIntent separating WHAT (Subject) from HOW (Format).
 */
export function extractTopicIntent(
  rawInput: string,
  options?: {
    profileFormat?: string;
    profileAudience?: string;
    profileGoal?: string;
  } | any
): TopicIntent {
  const raw = (rawInput || '').trim();
  const lower = raw.toLowerCase();

  // Extract from VideoCreationBrief if passed
  const profileFormat = options?.presentationStyle?.[0] || options?.profileFormat;
  const profileAudience = options?.targetAudience || options?.profileAudience;
  const profileGoal = options?.primaryPriority || options?.profileGoal;

  // Check if topic is ITSELF about making/learning the format (e.g. "How to create whiteboard animations")
  const isDirectFormatTutorial = 
    /^how to (?:create|make|do|edit|draw|animate|build|start)\s+(?:a\s+)?(whiteboard|faceless|screen recording|shorts|documentary|animation)/i.test(lower) ||
    /^(?:whiteboard animation|screen recording|documentary|shorts|faceless)\s+(?:tutorial|software|tools|guide|course|tips|workflow)/i.test(lower) ||
    /^best\s+(?:whiteboard|screen recording|animation|documentary)\s+(?:software|tools|apps|hardware|cameras)/i.test(lower);

  if (isDirectFormatTutorial) {
    const matchedFormat = KNOWN_FORMATS.find(f => f.regex.test(lower));
    return {
      rawInput: raw,
      coreTopic: raw,
      subject: toTitleCase(raw),
      intent: 'tutorial',
      audience: options?.profileAudience || 'Beginner creators',
      requestedFormat: matchedFormat?.name || options?.profileFormat || 'Tutorial Walkthrough',
      presentationFormat: matchedFormat?.name || options?.profileFormat || 'Tutorial Walkthrough',
      topicKeywords: extractPureTopicKeywords(raw),
      excludedInterpretations: [],
      isFormatSubject: true,
    };
  }

  // Detect and extract format wrappers inside user prompt
  let coreTopic = raw;
  let requestedFormat: string | undefined = undefined;
  let matchedFormatMeta: KnownFormatMeta | undefined = undefined;

  // 1. Prefix: "Make a faceless video about AI", "Create a Shorts video about 5 YouTube mistakes", "Make a documentary about history of YouTube"
  const makeAboutMatch = raw.match(/^(?:make|create|produce|generate|record|film|build)\s+(?:a\s+|an\s+)?(.+?)\s+(?:about|on|for|explaining|discussing)\s+(.+)$/i);
  if (makeAboutMatch) {
    const formatCandidate = makeAboutMatch[1].trim();
    const topicCandidate = makeAboutMatch[2].trim();
    const foundFormat = KNOWN_FORMATS.find(f => f.regex.test(formatCandidate));
    if (foundFormat) {
      requestedFormat = foundFormat.name;
      matchedFormatMeta = foundFormat;
      coreTopic = topicCandidate;
    }
  }

  // 2. Direct format prefix: "Whiteboard animation about climate change", "Shorts about 5 AI tools", "Screen recording tutorial for Photoshop"
  if (!requestedFormat) {
    const directAboutMatch = raw.match(/^(.+?)\s+(?:about|on|for|explaining)\s+(.+)$/i);
    if (directAboutMatch) {
      const formatCandidate = directAboutMatch[1].trim();
      const topicCandidate = directAboutMatch[2].trim();
      const foundFormat = KNOWN_FORMATS.find(f => f.regex.test(formatCandidate));
      if (foundFormat) {
        requestedFormat = foundFormat.name;
        matchedFormatMeta = foundFormat;
        coreTopic = topicCandidate;
      }
    }
  }

  // 3. Suffix: "Climate change as a whiteboard animation", "History of YouTube (documentary)"
  if (!requestedFormat) {
    const suffixMatch = raw.match(/^(.+?)\s+(?:in|as|using|with)\s+(?:a\s+)?(.+?)(?:\s+format|\s+style)?$/i) ||
                        raw.match(/^(.+?)\s*\((.+?)\)$/i) ||
                        raw.match(/^(.+?)\s*-\s*(.+?)$/i);
    if (suffixMatch) {
      const topicCandidate = suffixMatch[1].trim();
      const formatCandidate = suffixMatch[2].trim();
      const foundFormat = KNOWN_FORMATS.find(f => f.regex.test(formatCandidate));
      if (foundFormat) {
        requestedFormat = foundFormat.name;
        matchedFormatMeta = foundFormat;
        coreTopic = topicCandidate;
      }
    }
  }

  // Clean core topic of leading articles/prepositions
  coreTopic = coreTopic
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/^(?:about|on|for|explaining)\s+/i, '')
    .trim();

  // If user entered a question/topic like "How to grow a YouTube channel", keep it intact
  if (!coreTopic) {
    coreTopic = raw;
  }

  // Effective presentation format (neutral default unless requested or configured in profile)
  const presentationFormat = requestedFormat || profileFormat || 'Educational Explainer';
  const effectiveMeta = matchedFormatMeta || KNOWN_FORMATS.find(f => f.name.toLowerCase() === presentationFormat.toLowerCase());

  // Determine core intent from the clean coreTopic
  let intent = 'educational';
  const coreLower = coreTopic.toLowerCase();
  if (/\bvs\.?\b|\bversus\b|\bcomparison\b|\bcomparing\b|\bbetter than\b/i.test(coreLower) || /\b[a-z0-9][a-z0-9\s.'-]{1,28}\s+or\s+[a-z0-9][a-z0-9\s.'-]{1,28}\b/i.test(coreLower)) {
    intent = 'comparison';
  } else if (/^how to\s+/i.test(coreLower) || /\b(tutorial|guide|step[- ]by[- ]step)\b/i.test(coreLower)) {
    intent = 'tutorial';
  } else if (/^why\s+/i.test(coreLower) || /\b(explain|reason|science|mechanism)\b/i.test(coreLower)) {
    intent = 'explanation';
  } else if (/^best\s+/i.test(coreLower) || /^top\s+/i.test(coreLower) || /\b(tools|recommend|review)\b/i.test(coreLower)) {
    intent = 'recommendation';
  } else if (/^\d+\s+/i.test(coreLower) || /\b(ways|tips|hacks|secrets|mistakes|rules)\b/i.test(coreLower)) {
    intent = 'list';
  } else if (/\b(history|story|origin|rise|evolution)\b/i.test(coreLower)) {
    intent = 'documentary';
  }

  // Target audience derivation
  let audience = options?.profileAudience || 'Beginner & intermediate creators';
  if (/student|school|college|exam|study/i.test(coreLower)) {
    audience = 'Students & learners';
  } else if (/youtube|channel|subscriber|views/i.test(coreLower)) {
    audience = 'Beginner YouTube creators';
  } else if (/photoshop|premiere|edit|design/i.test(coreLower)) {
    audience = 'Creative beginners & editors';
  } else if (/climate|planet|earth|science|nature/i.test(coreLower)) {
    audience = 'Curious minds & environmentally-conscious viewers';
  } else if (/crypto|finance|money|invest/i.test(coreLower)) {
    audience = 'Aspiring investors & finance enthusiasts';
  }

  // Pure topic keywords (WITHOUT injecting presentation format words)
  const topicKeywords = extractPureTopicKeywords(coreTopic);

  // Excluded interpretations
  const excluded = effectiveMeta?.exclusion || [
    `How to make ${presentationFormat.toLowerCase()}`,
    `Best ${presentationFormat.toLowerCase()} software`,
    `${presentationFormat} tutorial`,
  ];

  return {
    rawInput: raw,
    coreTopic: coreTopic,
    subject: toTitleCase(coreTopic),
    intent: intent,
    audience: audience,
    requestedFormat: requestedFormat,
    presentationFormat: presentationFormat,
    topicKeywords: topicKeywords,
    excludedInterpretations: excluded,
    isFormatSubject: false,
  };
}

/**
 * Extracts pure semantic keywords from a topic without format noise
 */
function extractPureTopicKeywords(topic: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'how', 'to', 'why', 'what', 'when', 'where', 'who', 'is', 'are', 'was',
    'were', 'in', 'on', 'at', 'for', 'with', 'about', 'as', 'by', 'of', 'and', 'or', 'make',
    'create', 'video', 'videos', 'from', 'scratch', 'complete', 'guide', 'tutorial',
    // Stopwords for format noise:
    'whiteboard', 'animation', 'faceless', 'voiceover', 'screen', 'recording', 'shorts', 'documentary',
  ]);

  const words = topic
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return Array.from(new Set(words));
}

/**
 * Main analyzeTopic function combining TopicProfile + TopicIntent
 */
export function analyzeTopic(topic: string, formatContext?: string): TopicProfile {
  const raw = topic.trim();
  const lower = raw.toLowerCase();

  // Structured topic intent extraction
  const intentObj = extractTopicIntent(raw, { profileFormat: formatContext });

  // Language detection flags
  const isTamilScript = /[\u0B80-\u0BFF]/.test(raw);
  const isDevanagari = /[\u0900-\u097F]/.test(raw);
  const hasTanglishTerms = /\b(eppadi|epdi|panradhu|pandradhu|namma|solren|pathu|paarunga|thappe|solla|mudiyum|irukku|panra|pannunga)\b/i.test(lower);
  const hasHinglishTerms = /\b(kaise|kare|karna|sikho|banao|tarika|sahi|galti|karein)\b/i.test(lower);

  // Extract explicit numbers
  const numberMatches = raw.match(/\b\d+\b/g);
  const numbers = numberMatches ? numberMatches.map(n => parseInt(n, 10)) : [5];

  // Detect niche based on coreTopic
  const coreLower = intentObj.coreTopic.toLowerCase();
  let niche = 'Creator Growth & Strategy';
  if (/video|edit|film|camera|lens|capcut|premiere|davinci|shot|audio|mic|cinematic/i.test(coreLower)) {
    niche = 'Video Production & Editing';
  } else if (/youtube|channel|subscribers|views|ctr|retention|algorithm|monetiz/i.test(coreLower)) {
    niche = 'YouTube Growth & Analytics';
  } else if (/ai|chatgpt|claude|gemini|prompts|model|tool|tech|software|code/i.test(coreLower)) {
    niche = 'AI & Creator Technology';
  } else if (/money|earn|income|finance|invest|crypto|stocks|business|hustle|rupee|lakh/i.test(coreLower)) {
    niche = 'Business & Creator Income';
  } else if (/student|study|exam|school|college|degree|learn|memory|focus/i.test(coreLower)) {
    niche = 'Learning & Productivity';
  } else if (/climate|planet|earth|warming|carbon|emission|nature|environment/i.test(coreLower)) {
    niche = 'Science & Environment';
  } else if (/fitness|gym|workout|diet|weight|muscle|health|sleep|dream|brain/i.test(coreLower)) {
    niche = 'Health & Science';
  }

  // Legacy intent classification
  let legacyIntent: LegacyTopicIntent = 'general';
  if (intentObj.intent === 'comparison') legacyIntent = 'comparison';
  else if (intentObj.intent === 'tutorial') legacyIntent = 'tutorial';
  else if (intentObj.intent === 'explanation') legacyIntent = 'explanation';
  else if (intentObj.intent === 'recommendation') legacyIntent = 'recommendation';
  else if (intentObj.intent === 'list') legacyIntent = 'list';
  else if (intentObj.intent === 'documentary') legacyIntent = 'documentary';

  // Extract comparisonA & comparisonB cleanly
  let comparisonA: string | undefined = undefined;
  let comparisonB: string | undefined = undefined;
  if (legacyIntent === 'comparison') {
    const cleanCompTopic = intentObj.coreTopic
      .replace(/\s+(?:for|in|on)\s+(?:beginners|creators|youtube|pc|mobile|202\d).*$/i, '')
      .trim();
    const vsMatch = cleanCompTopic.match(/^(.+?)\s+(?:vs\.?|versus|compared to|or)\s+(.+)$/i);
    if (vsMatch) {
      comparisonA = toTitleCase(vsMatch[1].trim());
      comparisonB = toTitleCase(vsMatch[2].trim().replace(/[?!.]+$/, ''));
    } else {
      const keywords = intentObj.topicKeywords;
      comparisonA = keywords[0] ? toTitleCase(keywords[0]) : toTitleCase(intentObj.coreTopic);
      comparisonB = keywords[1] ? toTitleCase(keywords[1]) : 'Alternatives';
    }
  }

  // Extract issueOrQuestion cleanly for explanations
  let issueOrQuestion: string | undefined = undefined;
  if (legacyIntent === 'explanation') {
    const whyMatch = raw.match(/^why\s+(?:do\s+|does\s+|are\s+|is\s+)?(.+?)[?!.]*$/i);
    if (whyMatch) {
      issueOrQuestion = whyMatch[1].trim();
    }
  }

  // Build proper gerund phrase (avoid 'mastering how to ...')
  const strippedAction = intentObj.coreTopic.replace(/^how to\s+/i, '').trim();
  const actionWords = strippedAction.split(/\s+/);
  const firstWord = actionWords[0] || '';
  const gerundPhrase = firstWord
    ? `${toGerund(firstWord)} ${actionWords.slice(1).join(' ')}`.trim()
    : intentObj.coreTopic.toLowerCase();

  // Build semantic keyword groups
  const semanticGroups = buildSemanticGroups(
    intentObj.subject,
    strippedAction || intentObj.coreTopic,
    intentObj.subject,
    intentObj.audience,
    legacyIntent,
    comparisonA,
    comparisonB
  );

  const allKeywords = deduplicateKeywords([
    ...intentObj.topicKeywords,
    ...semanticGroups.core,
    ...semanticGroups.intent,
    ...semanticGroups.beginner,
  ]);

  return {
    rawTopic: raw,
    normalizedTopic: intentObj.coreTopic,
    subject: intentObj.subject,
    actionPhrase: strippedAction || intentObj.coreTopic,
    searchPhrase: intentObj.coreTopic.toLowerCase(),
    nounPhrase: intentObj.subject,
    gerundPhrase,
    audience: intentObj.audience,
    intent: legacyIntent,
    comparisonA,
    comparisonB,
    issueOrQuestion,
    numbers: numbers,
    entities: intentObj.topicKeywords,
    keywords: allKeywords,
    semanticGroups: semanticGroups,
    detectedNiche: niche,
    isTanglishOrTamil: isTamilScript || hasTanglishTerms,
    isHindiOrHinglish: isDevanagari || hasHinglishTerms,
    topicIntent: intentObj,
  };
}

function buildSemanticGroups(
  subject: string,
  actionPhrase: string,
  nounPhrase: string,
  audience?: string,
  intent?: LegacyTopicIntent,
  compA?: string,
  compB?: string
): SemanticKeywordGroups {
  const s = subject.toLowerCase();
  const act = actionPhrase.toLowerCase();
  const noun = nounPhrase.toLowerCase();

  if (compA && compB) {
    const a = compA.toLowerCase();
    const b = compB.toLowerCase();
    return {
      core: [`${a} vs ${b}`, `${a} or ${b}`, `${a} comparison`],
      intent: [`is ${a} better than ${b}`, `which editor is better ${a} or ${b}`, `switching from ${b} to ${a}`],
      beginner: [`best video editor for beginners`, `${a} for beginners tutorial`, `${b} tutorial`],
      problem: [`${a} limitations`, `${b} performance review`, `video editing workflow speed`],
      related: [`timeline editing`, `export settings comparison`, `creator editing tools`],
    };
  }

  if (/youtube/i.test(s) || /grow/i.test(act)) {
    return {
      core: ['how to grow a YouTube channel', 'YouTube channel growth', 'grow YouTube channel'],
      intent: ['how to get more YouTube views', 'how to gain YouTube subscribers', 'YouTube growth strategy'],
      beginner: ['YouTube growth tips for beginners', 'how to grow a small YouTube channel', 'starting a YouTube channel from zero'],
      problem: ['why YouTube channels stop growing', 'how to get more views on YouTube', 'fixing low video retention'],
      related: ['YouTube content strategy', 'YouTube audience growth', 'YouTube creator tips', 'video CTR optimization'],
    };
  }

  if (/climate/i.test(s) || /warming/i.test(act)) {
    return {
      core: ['climate change explained', 'global warming causes', 'understanding climate change'],
      intent: ['why earth is getting warmer', 'what causes global warming', 'climate change visual explanation'],
      beginner: ['climate change basics for beginners', 'greenhouse effect explained simply', 'carbon emissions breakdown'],
      problem: ['rising global temperatures effects', 'how to reduce carbon footprint', 'climate action steps'],
      related: ['renewable energy transition', 'environmental science guide', 'sustainable living ideas'],
    };
  }

  if (/phone|mobile/i.test(s) || /edit/i.test(act)) {
    return {
      core: ['cinematic phone video editing', 'mobile video editing tutorial', 'edit cinematic videos on phone'],
      intent: ['smartphone filmmaking guide', 'cinematic mobile camera tips', 'mobile video editing workflow'],
      beginner: ['mobile video editing for beginners', 'phone video editing tricks', 'smartphone filmmaking basics'],
      problem: ['why phone videos look amateur', 'how to fix mobile video lighting', 'phone video color grading'],
      related: ['CapCut mobile editing tips', 'mobile storytelling', 'smartphone b-roll techniques'],
    };
  }

  if (/ai.*tool|student/i.test(s) || audience === 'students') {
    return {
      core: ['best AI tools for students', 'AI tools for studying', 'student productivity AI'],
      intent: ['how students can use AI tools', 'top AI apps for homework', 'free AI study tools'],
      beginner: ['AI tools beginners guide for school', 'study smarter with AI', 'AI research tools for students'],
      problem: ['avoiding AI detection in school', 'ethical AI for students', 'best AI note taking tools'],
      related: ['ChatGPT for students', 'AI summary tools', 'exam preparation hacks'],
    };
  }

  if (/internet/i.test(s) || /history/i.test(act)) {
    return {
      core: ['history of the internet', 'how the internet was built', 'story of the world wide web'],
      intent: ['who invented the internet', 'ARPANET to modern web timeline', 'internet history documentary'],
      beginner: ['how the internet works explained', 'origins of the internet', 'early days of the web'],
      problem: ['internet dot com bubble collapse', 'centralization of the internet', 'future of the web'],
      related: ['web 1.0 to modern tech', 'computer networking history', 'tech pioneers documentary'],
    };
  }

  // General fallback semantic groups
  return {
    core: [`how to ${act}`, `${noun} guide`, `${s} tutorial`],
    intent: [`best ways to ${act}`, `proven ${s} methods`, `how to improve ${s}`],
    beginner: [`${s} for beginners`, `simple ${s} steps`, `getting started with ${s}`],
    problem: [`common ${s} mistakes`, `why ${s} fails`, `how to fix ${s}`],
    related: [`${s} tips and tricks`, `advanced ${s} framework`, `creator workflow for ${s}`],
  };
}

export function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const kw of keywords) {
    const normalized = kw.toLowerCase().trim();
    if (!normalized || normalized.length < 3) continue;
    if (seen.has(normalized)) continue;

    // Check near duplicates
    let isDuplicate = false;
    for (const existing of seen) {
      if (existing === normalized || existing === `${normalized}s` || normalized === `${existing}s`) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      result.push(kw.trim());
    }
  }

  return result;
}
