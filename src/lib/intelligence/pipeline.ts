/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central CreatorFlow Intelligence Pipeline (10-Step Orchestrator).
 * Follows the constitutional pipeline:
 *   GEMINI GENERATES. CREATORFLOW ALGORITHMS PERSONALIZE. CREATORFLOW VALIDATES.
 *
 * Enforces BYOK key usage, compact minimal task context, Google Search research grounding,
 * deterministic validation, bounded repair loop (max 2 targeted correction calls),
 * per-user cache, and per-user AI usage metrics.
 */

import { ThinkingLevel } from '@google/genai';
import type { ServerStateStore } from '../serverStateStore.ts';
import { decryptByokKey } from './byokCrypto.ts';
import {
  GeminiProviderError,
  generateStructuredJsonWithByok,
  generateTextWithByok,
} from './geminiProvider.ts';
import { isGemini4Model, resolveTaskModel } from './models.ts';
import {
  buildCreatorContextProfile,
  buildPersonalizationSummary,
  selectMinimalContextForTask,
} from './personalizationEngine.ts';
import { evaluateIntelligenceOutput } from './qualityValidator.ts';
import {
  buildUserResponseCacheKey,
  getCachedIntelligenceResponse,
  setCachedIntelligenceResponse,
} from './responseCache.ts';
import type {
  CreatorContextProfile,
  GeminiModelId,
  IntelligenceExecutionInput,
  IntelligenceExecutionRequest,
  IntelligenceExecutionResponse,
  IntelligenceTaskType,
  WebResearchBrief,
} from './types.ts';
import { runWebResearch } from './webResearchEngine.ts';

const MAX_REPAIR_ATTEMPTS = 2; // Bounded repair loop: initial call + max 2 targeted repairs

function shouldRunWebResearch(
  task: IntelligenceTaskType,
  enableWebResearch?: boolean
): boolean {
  if (enableWebResearch === false) return false;
  if (enableWebResearch === true) return true;
  return (
    task === 'content_radar' ||
    task === 'next_video' ||
    task === 'topic_analysis' ||
    task === 'idea_generation'
  );
}

function buildResearchQuery(
  task: IntelligenceTaskType,
  input: IntelligenceExecutionInput,
  ctx: CreatorContextProfile
): string {
  const topic = String(input.topic || input.selectedTitle || input.prompt || '').trim();
  if (task === 'content_radar' || task === 'next_video') {
    return `${ctx.niche} YouTube video topics trends ${ctx.preferredLanguage}`.trim();
  }
  if (topic) {
    return `${topic} ${ctx.niche !== 'General Educational & Creator Growth' ? ctx.niche : ''} ${ctx.preferredLanguage}`.trim();
  }
  return `${ctx.niche} ${ctx.preferredLanguage}`.trim();
}

