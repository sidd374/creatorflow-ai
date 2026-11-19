import { useEffect } from 'react';

export interface SeoMetadataOptions {
  currentView: string;
}

const CANONICAL_ORIGIN = 'https://creatorflowai.ai.studio';

export function updateHeadMetadata(view: string) {
  if (typeof document === 'undefined') return;

  let title = 'CreatorFlow AI | Content Creation Tools for Creators';
  let description =
    'Plan YouTube videos, discover content ideas, generate high-retention titles and hooks, and structure production workflows with CreatorFlow AI.';
  let canonicalUrl = `${CANONICAL_ORIGIN}/`;
  let allowRobots = true;

  if (view === 'pricing') {
    title = 'CreatorFlow AI Pricing | Plans for YouTube Creators';
    description =
      'Explore CreatorFlow AI plans and pricing. Start for free with 2 video workflow slots every 7 days or upgrade for expanded creation kits and analytics.';
    canonicalUrl = `${CANONICAL_ORIGIN}/pricing`;
    allowRobots = true;
  } else if (view === 'privacy') {
    title = 'Privacy Policy | CreatorFlow AI';
    description = 'Learn how CreatorFlow AI protects your creator workspace, Firebase authentication data, and personalization controls.';
    canonicalUrl = `${CANONICAL_ORIGIN}/privacy`;
    allowRobots = true;
  } else if (view === 'terms') {
    title = 'Terms of Service | CreatorFlow AI';
    description = 'Review CreatorFlow AI terms of service, content ownership, and fair usage guidelines.';
    canonicalUrl = `${CANONICAL_ORIGIN}/terms`;
    allowRobots = true;
  } else if (view === 'refund-policy') {
    title = 'Refund Policy | CreatorFlow AI';
    description = 'Read CreatorFlow AI cancellation, pre-launch billing, and refund eligibility policies.';
    canonicalUrl = `${CANONICAL_ORIGIN}/refund-policy`;
    allowRobots = true;
  } else if (view === 'contact') {
    title = 'Contact & Support | CreatorFlow AI';
    description = 'Reach CreatorFlow AI support for product questions, feedback, privacy requests, or early access.';
    canonicalUrl = `${CANONICAL_ORIGIN}/contact`;
    allowRobots = true;
  } else if (view === 'landing') {
    title = 'CreatorFlow AI | Content Creation Tools for Creators';
    description =
      'Plan YouTube videos, discover content ideas, generate high-retention titles and hooks, and structure production workflows with CreatorFlow AI.';
    canonicalUrl = `${CANONICAL_ORIGIN}/`;
    allowRobots = true;
  } else {
    // Private/authenticated app views should not be indexed by search engines
    title = `CreatorFlow AI Workspace | ${view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}`;
    description = 'Private YouTube creator strategy and production workspace.';
    canonicalUrl = `${CANONICAL_ORIGIN}/`;
    allowRobots = false;
  }

  // 1. Set Document Title
  document.title = title;

  // 2. Set Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // 3. Set Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 4. Set OpenGraph Title, Description, and URL
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

  // 5. Set Twitter Title & Description
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', title);

  let twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', description);

  // 6. Set Robots Directive
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (!allowRobots) {
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
  } else {
    if (robotsMeta) {
      robotsMeta.remove();
    }
  }
}

export function useSeoMetadata({ currentView }: SeoMetadataOptions) {
  useEffect(() => {
    updateHeadMetadata(currentView);
  }, [currentView]);
}
