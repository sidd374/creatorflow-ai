/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Creator Situation Lab Engine
 * Cross-references real (non-demo) channel analytics, CreatorProfile production context,
 * and active projects to produce structured diagnostics.
 *
 * Strict Guardrails:
 * 1. Verified Evidence ONLY states facts directly present in logged records/profile.
 * 2. Hypotheses are explicitly labeled as testable hypotheses (zero algorithm promises).
 * 3. Sample/demo analytics entries are excluded from channel evidence.
 * 4. Missing/sparse analytics trigger an explicit honesty notice.
 */

import { CreatorProfile, VideoAnalytics, VideoProject } from '../types';
import {
  SITUATION_SCENARIOS,
  SituationScenarioDefinition,
  matchScenarioFromText,
} from './situationLibrary';

export type SituationCaseStatus =
  | 'Diagnosed'
  | 'Testing'
  | 'Improved'
  | 'Needs Follow-up';

export interface SituationEvidenceItem {
  source: 'analytics' | 'profile' | 'projects';
  fact: string;
}

export interface SituationHypothesisItem {
  statement: string;
  testToValidate: string;
}

export interface SituationActionStep {
  title: string;
  detail: string;
  targetView: 'analytics' | 'tools' | 'ideas' | 'content-pack' | 'builder' | 'radar';
}

export interface SituationDiagnosis {
  scenarioId: string;
  scenarioTitle: string;
  shortTag: string;
  dataSufficiency: 'sufficient' | 'sparse' | 'none';
  realAnalyticsCount: number;
  honestyNotice?: string;
  verifiedEvidence: SituationEvidenceItem[];
  hypotheses: SituationHypothesisItem[];
  followUpQuestions: string[];
  nextActions: SituationActionStep[];
}

export interface SituationCaseNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface SituationCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  scenarioId: string;
  title: string;
  userContextNotes: string;
  status: SituationCaseStatus;
  diagnosis: SituationDiagnosis;
  notes: SituationCaseNote[];
}

export interface DiagnoseSituationInput {
  scenarioId?: string;
  situationText?: string;
  profile: CreatorProfile;
  analyticsList: VideoAnalytics[];
  projects: VideoProject[];
}

function getRealAnalytics(list: VideoAnalytics[]): VideoAnalytics[] {
  return (list || []).filter(
    (entry) => !entry.isDemoData && !String(entry.id || '').startsWith('test-va-')
  );
}

/**
 * Generates an evidence-backed, hypothesis-driven diagnosis for a creator's situation.
 */