function buildTaskPromptAndSchema(params: {
  task: IntelligenceTaskType;
  input: IntelligenceExecutionInput;
  ctx: CreatorContextProfile;
  minimalContext: Record<string, unknown>;
  researchBrief: WebResearchBrief | null;
}): { systemInstruction: string; prompt: string; isConversational?: boolean } {
  const { task, input, ctx, minimalContext, researchBrief } = params;
  const language = String(input.language || ctx.preferredLanguage || 'English');
  const platform = input.platform || ctx.preferredPlatform || 'YouTube';
  const tone = input.tone || 'Educational';
  const topic = String(input.topic || input.selectedTitle || input.prompt || ctx.niche).trim();

  const researchSection = researchBrief
    ? `\nVERIFIED WEB RESEARCH BRIEF (Retrieved ${researchBrief.retrievedAt}):
Summary: ${researchBrief.summary}
Verified Facts:
${researchBrief.verifiedFacts.map((f) => `- ${f}`).join('\n') || '- Use general domain knowledge faithfully without inventing statistics.'}
Grounded URLs available: ${researchBrief.sources.map((s) => `${s.title} (${s.url})`).join(' | ') || 'None'}`
    : '';

  const strictRules = `CONSTITUTIONAL PRODUCTION RULES:
1. Preserve the creator's exact subject matter ("${topic}"). NEVER turn a non-filmmaking topic (e.g. history, mysteries, science, coding) into a tutorial on how to film/edit a YouTube video.
2. Language: Write viewer-facing titles, hooks, scripts, descriptions, and tags naturally in ${language}.
3. Production Method: Creator uses "${ctx.primaryProductionMethod}" (${ctx.onCamera ? 'ON-CAMERA' : 'FACELESS / OFF-CAMERA'}).${
    !ctx.onCamera ? ' NEVER instruct them to look at a camera or film themselves talking.' : ''
  }
4. Budget & Device Realism: Budget="${ctx.monthlyBudget}" (${ctx.isZeroBudget ? 'STRICTLY ₹0 FREE TOOLS ONLY — never require Premiere Pro, After Effects, Final Cut Pro, Midjourney, or paid tools' : 'match budget'}), Devices=${JSON.stringify(ctx.availableDevices)}${
    ctx.isPhoneOnly ? ' (PHONE-ONLY — recommend mobile apps like CapCut Mobile/Canva Mobile, NOT desktop software)' : ''
  }.
5. Never invent fake view counts, subscriber numbers, CTR percentages, URLs, or guarantees.`;

  const systemInstruction = `You are CreatorFlow Intelligence Engine: an expert YouTube creative director and strategist operating strictly inside the user's real production constraints. Return valid JSON ONLY with no markdown fences unless conversational mode is requested.\n\n${strictRules}`;

  if (task === 'topic_analysis') {
    const prompt = `Analyze this video topic for the creator context below.
Topic: "${topic}"
Requested Format/Duration Hint: "${input.format || input.durationLabel || 'Auto-select best fit'}"
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON with keys:
{
  "analyzedTopic": "string",
  "bestFormat": "Long-form" | "Short" | "Hybrid",
  "whyFormatFits": "string explaining why based on topic & creator constraints",
  "recommendedAudience": "string",
  "suggestedAngle": "string",
  "productionDifficulty": "Easy" | "Medium" | "Advanced",
  "estimatedProductionTime": "string (e.g. 2-3 hours)",
  "budgetFit": "string confirming ₹0 / tool alignment",
  "topicSummary": "string (2 sentences directly about the subject)",
  "recommendedIdeas": [
    {
      "id": "string",
      "title": "string",
      "format": "Long-form" | "Short" | "Hybrid",
      "goal": "string",
      "difficulty": "Easy" | "Medium" | "Advanced",
      "estimatedTime": "string",
      "topicRelevance": number (60-100),
      "whyThisIdea": ["string", "string"],
      "budgetFit": "string",
      "status": "Idea",
      "suggestedAngle": "string",
      "targetAudience": "string",
      "presentationFormat": "string"
    }
  ] (provide 3 distinct ideas focused on "${topic}")
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'idea_generation') {
    const prompt = `Generate 4 high-fit video ideas on topic/theme "${topic}" tailored specifically to this creator.
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON:
{
  "ideas": [
    {
      "id": "string",
      "title": "string",
      "format": "Long-form" | "Short" | "Hybrid",
      "goal": "string",
      "difficulty": "Easy" | "Medium" | "Advanced",
      "estimatedTime": "string",
      "topicRelevance": number (60-100),
      "whyThisIdea": ["string", "string"],
      "budgetFit": "string",
      "status": "Idea",
      "suggestedAngle": "string",
      "targetAudience": "string",
      "presentationFormat": "string"
    }
  ]
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'content_radar') {
    const prompt = `Generate 4 fresh Daily Content Radar opportunities grounded in the creator's niche, constraints, and verified web research below.
Focus / Seed: "${topic}"
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON:
{
  "opportunities": [
    {
      "id": "string",
      "title": "string",
      "topic": "string",
      "angle": "string",
      "format": "Long-form" | "Short" | "Hybrid",
      "suggestedDuration": number (in seconds),
      "suggestedDurationDisplay": "string (e.g. 10-12 min or 45s)",
      "opportunityScore": number (60-98),
      "difficulty": "Easy" | "Medium" | "Advanced",
      "whyNow": "string citing real trend or evergreen demand honestly (no invented view stats)",
      "whyThisFitsYou": "string matching device/budget/method",
      "hook": "string (first 1-2 spoken lines)",
      "suggestedProductionMethod": "string",
      "language": "${language}",
      "tags": ["string", "string", "string"],
      "sourceType": "creator_profile" | "content_gap" | "performance"
    }
  ]
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'next_video') {
    const prompt = `Recommend the single highest-leverage NEXT VIDEO this creator should make based on their niche, unfinished projects, real analytics (only if present), and research brief.
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON:
{
  "id": "string",
  "recommendedVideo": "string (compelling video title)",
  "whyNext": "string (honest strategic rationale grounded in real context)",
  "basedOn": "string",
  "basedOnType": "performance" | "creator_goal" | "unfinished_project" | "content_gap",
  "suggestedFormat": "Long-form" | "Short",
  "suggestedDuration": "string",
  "suggestedHook": "string",
  "productionMethod": "string",
  "confidence": "High" | "Medium",
  "isPerformanceBased": boolean,
  "difficulty": "Easy" | "Medium" | "Advanced",
  "tags": ["string", "string"]
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'script_generation') {
    const durMin = input.durationMinutes || (platform === 'Shorts' ? 1 : 10);
    const durLabel =
      input.durationLabel || (platform === 'Shorts' ? '45-60 seconds' : `${durMin}-${durMin + 3} minutes`);
    const prompt = `Write a complete, production-ready script for:
Title/Topic: "${topic}"
Angle: "${input.angle || 'Compelling deep dive'}"
Format: "${input.format || platform}"
Target Duration: "${durLabel}" (durationMinutes hint: ${durMin})
Language: "${language}"
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

IMPORTANT:
- Write actual spoken narration/dialogue directly on "${topic}" — do NOT write instructions about filming a video.
- Include realistic visualCue & deliveryTip matching ${ctx.onCamera ? 'on-camera' : 'faceless'} workflow & ${ctx.availableDevices.join('/')} devices.
- For long-form (${durMin}+ min), write at least 5 detailed script sections totaling >= 220 words of substantive sample/core script with clear timeRanges spanning the runtime.

Return strictly valid JSON:
{
  "durationMinutes": number,
  "format": "string",
  "recommendedTools": ["string"],
  "scriptSections": [
    {
      "id": "string",
      "label": "string (e.g. HOOK, CONTEXT, CHAPTER 1, TWIST, PAYOFF, OUTRO)",
      "timeRange": "string (e.g. 0:00–0:45)",
      "text": "string (rich spoken script)",
      "visualCue": "string",
      "deliveryTip": "string"
    }
  ],
  "productionNotes": ["string"]
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'title_seo') {
    const prompt = `Generate high-CTR YouTube titles, SEO keywords, description, and hashtags for:
Topic: "${topic}"
Platform: "${platform}" | Tone: "${tone}" | Language: "${language}"
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON:
{
  "finalTitle": "string",
  "alternativeTitles": ["string", "string", "string"],
  "titles": [
    { "text": "string", "style": "Curiosity" | "Mystery" | "How-To" | "Story", "predictedCtr": "string", "explanations": ["string"] }
  ],
  "description": {
    "hookLine": "string",
    "summary": "string",
    "valuePoints": ["string", "string"],
    "timestamps": [{ "time": "0:00", "label": "string" }],
    "callToAction": "string"
  },
  "primaryKeywords": ["string"],
  "relatedKeywords": ["string"],
  "hashtags": ["#string"]
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'thumbnail_intelligence') {
    const prompt = `Design an attention-commanding, clickable YouTube thumbnail strategy for:
Title/Topic: "${topic}"
Language: "${language}"
Creator Context: ${JSON.stringify(minimalContext)}

Return strictly valid JSON:
{
  "recommendedThumbnailText": "string (2-4 bold words)",
  "thumbnailTextOptions": [
    { "id": "opt_1", "text": "string", "reason": "string", "isRecommended": true },
    { "id": "opt_2", "text": "string", "reason": "string", "isRecommended": false }
  ],
  "thumbnailBrief": {
    "mainVisual": "string",
    "subject": "string",
    "emotion": "string",
    "background": "string",
    "composition": "string",
    "contrast": "string",
    "visualHierarchy": "string",
    "textPlacement": "string",
    "lighting": "string",
    "style": "string",
    "colorDirection": "string"
  },
  "thumbnailPrompt": "string (clean visual generation prompt without paid software requirements)"
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'analytics_intelligence') {
    const prompt = `Analyze ONLY the creator's REAL recorded analytics context below and provide actionable next-video diagnosis.
Creator Context & Real Analytics Summary: ${JSON.stringify(minimalContext)}
Raw Analytics Sample (if any): ${JSON.stringify((input.contextSnapshot as any)?.videos || [])}

STRICT HONESTY RULE:
- If realCount == 0 or analyticsSummary is null, state honestly that no real video metrics are recorded yet, NEVER invent view counts/CTR percentages/retention numbers, and give clear guidance on what metrics to track for their next 3 videos.

Return strictly valid JSON:
{
  "hasReliableData": boolean,
  "diagnosisSummary": "string",
  "strengths": ["string"],
  "bottlenecks": ["string"],
  "recommendations": [
    { "title": "string", "action": "string", "expectedImpact": "string" }
  ],
  "nextExperiment": "string"
}`;
    return { systemInstruction, prompt };
  }

  if (task === 'creator_assistant') {
    const conversation = Array.isArray(input.messages)
      ? input.messages.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      : String(input.prompt || topic);
    return {
      systemInstruction: `${systemInstruction}\nWhen replying as CreatorFlow Assistant, return a helpful, concise, practical plain-text/markdown response (NOT JSON). Cite creator's real devices/budget/workflow context directly.`,
      prompt: `CREATOR CONTEXT: ${JSON.stringify(minimalContext)}\nEXTRA SNAPSHOT: ${JSON.stringify(input.contextSnapshot || {})}${researchSection}\n\nCONVERSATION:\n${conversation}`,
      isConversational: true,
    };
  }

  // Default: content_pack / guided_workflow_pack
  const durHint = input.durationLabel || (platform === 'Shorts' ? '45s' : `${input.durationMinutes || 10} min`);
  const prompt = `Generate a complete CreatorFlow Content Pack for:
Topic: "${topic}"
Platform: "${platform}" | Language: "${language}" | Tone: "${tone}" | Target Duration: "${durHint}"
Creator Context: ${JSON.stringify(minimalContext)}${researchSection}

Return strictly valid JSON:
{
  "topic": "${topic}",
  "platform": "${platform}",
  "language": "${language}",
  "tone": "${tone}",
  "durationLabel": "${durHint}",
  "titles": [
    { "text": "string", "style": "string", "charCount": number, "score": number, "predictedCtr": "string", "explanations": ["string"] },
    { "text": "string", "style": "string", "charCount": number, "score": number, "predictedCtr": "string", "explanations": ["string"] },
    { "text": "string", "style": "string", "charCount": number, "score": number, "predictedCtr": "string", "explanations": ["string"] }
  ],
  "hooks": [
    { "hook": "string", "type": "Curiosity Gap", "deliveryTip": "string", "retentionReason": "string" },
    { "hook": "string", "type": "Story Tease", "deliveryTip": "string", "retentionReason": "string" }
  ],
  "description": {
    "hookLine": "string",
    "summary": "string",
    "valuePoints": ["string", "string", "string"],
    "timestamps": [{ "time": "0:00", "label": "Hook & Mystery Setup" }, { "time": "2:00", "label": "Key Evidence" }],
    "linksPlaceholder": "[Add your relevant links here]",
    "callToAction": "string"
  },
  "keywords": ["string", "string", "string", "string", "string"],
  "hashtags": ["#string", "#string", "#string"],
  "shortsScript": {
    "title": "string",
    "duration": "45s",
    "hook": "string",
    "body": [
      { "second": "0-15s", "visual": "string", "audio": "string" },
      { "second": "15-35s", "visual": "string", "audio": "string" },
      { "second": "35-45s", "visual": "string", "audio": "string" }
    ],
    "cta": "string"
  },
  "pinnedComment": {
    "comment": "string",
    "engagementQuestion": "string",
    "boostTip": "string"
  },
  "thumbnailConcept": {
    "composition": "string",
    "focalPoint": "string",
    "facialExpression": "${ctx.onCamera ? 'Curious / Intense' : 'N/A (Visual Subject Focus)'}",
    "overlayText": "string (2-4 words)",
    "overlayOptions": ["string", "string"],
    "background": "string",
    "visualContrast": "string",
    "textPlacement": "string",
    "colorPalette": ["#1A1A1A", "#D4A017", "#F8F7F4"],
    "psychologicalTrigger": "Curiosity"
  },
  "videoIdeas": [
    { "title": "string", "angle": "string", "description": "string", "difficulty": "Easy", "formatRecommendation": "${platform}", "targetAudience": "${ctx.targetAudience}" }
  ],
  "recommendedTools": ["string"]
}`;
  return { systemInstruction, prompt };
}

export async function runIntelligencePipeline(params: {
  request: IntelligenceExecutionRequest;
  store: ServerStateStore;
}): Promise<IntelligenceExecutionResponse> {
  const { request, store } = params;
  const startMs = Date.now();
  const { uid, task, input } = request;

  // Step 1 & 2: Retrieve strictly user-scoped BYOK credential and build compact CreatorContextProfile
  const byokRecord = await store.getByokCredential(uid);
  if (!byokRecord) {
    throw new GeminiProviderError(
      'MISSING_API_KEY',
      'Connect your personal Gemini API key in Settings -> Gemini API to run AI generation.',
      428,
      false
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptByokKey(byokRecord, uid);
  } catch {
    throw new GeminiProviderError(
      'INVALID_API_KEY',
      'Stored Gemini API key could not be decrypted. Please re-save your API key in Settings -> Gemini API.',
      401,
      false
    );
  }

  const model: GeminiModelId = resolveTaskModel(
    request.preferredModel || byokRecord.selectedModel,
    task
  );

  const contextProfile = buildCreatorContextProfile({
    uid,
    creatorProfile: request.creatorProfile,
    recentProjects: request.recentProjects,
    recentIdeas: request.recentIdeas,
    recentPacks: request.recentPacks,
    analyticsList: request.analyticsList,
  });

  const minimalContext = selectMinimalContextForTask(task, contextProfile);

  // Step 3: Per-UID cache check (never cross-user)
  const cacheKey = buildUserResponseCacheKey({
    uid,
    task,
    model,
    inputFingerprint: input,
    contextFingerprint: minimalContext,
  });

  if (!request.bypassCache) {
    const cached = getCachedIntelligenceResponse(uid, cacheKey);
    if (cached) {
      await store.recordAiUsageMetrics(uid, {
        success: true,
        cacheHit: true,
        repairs: 0,
        inputTokens: 0,
        outputTokens: 0,
        model,
        task,
      });
      return {
        ...cached,
        cacheHit: true,
      };
    }
  }

  // Step 4: Optional Real Web Research via Google Search grounding
  let researchBrief: WebResearchBrief | null = null;
  if (shouldRunWebResearch(task, request.enableWebResearch)) {
    const query = buildResearchQuery(task, input, contextProfile);
    try {
      researchBrief = await runWebResearch({
        apiKey,
        model,
        query,
        niche: contextProfile.niche,
        language: String(input.language || contextProfile.preferredLanguage),
        bypassCache: request.bypassCache,
      });
    } catch (researchErr: any) {
      // Surface fatal auth / quota errors immediately; tolerate only non-fatal search hiccups
      if (
        researchErr instanceof GeminiProviderError &&
        (researchErr.code === 'INVALID_API_KEY' ||
          researchErr.code === 'QUOTA_EXCEEDED' ||
          researchErr.code === 'INVALID_MODEL')
      ) {
        await store.updateByokKeyStatus(uid, {
          status:
            researchErr.code === 'INVALID_API_KEY'
              ? 'invalid'
              : researchErr.code === 'QUOTA_EXCEEDED'
              ? 'quota_exceeded'
              : 'error',
          lastError: researchErr.message,
          lastDiagnostic: researchErr.diagnostic || null,
        });
        await store.recordAiUsageMetrics(uid, {
          success: false,
          cacheHit: false,
          repairs: 0,
          inputTokens: 0,
          outputTokens: 0,
          model,
          task,
        });
        throw researchErr;
      }
      researchBrief = null;
    }
  }

  // Step 5 & 6: Build structured prompt and call user's BYOK Gemini
  const { systemInstruction, prompt, isConversational } = buildTaskPromptAndSchema({
    task,
    input,
    ctx: contextProfile,
    minimalContext,
    researchBrief,
  });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let repairCount = 0;
  let currentOutput: any;
  let lastDiagnostic: import('./types.ts').GeminiDiagnosticInfo | undefined;

  const taskThinkingLevel = isGemini4Model(model) ? ThinkingLevel.MEDIUM : undefined;

  try {
    if (isConversational) {
      const textRes = await generateTextWithByok({
        apiKey,
        model,
        contents: prompt,
        systemInstruction,
        thinkingLevel: taskThinkingLevel,
        connectTimeoutMs: 7000,
        timeoutMs: 24000,
        maxTransientRetries: 1,
      });
      totalInputTokens += textRes.inputTokens;
      totalOutputTokens += textRes.outputTokens;
      lastDiagnostic = textRes.diagnostic;
      currentOutput = textRes.text;
    } else {
      const jsonRes = await generateStructuredJsonWithByok({
        apiKey,
        model,
        prompt,
        systemInstruction,
        thinkingLevel: taskThinkingLevel,
        connectTimeoutMs: 7000,
        timeoutMs: 26000,
        maxTransientRetries: 1,
      });
      totalInputTokens += jsonRes.inputTokens;
      totalOutputTokens += jsonRes.outputTokens;
      lastDiagnostic = jsonRes.diagnostic;
      currentOutput = jsonRes.data;
    }

    // Step 7 & 8: Deterministic Validator + Bounded Targeted Repair Loop (max 2 attempts, bounded to stay < 50s total)
    let qualityReport = evaluateIntelligenceOutput({
      task,
      input,
      contextProfile,
      output: currentOutput,
      researchBrief,
      attempts: 1,
    });

    while (!qualityReport.passed && repairCount < MAX_REPAIR_ATTEMPTS && Date.now() - startMs < 36000) {
      repairCount++;
      const repairPrompt = `Your previous output failed CreatorFlow quality validation checks and MUST be corrected cleanly.

VALIDATION FAILURES TO FIX:
${qualityReport.repairInstructions.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ORIGINAL REQUEST CONSTRAINTS:
${prompt}

PREVIOUS OUTPUT TO FIX:
${typeof currentOutput === 'string' ? currentOutput : JSON.stringify(currentOutput)}

Return ONLY the corrected ${isConversational ? 'response' : 'valid JSON matching the exact requested schema'}.`;

      if (isConversational) {
        const repairedText = await generateTextWithByok({
          apiKey,
          model,
          contents: repairPrompt,
          systemInstruction,
          thinkingLevel: isGemini4Model(model) ? ThinkingLevel.LOW : undefined,
          connectTimeoutMs: 6000,
          timeoutMs: 14000,
          maxTransientRetries: 0,
        });
        totalInputTokens += repairedText.inputTokens;
        totalOutputTokens += repairedText.outputTokens;
        lastDiagnostic = repairedText.diagnostic || lastDiagnostic;
        currentOutput = repairedText.text;
      } else {
        const repairedJson = await generateStructuredJsonWithByok({
          apiKey,
          model,
          prompt: repairPrompt,
          systemInstruction,
          thinkingLevel: isGemini4Model(model) ? ThinkingLevel.LOW : undefined,
          connectTimeoutMs: 6000,
          timeoutMs: 16000,
          maxTransientRetries: 0,
        });
        totalInputTokens += repairedJson.inputTokens;
        totalOutputTokens += repairedJson.outputTokens;
        lastDiagnostic = repairedJson.diagnostic || lastDiagnostic;
        currentOutput = repairedJson.data;
      }

      qualityReport = evaluateIntelligenceOutput({
        task,
        input,
        contextProfile,
        output: currentOutput,
        researchBrief,
        attempts: 1 + repairCount,
      });
    }

    // Step 9 & 10: Persist BYOK status healthy + record per-UID AI usage metrics + cache validated output
    await store.updateByokKeyStatus(uid, {
      status: 'connected',
      lastError: null,
      lastTestedAt: new Date().toISOString(),
      lastDiagnostic: lastDiagnostic || null,
    });
    await store.recordAiUsageMetrics(uid, {
      success: true,
      cacheHit: false,
      repairs: repairCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model,
      task,
    });

    const responsePayload: IntelligenceExecutionResponse = {
      success: true,
      task,
      model,
      data: currentOutput,
      qualityReport,
      researchBrief,
      personalizationSummary: buildPersonalizationSummary(contextProfile),
      cacheHit: false,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs: Date.now() - startMs,
      },
      ...(lastDiagnostic ? { diagnostic: lastDiagnostic } : {}),
    };

    setCachedIntelligenceResponse(uid, cacheKey, responsePayload);
    return responsePayload;
  } catch (err: any) {
    if (err instanceof GeminiProviderError) {
      const nextStatus =
        err.code === 'INVALID_API_KEY'
          ? 'invalid'
          : err.code === 'QUOTA_EXCEEDED'
          ? 'quota_exceeded'
          : err.code === 'RATE_LIMIT_EXCEEDED'
          ? 'rate_limited'
          : 'error';
      await store.updateByokKeyStatus(uid, {
        status: nextStatus,
        lastError: err.message,
        lastDiagnostic: err.diagnostic || null,
      });
    }
    await store.recordAiUsageMetrics(uid, {
      success: false,
      cacheHit: false,
      repairs: repairCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model,
      task,
    });
    throw err;
  }
}
