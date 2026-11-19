/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Deterministic Prompt Validation & Pre-Copy Sanitization Layer
 * Validates AI video, keyframe image, character, style, and thumbnail prompts before
 * clipboard export and performs safe, deterministic syntax sanitization without mutating source state.
 */

import { getAIVideoToolProfile } from './aiVideoToolProfiles';

export type PromptKind =
  | 'video_clip'
  | 'image_keyframe'
  | 'motion'
  | 'character'
  | 'style'
  | 'thumbnail'
  | 'script'
  | 'general';

export type PromptValidationCode =
  | 'empty_prompt'
  | 'too_short'
  | 'unresolved_placeholder'
  | 'truncated_ending'
  | 'disallowed_syntax'
  | 'conflicting_camera'
  | 'length_limit';

export interface PromptValidationIssue {
  code: PromptValidationCode;
  severity: 'error' | 'warning';
  message: string;
  autoFixable: boolean;
}

export interface PromptValidationResult {
  valid: boolean;
  status: 'ready' | 'warning' | 'blocked';
  issues: PromptValidationIssue[];
  errors: PromptValidationIssue[];
  warnings: PromptValidationIssue[];
  charCount: number;
  wordCount: number;
  sanitizedPreview: string;
}

export interface ValidatePromptOptions {
  toolId?: string;
  kind?: PromptKind;
  allowEmpty?: boolean;
  aspectRatio?: string;
}

// Bracketed/curly template placeholders (avoids matching timestamps like [0:05] or scene tags like [CLIP 1])
const UNRESOLVED_PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[(?:INSERT|YOUR|ADD|ENTER|TOPIC|SUBJECT|CHARACTER(?:\s+CONSISTENCY)?|ACTION(?:\s+with[^[\]]*)?|ENVIRONMENT|CAMERA(?:\s+DIRECTION)?|LIGHTING|OBSERVABLE\s+ACTION|PHYSICAL\s+INTERACTION|STYLE|PLACEHOLDER)\b[^[\]]*\]/gi,
  /\{\{[^{}]+\}\}/g,
  /\{(?:insert|your|topic|subject|character|action|environment|camera|lighting|placeholder)[^{}]*\}/gi,
  /<(?:placeholder|insert|topic|your_[a-z_]+)>/gi,
  /\b(?:TODO|TBD)\s*[:\-]?/g,
];

const TRAILING_DANGLING_CONNECTOR_REGEX =
  /(?:,\s*|\s+)(?:with|featuring|showing|including|and|or|using|in the|on the|of a|for a)\s*[,:-]?\s*$/i;

const NEGATIVE_FLAG_PATTERNS: RegExp[] = [
  /\s*--no\s+[^\n]+/gi,
  /\s*-neg\s+[^\n]+/gi,
  /\s*(?:^|\n|\.\s*)negative\s+prompt\s*:\s*[^\n]+/gi,
];

const CONFLICTING_CAMERA_PAIRS = [
  {
    a: /\b(?:push[- ]in|zoom\s+in|dolly\s+in)\b/i,
    b: /\b(?:pull[- ]back|zoom\s+out|dolly\s+out)\b/i,
    desc: 'Conflicting zoom/dolly directions (push-in + pull-back)',
  },
  {
    a: /\bpan\s+left\b/i,
    b: /\bpan\s+right\b/i,
    desc: 'Conflicting horizontal pan directions (left + right)',
  },
  {
    a: /\b(?:tilt|crane)\s+up\b/i,
    b: /\b(?:tilt|crane)\s+down\b/i,
    desc: 'Conflicting vertical camera directions (up + down)',
  },
];

/**
 * Deterministically cleans unresolved placeholders, unsupported negative-prompt flags,
 * dangling trailing clauses, and extra punctuation/whitespace for safe clipboard export.
 */
