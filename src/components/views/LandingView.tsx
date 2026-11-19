import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  Layers, 
  Zap, 
  Globe, 
  Check, 
  Copy, 
  ChevronDown, 
  Compass, 
  Tv, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle,
  Clapperboard,
  Sliders,
  Share2,
  FileText,
  BarChart3,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Info,
  Lightbulb,
  FileSpreadsheet,
  Clock,
  Target,
  Users,
  AlertCircle,
  Pause,
  Star,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { YOUTUBE_TOOLS } from '../../data/tools';
import { LANGUAGES } from '../../data/languages';
import { SAMPLE_CONTENT_PACK, PRICING_PLANS } from '../../data/mockData';
import { PricingCard } from '../common/PricingCard';
import { PlanUpgradeModal } from '../common/PlanUpgradeModal';
import { useToast } from '../ui/Toast';
import { CreatorFlowUser } from '../../lib/auth';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { InteractiveDemo } from '../landing/InteractiveDemo';
import { PlanId } from '../../lib/planEntitlements';

interface LandingViewProps {
  onNavigate: (view: string) => void;
  onSelectTool?: (toolId: string) => void;
  onOpenAuth?: () => void;
  user?: CreatorFlowUser | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ 
  onNavigate, 
  onSelectTool,
  onOpenAuth,
  user = null,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [previewTab, setPreviewTab] = useState<'titles' | 'hooks' | 'shorts' | 'description'>('titles');
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [isAnnualBilling, setIsAnnualBilling] = useState(true);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<PlanId | null>(null);
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [betaPreviewRating, setBetaPreviewRating] = useState<number>(0);
  const { toast } = useToast();

