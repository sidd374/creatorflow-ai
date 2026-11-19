process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.DISABLE_HMR = 'true';

import http from 'http';
import {
  processPlanRequest,
  getDemandAnalytics,
  isValidEmail,
  generateMailtoFallback,
  PlanRequestPayload,
} from './src/lib/planRequestService.ts';

async function runEarlyAccessTests() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — PRE-LAUNCH PAID PLAN REQUEST SUITE');
  console.log('================================================================\n');

  // --- SUITE 1: Validation & Security Rules ---
  console.log('--- SUITE 1: Form Validation & Spam Rules ---');
  if (isValidEmail('valid@creator.com') !== true) throw new Error('Valid email rejected');
  if (isValidEmail('invalid-email') !== false) throw new Error('Invalid email accepted');
  if (isValidEmail('') !== false) throw new Error('Empty email accepted');
  console.log('✅ PASS: Email validation correctly enforces standard RFC syntax');

  // Rejects missing name
  const resNoName = await processPlanRequest({
    name: '',
    email: 'test@example.com',
    creatorPlatform: 'YouTube',
    selectedPlan: 'Creator',
    displayedPrice: '₹499/month',
    consent: true,
  });
  if (resNoName.error !== 'INVALID_NAME') throw new Error('Failed to reject empty name');
  console.log('✅ PASS: Correctly rejects empty/invalid customer name');

  // Rejects invalid email
  const resBadEmail = await processPlanRequest({
    name: 'Siddharth Creator',
    email: 'bad-email-format',
    creatorPlatform: 'YouTube',
    selectedPlan: 'Creator',
    displayedPrice: '₹499/month',
    consent: true,
  });
  if (resBadEmail.error !== 'INVALID_EMAIL') throw new Error('Failed to reject bad email');
  console.log('✅ PASS: Correctly rejects invalid email syntax');

  // Rejects missing consent
  const resNoConsent = await processPlanRequest({
    name: 'Siddharth Creator',
    email: 'creator@example.com',
    creatorPlatform: 'YouTube',
    selectedPlan: 'Creator',
    displayedPrice: '₹499/month',
    consent: false,
  });
  if (resNoConsent.error !== 'CONSENT_REQUIRED') throw new Error('Failed to reject unconfirmed consent');
  console.log('✅ PASS: Correctly enforces explicit contact consent agreement');

  // Rejects honeypot spam
  const resSpam = await processPlanRequest({
    name: 'Bot Spammer',
    email: 'bot@spam.com',
    creatorPlatform: 'YouTube',
    selectedPlan: 'Creator',
    displayedPrice: '₹499/month',
    consent: true,
    honeypot: 'http://spam-link.ru',
  });
  if (resSpam.error !== 'SPAM_DETECTED') throw new Error('Failed to catch honeypot bot submission');
  console.log('✅ PASS: Honeypot spam trap caught and rejected non-human submission');

  // --- SUITE 2: Truthful Delivery & Fallback Reporting ---
  console.log('\n--- SUITE 2: Truthful Delivery & Mailto Fallback ---');
  // In environment without SMTP secrets configured, processPlanRequest must NOT lie
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  const validReq: PlanRequestPayload = {
    name: 'Arunachalam Jothi',
    email: 'arunachalamjothi11@gmail.com',
    creatorPlatform: 'YouTube',
    selectedPlan: 'Creator',
    displayedPrice: '₹499/month',
    channelUrl: 'https://youtube.com/@creatorflow',
    audienceSize: '1,000–10,000',
    monthlyPostsCount: '4–8 videos/posts',
    preferredBilling: 'Annual',
    mostWantedFeature: 'Daily Content Radar and multi-scene Runway video prompts',
    additionalFeedback: 'Excited for live release, need high-retention Tamil and English hooks',
    consent: true,
  };

  const resUnconfigured = await processPlanRequest(validReq);
  if (resUnconfigured.delivered !== false) {
    throw new Error('Claimed delivered: true when SMTP is unconfigured!');
  }
  if (!resUnconfigured.mailtoFallback) {
    throw new Error('Missing mailtoFallback when SMTP is unconfigured');
  }
  console.log('✅ PASS: Truthful reporting: delivered is strictly false when SMTP is not configured');
  console.log('✅ PASS: Fallback email details provided for visitor mail app');

  // Verify recipient & formatting of mailto fallback
  const fallback = resUnconfigured.mailtoFallback;
  if (fallback.to !== 'support@creatorflowai.ai.studio') {
    throw new Error(`Fallback recipient must be support@creatorflowai.ai.studio, got ${fallback.to}`);
  }
  console.log('✅ PASS: Fallback destination strictly set to support@creatorflowai.ai.studio');

  if (!fallback.subject.includes('New Early Access Request — Creator')) {
    throw new Error(`Subject missing required structure: ${fallback.subject}`);
  }
  console.log('✅ PASS: Subject matches required pattern ("[CreatorFlow AI] New Early Access Request — [Selected Plan]")');

  if (
    !fallback.body.includes('Arunachalam Jothi') ||
    !fallback.body.includes('arunachalamjothi11@gmail.com') ||
    !fallback.body.includes('Creator (₹499/month)') ||
    !fallback.body.includes('1,000–10,000') ||
    !fallback.body.includes('Annual') ||
    !fallback.body.includes('Daily Content Radar')
  ) {
    throw new Error('Fallback body missing required customer response fields');
  }
  console.log('✅ PASS: Fallback body contains all structured customer needs and usage context');

  // --- SUITE 3: Demand Analytics Aggregation ---
  console.log('\n--- SUITE 3: Demand Analytics (Zero-PII) ---');
  const analytics = getDemandAnalytics();
  if (analytics.totalRequests <= 0) {
    throw new Error('Demand analytics did not increment totalRequests');
  }
  if (!analytics.byPlan['Creator'] || analytics.byPlan['Creator'] <= 0) {
    throw new Error('Demand analytics missing Creator plan count');
  }
  if (!analytics.byPlatform['YouTube']) {
    throw new Error('Demand analytics missing YouTube platform count');
  }
  if (!analytics.byBillingPreference['Annual']) {
    throw new Error('Demand analytics missing Annual billing preference count');
  }
  // Verify no personal email keys leaked in demand analytics
  const serialized = JSON.stringify(analytics);
  if (serialized.includes('arunachalamjothi11@gmail.com') || serialized.includes('Arunachalam')) {
    throw new Error('PII detected inside demand analytics state!');
  }
  console.log('✅ PASS: Demand analytics tracks aggregate demand by plan, platform, audience, and billing');
  console.log('✅ PASS: Zero PII or email addresses exposed in demand analytics');

  // --- SUITE 4: Server Endpoint HTTP Verification ---
  console.log('\n--- SUITE 4: Server HTTP Endpoint Integration ---');
  const { app } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Test POST /api/plan-requests
    const postRes = await fetch(`${baseUrl}/api/plan-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validReq),
    });

    if (postRes.status !== 200) {
      throw new Error(`Expected HTTP 200 from /api/plan-requests, got ${postRes.status}`);
    }
    const postData = await postRes.json();
    if (!postData.success) {
      throw new Error('API returned success: false for valid request');
    }
    if (postData.delivered !== false) {
      throw new Error('API falsely reported delivered: true without SMTP credentials');
    }
    if (!postData.mailtoFallback || postData.mailtoFallback.to !== 'support@creatorflowai.ai.studio') {
      throw new Error('API response missing valid mailtoFallback');
    }
    console.log('✅ PASS: POST /api/plan-requests returns HTTP 200 with truthful delivered status & fallback');

    // 2. Test GET /api/plan-requests/stats (now strictly owner-authenticated)
    const statsRes = await fetch(`${baseUrl}/api/plan-requests/stats`);
    if (statsRes.status !== 401) {
      throw new Error(`Expected HTTP 401 from unauthenticated /api/plan-requests/stats, got ${statsRes.status}`);
    }
    console.log('✅ PASS: GET /api/plan-requests/stats rejects unauthenticated callers with HTTP 401');
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log('🎉 ALL PRE-LAUNCH PAID PLAN REQUEST TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runEarlyAccessTests().catch((err) => {
  console.error('❌ Early access test suite failed:', err);
  process.exit(1);
});