export function sanitizePromptForExport(
  promptText: string,
  options?: { toolId?: string }
): string {
  if (!promptText) return '';

  let cleaned = promptText.replace(/\r\n/g, '\n');

  // 1. Strip unresolved template placeholders
  for (const pattern of UNRESOLVED_PLACEHOLDER_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 2. Strip tool-disallowed negative-prompt flags when target tool rejects inline negative syntax
  if (options?.toolId) {
    const profile = getAIVideoToolProfile(options.toolId);
    if (!profile.supportsNegativePrompt) {
      for (const negPattern of NEGATIVE_FLAG_PATTERNS) {
        cleaned = cleaned.replace(negPattern, '');
      }
    }
  }

  // 3. Clean repeated separators created by stripped tokens
  cleaned = cleaned
    .replace(/,\s*,+/g, ',')
    .replace(/^\s*[,;.]+\s*/gm, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 4. Trim dangling trailing connectors / punctuation if truncated at end
  cleaned = cleaned.replace(TRAILING_DANGLING_CONNECTOR_REGEX, '').trim();
  cleaned = cleaned.replace(/[,;:\-]+$/, '').trim();

  return cleaned;
}

/**
 * Validates a prompt string before copy/export against completeness, placeholder hygiene,
 * camera feasibility, and target AI video tool syntax constraints.
 */
export function validatePromptForExport(
  promptText: string,
  options: ValidatePromptOptions = {}
): PromptValidationResult {
  const raw = typeof promptText === 'string' ? promptText : '';
  const trimmed = raw.trim();
  const kind: PromptKind = options.kind || 'general';
  const issues: PromptValidationIssue[] = [];

  if (!trimmed) {
    if (!options.allowEmpty) {
      issues.push({
        code: 'empty_prompt',
        severity: 'error',
        message: 'Prompt is empty and has no content to copy.',
        autoFixable: false,
      });
    }
    return {
      valid: Boolean(options.allowEmpty),
      status: options.allowEmpty ? 'ready' : 'blocked',
      issues,
      errors: issues.filter((i) => i.severity === 'error'),
      warnings: [],
      charCount: 0,
      wordCount: 0,
      sanitizedPreview: '',
    };
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const charCount = trimmed.length;
  const requiresDescriptiveLength =
    kind === 'video_clip' ||
    kind === 'image_keyframe' ||
    kind === 'character' ||
    kind === 'style' ||
    kind === 'thumbnail';

  if (requiresDescriptiveLength && charCount < 8) {
    issues.push({
      code: 'too_short',
      severity: 'error',
      message: 'Prompt is too short to describe a clear scene or subject.',
      autoFixable: false,
    });
  } else if (requiresDescriptiveLength && charCount < 18) {
    issues.push({
      code: 'too_short',
      severity: 'warning',
      message: 'Prompt is very brief; consider adding subject action or framing cues.',
      autoFixable: false,
    });
  }

  // Unresolved placeholders check
  const hasPlaceholder = UNRESOLVED_PLACEHOLDER_PATTERNS.some((pat) => {
    pat.lastIndex = 0;
    return pat.test(trimmed);
  });
  if (hasPlaceholder) {
    issues.push({
      code: 'unresolved_placeholder',
      severity: 'error',
      message: 'Contains unresolved template placeholder text (e.g. [INSERT ...], {topic}, or TBD).',
      autoFixable: true,
    });
  }

  // Dangling / truncated ending check
  if (
    TRAILING_DANGLING_CONNECTOR_REGEX.test(trimmed) ||
    /[,;:]$/.test(trimmed)
  ) {
    issues.push({
      code: 'truncated_ending',
      severity: 'warning',
      message: 'Prompt ends mid-clause or with a trailing connector.',
      autoFixable: true,
    });
  }

  // Tool-specific syntax and length rules
  if (options.toolId) {
    const profile = getAIVideoToolProfile(options.toolId);

    if (!profile.supportsNegativePrompt) {
      const hasInlineNeg = NEGATIVE_FLAG_PATTERNS.some((pat) => {
        pat.lastIndex = 0;
        return pat.test(trimmed);
      });
      if (hasInlineNeg) {
        issues.push({
          code: 'disallowed_syntax',
          severity: 'error',
          message: `${profile.name} does not accept inline negative prompt flags (--no / -neg / Negative prompt:).`,
          autoFixable: true,
        });
      }
    }

    const recommendedMaxChars =
      profile.toolId === 'pika_art' || profile.toolId === 'luma_dream_machine'
        ? 1000
        : profile.toolId === 'heygen'
          ? 3000
          : 1500;

    if (charCount > recommendedMaxChars && kind !== 'script') {
      issues.push({
        code: 'length_limit',
        severity: 'warning',
        message: `Prompt is ${charCount} chars; ${profile.name} performs best under ~${recommendedMaxChars} chars per clip.`,
        autoFixable: false,
      });
    }
  }

  // Camera conflict check for motion & clip prompts
  if (kind === 'video_clip' || kind === 'motion' || kind === 'general') {
    for (const pair of CONFLICTING_CAMERA_PAIRS) {
      if (pair.a.test(trimmed) && pair.b.test(trimmed)) {
        issues.push({
          code: 'conflicting_camera',
          severity: 'warning',
          message: `${pair.desc} detected in the same clip.`,
          autoFixable: false,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const sanitizedPreview = sanitizePromptForExport(trimmed, { toolId: options.toolId });

  return {
    valid: errors.length === 0,
    status: errors.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready',
    issues,
    errors,
    warnings,
    charCount,
    wordCount,
    sanitizedPreview,
  };
}
