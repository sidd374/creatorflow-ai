import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Mail, 
  Send, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  CheckCheck,
  ShieldCheck,
  Info
} from 'lucide-react';
import { PlanId, PLAN_DEFINITIONS } from '../../lib/planEntitlements';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { trackEvent } from '../../lib/analyticsService';

export interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlanId: PlanId;
  isAnnual?: boolean;
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({
  isOpen,
  onClose,
  targetPlanId,
  isAnnual = true,
}) => {
  const { toast } = useToast();

  const meta = PLAN_DEFINITIONS[targetPlanId] || PLAN_DEFINITIONS.pro;
  const monthlyPrice = meta.priceMonthly;
  const annualTotal = meta.priceYearly;
  const annualMonthlyEquivalent = Math.round(annualTotal / 12);
  const activePriceDisplay = isAnnual && annualTotal > 0 ? annualMonthlyEquivalent : monthlyPrice;

  const formattedDisplayedPrice = isAnnual && annualTotal > 0
    ? `₹${annualMonthlyEquivalent}/month (₹${annualTotal.toLocaleString()}/year billed annually)`
    : `₹${monthlyPrice}/month (Monthly billing)`;

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [creatorPlatform, setCreatorPlatform] = useState<'YouTube' | 'Instagram' | 'Facebook' | 'Other'>('YouTube');
  const [channelUrl, setChannelUrl] = useState('');
  const [audienceSize, setAudienceSize] = useState('1,000–10,000');
  const [monthlyPostsCount, setMonthlyPostsCount] = useState('4–8 videos/posts');
  const [preferredBilling, setPreferredBilling] = useState<'Monthly' | 'Annual' | 'Not sure'>(isAnnual ? 'Annual' : 'Monthly');
  const [mostWantedFeature, setMostWantedFeature] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    delivered: boolean;
    message: string;
    requestId?: string;
    mailtoFallback?: { to: string; subject: string; body: string };
  } | null>(null);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedFallback, setCopiedFallback] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name (at least 2 characters).';
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(emailTrimmed)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!creatorPlatform) {
      newErrors.creatorPlatform = 'Please select your primary creator platform.';
    }

    if (!consent) {
      newErrors.consent = 'You must agree to the contact consent statement to continue.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    const payload = {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      creatorPlatform,
      selectedPlan: meta.name,
      displayedPrice: formattedDisplayedPrice,
      channelUrl: channelUrl.trim(),
      audienceSize,
      monthlyPostsCount,
      preferredBilling,
      mostWantedFeature: mostWantedFeature.trim(),
      additionalFeedback: additionalFeedback.trim(),
      consent,
      honeypot,
    };

    try {
      const response = await fetch('/api/plan-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      trackEvent('plan_request_submitted', {
        plan: targetPlanId,
        properties: {
          platform: creatorPlatform,
          audienceSize,
          preferredBilling,
          delivered: data.delivered,
        },
      });

      if (data.delivered) {
        setSubmitResult({
          success: true,
          delivered: true,
          message: data.message || 'Your early-access request has been received. Thank you for your interest in CreatorFlow AI.',
          requestId: data.requestId,
        });
        toast('Request Received', 'Your early-access request has been received.', 'success');
      } else {
        // Truthful reporting: delivered is false, present fallback
        setSubmitResult({
          success: true,
          delivered: false,
          message: data.message || 'Automatic email delivery is currently unconfigured or unavailable on the server.',
          requestId: data.requestId,
          mailtoFallback: data.mailtoFallback,
        });
      }
    } catch (err: any) {
      console.error('Error submitting plan request:', err);
      // Generate client-side mailto fallback
      const mailtoSubject = encodeURIComponent(`[CreatorFlow AI] New Early Access Request — ${meta.name}`);
      const mailtoBody = encodeURIComponent(
        `CREATORFLOW AI — PRE-LAUNCH EARLY ACCESS REQUEST\n` +
        `Customer Name: ${fullName.trim()}\n` +
        `Customer Email: ${email.trim()}\n` +
        `Platform: ${creatorPlatform}\n` +
        `Selected Plan: ${meta.name} (${formattedDisplayedPrice})\n` +
        `Audience Size: ${audienceSize}\n` +
        `Preferred Billing: ${preferredBilling}\n` +
        `Channel: ${channelUrl.trim() || 'None'}\n` +
        `Most Wanted Feature: ${mostWantedFeature.trim() || 'None'}\n` +
        `Additional Feedback: ${additionalFeedback.trim() || 'None'}\n`
      );

      setSubmitResult({
        success: false,
        delivered: false,
        message: 'Network connection or server error. Please use the email button below to send your request directly.',
        mailtoFallback: {
          to: 'support@creatorflowai.ai.studio',
          subject: `[CreatorFlow AI] New Early Access Request — ${meta.name}`,
          body: decodeURIComponent(mailtoBody),
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyFallback = () => {
    if (!submitResult?.mailtoFallback) return;
    const fullText = `To: ${submitResult.mailtoFallback.to}\nSubject: ${submitResult.mailtoFallback.subject}\n\n${submitResult.mailtoFallback.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedFallback(true);
    toast('Copied', 'Request email details copied to clipboard.', 'info');
    setTimeout(() => setCopiedFallback(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-xl w-full border border-black/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="early-access-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-7 bg-[#f8f7f4] border-b border-black/[0.06] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#1a1a1a] text-[#f8f7f4] font-semibold rounded-xs">
                Pre-Launch Access
              </span>
              <span className="font-mono text-[10px] text-neutral-500 uppercase">
                {isAnnual ? 'Annual Billing (Save 20%)' : 'Monthly Billing'}
              </span>
            </div>
            <h2 id="early-access-title" className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a] tracking-tight">
              Get Early Access to CreatorFlow AI
            </h2>
            <p className="text-xs text-neutral-600 mt-2 font-sans leading-relaxed">
              We're preparing secure payments for our paid plans. Join the early-access list to tell us what you need and hear from us when your selected plan becomes available.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Plan Summary Banner */}
        <div className="px-6 py-3.5 bg-[#eeeae3]/50 border-b border-black/[0.06] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4a017] shrink-0" />
            <span className="font-serif text-base font-semibold text-neutral-900">
              {meta.name} Plan
            </span>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-neutral-900 font-bold">₹{activePriceDisplay}/mo</span>
            {isAnnual && annualTotal > 0 && (
              <span className="text-[10px] text-neutral-500 block">Billed ₹{annualTotal.toLocaleString()}/yr</span>
            )}
          </div>
        </div>

        {/* Content & Form Area */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 text-xs font-sans">
          {submitResult ? (
            /* Result Screen */
            submitResult.delivered ? (
              /* Genuine Success State */
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-medium text-neutral-900">
                    Request Received
                  </h3>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                    Your early-access request has been received. Thank you for your interest in CreatorFlow AI.
                  </p>
                  {submitResult.requestId && (
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded text-[11px] font-mono text-neutral-500 inline-block">
                      Reference ID: <strong>{submitResult.requestId}</strong>
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={onClose}
                    className="font-mono text-xs uppercase tracking-wider"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Accurate Fallback Screen when Server SMTP is unconfigured or failed */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Direct Server Email Not Configured</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {submitResult.message}
                  </p>
                </div>

                {submitResult.mailtoFallback && (
                  <div className="p-4 rounded-xl bg-[#faf9f5] border border-black/[0.08] space-y-3">
                    <div className="text-[11px] font-mono text-neutral-500">
                      Destination: <strong className="text-neutral-800">{submitResult.mailtoFallback.to}</strong>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <a
                        href={`mailto:${encodeURIComponent(submitResult.mailtoFallback.to)}?subject=${encodeURIComponent(submitResult.mailtoFallback.subject)}&body=${encodeURIComponent(submitResult.mailtoFallback.body)}`}
                        className="w-full sm:flex-1 py-2.5 px-4 bg-[#1a1a1a] hover:bg-neutral-800 text-white rounded-lg font-mono text-xs uppercase tracking-wider font-semibold text-center flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Email App</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyFallback}
                        className="w-full sm:w-auto py-2.5 px-4 bg-white border border-black/[0.12] hover:bg-neutral-50 text-neutral-800 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedFallback ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFallback ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setSubmitResult(null)}
                    className="text-xs text-neutral-500 hover:text-neutral-800 font-mono underline cursor-pointer"
                  >
                    Edit Form Details
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Early Access Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hidden Honeypot */}
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="e.g. Maya Sharma"
                    className={`w-full text-xs p-2.5 rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                      errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-black/[0.12] focus:ring-[#1a1a1a]'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-[10px] text-red-600 mt-1 font-sans">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="e.g. maya@creator.com"
                    className={`w-full text-xs p-2.5 rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-black/[0.12] focus:ring-[#1a1a1a]'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-600 mt-1 font-sans">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Creator Platform & Channel URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Primary Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={creatorPlatform}
                    onChange={(e) => setCreatorPlatform(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Channel or Profile URL <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              {/* Row 3: Audience Size & Monthly Cadence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Audience Size <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={audienceSize}
                    onChange={(e) => setAudienceSize(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  >
                    <option value="Not launched yet">Not launched yet</option>
                    <option value="Under 1,000">Under 1,000</option>
                    <option value="1,000–10,000">1,000–10,000</option>
                    <option value="10,000–100,000">10,000–100,000</option>
                    <option value="Over 100,000">Over 100,000</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                    Monthly Publishing Cadence <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={monthlyPostsCount}
                    onChange={(e) => setMonthlyPostsCount(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  >
                    <option value="1–3 videos/posts">1–3 videos/posts per month</option>
                    <option value="4–8 videos/posts">4–8 videos/posts per month</option>
                    <option value="9–15 videos/posts">9–15 videos/posts per month</option>
                    <option value="16+ videos/posts">16+ videos/posts per month</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Billing Preference */}
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                  Preferred Billing Cadence <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Monthly', 'Annual', 'Not sure'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreferredBilling(opt)}
                      className={`p-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                        preferredBilling === opt
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white font-semibold'
                          : 'border-black/[0.1] bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Most Wanted Feature */}
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                  Most Wanted CreatorFlow Feature <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={mostWantedFeature}
                  onChange={(e) => setMostWantedFeature(e.target.value)}
                  placeholder="e.g. Daily Content Radar, Multi-clip Runway video prompts, or SEO titles"
                  className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                />
              </div>

              {/* Row 6: Additional Feedback */}
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                  Additional Feedback or Channel Goal <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={additionalFeedback}
                  onChange={(e) => setAdditionalFeedback(e.target.value)}
                  rows={2}
                  placeholder="Tell us what you are working towards or any workflow bottlenecks you want resolved..."
                  className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                />
              </div>

              {/* Consent Statement */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errors.consent) setErrors((prev) => ({ ...prev, consent: '' }));
                    }}
                    className="mt-0.5 rounded border-neutral-300 text-[#1a1a1a] focus:ring-[#1a1a1a]"
                  />
                  <span className="text-[11px] text-neutral-700 leading-relaxed font-sans">
                    By submitting this request, you agree that CreatorFlow AI may contact you about early access and your product feedback.
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-[10px] text-red-600 mt-1 font-sans pl-6">{errors.consent}</p>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider shadow-xs h-11"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  {isSubmitting ? 'Sending Request…' : 'Request Early Access'}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-400 text-center pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero payment card or credentials collected &bull; Notification sent to team</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
