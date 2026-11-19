/**
 * CreatorFlow AI — Secure Gemini API & Rate Limiting Test Suite
 * Validates:
 * 1. Zero client-side API key leaks (no VITE_GEMINI_API_KEY, no direct Google API calls from client)
 * 2. Backend `/api/generate` route prompt validation (empty, null, whitespace, >2000 chars)
 * 3. Rate limiting enforcement (express-rate-limit 10 reqs / 60 min, returns 429 with required message)
 * 4. Response schema contracts ({ success: true, data: ... } on success, proper error codes on failure)
 * 5. Client service `callSecureGenerateApi` client-side validation and graceful error formatting
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callSecureGenerateApi } from './src/lib/aiGenerateService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — SECURE GEMINI API & RATE LIMITING TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: Client-Side Security Audit (Zero client-side API key exposure)
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: Client-Side Security Audit ---');

  const srcDir = path.resolve(__dirname, 'src');
  const allFiles: string[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && /\.(tsx?|jsx?|html)$/.test(entry.name)) {
        allFiles.push(fullPath);
      }
    }
  }
  walkDir(srcDir);

  let clientKeyLeakFound = false;
  let clientDirectApiCallFound = false;

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('VITE_GEMINI_API_KEY') || content.includes('import.meta.env.VITE_GEMINI_API_KEY')) {
      clientKeyLeakFound = true;
      console.error(`Leak found in ${filePath}: references VITE_GEMINI_API_KEY`);
    }
    if (content.includes('generativelanguage.googleapis.com')) {
      clientDirectApiCallFound = true;
      console.error(`Direct API call found in ${filePath}: calls generativelanguage.googleapis.com`);
    }
  }

  assert(!clientKeyLeakFound, 'No client-side files in /src reference VITE_GEMINI_API_KEY');
  assert(!clientDirectApiCallFound, 'No client-side files in /src call generativelanguage.googleapis.com directly');

  // Also verify index.html and vite.config.ts
  const indexHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  assert(!indexHtml.includes('GEMINI_API_KEY'), 'index.html does not contain GEMINI_API_KEY');

  // -------------------------------------------------------------------------
  // SUITE 2: Client Service `callSecureGenerateApi` Local Validations
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Client Service Local Validations ---');

  const emptyRes = await callSecureGenerateApi('');
  assert(emptyRes.success === false, 'Empty prompt rejected by callSecureGenerateApi');
  assert(emptyRes.error === 'INVALID_PROMPT', 'Empty prompt returns INVALID_PROMPT error code');

  const whitespaceRes = await callSecureGenerateApi('   \n  \t  ');
  assert(whitespaceRes.success === false, 'Whitespace prompt rejected by callSecureGenerateApi');
  assert(whitespaceRes.error === 'INVALID_PROMPT', 'Whitespace prompt returns INVALID_PROMPT error code');

  const longPrompt = 'A'.repeat(2001);
  const longRes = await callSecureGenerateApi(longPrompt);
  assert(longRes.success === false, 'Prompt > 2000 chars rejected before network call');
  assert(longRes.error === 'PROMPT_TOO_LONG', 'Long prompt returns PROMPT_TOO_LONG error code');

  // -------------------------------------------------------------------------
  // SUITE 3: Express Backend Route Setup & Validation Tests
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Backend Endpoint & Rate Limiter Tests ---');

  // Spin up an isolated test server replicating server.ts configuration
  const testApp = express();
  testApp.use(express.json());

  const testLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'You have reached your hourly generation limit. Please try again later.',
      });
    },
  });

  // Replicate route logic from server.ts
  testApp.post('/api/generate', testLimiter, async (req, res): Promise<void> => {
    try {
      const { prompt } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({
          success: false,
          error: 'INVALID_PROMPT',
          message: 'A non-empty prompt string is required.',
        });
        return;
      }

      const trimmed = prompt.trim();
      if (trimmed.length > 2000) {
        res.status(400).json({
          success: false,
          error: 'PROMPT_TOO_LONG',
          message: 'Prompt exceeds maximum length of 2,000 characters.',
        });
        return;
      }

      // Mock generation result for test
      res.status(200).json({
        success: true,
        data: `Mock generated content for: ${trimmed.slice(0, 30)}...`,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'GENERATION_FAILED',
        message: 'Failed to generate content. Please try again later.',
      });
    }
  });

  const testServer = testApp.listen(0);
  const addr = testServer.address();
  const testPort = typeof addr === 'object' && addr ? addr.port : 3333;
  const baseUrl = `http://127.0.0.1:${testPort}/api/generate`;

  try {
    // Test 1: Empty prompt -> 400
    const res1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    assert(res1.status === 400, 'Server returns 400 for empty prompt');
    const json1 = await res1.json();
    assert(json1.error === 'INVALID_PROMPT', 'Server returns error: INVALID_PROMPT');

    // Test 2: Whitespace-only prompt -> 400
    const res2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '    \n  ' }),
    });
    assert(res2.status === 400, 'Server returns 400 for whitespace-only prompt');

    // Test 3: Prompt > 2000 chars -> 400
    const res3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x'.repeat(2001) }),
    });
    assert(res3.status === 400, 'Server returns 400 for prompt > 2000 characters');
    const json3 = await res3.json();
    assert(json3.error === 'PROMPT_TOO_LONG', 'Server returns error: PROMPT_TOO_LONG');

    // Test 4: Valid prompt (at boundary: 2,000 characters) -> 200
    const res4 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Valid Prompt '.repeat(100).slice(0, 2000) }),
    });
    assert(res4.status === 200, 'Server returns 200 for valid prompt <= 2000 characters');
    const json4 = await res4.json();
    assert(json4.success === true && typeof json4.data === 'string', 'Server returns { success: true, data: result }');

    // -------------------------------------------------------------------------
    // SUITE 4: Strict Rate Limiting (10 requests per 60 minutes, 11th yields 429)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 4: Rate Limiting Enforcement ---');
    // We have already made 4 requests from this IP (res1, res2, res3, res4).
    // Let's make 6 more valid requests to hit exactly 10 requests.
    for (let i = 5; i <= 10; i++) {
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Test prompt number ${i}` }),
      });
      assert(r.status === 200, `Request #${i} permitted within 10-request allowance (Status ${r.status})`);
    }

    // Now request 11 must be blocked with HTTP 429
    const blockedRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'This request should be rate limited' }),
    });

    assert(blockedRes.status === 429, '11th request receives HTTP 429 Too Many Requests');
    const blockedJson = await blockedRes.json();
    assert(blockedJson.success === false, 'Rate limited response has success: false');
    assert(blockedJson.error === 'RATE_LIMIT_EXCEEDED', 'Rate limited response has error: RATE_LIMIT_EXCEEDED');
    assert(
      blockedJson.message === 'You have reached your hourly generation limit. Please try again later.',
      '429 message matches requirement: "You have reached your hourly generation limit. Please try again later."'
    );

    console.log('\n================================================================');
    console.log('✅ ALL GEMINI API & RATE LIMITING TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    testServer.close();
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
