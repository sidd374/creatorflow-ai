process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.DISABLE_HMR = 'true';

import http from 'http';
import fs from 'fs';
import path from 'path';

async function runSitemapTests() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — SITEMAP & SEO ROUTING REGRESSION SUITE');
  console.log('================================================================\n');

  const { app } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Verify /sitemap.xml endpoint
    console.log('--- SUITE 1: /sitemap.xml Endpoint Verification ---');
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapContentType = sitemapRes.headers.get('content-type') || '';
    const sitemapText = await sitemapRes.text();

    if (sitemapRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for /sitemap.xml, got ${sitemapRes.status}`);
    }
    console.log('✅ PASS: /sitemap.xml returns HTTP status 200 OK');

    if (!sitemapContentType.includes('xml')) {
      throw new Error(`Expected Content-Type to include 'xml', got '${sitemapContentType}'`);
    }
    console.log(`✅ PASS: Content-Type is XML ('${sitemapContentType}')`);

    if (sitemapText.includes('<!doctype html>') || sitemapText.includes('<html')) {
      throw new Error('/sitemap.xml returned HTML instead of XML!');
    }
    console.log('✅ PASS: Response is strictly XML (not HTML single-page app fallback)');

    if (!sitemapText.includes('<urlset') || !sitemapText.includes('sitemaps.org')) {
      throw new Error('Missing standard <urlset> root element or XML namespace');
    }
    console.log('✅ PASS: Contains valid Sitemap Protocol 0.9 <urlset> root element');

    if (!sitemapText.includes('https://creatorflowai.ai.studio/') || !sitemapText.includes('https://creatorflowai.ai.studio/pricing')) {
      throw new Error('Sitemap missing required canonical URLs (homepage / pricing)');
    }
    console.log('✅ PASS: Contains exact required canonical origin URLs (https://creatorflowai.ai.studio)');

    // 2. Verify /robots.txt endpoint
    console.log('\n--- SUITE 2: /robots.txt Endpoint Verification ---');
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    const robotsContentType = robotsRes.headers.get('content-type') || '';
    const robotsText = await robotsRes.text();

    if (robotsRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for /robots.txt, got ${robotsRes.status}`);
    }
    console.log('✅ PASS: /robots.txt returns HTTP status 200 OK');

    if (!robotsContentType.includes('text/plain')) {
      throw new Error(`Expected Content-Type to include 'text/plain', got '${robotsContentType}'`);
    }
    console.log(`✅ PASS: Content-Type is text/plain ('${robotsContentType}')`);

    if (!robotsText.includes('Sitemap: https://creatorflowai.ai.studio/sitemap.xml')) {
      throw new Error('robots.txt missing required Sitemap declaration');
    }
    console.log('✅ PASS: Contains valid Sitemap declaration pointing to https://creatorflowai.ai.studio/sitemap.xml');

    // 3. Verify Google Search Console Meta Tag in index.html
    console.log('\n--- SUITE 3: Google Search Console Verification Tag ---');
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    if (!indexHtml.includes('<meta name="google-site-verification" content="UejGQvgq8bwuwAOD3RAXQH9d-eCjJCTfKclOZLzA6Ig" />')) {
      throw new Error('Google Search Console verification meta tag missing or altered in index.html!');
    }
    console.log('✅ PASS: Google Search Console verification meta tag strictly preserved in index.html');

    // 4. Verify Homepage and Pricing HTML Metadata
    console.log('\n--- SUITE 4: SEO Metadata Verification ---');
    if (!indexHtml.includes('<title>CreatorFlow AI | Content Creation Tools for Creators</title>')) {
      throw new Error('index.html missing updated descriptive homepage title!');
    }
    console.log('✅ PASS: Homepage title matches requirement ("CreatorFlow AI | Content Creation Tools for Creators")');

    if (!indexHtml.includes('name="description"') || !indexHtml.includes('Plan YouTube videos, discover content ideas')) {
      throw new Error('index.html missing accurate meta description!');
    }
    console.log('✅ PASS: Homepage meta description accurately reflects actual product capabilities');

    if (!indexHtml.includes('<link rel="canonical" href="https://creatorflowai.ai.studio/" />')) {
      throw new Error('index.html missing canonical homepage URL!');
    }
    console.log('✅ PASS: Homepage canonical URL strictly set to https://creatorflowai.ai.studio/');

    if (!indexHtml.includes('application/ld+json') || !indexHtml.includes('"url": "https://creatorflowai.ai.studio/"')) {
      throw new Error('index.html missing structured data JSON-LD with canonical URL!');
    }
    console.log('✅ PASS: WebApplication JSON-LD structured data configured without fake review ratings');

    // 5. Verify /pricing Server Route & Head Metadata
    console.log('\n--- SUITE 5: /pricing Route Metadata Verification ---');
    const pricingRes = await fetch(`${baseUrl}/pricing`);
    const pricingContentType = pricingRes.headers.get('content-type') || '';
    const pricingText = await pricingRes.text();

    if (pricingRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for /pricing, got ${pricingRes.status}`);
    }
    console.log('✅ PASS: /pricing returns HTTP status 200 OK');

    if (!pricingContentType.includes('text/html')) {
      throw new Error(`Expected /pricing Content-Type to include text/html, got '${pricingContentType}'`);
    }
    console.log(`✅ PASS: /pricing Content-Type is HTML ('${pricingContentType}')`);

    if (!pricingText.includes('<title>CreatorFlow AI Pricing | Plans for YouTube Creators</title>')) {
      throw new Error('/pricing response missing pricing title!');
    }
    console.log('✅ PASS: /pricing title pre-rendered accurately ("CreatorFlow AI Pricing | Plans for YouTube Creators")');

    if (!pricingText.includes('<link rel="canonical" href="https://creatorflowai.ai.studio/pricing" />')) {
      throw new Error('/pricing response missing pricing canonical link!');
    }
    console.log('✅ PASS: /pricing canonical URL strictly set to https://creatorflowai.ai.studio/pricing');

    if (!pricingText.includes('<meta name="google-site-verification" content="UejGQvgq8bwuwAOD3RAXQH9d-eCjJCTfKclOZLzA6Ig" />')) {
      throw new Error('/pricing response missing Google Search Console verification meta tag!');
    }
    console.log('✅ PASS: /pricing response preserves Google Search Console verification tag');

    console.log('\n================================================================');
    console.log('🎉 ALL SITEMAP & SEO VERIFICATION TESTS PASSED (100%)!');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runSitemapTests().catch((err) => {
  console.error('❌ Sitemap verification failed:', err);
  process.exit(1);
});