export function diagnoseCreatorSituation(
  input: DiagnoseSituationInput
): SituationDiagnosis {
  const { scenarioId, situationText, profile, analyticsList, projects } = input;

  const scenario: SituationScenarioDefinition =
    (scenarioId ? SITUATION_SCENARIOS.find((s) => s.id === scenarioId) : undefined) ||
    matchScenarioFromText(situationText || '');

  const realAnalytics = getRealAnalytics(analyticsList);
  const realCount = realAnalytics.length;

  let dataSufficiency: 'sufficient' | 'sparse' | 'none' = 'none';
  let honestyNotice: string | undefined;

  if (realCount === 0) {
    dataSufficiency = 'none';
    honestyNotice =
      'Insufficient channel metrics: 0 real uploaded videos logged in Creator Analytics (sample demo entries are excluded). Diagnosis below relies strictly on your Creator Profile, project pipeline, and structural testable hypotheses.';
  } else if (realCount < 2) {
    dataSufficiency = 'sparse';
    honestyNotice =
      `Limited channel metrics: only ${realCount} real video record is logged in Creator Analytics. At least 2–3 logged videos are needed before calling CTR or retention patterns an established channel trend.`;
  } else {
    dataSufficiency = 'sufficient';
  }

  // -------------------------------------------------------------------------
  // 1. VERIFIED EVIDENCE (Strictly factual observations from real data only)
  // -------------------------------------------------------------------------
  const verifiedEvidence: SituationEvidenceItem[] = [];

  if (realCount > 0) {
    const withViews = realAnalytics.filter((a) => typeof a.views === 'number');
    const totalViews = withViews.reduce((acc, a) => acc + (a.views || 0), 0);

    const withCtr = realAnalytics.filter((a) => typeof a.ctr === 'number' && !isNaN(a.ctr));
    const avgCtr =
      withCtr.length > 0
        ? Number((withCtr.reduce((acc, a) => acc + (a.ctr || 0), 0) / withCtr.length).toFixed(1))
        : null;

    const withRet = realAnalytics.filter(
      (a) => typeof a.averagePercentageViewed === 'number' && !isNaN(a.averagePercentageViewed)
    );
    const avgRet =
      withRet.length > 0
        ? Number(
            (
              withRet.reduce((acc, a) => acc + (a.averagePercentageViewed || 0), 0) /
              withRet.length
            ).toFixed(1)
          )
        : null;

    const metricParts: string[] = [`${realCount} real logged video${realCount > 1 ? 's' : ''}`];
    if (withViews.length > 0) metricParts.push(`${totalViews.toLocaleString()} combined logged views`);
    if (avgCtr !== null) metricParts.push(`${avgCtr}% avg logged CTR (across ${withCtr.length} record${withCtr.length > 1 ? 's' : ''})`);
    if (avgRet !== null) metricParts.push(`${avgRet}% avg logged retention (across ${withRet.length} record${withRet.length > 1 ? 's' : ''})`);

    verifiedEvidence.push({
      source: 'analytics',
      fact: `Analytics Log Summary: ${metricParts.join(' · ')}.`,
    });

    if (withCtr.length > 0) {
      const sortedCtr = [...withCtr].sort((a, b) => (b.ctr || 0) - (a.ctr || 0));
      const best = sortedCtr[0];
      const lowest = sortedCtr[sortedCtr.length - 1];
      if (sortedCtr.length >= 2 && best.id !== lowest.id) {
        verifiedEvidence.push({
          source: 'analytics',
          fact: `Logged CTR Spread: "${best.videoTitle}" (${best.ctr}%) vs "${lowest.videoTitle}" (${lowest.ctr}%).`,
        });
      }
    }

    if (withRet.length > 0) {
      const sortedRet = [...withRet].sort(
        (a, b) => (b.averagePercentageViewed || 0) - (a.averagePercentageViewed || 0)
      );
      const topR = sortedRet[0];
      verifiedEvidence.push({
        source: 'analytics',
        fact: `Highest Logged Retention: ${topR.averagePercentageViewed}% on "${topR.videoTitle}".`,
      });
    }
  } else {
    verifiedEvidence.push({
      source: 'analytics',
      fact: 'No real (non-demo) video performance metrics are currently logged in Creator Analytics.',
    });
  }

  // Profile evidence
  const nicheLabel = profile.niche || profile.channelTopic || 'General Creator Niche';
  const prodMethod = profile.creatorStyle || 'Not specified';
  const langLabel = profile.preferredLanguage || 'English';
  const timeWindow = profile.dailyTimeAvailable || 'Not set';
  const budgetWindow = profile.monthlyBudget || 'Not set';

  verifiedEvidence.push({
    source: 'profile',
    fact: `Creator Setup: Focus "${nicheLabel}" · Stage: ${profile.creatorStage} (${profile.experienceLevel}) · Production: ${prodMethod} · Language: ${langLabel}.`,
  });
  verifiedEvidence.push({
    source: 'profile',
    fact: `Capacity Constraints: Daily window "${timeWindow}" · Budget tier "${budgetWindow}".`,
  });

  // Active Projects evidence
  const activeProjects = projects || [];
  const draftProjects = activeProjects.filter((p) => p.status !== 'Published');
  const readyProjects = activeProjects.filter((p) => p.status === 'Ready');

  verifiedEvidence.push({
    source: 'projects',
    fact:
      activeProjects.length === 0
        ? 'Project Pipeline: 0 active projects started in Video Builder.'
        : `Project Pipeline: ${activeProjects.length} total project${activeProjects.length > 1 ? 's' : ''} (${draftProjects.length} in progress, ${readyProjects.length} marked Ready).`,
  });

  // -------------------------------------------------------------------------
  // 2. HYPOTHESES TO TEST (Strictly labeled hypotheses, no unverified claims)
  // -------------------------------------------------------------------------
  const hypotheses: SituationHypothesisItem[] = [...scenario.baseHypotheses];

  if (
    scenario.id === 'inconsistent_uploads' &&
    (timeWindow.includes('30') || timeWindow.includes('1 hr'))
  ) {
    hypotheses.push({
      statement:
        `Hypothesis (to test): At "${timeWindow}" per day, multi-scene long-form edits can exceed your available weekly editing budget.`,
      testToValidate:
        'Test shipping 45–60 second structured Shorts or single-location tutorials for 2 weeks and measure completion consistency.',
    });
  }

  if (
    scenario.id === 'zero_budget_bottleneck' &&
    budgetWindow.includes('0')
  ) {
    hypotheses.push({
      statement:
        'Hypothesis (to test): Focusing exclusively on free-tier tools and natural voiceover avoids paid export limits and subscription interruptions.',
      testToValidate:
        'Build your next upload end-to-end inside Guided Workflow with free-tier presets selected.',
    });
  }

  if (
    (scenario.id === 'low_ctr' || scenario.id === 'multilingual_audience_split') &&
    langLabel !== 'English'
  ) {
    hypotheses.push({
      statement:
        `Hypothesis (to test): Mixing search terms audiences recognize with natural ${langLabel} phrasing could improve feed comprehension.`,
      testToValidate:
        `Generate a ${langLabel} Content Pack and compare native-script vs mixed search-term titles over your next 2 uploads.`,
    });
  }

  // -------------------------------------------------------------------------
  // 3. CLARIFYING QUESTIONS & PRIORITIZED NEXT ACTIONS
  // -------------------------------------------------------------------------
  const followUpQuestions = [...scenario.clarifyingQuestions];
  if (realCount < 2) {
    followUpQuestions.unshift(
      'Can you log your last 2–3 uploaded videos (Views, CTR %, Avg % Viewed) in Creator Analytics so future checks compare against your actual baseline?'
    );
  }

  const nextActions: SituationActionStep[] = scenario.recommendedWorkspaces.map((w) => ({
    title: w.label,
    detail: w.detail,
    targetView: w.targetView,
  }));

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.label,
    shortTag: scenario.shortTag,
    dataSufficiency,
    realAnalyticsCount: realCount,
    honestyNotice,
    verifiedEvidence,
    hypotheses,
    followUpQuestions,
    nextActions,
  };
}

