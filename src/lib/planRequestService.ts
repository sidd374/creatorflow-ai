import nodemailer from 'nodemailer';

export interface PlanRequestPayload {
  name: string;
  email: string;
  creatorPlatform: 'YouTube' | 'Instagram' | 'Facebook' | 'Other' | string;
  selectedPlan: string;
  displayedPrice: string;
  channelUrl?: string;
  audienceSize?: string;
  monthlyPostsCount?: string;
  preferredBilling?: 'Monthly' | 'Annual' | 'Not sure' | string;
  mostWantedFeature?: string;
  additionalFeedback?: string;
  consent: boolean;
  honeypot?: string;
}

export interface PlanRequestResult {
  success: boolean;
  delivered: boolean;
  requestId?: string;
  timestamp?: string;
  message: string;
  error?: string;
  mailtoFallback?: {
    to: string;
    subject: string;
    body: string;
  };
}

export interface DemandAnalyticsSummary {
  totalRequests: number;
  byPlan: Record<string, number>;
  byPlatform: Record<string, number>;
  byAudienceSize: Record<string, number>;
  byBillingPreference: Record<string, number>;
}

// In-memory demand analytics aggregation (safe: zero PII / emails stored here)
const demandAnalyticsState: DemandAnalyticsSummary = {
  totalRequests: 0,
  byPlan: {},
  byPlatform: {},
  byAudienceSize: {},
  byBillingPreference: {},
};

export function getDemandAnalytics(): DemandAnalyticsSummary {
  return {
    totalRequests: demandAnalyticsState.totalRequests,
    byPlan: { ...demandAnalyticsState.byPlan },
    byPlatform: { ...demandAnalyticsState.byPlatform },
    byAudienceSize: { ...demandAnalyticsState.byAudienceSize },
    byBillingPreference: { ...demandAnalyticsState.byBillingPreference },
  };
}

export function recordDemandAnalytics(req: PlanRequestPayload): void {
  demandAnalyticsState.totalRequests += 1;

  const planKey = req.selectedPlan || 'Unknown';
  demandAnalyticsState.byPlan[planKey] = (demandAnalyticsState.byPlan[planKey] || 0) + 1;

  const platformKey = req.creatorPlatform || 'Other';
  demandAnalyticsState.byPlatform[platformKey] = (demandAnalyticsState.byPlatform[platformKey] || 0) + 1;

  if (req.audienceSize) {
    demandAnalyticsState.byAudienceSize[req.audienceSize] =
      (demandAnalyticsState.byAudienceSize[req.audienceSize] || 0) + 1;
  }

  if (req.preferredBilling) {
    demandAnalyticsState.byBillingPreference[req.preferredBilling] =
      (demandAnalyticsState.byBillingPreference[req.preferredBilling] || 0) + 1;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 150) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
}

// Generate prefilled mailto link details for fallback
export function generateMailtoFallback(
  req: PlanRequestPayload,
  requestId: string,
  timestamp: string,
  recipientEmail: string = 'support@creatorflowai.ai.studio'
): { to: string; subject: string; body: string } {
  const subject = `[CreatorFlow AI] New Early Access Request — ${req.selectedPlan}`;
  const body = `CREATORFLOW AI — PRE-LAUNCH EARLY ACCESS REQUEST
======================================================
Request ID: ${requestId}
Submission Timestamp: ${timestamp}

CUSTOMER DETAILS:
- Full Name: ${req.name}
- Email Address: ${req.email}
- Creator Platform: ${req.creatorPlatform}
- Channel / Profile URL: ${req.channelUrl || 'Not provided'}

PLAN & USAGE NEEDS:
- Selected Plan: ${req.selectedPlan} (${req.displayedPrice})
- Preferred Billing: ${req.preferredBilling || 'Not specified'}
- Current Audience Size: ${req.audienceSize || 'Not specified'}
- Monthly Publishing Frequency: ${req.monthlyPostsCount || 'Not specified'}

FEEDBACK & PRIORITIES:
- Most Wanted Feature: ${req.mostWantedFeature || 'None specified'}
- Additional Feedback: ${req.additionalFeedback || 'None'}

CONSENT:
- Agreed to contact: Yes
======================================================
(Sent via CreatorFlow AI Pre-launch Access System)
`;

  return {
    to: recipientEmail,
    subject,
    body,
  };
}

/**
 * Processes early-access plan request, attempts real SMTP dispatch if configured,
 * and returns truthful delivery status or mailto fallback.
 */
