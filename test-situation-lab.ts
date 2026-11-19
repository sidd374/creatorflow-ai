/**
 * CreatorFlow AI — Phase 5 Creator Situation Lab Verification Suite
 */

import {
  diagnoseCreatorSituation,
  createSituationCase,
  updateSituationCaseStatus,
  addSituationCaseNote,
} from './src/lib/situationLabEngine';
import { DEFAULT_CREATOR_PROFILE } from './src/lib/creatorStorage';
import { VideoAnalytics, VideoProject } from './src/types';

function assert(cond: boolean, message: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — PHASE 5 SITUATION LAB VERIFICATION');
  console.log('================================================================');

  const nowIso = new Date().toISOString();

  // 1. Empty or Demo-Only Analytics Honesty Check
  const demoOnlyAnalytics: VideoAnalytics[] = [
    {
      id: 'test-va-demo-1',
      videoTitle: 'Demo Video That Should Be Ignored',
      topic: 'Demo topic',
      format: 'Long-form',
      publishedDate: nowIso,
      views: 50000,
      ctr: 12.4,
      isDemoData: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const sparseDiag = diagnoseCreatorSituation({
    scenarioId: 'low_ctr',
    profile: DEFAULT_CREATOR_PROFILE,
    analyticsList: demoOnlyAnalytics,
    projects: [],
  });

  assert(sparseDiag.realAnalyticsCount === 0, 'Demo analytics entries are excluded from real channel evidence');
  assert(sparseDiag.dataSufficiency === 'none', 'Reports dataSufficiency === none when 0 real records exist');
  assert(
    Boolean(sparseDiag.honestyNotice && sparseDiag.honestyNotice.toLowerCase().includes('insufficient')),
    'Surfaces explicit honesty notice when channel metrics are missing'
  );
  assert(
    sparseDiag.hypotheses.every((h) => h.statement.startsWith('Hypothesis (to test):')),
    'All hypotheses are explicitly labeled as "Hypothesis (to test):"'
  );

  // Zero fabricated CTR/view benchmarks or secret algorithm promises
  const allOutputText = JSON.stringify(sparseDiag).toLowerCase();
  assert(
    !allOutputText.includes('secret algorithm') &&
      !allOutputText.includes('guaranteed') &&
      !allOutputText.includes('50000'),
    'Zero fabricated demo stats or false algorithm claims appear in diagnosis output'
  );

  // 2. Sufficient Real Analytics Evidence Cross-Referencing
  const realAnalytics: VideoAnalytics[] = [
    {
      id: 'va-real-1',
      videoTitle: 'Budget Desk Mic Test',
      topic: 'Desk microphone audio test',
      format: 'Long-form',
      publishedDate: nowIso,
      views: 1200,
      ctr: 6.2,
      averagePercentageViewed: 48,
      isDemoData: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'va-real-2',
      videoTitle: 'Lighting Setup Guide',
      topic: 'Key light placement for creators',
      format: 'Long-form',
      publishedDate: nowIso,
      views: 450,
      ctr: 2.1,
      averagePercentageViewed: 41,
      isDemoData: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const projects: VideoProject[] = [
    {
      id: 'proj-1',
      ideaId: 'idea-1',
      selectedTitle: 'Thumbnail Breakdown Part 2',
      topic: 'Thumbnail design',
      format: 'Long-form',
      targetAudience: 'New YouTube creators',
      primaryGoal: 'Grow views',
      difficulty: 'Easy',
      estimatedMinutes: 30,
      creatorFitScore: 88,
      reasonForFit: ['Matches zero-budget setup'],
      angle: 'Practical breakdown',
      status: 'Writing',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const realDiag = diagnoseCreatorSituation({
    situationText: 'My CTR is low on recent uploads',
    profile: {
      ...DEFAULT_CREATOR_PROFILE,
      niche: 'Budget creator gear',
      preferredLanguage: 'Tamil',
    },
    analyticsList: realAnalytics,
    projects,
  });

  assert(realDiag.realAnalyticsCount === 2, 'Counts 2 real logged analytics records');
  assert(realDiag.dataSufficiency === 'sufficient', 'Marks 2+ real records as sufficient');
  assert(
    realDiag.verifiedEvidence.some((e) => e.fact.includes('Budget Desk Mic Test') && e.fact.includes('6.2%')),
    'Verified evidence cites real logged CTR & video title accurately'
  );
  assert(
    realDiag.verifiedEvidence.some((e) => e.fact.includes('1 total project')),
    'Verified evidence reflects active project count'
  );

  // 3. Longitudinal Case Creation, Status Transition & Notes
  const created = createSituationCase({
    scenarioId: 'low_ctr',
    situationText: 'Testing two-word thumbnail headline',
    profile: DEFAULT_CREATOR_PROFILE,
    analyticsList: realAnalytics,
    projects,
  });
  assert(created.status === 'Diagnosed', 'Initial SituationCase status starts at Diagnosed');

  let caseList = [created];
  caseList = updateSituationCaseStatus(caseList, created.id, 'Testing');
  assert(caseList[0].status === 'Testing', 'Status transitions cleanly from Diagnosed -> Testing');

  caseList = addSituationCaseNote(caseList, created.id, 'Updated thumbnail text to 3 bold words');
  assert(caseList[0].notes.length === 1, 'Experiment note appended cleanly');

  caseList = updateSituationCaseStatus(caseList, created.id, 'Improved');
  assert(caseList[0].status === 'Improved', 'Status transitions cleanly from Testing -> Improved');

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 5 TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