/**
 * Creates a tracked longitudinal SituationCase ready for persistence.
 */
export function createSituationCase(
  input: DiagnoseSituationInput
): SituationCase {
  const diagnosis = diagnoseCreatorSituation(input);
  const now = new Date().toISOString();
  const noteSnippet = (input.situationText || '').trim();
  const title =
    noteSnippet.length > 0
      ? `${diagnosis.shortTag}: ${noteSnippet.slice(0, 64)}${noteSnippet.length > 64 ? '…' : ''}`
      : diagnosis.scenarioTitle;

  return {
    id: `sit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    scenarioId: diagnosis.scenarioId,
    title,
    userContextNotes: noteSnippet,
    status: 'Diagnosed',
    diagnosis,
    notes: [],
  };
}

export function updateSituationCaseStatus(
  cases: SituationCase[],
  caseId: string,
  status: SituationCaseStatus
): SituationCase[] {
  const now = new Date().toISOString();
  return cases.map((c) => (c.id === caseId ? { ...c, status, updatedAt: now } : c));
}

export function addSituationCaseNote(
  cases: SituationCase[],
  caseId: string,
  noteText: string
): SituationCase[] {
  const clean = noteText.trim();
  if (!clean) return cases;
  const now = new Date().toISOString();
  return cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      updatedAt: now,
      notes: [
        {
          id: `note_${Date.now()}`,
          text: clean,
          createdAt: now,
        },
        ...c.notes,
      ],
    };
  });
}
