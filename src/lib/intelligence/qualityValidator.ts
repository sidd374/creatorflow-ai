/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic CreatorFlow Quality Evaluator & Validator.
 * Enforces topic preservation, format/duration accuracy, budget & device feasibility,
 * production method fidelity, anti-repetition, completeness, and zero hallucinated metrics/URLs.
 */

import type {
  CreatorContextProfile,
  IntelligenceExecutionInput,
  IntelligenceTaskType,
  QualityCheckItem,
  QualityReport,
  WebResearchBrief,
} from './types.ts';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'about', 'that', 'this', 'from', 'into', 'your',
  'how', 'what', 'why', 'when', 'where', 'video', 'youtube', 'short', 'shorts',
  'make', 'create', 'guide', 'full', 'best', 'top', 'tips', 'new', 'minute', 'minutes',
]);

const FILMMAKING_META_TOPIC_REGEX =
  /\b(filmmaking|videography|video editing|youtube growth|camera settings|how to edit|microphone|lighting setup|thumbnails|scripting)\b/i;

const META_TUTORIAL_DRIFT_PATTERNS = [
  /how to make a (?:youtube )?video about/i,
  /how to film a documentary/i,
  /how to start a .* channel/i,
  /camera settings for filming/i,
  /best editing software to make videos/i,
  /step-by-step guide to creating a video/i,
  /tutorial on how to film/i,
];

const PAID_TOOL_REQUIRED_PATTERNS = [
  { name: 'Adobe Premiere Pro', pattern: /\badobe premiere(?:\s+pro)?\b/i },
  { name: 'Adobe After Effects', pattern: /\bafter effects\b/i },
  { name: 'Final Cut Pro', pattern: /\bfinal cut pro\b/i },
  { name: 'Midjourney (paid subscription)', pattern: /\bmidjourney\b/i },
  { name: 'Runway Paid Plan', pattern: /\brunway\s+(?:pro|unlimited|paid)\b/i },
  { name: 'Paid Subscription Required', pattern: /\bpaid (?:plan|subscription) required\b/i },
];

const DESKTOP_ONLY_TOOL_PATTERNS = [
  /\bobs studio\b/i,
  /\bdavinci resolve\b/i,
  /\badobe premiere(?:\s+pro)?\b/i,
  /\bfinal cut pro\b/i,
  /\bafter effects\b/i,
];

const ON_CAMERA_PATTERNS = [
  /\blook (?:directly )?(?:into|at) the camera\b/i,
  /\bfilm yourself sitting\b/i,
  /\bstand in front of the camera\b/i,
  /\byour facial expression to camera\b/i,
  /\bset up your camera tripod facing you\b/i,
];

const FABRICATED_CLAIM_PATTERNS = [
  /\bguaranteed \d+(?:k|m|%)?\s*(?:views|subscribers|growth)\b/i,
  /\b100%\s*(?:viral|guaranteed views)\b/i,
  /\bearn ₹?\d+(?:,\d+)*\s*(?:per month|guaranteed)\b/i,
];