export async function processPlanRequest(
  payload: PlanRequestPayload,
  clientIp?: string
): Promise<PlanRequestResult> {
  // Honeypot spam check
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    return {
      success: false,
      delivered: false,
      error: 'SPAM_DETECTED',
      message: 'Request could not be processed.',
    };
  }

  // Validate required fields
  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const creatorPlatform = (payload.creatorPlatform || '').trim();
  const selectedPlan = (payload.selectedPlan || '').trim();
  const displayedPrice = (payload.displayedPrice || '').trim();

  if (!name || name.length < 2 || name.length > 100) {
    return {
      success: false,
      delivered: false,
      error: 'INVALID_NAME',
      message: 'Please provide a valid full name (2–100 characters).',
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      delivered: false,
      error: 'INVALID_EMAIL',
      message: 'Please provide a valid email address.',
    };
  }

  if (!creatorPlatform) {
    return {
      success: false,
      delivered: false,
      error: 'MISSING_PLATFORM',
      message: 'Please select your primary creator platform.',
    };
  }

  if (!selectedPlan) {
    return {
      success: false,
      delivered: false,
      error: 'MISSING_PLAN',
      message: 'Selected plan is missing.',
    };
  }

  if (!payload.consent) {
    return {
      success: false,
      delivered: false,
      error: 'CONSENT_REQUIRED',
      message: 'You must agree to be contacted about early access and product feedback.',
    };
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  const recipient = process.env.PLAN_REQUEST_TO || process.env.SUPPORT_EMAIL || 'support@creatorflowai.ai.studio';

  const sanitizedPayload: PlanRequestPayload = {
    name,
    email,
    creatorPlatform,
    selectedPlan,
    displayedPrice,
    channelUrl: (payload.channelUrl || '').trim().substring(0, 300),
    audienceSize: (payload.audienceSize || '').trim().substring(0, 50),
    monthlyPostsCount: (payload.monthlyPostsCount || '').trim().substring(0, 50),
    preferredBilling: (payload.preferredBilling || '').trim().substring(0, 50),
    mostWantedFeature: (payload.mostWantedFeature || '').trim().substring(0, 500),
    additionalFeedback: (payload.additionalFeedback || '').trim().substring(0, 1000),
    consent: true,
  };

  // Record safe aggregate demand analytics
  recordDemandAnalytics(sanitizedPayload);

  const fallback = generateMailtoFallback(sanitizedPayload, requestId, timestamp, recipient);

  // Check SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CreatorFlow AI <noreply@creatorflow.ai>';

  const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);

  if (!isSmtpConfigured) {
    // Truthful reporting: do NOT claim email was sent if SMTP is unconfigured
    return {
      success: true, // Request validated successfully
      delivered: false, // Truthful delivery flag
      requestId,
      timestamp,
      error: 'SMTP_NOT_CONFIGURED',
      message:
        'Automatic server email dispatch is not configured. Please use the prefilled email button below to send your request directly to our team.',
      mailtoFallback: fallback,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const emailSubject = `[CreatorFlow AI] New Early Access Request — ${sanitizedPayload.selectedPlan}`;
    const emailText = fallback.body;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #1a1a1a;">
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-family: serif;">CreatorFlow AI — Early Access Request</h2>
          <span style="color: #d4a017; font-size: 12px; font-family: monospace;">PRE-LAUNCH PAID PLAN DEMAND</span>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none; background: #ffffff;">
          <p style="margin-top: 0;">A new creator has requested early access for <strong>${sanitizedPayload.selectedPlan}</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666; width: 40%;"><strong>Request ID:</strong></td><td style="padding: 8px 0; font-family: monospace;">${requestId}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Submission Time:</strong></td><td style="padding: 8px 0;">${timestamp}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Customer Name:</strong></td><td style="padding: 8px 0;"><strong>${sanitizedPayload.name}</strong></td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Customer Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${sanitizedPayload.email}">${sanitizedPayload.email}</a></td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Selected Plan:</strong></td><td style="padding: 8px 0;"><span style="background: #eeeae3; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${sanitizedPayload.selectedPlan}</span> (${sanitizedPayload.displayedPrice})</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Creator Platform:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.creatorPlatform}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Channel / Profile:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.channelUrl || 'Not provided'}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Audience Size:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.audienceSize || 'Not specified'}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Monthly Posts:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.monthlyPostsCount || 'Not specified'}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Billing Preference:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.preferredBilling || 'Not specified'}</td></tr>
            <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0; color: #666;"><strong>Most Wanted Feature:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.mostWantedFeature || 'None specified'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Additional Feedback:</strong></td><td style="padding: 8px 0;">${sanitizedPayload.additionalFeedback || 'None'}</td></tr>
          </table>

          <div style="background-color: #f8f7f4; padding: 12px; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>Consent Confirmed:</strong> User agreed to be contacted regarding early access and product feedback.
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: recipient,
      replyTo: sanitizedPayload.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    return {
      success: true,
      delivered: true,
      requestId,
      timestamp,
      message: 'Your early-access request has been received. Thank you for your interest in CreatorFlow AI.',
    };
  } catch (deliveryError: any) {
    console.error('SMTP email dispatch error in /api/plan-requests:', deliveryError?.message || deliveryError);

    // Truthful reporting: delivery failed, offer mailto fallback
    return {
      success: true, // Request validated
      delivered: false, // Email dispatch failed
      requestId,
      timestamp,
      error: 'DELIVERY_FAILED',
      message:
        'Failed to deliver email through server SMTP. Please use the fallback email button below to send your request directly.',
      mailtoFallback: fallback,
    };
  }
}
