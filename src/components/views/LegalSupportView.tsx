import React, { useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, FileText, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export type LegalPageId = 'privacy' | 'terms' | 'refund-policy' | 'contact';

interface LegalSupportViewProps {
  page: LegalPageId;
  onNavigate: (view: string) => void;
}

export const LegalSupportView: React.FC<LegalSupportViewProps> = ({ page, onNavigate }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Question');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast('Missing Details', 'Please enter your name, email address, and message.', 'error');
      return;
    }
    setSubmitted(true);
    toast('Message Recorded', 'Your inquiry details are ready. You can also send directly to support@creatorflowai.ai.studio.', 'success');
  };

  const navTabs: { id: LegalPageId; label: string; icon: React.ReactNode }[] = [
    { id: 'privacy', label: 'Privacy Policy', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'terms', label: 'Terms of Service', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'refund-policy', label: 'Refund Policy', icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: 'contact', label: 'Contact & Support', icon: <Mail className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-[80vh] bg-[#faf9f5] py-12 px-4 sm:px-6 font-sans text-[#1a1a1a]">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>

          <nav aria-label="Legal and support pages" className="flex flex-wrap items-center gap-1.5">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  page === tab.id
                    ? 'bg-[#1a1a1a] text-white font-semibold'
                    : 'bg-white border border-black/[0.08] text-neutral-600 hover:text-[#1a1a1a]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-10 space-y-6">
          {page === 'privacy' && (
            <>
              <div className="space-y-2 border-b border-black/[0.06] pb-6">
                <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-widest block">
                  Transparency &amp; Data Protection
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
                  Privacy Policy
                </h1>
                <p className="text-xs font-mono text-neutral-500">
                  Last Updated: November 2026 &bull; CreatorFlow AI
                </p>
              </div>

              <div className="space-y-5 text-sm text-neutral-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">1. Information We Collect</h2>
                  <p>
                    When you sign in to CreatorFlow AI using Google or Microsoft authentication (powered by Firebase Authentication), we receive your account identifier (UID), email address, display name, and profile avatar URL solely to authenticate your workspace and keep your projects isolated to your account.
                  </p>
                  <p>
                    We also store the creator profile preferences, video projects, scripts, saved content packs, and any optional performance metrics you explicitly enter inside your workspace.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">2. How Your Workspace Data Is Stored</h2>
                  <p>
                    CreatorFlow AI uses an account-isolated local cache paired with Cloud Firestore synchronization under your private workspace path. Each signed-in user can only read or modify their own account workspace.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">3. Content Intelligence &amp; Personalization</h2>
                  <p>
                    Our local Content Intelligence Engine adapts recommendations using high-level strategy preferences (such as preferred language, tone, and title formats) directly inside your account. We do not train external models on your private scripts or publish your channel drafts, and you can disable or reset personalization at any time in Settings.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">4. Analytics &amp; Third-Party Services</h2>
                  <p>
                    CreatorFlow AI does not scrape your YouTube channel or invent external analytics. YouTube Studio numbers you enter in Creator Analytics or Creator Situation Lab stay in your private workspace. If you request cloud-assisted generation where configured, prompts are routed through our secure server proxy without exposing API keys in the browser.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">5. Your Rights &amp; Data Deletion</h2>
                  <p>
                    You may reset your creator profile, clear personalization signals, or remove saved content libraries from Account Settings at any time. For account deletion or privacy inquiries, contact{' '}
                    <a href="mailto:support@creatorflowai.ai.studio" className="text-[#b8860b] underline">
                      support@creatorflowai.ai.studio
                    </a>.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === 'terms' && (
            <>
              <div className="space-y-2 border-b border-black/[0.06] pb-6">
                <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-widest block">
                  Platform Agreement
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
                  Terms of Service
                </h1>
                <p className="text-xs font-mono text-neutral-500">
                  Last Updated: November 2026 &bull; CreatorFlow AI
                </p>
              </div>

              <div className="space-y-5 text-sm text-neutral-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">1. Workspace Purpose &amp; Ownership</h2>
                  <p>
                    CreatorFlow AI provides workflow planning, title formulas, scripting, Creation Kits, diagnostics, and publishing preparation tools for content creators. You retain full ownership of the topics, scripts, titles, descriptions, and final videos you produce using your workspace.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">2. No Guarantee of Channel Outcomes</h2>
                  <p>
                    Any scores, readability metrics, or retention suggestions in CreatorFlow AI are structural planning heuristics designed to support consistent execution. CreatorFlow AI does not guarantee YouTube views, subscribers, impressions, monetization approval, or revenue, and has no control over YouTube&apos;s recommendation systems.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">3. Fair Usage &amp; Plan Quotas</h2>
                  <p>
                    Free and paid plans include clear weekly and monthly quotas. Automated abuse, multi-account quota circumvention, reverse engineering, or unauthorized scraping of platform endpoints is prohibited.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">4. Independence</h2>
                  <p>
                    CreatorFlow AI is an independent software workspace and is not affiliated with, sponsored by, or endorsed by YouTube or Google LLC.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === 'refund-policy' && (
            <>
              <div className="space-y-2 border-b border-black/[0.06] pb-6">
                <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-widest block">
                  Billing &amp; Cancellations
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
                  Refund &amp; Cancellation Policy
                </h1>
                <p className="text-xs font-mono text-neutral-500">
                  Last Updated: November 2026 &bull; CreatorFlow AI
                </p>
              </div>

              <div className="space-y-5 text-sm text-neutral-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">1. Current Beta &amp; Pre-Launch Billing Status</h2>
                  <p>
                    CreatorFlow AI is currently in open beta with free starter access. Paid plans (Pro, Creator, and MAX) are not collecting live card or UPI charges during early access—no credit card is required or stored.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">2. Subscription Cancellations</h2>
                  <p>
                    Once paid billing launches, you may cancel recurring monthly or annual renewals at any time from Settings before the next billing cycle date, and you will retain access through the end of the already-paid period.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">3. Refund Eligibility</h2>
                  <p>
                    When live subscriptions are active, duplicate charges, accidental renewals requested within 7 days of billing without substantial quota consumption, or verified service outages preventing access are eligible for full review and refund.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-serif text-xl text-[#1a1a1a]">4. How to Request Help</h2>
                  <p>
                    Reach our billing support desk at{' '}
                    <a href="mailto:support@creatorflowai.ai.studio" className="text-[#b8860b] underline">
                      support@creatorflowai.ai.studio
                    </a>{' '}
                    or use our <button type="button" onClick={() => onNavigate('contact')} className="text-[#b8860b] underline cursor-pointer">Contact page</button>.
                  </p>
                </section>
              </div>
            </>
          )}

          {page === 'contact' && (
            <>
              <div className="space-y-2 border-b border-black/[0.06] pb-6">
                <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-widest block">
                  Creator Support
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
                  Contact CreatorFlow AI
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600">
                  Questions about workflows, beta feedback, multilingual quality, or early access? Send us a message directly.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                  <h2 className="font-serif text-xl text-[#1a1a1a]">Inquiry Prepared</h2>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto">
                    Thank you, {name}. Click below to dispatch your note via your email client to{' '}
                    <strong>support@creatorflowai.ai.studio</strong>, or send another message.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={`mailto:support@creatorflowai.ai.studio?subject=${encodeURIComponent(`[CreatorFlow Support] ${topic}`)}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-xs font-mono uppercase tracking-wider"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send via Email App</span>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setMessage('');
                      }}
                    >
                      Write Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Creator Name"
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@channel.com"
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                      Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                    >
                      <option value="General Question">General Question</option>
                      <option value="Beta Feedback">Beta Feedback &amp; Feature Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Privacy or Account">Privacy or Account Request</option>
                      <option value="Early Access Plans">Early Access Plans</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-neutral-700 block mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help improve your creator workflow?"
                      required
                      className="w-full text-xs p-2.5 rounded-lg border border-black/[0.12] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <Button type="submit" variant="primary" size="md" leftIcon={<Send className="w-3.5 h-3.5" />}>
                      Prepare Support Message
                    </Button>
                    <span className="text-xs font-mono text-neutral-500">
                      Support Desk:{' '}
                      <a href="mailto:support@creatorflowai.ai.studio" className="text-[#1a1a1a] underline">
                        support@creatorflowai.ai.studio
                      </a>
                    </span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