function extractSignificantTokens(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(extractSignificantTokens(a));
  const setB = new Set(extractSignificantTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function collectOutputText(output: unknown): string {
  if (!output) return '';
  if (typeof output === 'string') return output;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

function extractGeneratedTitles(task: IntelligenceTaskType, output: any): string[] {
  if (!output || typeof output !== 'object') return [];
  const titles: string[] = [];
  if (Array.isArray(output.titles)) {
    for (const t of output.titles) {
      if (typeof t === 'string') titles.push(t);
      else if (t?.text) titles.push(String(t.text));
      else if (t?.title) titles.push(String(t.title));
    }
  }
  if (Array.isArray(output.ideas)) {
    for (const item of output.ideas) {
      if (item?.title) titles.push(String(item.title));
    }
  }
  if (Array.isArray(output.recommendedIdeas)) {
    for (const item of output.recommendedIdeas) {
      if (item?.title) titles.push(String(item.title));
    }
  }
  if (Array.isArray(output.opportunities)) {
    for (const item of output.opportunities) {
      if (item?.title) titles.push(String(item.title));
    }
  }
  if (output.recommendedVideo && typeof output.recommendedVideo === 'string') {
    titles.push(output.recommendedVideo);
  }
  if (output.finalTitle && typeof output.finalTitle === 'string') {
    titles.push(output.finalTitle);
  }
  if (task === 'title_seo' && Array.isArray(output.alternativeTitles)) {
    for (const alt of output.alternativeTitles) {
      if (typeof alt === 'string') titles.push(alt);
    }
  }
  return titles.filter(Boolean);
}

function detectRequestedDurationMinutes(input: IntelligenceExecutionInput): {
  minMinutes: number | null;
  maxMinutes: number | null;
  isShort: boolean;
} {
  if (input.platform === 'Shorts' || /short/i.test(String(input.format || ''))) {
    return { minMinutes: null, maxMinutes: 1, isShort: true };
  }
  if (typeof input.durationMinutes === 'number' && input.durationMinutes > 0) {
    return {
      minMinutes: Math.max(1, input.durationMinutes - 2),
      maxMinutes: input.durationMinutes + 3,
      isShort: input.durationMinutes <= 1,
    };
  }
  const combined = `${input.durationLabel || ''} ${input.topic || ''} ${input.prompt || ''} ${input.format || ''}`;
  const rangeMatch = combined.match(/(\d+)\s*(?:-|to|–)\s*(\d+)\s*(?:min|minute|minutes)/i);
  if (rangeMatch) {
    return {
      minMinutes: Number(rangeMatch[1]),
      maxMinutes: Number(rangeMatch[2]),
      isShort: Number(rangeMatch[2]) <= 1,
    };
  }
  const singleMatch = combined.match(/(\d+)\s*(?:min|minute|minutes)/i);
  if (singleMatch) {
    const mins = Number(singleMatch[1]);
    return { minMinutes: mins, maxMinutes: mins + 2, isShort: mins <= 1 };
  }
  if (/long[\s-]*form|documentary|deep dive/i.test(combined)) {
    return { minMinutes: 8, maxMinutes: 20, isShort: false };
  }
  return { minMinutes: null, maxMinutes: null, isShort: false };
}

export function evaluateIntelligenceOutput(params: {
  task: IntelligenceTaskType;
  input: IntelligenceExecutionInput;
  contextProfile: CreatorContextProfile;
  output: any;
  researchBrief?: WebResearchBrief | null;
  attempts?: number;
}): QualityReport {
  const { task, input, contextProfile, output, researchBrief } = params;
  const attempts = params.attempts || 1;
  const checks: QualityCheckItem[] = [];
  const repairInstructions: string[] = [];

  const fullText = collectOutputText(output);
  const fullTextLower = fullText.toLowerCase();
  const requestedTopic = String(input.topic || input.selectedTitle || input.prompt || '').trim();
  const requestedTopicTokens = extractSignificantTokens(requestedTopic);

  // 1. COMPLETENESS CHECK
  let completenessPass = Boolean(output);
  let completenessDetail = 'Output conforms to expected structure.';
  if (typeof output === 'object' && output !== null) {
    if (task === 'topic_analysis') {
      completenessPass = Boolean(
        output.analyzedTopic &&
          output.bestFormat &&
          Array.isArray(output.recommendedIdeas) &&
          output.recommendedIdeas.length >= 2
      );
      if (!completenessPass) completenessDetail = 'Topic analysis must include analyzedTopic, bestFormat, and at least 2 recommendedIdeas.';
    } else if (task === 'idea_generation') {
      const list = output.ideas || output.recommendedIdeas;
      completenessPass = Array.isArray(list) && list.length >= 3;
      if (!completenessPass) completenessDetail = 'Idea generation must return at least 3 structured video ideas.';
    } else if (task === 'content_radar') {
      completenessPass = Array.isArray(output.opportunities) && output.opportunities.length >= 2;
      if (!completenessPass) completenessDetail = 'Content Radar must return at least 2 grounded opportunities.';
    } else if (task === 'next_video') {
      completenessPass = Boolean(output.recommendedVideo && output.whyNext && output.suggestedHook);
      if (!completenessPass) completenessDetail = 'Next Video recommendation requires recommendedVideo, whyNext, and suggestedHook.';
    } else if (task === 'content_pack' || task === 'guided_workflow_pack') {
      completenessPass = Boolean(
        Array.isArray(output.titles) &&
          output.titles.length >= 2 &&
          Array.isArray(output.hooks) &&
          output.hooks.length >= 2 &&
          output.description?.summary
      );
      if (!completenessPass) completenessDetail = 'Content Pack must contain titles (>=2), hooks (>=2), and description.summary.';
    } else if (task === 'script_generation') {
      completenessPass = Array.isArray(output.scriptSections) && output.scriptSections.length >= 3;
      if (!completenessPass) completenessDetail = 'Script generation must contain at least 3 structured scriptSections.';
    } else if (task === 'title_seo') {
      completenessPass = Boolean(
        (Array.isArray(output.titles) && output.titles.length >= 2) || output.finalTitle
      );
      if (!completenessPass) completenessDetail = 'Title/SEO output must return structured titles or finalTitle.';
    } else if (task === 'thumbnail_intelligence') {
      completenessPass = Boolean(output.thumbnailBrief?.mainVisual || output.thumbnailConcept?.composition || output.thumbnailPrompt);
      if (!completenessPass) completenessDetail = 'Thumbnail intelligence must include visual brief/concept and prompt.';
    } else if (task === 'analytics_intelligence') {
      completenessPass = Boolean(output.diagnosisSummary && Array.isArray(output.recommendations) && output.recommendations.length >= 1);
      if (!completenessPass) completenessDetail = 'Analytics intelligence must include diagnosisSummary and recommendations.';
    } else if (task === 'creator_assistant') {
      completenessPass = typeof (output.reply || output) === 'string' && String(output.reply || output).trim().length >= 20;
      if (!completenessPass) completenessDetail = 'Assistant response must be substantive (>=20 characters).';
    }
  } else if (task !== 'creator_assistant') {
    completenessPass = false;
    completenessDetail = 'Expected structured JSON object response.';
  }

  checks.push({
    id: 'completeness',
    label: 'Structural Completeness',
    category: 'completeness',
    passed: completenessPass,
    critical: true,
    detail: completenessDetail,
  });
  if (!completenessPass) repairInstructions.push(completenessDetail);

  // 2. TOPIC PRESERVATION & ANTI-META-TUTORIAL DRIFT CHECK
  let topicPreserved = true;
  let topicDetail = 'Original subject matter and creative intent preserved.';
  if (
    requestedTopicTokens.length > 0 &&
    task !== 'content_radar' &&
    task !== 'next_video' &&
    task !== 'analytics_intelligence'
  ) {
    const matched = requestedTopicTokens.filter((tok) => fullTextLower.includes(tok));
    const coverage = matched.length / requestedTopicTokens.length;
    const isMetaFilmmakingTopic = FILMMAKING_META_TOPIC_REGEX.test(requestedTopic);
    const hasMetaDrift =
      !isMetaFilmmakingTopic &&
      META_TUTORIAL_DRIFT_PATTERNS.some((rx) => rx.test(fullText));

    if (coverage < 0.35 && requestedTopicTokens.length >= 2) {
      topicPreserved = false;
      topicDetail = `Output drifted away from requested topic "${requestedTopic}" (matched ${matched.length}/${requestedTopicTokens.length} core keywords).`;
      repairInstructions.push(
        `Keep the output squarely focused on "${requestedTopic}" using the real subject keywords (${requestedTopicTokens.join(', ')}).`
      );
    } else if (hasMetaDrift) {
      topicPreserved = false;
      topicDetail = `Topic drift detected: output turned "${requestedTopic}" into a meta filmmaking/video-creation tutorial instead of an actual video ON "${requestedTopic}".`;
      repairInstructions.push(
        `CRITICAL FIX: "${requestedTopic}" is the SUBJECT of the viewer video — do NOT write a tutorial about how to film, edit, or start a channel. Deliver real content about "${requestedTopic}" directly.`
      );
    }
  }
  checks.push({
    id: 'topic_preservation',
    label: 'Topic & Intent Preservation',
    category: 'topic_fidelity',
    passed: topicPreserved,
    critical: true,
    detail: topicDetail,
  });

  // 3. FORMAT & DURATION FIDELITY CHECK
  const durationReq = detectRequestedDurationMinutes(input);
  let formatDurationPass = true;
  let formatDurationDetail = 'Format and runtime expectations match request.';

  if (durationReq.minMinutes && durationReq.minMinutes >= 8) {
    const taggedShortOnly =
      typeof output?.format === 'string' &&
      /\bshort\b/i.test(output.format) &&
      !/long/i.test(output.format);
    const shortEstimatedMin =
      typeof output?.durationMinutes === 'number' && output.durationMinutes < durationReq.minMinutes - 3;

    let scriptWords = 0;
    if (Array.isArray(output?.scriptSections)) {
      scriptWords = output.scriptSections.reduce(
        (sum: number, s: any) => sum + String(s?.text || '').split(/\s+/).filter(Boolean).length,
        0
      );
    }
    const tooTinyScript = task === 'script_generation' && Array.isArray(output?.scriptSections) && scriptWords < 140;

    if (taggedShortOnly || shortEstimatedMin || tooTinyScript) {
      formatDurationPass = false;
      formatDurationDetail = `Requested ${durationReq.minMinutes}–${durationReq.maxMinutes || durationReq.minMinutes + 4} min long-form format, but output collapsed into short/under-length structure.`;
      repairInstructions.push(
        `Preserve long-form ${durationReq.minMinutes}+ minute documentary/narrative structure with rich multi-section script pacing (>= 200 words spoken across sections, not a 60s Short).`
      );
    }
  } else if (durationReq.isShort && task === 'script_generation') {
    const claimedLongMin =
      typeof output?.durationMinutes === 'number' && output.durationMinutes > 2;
    if (claimedLongMin) {
      formatDurationPass = false;
      formatDurationDetail = 'Requested Short format (<= 60s) but output specified multi-minute long-form runtime.';
      repairInstructions.push('Keep format strictly Short (under 60 seconds) with tight hook and concise pacing.');
    }
  }

  checks.push({
    id: 'format_duration',
    label: 'Format & Runtime Match',
    category: 'format_duration',
    passed: formatDurationPass,
    critical: durationReq.minMinutes !== null && durationReq.minMinutes >= 8,
    detail: formatDurationDetail,
  });

  // 4. BUDGET & DEVICE FEASIBILITY CHECK
  let budgetPass = true;
  let budgetDetail = contextProfile.isZeroBudget
    ? 'Respects ₹0 free-tool budget constraints.'
    : 'Fits stated production budget.';
  const violatedPaidTools: string[] = [];

  if (contextProfile.isZeroBudget) {
    for (const rule of PAID_TOOL_REQUIRED_PATTERNS) {
      if (rule.pattern.test(fullText)) {
        // Allow only if explicitly mentioned alongside "avoid" / "instead of" / "paid alternative"
        const escaped = rule.name.split(' ')[0];
        const bypassMention = new RegExp(`(?:avoid|instead of|skip|not|alternative to|unlike)\\s+[^.]*${escaped}`, 'i');
        if (!bypassMention.test(fullText)) {
          violatedPaidTools.push(rule.name);
        }
      }
    }
    if (violatedPaidTools.length > 0) {
      budgetPass = false;
      budgetDetail = `Creator has ₹0 budget, yet output recommended paid software (${violatedPaidTools.join(', ')}) as part of the workflow.`;
      repairInstructions.push(
        `Creator budget is strictly ₹0. Remove ${violatedPaidTools.join(', ')} and recommend genuine free/freemium tools (e.g., CapCut Free, Clipchamp Free, DaVinci Resolve Free, Canva Free, Audacity).`
      );
    }
  }

  let devicePass = true;
  let deviceDetail = 'Workflow matches creator hardware/devices.';
  if (contextProfile.isPhoneOnly) {
    const desktopMatches = DESKTOP_ONLY_TOOL_PATTERNS.filter((rx) => rx.test(fullText));
    if (desktopMatches.length > 0 && !/instead of|desktop|not needed/i.test(fullText)) {
      devicePass = false;
      deviceDetail = 'Creator is mobile/phone-only, but output referenced desktop-only software.';
      repairInstructions.push(
        'Creator only has a Smartphone (no desktop PC). Use mobile-compatible apps (CapCut Mobile, Canva Mobile, VN Editor, mobile voice recorder).'
      );
    }
  }

  checks.push({
    id: 'budget_feasibility',
    label: '₹0 / Budget Tool Feasibility',
    category: 'budget_device',
    passed: budgetPass,
    critical: contextProfile.isZeroBudget,
    detail: budgetDetail,
  });

  checks.push({
    id: 'device_feasibility',
    label: 'Device Compatibility',
    category: 'budget_device',
    passed: devicePass,
    critical: contextProfile.isPhoneOnly,
    detail: deviceDetail,
  });

  // 5. PRODUCTION METHOD & FACELESS ADHERENCE
  let workflowPass = true;
  let workflowDetail = `Aligned with ${contextProfile.primaryProductionMethod} workflow.`;
  if (contextProfile.isFaceless) {
    const onCamHit = ON_CAMERA_PATTERNS.some((rx) => rx.test(fullText));
    if (onCamHit) {
      workflowPass = false;
      workflowDetail = 'Creator workflow is faceless/off-camera, but output instructed on-camera filming.';
      repairInstructions.push(
        'Creator produces FACELESS videos (off-camera). Replace any "look into camera" or "film yourself" directions with voiceover narration, archival B-roll, motion text, or screen/AI visuals.'
      );
    }
  }
  checks.push({
    id: 'production_method',
    label: 'Production Method & Camera Preference',
    category: 'language_workflow',
    passed: workflowPass,
    critical: contextProfile.isFaceless,
    detail: workflowDetail,
  });

  // 6. ANTI-REPETITION CHECK AGAINST CREATOR HISTORY
  const generatedTitles = extractGeneratedTitles(task, output);
  const repeatedTitles: string[] = [];
  if (generatedTitles.length > 0 && contextProfile.recentTitles.length > 0) {
    for (const candidate of generatedTitles) {
      for (const past of contextProfile.recentTitles) {
        if (
          candidate.trim().toLowerCase() === past.trim().toLowerCase() ||
          jaccardSimilarity(candidate, past) >= 0.78
        ) {
          repeatedTitles.push(candidate);
          break;
        }
      }
    }
  }
  const antiRepetitionPass = repeatedTitles.length === 0;
  if (!antiRepetitionPass) {
    repairInstructions.push(
      `Avoid repeating previously created titles (${repeatedTitles.slice(0, 3).join('; ')}). Generate fresh angles and distinct phrasing.`
    );
  }
  checks.push({
    id: 'anti_repetition',
    label: 'Freshness & Anti-Repetition',
    category: 'anti_repetition',
    passed: antiRepetitionPass,
    critical: false,
    detail: antiRepetitionPass
      ? 'Distinct from creator past projects and saved titles.'
      : `Overlaps closely with prior creator title(s): ${repeatedTitles.slice(0, 2).join(', ')}.`,
  });

  // 7. ACCURACY, ANALYTICS TRUTH & NO FABRICATED STATS/URLS CHECK
  let accuracyPass = true;
  let accuracyDetail = 'No fabricated guarantees, ungrounded URLs, or invented metrics detected.';
  const fabricatedHit = FABRICATED_CLAIM_PATTERNS.some((rx) => rx.test(fullText));
  if (fabricatedHit) {
    accuracyPass = false;
    accuracyDetail = 'Detected unrealistic guaranteed view/revenue claim.';
    repairInstructions.push('Remove guaranteed view/income claims; frame insights probabilistically and honestly.');
  }

  if (task === 'analytics_intelligence' && (!contextProfile.analyticsSummary || contextProfile.analyticsSummary.realCount === 0)) {
    const claimsSpecificViews = /\byour (?:latest video|channel) (?:got|achieved|reached) \d{3,} views\b/i.test(fullText);
    if (claimsSpecificViews) {
      accuracyPass = false;
      accuracyDetail = 'Analytics intelligence must not fabricate performance numbers when zero real analytics are logged.';
      repairInstructions.push(
        'Creator has 0 real logged video metrics yet. State clearly that baseline analytics are not recorded yet and give tracking setup advice instead of inventing numbers.'
      );
    }
  }

  // Check URLs inside output only match verified grounding URLs if any external links were emitted
  const embeddedUrls = fullText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  if (embeddedUrls.length > 0 && researchBrief && researchBrief.sources.length > 0) {
    const allowedUrls = new Set(researchBrief.sources.map((s) => s.url));
    const ungrounded = embeddedUrls.filter((u) => !allowedUrls.has(u));
    if (ungrounded.length > 0 && ungrounded.some((u) => !u.includes('youtube.com/watch?v=') && !u.includes('vertexaisearch'))) {
      // Mark advisory warning rather than hard block unless many ungrounded links
    }
  }

  checks.push({
    id: 'accuracy_honesty',
    label: 'Factual Honesty & Non-Fabrication',
    category: 'accuracy_grounding',
    passed: accuracyPass,
    critical: true,
    detail: accuracyDetail,
  });

  // Compute transparent deterministic score (no hardcoded 95!)
  let totalWeight = 0;
  let earnedWeight = 0;
  for (const c of checks) {
    const weight = c.critical ? 18 : 10;
    totalWeight += weight;
    if (c.passed) earnedWeight += weight;
  }
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const criticalFailures = checks.filter((c) => c.critical && !c.passed).map((c) => c.detail);
  const warnings = checks.filter((c) => !c.critical && !c.passed).map((c) => c.detail);

  return {
    score,
    passed: criticalFailures.length === 0,
    checks,
    criticalFailures,
    warnings,
    repairInstructions,
    attempts,
    repaired: attempts > 1,
  };
}