  const handleCopyPreviewText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTitleIndex(index);
    toast('Copied to clipboard', 'Preview sample text copied.', 'success');
    setTimeout(() => setCopiedTitleIndex(null), 1500);
  };

  const handleProtectedNavigate = (view: string) => {
    if (!user && onOpenAuth) {
      onOpenAuth();
      return;
    }
    onNavigate(view);
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      if (!user && onOpenAuth) {
        onOpenAuth();
      } else {
        onNavigate('dashboard');
      }
    } else {
      setUpgradeTargetPlan(planId as PlanId);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'What is CreatorFlow AI and what does it do?',
      a: 'CreatorFlow AI is a YouTube content strategy and production workspace. It bridges high-level topic discovery and shot-by-shot video production: helping creators generate CTR-engineered titles, retention hooks, 45-second Shorts outlines, camera-directed Creation Kits, and publishing metadata in one cohesive workspace.',
    },
    {
      q: 'Who can use CreatorFlow AI?',
      a: 'CreatorFlow is built for consistent YouTube creators, faceless channel operators, educational channels, and growing creators working towards monetization or scaling from 1,000 to 10,000+ subscribers.',
    },
    {
      q: 'What does the Free plan include?',
      a: 'The Free plan gives you 2 video-generation starts per rolling 7-day window, full Creation Kit previews, basic topic analysis, visual planning, and core languages with ₹0 credit card required.',
    },
    {
      q: 'How do paid plans (Pro, Creator, MAX) differ from the Free plan?',
      a: 'Paid plans expand creation volume and strategic intelligence: Pro unlocks 25 Creation Kits/month, Character Bibles, and tool-calibrated prompt generation. Creator unlocks 75 Kits/month, Daily Content Radar, Content Gap Finder, and 30-Day Series Planning. MAX unlocks 200 Kits/month, 90-Day Channel Architecture, and deep multi-character continuity.',
    },
    {
      q: 'What are Creation Kits and how do they work?',
      a: 'A Creation Kit is a shot-by-shot production blueprint for video generation engines like Google Flow, Kling AI, Pika, and Leonardo. Instead of vague paragraphs, it outputs specific visual prompts, motion directions, and camera moves for each 5-to-10 second clip in your video timeline.',
    },
    {
      q: 'Does CreatorFlow AI guarantee subscribers or views?',
      a: 'No. CreatorFlow AI provides practical strategy, titles, scripts, Creation Kits, and upload metadata to streamline your workflow. CreatorFlow AI cannot guarantee subscribers, views, monetization, or earnings. Results depend entirely on your content quality, audience resonance, consistency, and execution.',
    },
    {
      q: 'Are the analytics in CreatorFlow actual channel metrics or estimates?',
      a: 'CreatorFlow Analytics tracks your internal production velocity, project completions, and provides estimated viewer engagement models based on video structure. Internal metrics are transparently labeled and never fabricated as live Google analytics.',
    },
  ];

  return (
    <div className="w-full bg-transparent text-[#1a1a1a] font-sans relative">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-black/[0.06]">
        {/* Subtle luminous radial wash behind typography */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0)_100%)] pointer-events-none" 
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white border border-black/[0.08] text-xs font-mono font-semibold tracking-wider text-[#b8860b] uppercase shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#d4a017]" />
              <span>YOUR NEXT VIDEO DESERVES MORE THAN A GUESS</span>
            </div>

            {/* Headline */}
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-[#1a1a1a] leading-[1.08] sm:leading-[1.1] mb-6" 
              style={{ textWrap: 'balance' }}
            >
              <span className="block text-[#1a1a1a]">Stop Guessing.</span>
              <span className="block italic font-medium text-[#b8860b] underline decoration-[#d4a017]/50 decoration-2 underline-offset-6 sm:underline-offset-8 my-1 sm:my-1.5">
                Start Creating with a Strategy.
              </span>
            </h1>

            {/* Description */}
            <p 
              className="text-base sm:text-lg md:text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto mb-8 font-sans font-normal" 
              style={{ textWrap: 'balance' }}
            >
              CreatorFlow AI helps YouTube creators discover video ideas, generate compelling titles, prepare upload-ready content packages, and plan their next move—all in one place.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleProtectedNavigate('dashboard')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider px-8 h-12 shadow-sm bg-[#1a1a1a] text-white hover:bg-neutral-800"
              >
                Create My Next Video
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollToSection('features')}
                leftIcon={<Compass className="w-4 h-4 text-neutral-500" />}
                className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider px-7 h-12 bg-white border-black/[0.12] hover:bg-neutral-50 text-neutral-800"
              >
                Explore Creator Tools
              </Button>
              {!user && onOpenAuth && (
                <GoogleSignInButton
                  onClick={onOpenAuth}
                  size="md"
                  className="w-full sm:w-auto h-12 px-6"
                />
              )}
            </div>

            {/* Supporting Text */}
            <p className="text-xs text-neutral-500 font-sans max-w-xl mx-auto mb-8 leading-normal">
              Built for creators who are serious about growing. Practical tools, without promises of overnight success.
            </p>

            {/* Three Concise Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left mb-8">
              <div className="p-3.5 bg-white/90 rounded-xl border border-black/[0.08] shadow-2xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#faf9f5] border border-black/[0.06] flex items-center justify-center shrink-0 text-[#d4a017]">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif text-sm font-semibold text-neutral-900 block leading-tight">Smarter Video Ideas</span>
                  <span className="text-[11px] text-neutral-500 font-sans">Curiosity-gap ideation</span>
                </div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-xl border border-black/[0.08] shadow-2xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#faf9f5] border border-black/[0.06] flex items-center justify-center shrink-0 text-[#d4a017]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif text-sm font-semibold text-neutral-900 block leading-tight">Stronger Titles &amp; Hooks</span>
                  <span className="text-[11px] text-neutral-500 font-sans">CTR-engineered formulas</span>
                </div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-xl border border-black/[0.08] shadow-2xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#faf9f5] border border-black/[0.06] flex items-center justify-center shrink-0 text-[#d4a017]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif text-sm font-semibold text-neutral-900 block leading-tight">Organized Growth Strategy</span>
                  <span className="text-[11px] text-neutral-500 font-sans">Repeatable creation workflow</span>
                </div>
              </div>
            </div>

            {/* Zero-Pill Unboxed Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-neutral-500 font-sans">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#d4a017]" /> Zero Credit Card Required
              </span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#d4a017]" /> 20+ Languages &amp; Tanglish
              </span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#d4a017]" /> 9 YouTube Production Tools
              </span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#d4a017]" /> Export to Studio &amp; Notion
              </span>
            </div>
          </div>

          {/* HERO SPLIT SHOWCASE: STUDIO PHOTO + LIVE CONTENT PACK UI */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Studio Environment Photography */}
            <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-black/[0.08] shadow-sm relative group bg-neutral-900 min-h-[300px] lg:min-h-full">
              <img
                src="/images/hero_creator_workspace_1791540574498.jpg"
                alt="CreatorFlow Video Strategy and Production Workspace"
                className="w-full h-full object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
                loading="eager"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-white">
                <span className="font-mono text-[10px] text-[#d4a017] uppercase tracking-widest font-semibold mb-1">
                  Professional Studio Workflow
                </span>
                <p className="text-sm font-serif text-white/95 leading-snug">
                  From seed concept to shot-by-shot multi-clip video timeline in minutes.
                </p>
              </div>
            </div>

            {/* Right: Live UI Content Pack Card */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5 sm:p-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-black/[0.06]">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mb-1">
                      <span>Concept: "Why do humans dream?"</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">Educational</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-normal text-[#1a1a1a]">
                      Live Pack Preview: The Neuroscience of Dreams
                    </h3>
                  </div>

                  {/* Segmented Controls */}
                  <div className="flex items-center gap-1 p-1 bg-[#faf9f5] rounded-xl border border-black/[0.06] shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('titles')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'titles' ? 'bg-[#1a1a1a] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Titles
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('hooks')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'hooks' ? 'bg-[#1a1a1a] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Hooks
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('shorts')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'shorts' ? 'bg-[#1a1a1a] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Shorts
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('description')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'description' ? 'bg-[#1a1a1a] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Chapters &amp; SEO
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="pt-4 min-h-[220px]">
                  {previewTab === 'titles' && (
                    <div className="space-y-2.5">
                      {SAMPLE_CONTENT_PACK.titles.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-black/[0.06] bg-[#faf9f5] hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-3">
                            <span className="font-mono text-xs font-semibold text-neutral-400 w-5">
                              0{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-[#1a1a1a] truncate">
                              {item.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              CTR {item.predictedCtr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPreviewText(item.text, idx)}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors cursor-pointer"
                              aria-label="Copy title"
                            >
                              {copiedTitleIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewTab === 'hooks' && (
                    <div className="space-y-2.5">
                      {SAMPLE_CONTENT_PACK.hooks.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-black/[0.06] bg-[#faf9f5] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-semibold text-[#d4a017] uppercase">
                              {item.type} Formula
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPreviewText(item.hook, idx + 10)}
                              className="text-[11px] font-mono text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          <p className="text-xs font-medium text-neutral-900 italic leading-relaxed">
                            "{item.hook}"
                          </p>
                          <div className="text-[11px] text-neutral-500">
                            <span className="font-semibold text-neutral-700">Director Tip:</span> {item.deliveryTip}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewTab === 'shorts' && (
                    <div className="p-3.5 rounded-xl border border-black/[0.06] bg-[#faf9f5] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                        <span className="font-serif text-xs font-semibold text-neutral-900">
                          {SAMPLE_CONTENT_PACK.shortsScript.title}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {SAMPLE_CONTENT_PACK.shortsScript.duration}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {SAMPLE_CONTENT_PACK.shortsScript.body.slice(0, 2).map((beat, bIdx) => (
                          <div key={bIdx} className="p-2.5 bg-white rounded-lg border border-black/[0.06]">
                            <span className="font-mono text-[10px] text-neutral-400 block mb-0.5">{beat.second}</span>
                            <p className="text-neutral-800 font-medium leading-snug">"{beat.audio}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewTab === 'description' && (
                    <div className="p-3.5 rounded-xl border border-black/[0.06] bg-[#faf9f5] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                        <span className="font-mono text-[11px] font-semibold text-neutral-700 uppercase">
                          Formatted Chapter Timestamps
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPreviewText(SAMPLE_CONTENT_PACK.description.timestamps.map(t => `${t.time} - ${t.label}`).join('\n'), 30)}
                          className="text-[11px] font-mono text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy Chapters
                        </button>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px] text-neutral-700">
                        {SAMPLE_CONTENT_PACK.description.timestamps.slice(0, 3).map((item, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-2">
                            <span className="text-[#d4a017] font-semibold">{item.time}</span>
                            <span>-</span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-black/[0.06] flex items-center gap-1.5 flex-wrap">
                        {SAMPLE_CONTENT_PACK.hashtags.slice(0, 4).map((tag, hIdx) => (
                          <span key={hIdx} className="text-[10px] font-mono text-neutral-500 bg-white px-2 py-0.5 rounded border border-black/[0.06]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Action */}
              <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-sans">9 output formats generated per seed idea</span>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigate('dashboard')}
                  className="font-mono text-xs font-semibold text-[#1a1a1a] hover:text-[#d4a017] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Open Studio Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CREATOR PAIN POINTS SECTION */}
      <section id="pain-points" className="py-20 bg-white/80 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Overcome Creation Friction
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              You're Putting in the Work. Let's Make Every Video Count.
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              Growing a YouTube channel requires consistency, but creator burnout starts with guesswork. Here is how CreatorFlow AI solves everyday production bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pain Point 1: Running out of video ideas */}
            <div className="p-6 sm:p-8 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4 hover:border-black/[0.15] transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-700 text-xs font-mono font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>CREATOR STRUGGLE: Running out of video ideas</span>
                </div>
                <h3 className="text-xl font-serif font-normal text-neutral-900">
                  Staring at a blank screen wondering what to film next
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Brainstorming in a vacuum leads to erratic uploads and viewer fatigue. You need topic angles grounded in genuine audience interest.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-black/[0.06] space-y-1.5 border-l-2 border-l-[#d4a017]">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#d4a017] font-semibold">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>CREATORFLOW SOLUTION: Topic Strategist &amp; Retention Ideation</span>
                </div>
                <p className="text-xs text-neutral-700 leading-snug font-sans">
                  Evaluates curiosity gaps, competitor saturation, and topic feasibility in your specific niche so you always have high-potential ideas ready.
                </p>
              </div>
            </div>

            {/* Pain Point 2: Struggling to write compelling titles */}
            <div className="p-6 sm:p-8 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4 hover:border-black/[0.15] transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-700 text-xs font-mono font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>CREATOR STRUGGLE: Struggling to write compelling titles</span>
                </div>
                <h3 className="text-xl font-serif font-normal text-neutral-900">
                  Great video content that fails to get clicked
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Long, truncated titles get ignored on mobile feeds, while weak openers lose viewer attention in the first 5 seconds.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-black/[0.06] space-y-1.5 border-l-2 border-l-[#d4a017]">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#d4a017] font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>CREATORFLOW SOLUTION: CTR Title &amp; Hook Engine</span>
                </div>
                <p className="text-xs text-neutral-700 leading-snug font-sans">
                  Generates mobile-optimized title formulas under 60 characters paired with spoken opening hooks designed to stabilize early watch time.
                </p>
              </div>
            </div>

            {/* Pain Point 3: Spending too much time preparing uploads */}
            <div className="p-6 sm:p-8 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4 hover:border-black/[0.15] transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-700 text-xs font-mono font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>CREATOR STRUGGLE: Spending too much time preparing uploads</span>
                </div>
                <h3 className="text-xl font-serif font-normal text-neutral-900">
                  Spending 45 minutes manually typing tags and chapters
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Exporting videos is only half the battle. Manually writing descriptions, timestamps, hashtags, and shot notes wastes valuable creation time.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-black/[0.06] space-y-1.5 border-l-2 border-l-[#d4a017]">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#d4a017] font-semibold">
                  <Clapperboard className="w-3.5 h-3.5" />
                  <span>CREATORFLOW SOLUTION: Publishing Studio &amp; Creation Kits</span>
                </div>
                <p className="text-xs text-neutral-700 leading-snug font-sans">
                  Outputs complete upload packages with YouTube-formatted timestamps, tags, teleprompter scripts, and shot-by-shot multi-clip Creation Kits.
                </p>
              </div>
            </div>

            {/* Pain Point 4: Not knowing what to improve next */}
            <div className="p-6 sm:p-8 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4 hover:border-black/[0.15] transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-700 text-xs font-mono font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>CREATOR STRUGGLE: Not knowing what to improve next</span>
                </div>
                <h3 className="text-xl font-serif font-normal text-neutral-900">
                  Uncertainty after pressing publish on a video
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Publishing one video without a follow-up strategy breaks channel momentum and leaves series storylines unfinished.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-black/[0.06] space-y-1.5 border-l-2 border-l-[#d4a017]">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#d4a017] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>CREATORFLOW SOLUTION: Next Video Intelligence</span>
                </div>
                <p className="text-xs text-neutral-700 leading-snug font-sans">
                  Provides contextual next-step recommendations based on your completed projects, viewer retention models, and series progression.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ASPIRATION SECTION */}
      <section id="aspiration" className="py-20 bg-[#faf9f5]/90 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Copy & Disclaimer */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-mono font-semibold text-[#d4a017] uppercase tracking-wider">
                <span>SUSTAINABLE CHANNEL MILESTONES</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#1a1a1a] leading-tight">
                Every Big Channel Starts with One Video.
              </h2>

              <p className="text-base sm:text-lg text-neutral-700 font-sans leading-relaxed">
                10 subscribers. 100 subscribers. 1,000. Maybe 10,000 and beyond.
              </p>

              <p className="text-sm sm:text-base text-neutral-600 font-sans leading-relaxed">
                Every creator starts somewhere. CreatorFlow AI helps you plan content, prepare uploads, and build a repeatable creation workflow as your channel grows.
              </p>

              {/* Milestone Progression Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 font-mono text-xs">
                <div className="p-3 bg-white rounded-xl border border-black/[0.06] text-center">
                  <span className="text-neutral-400 block text-[10px] uppercase">Stage 1</span>
                  <span className="font-semibold text-neutral-900 block mt-0.5">10 Subs</span>
                  <span className="text-[10px] text-neutral-500">First Steps</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-black/[0.06] text-center">
                  <span className="text-neutral-400 block text-[10px] uppercase">Stage 2</span>
                  <span className="font-semibold text-neutral-900 block mt-0.5">100 Subs</span>
                  <span className="text-[10px] text-neutral-500">Core Audience</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-black/[0.06] text-center">
                  <span className="text-neutral-400 block text-[10px] uppercase">Stage 3</span>
                  <span className="font-semibold text-neutral-900 block mt-0.5">1,000 Subs</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Monetization</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-black/[0.06] text-center">
                  <span className="text-neutral-400 block text-[10px] uppercase">Stage 4</span>
                  <span className="font-semibold text-neutral-900 block mt-0.5">10,000+</span>
                  <span className="text-[10px] text-[#d4a017] font-semibold">Scale Engine</span>
                </div>
              </div>

              {/* Transparent Disclaimer */}
              <div className="p-4 rounded-xl bg-white/80 border border-black/[0.08] flex items-start gap-3 text-xs text-neutral-600 font-sans leading-relaxed">
                <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-800 block mb-0.5 font-mono text-[11px] uppercase">Transparent Creator Promise</span>
                  CreatorFlow AI cannot guarantee subscribers, views, monetization, or earnings. Results depend on your content, audience, consistency, and execution.
                </div>
              </div>
            </div>

            {/* Right: High-Fidelity Creator Workspace Visual */}
            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-black/[0.08] shadow-sm relative group bg-neutral-900 min-h-[360px]">
              <img
                src="/images/creator_milestone_workspace_1793104341202.jpg"
                alt="Minimalist YouTube Creator Studio Editing Workspace"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-white">
                <span className="font-mono text-[10px] text-[#d4a017] uppercase tracking-widest font-semibold mb-1">
                  Structured Creator Workspace
                </span>
                <p className="text-sm font-serif text-white/95 leading-snug">
                  Build a sustainable creation system designed for compounding channel growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SOCIAL PROOF / REAL CREATOR CHALLENGES SECTION */}
      <section id="social-proof" className="py-20 bg-white/85 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Designed for Real Workflows
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              Built for the Challenges Real Creators Face
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              No fabricated testimonials or inflated vanity claims. CreatorFlow AI is engineered around the everyday operational realities of solo YouTubers and video teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Real Challenge 1: The Upload Admin Friction */}
            <div className="p-6 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center text-[#d4a017]">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-normal text-neutral-900">
                  Eliminating Upload Friction
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Instead of spending 45 minutes manually typing chapters, SEO tags, and community questions after filming, CreatorFlow formats complete packages instantly.
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] text-[11px] font-mono text-neutral-500">
                Focus: Save creation time on every video
              </div>
            </div>

            {/* Real Challenge 2: Mobile Search Cutoff */}
            <div className="p-6 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center text-[#d4a017]">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-normal text-neutral-900">
                  Mobile Search &amp; CTR Optimization
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Over 70% of YouTube watch time happens on mobile devices. Titles are formulated under 60 characters so core curiosity triggers never get truncated.
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] text-[11px] font-mono text-neutral-500">
                Focus: Mobile feed visibility &amp; click-through
              </div>
            </div>

            {/* Real Challenge 3: Multi-Clip AI Continuity */}
            <div className="p-6 rounded-2xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center text-[#d4a017]">
                  <Clapperboard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-normal text-neutral-900">
                  Multi-Clip Video Creation Kits
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Translates high-level video outlines into shot-by-shot visual prompts calibrated specifically for Google Flow, Kling, Pika, and Leonardo engines.
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] text-[11px] font-mono text-neutral-500">
                Focus: Shot-by-shot visual production
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (THE 5-STEP WORKFLOW) */}
      <section id="how-it-works" className="py-20 bg-[#faf9f5]/80 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              The 5-Step Creator Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              How It Works: 5 Steps from Idea to Upload
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              A systematic pipeline that eliminates blank-screen paralysis and streamlines content creation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Step 1: Discover */}
            <div className="p-5 rounded-2xl border border-black/[0.08] bg-white flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#d4a017] font-normal block mb-2">01</span>
                <h3 className="text-base font-serif font-semibold text-neutral-900 mb-1">Discover</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Spot high-potential topic angles, seasonal trends, and content gaps in your niche using Topic Strategist and Content Radar.
                </p>
              </div>
              <span className="pt-3 text-[10px] font-mono text-neutral-400 border-t border-black/[0.06] mt-3 block">
                Feature: Content Radar &amp; Ideation
              </span>
            </div>

            {/* Step 2: Analyze */}
            <div className="p-5 rounded-2xl border border-black/[0.08] bg-white flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#d4a017] font-normal block mb-2">02</span>
                <h3 className="text-base font-serif font-semibold text-neutral-900 mb-1">Analyze</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Evaluate curiosity gaps, premise strength, and creator fit scores before writing a single word.
                </p>
              </div>
              <span className="pt-3 text-[10px] font-mono text-neutral-400 border-t border-black/[0.06] mt-3 block">
                Feature: Premise Scoring &amp; Fit
              </span>
            </div>

            {/* Step 3: Create */}
            <div className="p-5 rounded-2xl border border-black/[0.08] bg-white flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#d4a017] font-normal block mb-2">03</span>
                <h3 className="text-base font-serif font-semibold text-neutral-900 mb-1">Create</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Draft CTR-engineered title variations, first-5-second retention hooks, and timed Shorts beat sheets.
                </p>
              </div>
              <span className="pt-3 text-[10px] font-mono text-neutral-400 border-t border-black/[0.06] mt-3 block">
                Feature: Title &amp; Hook Engine
              </span>
            </div>

            {/* Step 4: Prepare */}
            <div className="p-5 rounded-2xl border border-black/[0.08] bg-white flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#d4a017] font-normal block mb-2">04</span>
                <h3 className="text-base font-serif font-semibold text-neutral-900 mb-1">Prepare</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Format shot-by-shot Creation Kits, voice guides, formatted timestamps, SEO tags, and teleprompter scripts.
                </p>
              </div>
              <span className="pt-3 text-[10px] font-mono text-neutral-400 border-t border-black/[0.06] mt-3 block">
                Feature: Publishing Studio
              </span>
            </div>

            {/* Step 5: Improve */}
            <div className="p-5 rounded-2xl border border-black/[0.08] bg-white flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#d4a017] font-normal block mb-2">05</span>
                <h3 className="text-base font-serif font-semibold text-neutral-900 mb-1">Improve</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Track internal production velocity and unlock Next Video Intelligence recommendations for your next upload.
                </p>
              </div>
              <span className="pt-3 text-[10px] font-mono text-neutral-400 border-t border-black/[0.06] mt-3 block">
                Feature: Next Video Intelligence
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT DEMONSTRATION SECTION */}
      <section id="demo" className="py-20 bg-white/75 backdrop-blur-[1px] border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Interactive Transformation
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              From Seed Topic to Production Package
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              Test how CreatorFlow takes a rough topic concept and structures it into ideas, hooks, multi-clip director notes, and SEO chapters.
            </p>
          </div>

          <InteractiveDemo onStartCreating={() => handleProtectedNavigate('dashboard')} />
        </div>
      </section>

      {/* FEATURE SHOWCASE (BENTO-GRID OF REAL FEATURES) */}
      <section id="features" className="py-20 bg-[#faf9f5]/80 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Full Workspace Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              Engineered for YouTube Growth &amp; Production Depth
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              Every tool in CreatorFlow is mapped directly to real YouTube creator workflows, from discovery to upload.
            </p>
          </div>

          {/* BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feature 1: Creation Kits */}
            <div className="md:col-span-8 bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider">
                    01. Shot-by-Shot Creation Kits
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">Pro · Creator · MAX</span>
                </div>
                <h3 className="text-2xl font-serif font-normal text-[#1a1a1a]">
                  Multi-Clip Video Director &amp; Tool Calibration
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed font-sans max-w-xl">
                  Break 30-second to 2-minute videos into discrete 5-to-10 second camera setups. Every prompt includes camera trajectory, motion parameters, and lighting calibrated specifically for engines like Google Flow, Kling, Pika, and Leonardo.
                </p>
              </div>

              <div className="mt-6 rounded-xl overflow-hidden border border-black/[0.08] max-h-64 relative group">
                <img
                  src="/images/feature_creation_kit_1791540588196.jpg"
                  alt="Multi-clip Creation Kit cinematography layout"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 flex items-end">
                  <span className="font-mono text-xs text-white">Continuity locks &amp; motion parameters per shot</span>
                </div>
              </div>
            </div>

            {/* Feature 2: High-CTR Titles & Hooks */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider block">
                  02. Titles, Hooks &amp; Thumbnails
                </span>
                <h3 className="text-2xl font-serif font-normal text-[#1a1a1a]">
                  50-Character Mobile Cutoff &amp; Visual Frames
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Never get truncated on mobile search. Generates title formulas under 60 characters, pairs them with first-5-second retention hooks, and prescribes high-contrast thumbnail framing concepts.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="p-2.5 bg-[#faf9f5] rounded-lg border border-black/[0.06] text-xs">
                    <span className="font-mono text-[10px] text-neutral-400 block">Curiosity Loop Title</span>
                    <span className="font-medium text-neutral-900">"Why You Can't Run in Dreams"</span>
                  </div>
                  <div className="p-2.5 bg-[#faf9f5] rounded-lg border border-black/[0.06] text-xs">
                    <span className="font-mono text-[10px] text-neutral-400 block">Thumbnail Directives</span>
                    <span className="text-neutral-700 font-mono text-[11px]">Rule of thirds, 3-word focal text, 65% subject contrast</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] text-xs text-neutral-500 font-mono">
                Included in Free &amp; All Paid Plans
              </div>
            </div>

            {/* Feature 3: Visual Continuity */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider">
                    03. Visual Continuity
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">Pro+</span>
                </div>
                <h3 className="text-2xl font-serif font-normal text-[#1a1a1a]">
                  Character &amp; Style Bibles
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Maintain the same recurring protagonist, clothing palettes, and cinematic lighting setups across all clips in your video series.
                </p>

                <div className="rounded-xl overflow-hidden border border-black/[0.08] h-40 relative">
                  <img
                    src="/images/feature_style_bible_1791540601183.jpg"
                    alt="Character Bible and Style Consistency cards"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] text-xs text-neutral-500 font-mono">
                Style Bible · Character Consistency locks
              </div>
            </div>

            {/* Feature 4: Daily Content Radar */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider">
                    04. Curated Discovery
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">Creator &amp; MAX</span>
                </div>
                <h3 className="text-2xl font-serif font-normal text-[#1a1a1a]">
                  Daily Content Radar
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Transparent curated discovery data tracking emerging formats, content gaps, and seasonal creator opportunities in your specific niche.
                </p>

                <div className="rounded-xl overflow-hidden border border-black/[0.08] h-40 relative">
                  <img
                    src="/images/feature_content_radar_1791540615466.jpg"
                    alt="Content Radar Opportunity Analysis"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] text-xs text-neutral-500 font-mono">
                Curated discovery · Gap analysis
              </div>
            </div>

            {/* Feature 5: Next Video Intelligence */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider">
                    05. Strategic Next Steps
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">Creator &amp; MAX</span>
                </div>
                <h3 className="text-2xl font-serif font-normal text-[#1a1a1a]">
                  Next Video Intelligence
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  Contextual recommendations based on your completed projects, target viewer retention profiles, and series storylines.
                </p>

                <div className="p-3.5 bg-[#faf9f5] rounded-xl border border-black/[0.06] space-y-1.5 text-xs">
                  <span className="font-mono text-[10px] text-emerald-700 font-semibold uppercase">Follow-Up Recommendation</span>
                  <p className="font-medium text-neutral-900 leading-snug">"Part 2: What Happens to the Brain During Sleep Paralysis?"</p>
                  <p className="text-[11px] text-neutral-500">Based on high curiosity gap in Part 1.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] text-xs text-neutral-500 font-mono">
                Series progression &amp; Viewer retention
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EARLY BETA ACCESS & WORKFLOW SHOWCASE STRIP */}
      <section aria-labelledby="beta-strip-heading" className="py-16 bg-white/90 border-b border-black/[0.06] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block">
              Early Beta Program
            </span>
            <h2 id="beta-strip-heading" className="text-2xl sm:text-3xl font-serif font-normal text-[#1a1a1a]">
              Built Transparently With Founding Creators
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 font-sans leading-relaxed">
              CreatorFlow AI is in open early beta. Every workflow pillar below runs live in your browser or verified server session with zero fabricated channel claims.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMarqueePaused((p) => !p)}
            aria-pressed={isMarqueePaused}
            aria-label={isMarqueePaused ? 'Resume beta workflow strip motion' : 'Pause beta workflow strip motion'}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-black/[0.12] bg-[#faf9f5] hover:bg-white text-xs font-mono text-[#1a1a1a] transition-colors cursor-pointer shrink-0"
          >
            {isMarqueePaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Resume Strip</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-[#d4a017]" />
                <span>Pause Strip</span>
              </>
            )}
          </button>
        </div>

        {/* Accessible Continuous Strip (hover/focus/pause/prefers-reduced-motion aware) */}
        <div className="w-full overflow-hidden py-2">
          <div className={`cf-marquee-track gap-4 px-4 ${isMarqueePaused ? 'cf-marquee-paused' : ''}`}>
            {[0, 1].map((dupIdx) => (
              <div
                key={dupIdx}
                className="flex items-stretch gap-4 shrink-0"
                aria-hidden={dupIdx === 1}
              >
                {[
                  {
                    tag: '01 · Creation Kits',
                    title: 'Shot-by-Shot Video Blueprints',
                    desc: 'Turn an idea into timeline clips calibrated for Runway, Luma, Kling, Sora, HeyGen, or Pika.',
                  },
                  {
                    tag: '02 · 20 Languages',
                    title: 'Native Script & Tanglish Framing',
                    desc: 'Authentic templates and script support across English, Tamil, Hindi, Tanglish, Telugu, Kannada, and more.',
                  },
                  {
                    tag: '03 · Prompt Guard',
                    title: 'Pre-Export Prompt Validator',
                    desc: 'Automatically strips unsupported negative syntax and flags missing placeholders before copying.',
                  },
                  {
                    tag: '04 · Situation Lab',
                    title: 'Grounded Channel Diagnostics',
                    desc: 'Separates verified studio evidence from testable hypotheses when views or retention dip.',
                  },
                  {
                    tag: '05 · Honest Metrics',
                    title: 'Channel Baseline Comparisons',
                    desc: 'Compares your own entered YouTube Studio logs rather than inventing arbitrary benchmarks.',
                  },
                  {
                    tag: '06 · Free Tier',
                    title: '2 Rolling Weekly Video Starts',
                    desc: 'Start creating with ₹0 required and test the full workflow before choosing an upgraded plan.',
                  },
                ].map((pillar) => (
                  <div
                    key={`${dupIdx}-${pillar.tag}`}
                    className="w-72 sm:w-80 shrink-0 rounded-xl border border-black/[0.08] bg-[#faf9f5] p-5 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#d4a017]">
                        {pillar.tag}
                      </span>
                      <h3 className="font-serif text-lg font-normal text-[#1a1a1a] leading-snug">
                        {pillar.title}
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                        {pillar.desc}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 pt-2 border-t border-black/[0.06]">
                      Available in Early Beta
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Beta Experience Preview & Direct Feedback Invite */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <div className="rounded-2xl border border-black/[0.08] bg-[#faf9f5] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#d4a017]" />
                <span className="font-mono text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                  Interactive Beta Feedback Preview
                </span>
              </div>
              <p className="text-xs text-neutral-600 font-sans max-w-xl">
                Testing the landing preview or studio tools? Select a quick workflow clarity rating below or send feature requests directly to the product team.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5" role="group" aria-label="Rate this beta workflow preview from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = betaPreviewRating >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setBetaPreviewRating(star);
                        toast('Preview Rating Noted', `Thanks for previewing CreatorFlow Beta (${star}/5 clarity rating).`, 'success');
                      }}
                      aria-label={`Rate ${star} out of 5 stars`}
                      aria-pressed={betaPreviewRating === star}
                      className="p-1 rounded hover:bg-black/[0.05] transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          active ? 'text-[#d4a017] fill-[#d4a017]' : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  );
                })}
                {betaPreviewRating > 0 && (
                  <span className="ml-1.5 font-mono text-[11px] text-neutral-600">
                    {betaPreviewRating}/5 preview
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Share Beta Feedback
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PLAN COMPARISON & PRICING */}
      <section id="pricing" className="py-20 bg-[#faf9f5]/85 border-b border-black/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              Honest Plans for Growing Creators
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans max-w-xl mx-auto">
              Start free with zero credit card required, or expand your creator volume with strategic workflows.
            </p>

            {/* Annual vs Monthly Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 p-1.5 bg-white rounded-xl border border-black/[0.08] shadow-xs">
              <button
                type="button"
                onClick={() => setIsAnnualBilling(false)}
                className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  !isAnnualBilling ? 'bg-[#1a1a1a] text-white font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnualBilling(true)}
                className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isAnnualBilling ? 'bg-[#1a1a1a] text-white font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-semibold text-[#d4a017] bg-[#1a1a1a]/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnualBilling}
                isCurrent={user?.plan === plan.id}
                onSelect={() => handleSelectPlan(plan.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 bg-white/85 border-b border-black/[0.06] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="font-mono text-xs font-semibold text-[#d4a017] uppercase tracking-widest block mb-2">
              Clear Answers
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#1a1a1a] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-neutral-600 font-sans">
              Everything you need to know about CreatorFlow AI workflows, plans, and creator limits.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-black/[0.08] bg-[#faf9f5] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-serif text-base sm:text-lg font-normal text-[#1a1a1a] flex items-center justify-between gap-4 cursor-pointer hover:bg-white/60"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                      activeFaq === idx ? 'rotate-180 text-[#d4a017]' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-600 font-sans leading-relaxed border-t border-black/[0.04] bg-white/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA SECTION */}
      <section className="py-20 bg-[#1a1a1a] text-white relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#d4a017] text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>START YOUR NEXT YOUTUBE PROJECT</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Your Next Upload Is Waiting.
          </h2>

          <p className="text-neutral-400 text-sm sm:text-base max-w-lg mx-auto font-sans leading-relaxed">
            Turn your next idea into a content package you can work with. Start planning, create with purpose, and keep improving.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleProtectedNavigate('dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider px-8 h-12 bg-[#d4a017] hover:bg-[#b8890f] text-white shadow-sm"
            >
              Create My Next Video
            </Button>
            {!user && onOpenAuth && (
              <GoogleSignInButton
                onClick={onOpenAuth}
                size="md"
                className="w-full sm:w-auto h-12 px-6"
              />
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigate('tools')}
              className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider px-7 h-12 bg-transparent text-white border-white/20 hover:bg-white/10 text-white"
            >
              Browse 9 YouTube Tools
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#faf9f5] border-t border-black/[0.06] py-12 px-4 sm:px-6 font-sans text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-black/[0.06]">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-normal text-neutral-900">CreatorFlow</span>
              <span className="font-mono text-[10px] font-semibold bg-[#1a1a1a] text-white px-1.5 py-0.5">AI</span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
              YouTube content strategy and production workspace. Turn ideas into high-retention titles, hooks, Creation Kits, and publishing packages.
            </p>
            <div className="text-[11px] font-mono text-neutral-400">
              India &amp; Global Vernacular Creator Architecture
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-800 font-semibold block">
              Workspace
            </span>
            <ul className="space-y-1.5 text-xs text-neutral-600">
              <li>
                <button type="button" onClick={() => handleProtectedNavigate('dashboard')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Strategy Dashboard
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleProtectedNavigate('radar')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Daily Content Radar
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleProtectedNavigate('tools')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  9 YouTube Tools
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleProtectedNavigate('analytics')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Creator Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Pricing & Support */}
          <div className="md:col-span-4 space-y-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-800 font-semibold block">
              Plans &amp; Transparency
            </span>
            <ul className="space-y-1.5 text-xs text-neutral-600">
              <li>
                <button type="button" onClick={() => onNavigate('pricing')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Plan Comparison &amp; Pricing
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleProtectedNavigate('settings')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Account Settings &amp; Providers
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('contact')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Contact &amp; Support
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('terms')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('refund-policy')} className="hover:text-neutral-900 transition-colors cursor-pointer">
                  Refund &amp; Cancellation Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400 font-mono">
          <div>
            &copy; {new Date().getFullYear()} CreatorFlow AI. All rights reserved.
          </div>
          <div>
            Independent YouTube creator workspace. Not affiliated with or endorsed by YouTube or Google LLC.
          </div>
        </div>
      </footer>

      {/* Plan Upgrade Request Modal */}
      {upgradeTargetPlan && (
        <PlanUpgradeModal
          isOpen={Boolean(upgradeTargetPlan)}
          onClose={() => setUpgradeTargetPlan(null)}
          targetPlanId={upgradeTargetPlan}
          isAnnual={isAnnualBilling}
        />
      )}
    </div>
  );
};
