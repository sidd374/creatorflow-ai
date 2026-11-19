import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Youtube, 
  Clock, 
  Target, 
  Wrench, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Smartphone,
  Video,
  Smile,
  Laptop
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { CreatorProfile, CreatorStage } from '../../types';
import { saveCreatorProfile } from '../../lib/creatorStorage';
import { trackEvent } from '../../lib/analyticsService';

interface OnboardingViewProps {
  initialProfile?: CreatorProfile;
  onComplete: (profile: CreatorProfile) => void;
  onCancel?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialProfile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [channelExists, setChannelExists] = useState<'yes' | 'no' | 'dormant'>(
    initialProfile?.channelExists || 'no'
  );
  const [channelTopic, setChannelTopic] = useState(initialProfile?.channelTopic || '');
  const [subscriberRange, setSubscriberRange] = useState(initialProfile?.subscriberRange || '0–100');
  const [uploadFrequency, setUploadFrequency] = useState(initialProfile?.uploadFrequency || 'Weekly');

  const [primaryGoal, setPrimaryGoal] = useState(initialProfile?.primaryGoal || 'Grow subscribers');
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>(
    initialProfile?.secondaryGoals || ['Get more views']
  );
  const [goalTimeline, setGoalTimeline] = useState(initialProfile?.goalTimeline || '6 months');

  const [contentCategories, setContentCategories] = useState<string[]>(
    initialProfile?.contentCategories || ['Tutorials', 'Tech']
  );
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Some experience' | 'Comfortable' | 'Advanced'>(
    initialProfile?.experienceLevel || 'Beginner'
  );
  const [creatorStyle, setCreatorStyle] = useState(
    initialProfile?.creatorStyle || 'Educational creator'
  );

  const [dailyTimeAvailable, setDailyTimeAvailable] = useState(
    initialProfile?.dailyTimeAvailable || '1–2 hours/day'
  );
  const [availableDevices, setAvailableDevices] = useState<string[]>(
    initialProfile?.availableDevices || ['Phone', 'Laptop / PC']
  );
  const [monthlyBudget, setMonthlyBudget] = useState(
    initialProfile?.monthlyBudget || '₹0 — Free only'
  );

  const [aiExperience, setAiExperience] = useState(
    initialProfile?.aiExperience || 'Sometimes'
  );
  const [aiNeeds, setAiNeeds] = useState<string[]>(
    initialProfile?.aiNeeds || ['Ideas', 'Scripts', 'Thumbnails', 'SEO']
  );
  const [productionMethods, setProductionMethods] = useState<string[]>(
    initialProfile?.productionMethods || ['Faceless narration and voiceover']
  );
  const [onCamera, setOnCamera] = useState<boolean>(
    typeof initialProfile?.onCamera === 'boolean' ? initialProfile.onCamera : false
  );
  const [aiWorkflow, setAiWorkflow] = useState<string>(
    initialProfile?.aiWorkflow || ''
  );
  const [preferredLanguage, setPreferredLanguage] = useState<string>(
    initialProfile?.preferredLanguage || 'English'
  );
  const [targetAudience, setTargetAudience] = useState<string>(
    initialProfile?.targetAudience || ''
  );

  // Step names
  const STEPS = [
    { num: 1, title: 'Profile' },
    { num: 2, title: 'Channel' },
    { num: 3, title: 'Goals' },
    { num: 4, title: 'Resources' },
    { num: 5, title: 'Preferences' },
    { num: 6, title: 'Plan' },
  ];

  const toggleArrayItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  // Derive Creator Stage
  const getCreatorStage = (): CreatorStage => {
    if (channelExists === 'no') return 'New Creator';
    if (channelExists === 'dormant') return 'Reviving Channel';
    if (subscriberRange === '10K–100K' || subscriberRange === '100K+') return 'Established Creator';
    return 'Growing Creator';
  };

  // Calculate Best Format recommendation
  const getRecommendedFormat = () => {
    if (dailyTimeAvailable.includes('Under 30') || dailyTimeAvailable.includes('30–60') || creatorStyle.includes('Short-form')) {
      return 'Shorts + Micro Guides';
    }
    if (experienceLevel === 'Beginner') {
      return 'Shorts + Short Tutorials (3–5 min)';
    }
    return 'Actionable Tutorials & Case Studies (5–10 min)';
  };

  // Calculate recommended pace
  const getRecommendedUploadPace = () => {
    if (dailyTimeAvailable.includes('Under 30')) return '1–2 Shorts / week';
    if (dailyTimeAvailable.includes('30–60')) return '2–3 Shorts or 1 Long-form / week';
    if (dailyTimeAvailable.includes('1–2 hours')) return '2–3 videos / week';
    return '3–5 videos / week';
  };

  const handleFinishOnboarding = () => {
    const selectedMethods =
      productionMethods.length > 0 ? productionMethods : ['Faceless narration and voiceover'];
    const finalProfile: CreatorProfile = {
      channelExists,
      channelTopic: channelTopic.trim() || 'General YouTube Content',
      niche: channelTopic.trim() || initialProfile?.niche || 'General YouTube Content',
      targetAudience: targetAudience.trim() || initialProfile?.targetAudience || 'Curious YouTube viewers',
      subscriberRange,
      uploadFrequency,
      creatorStage: getCreatorStage(),
      primaryGoal,
      secondaryGoals,
      goalTimeline,
      contentCategories: contentCategories.length > 0 ? contentCategories : ['Tutorials'],
      experienceLevel,
      dailyTimeAvailable,
      availableDevices: availableDevices.length > 0 ? availableDevices : ['Phone'],
      availableTools: monthlyBudget.includes('₹0') ? ['CapCut (Free)', 'Canva (Free)'] : ['Premiere / CapCut'],
      monthlyBudget,
      aiExperience,
      aiNeeds,
      creatorStyle,
      productionMethods: selectedMethods,
      primaryProductionMethod: selectedMethods[0],
      onCamera,
      aiWorkflow: aiWorkflow.trim() || undefined,
      preferredLanguage: preferredLanguage.trim() || initialProfile?.preferredLanguage || 'English',
      preferredPlatform: creatorStyle.includes('Short-form') ? 'Shorts' : 'YouTube',
      onboardingCompleted: true,
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCreatorProfile(finalProfile);
    trackEvent('onboarding_completed', {
      properties: {
        creatorStage: finalProfile.creatorStage,
        experienceLevel: finalProfile.experienceLevel,
        channelTopic: finalProfile.channelTopic,
        primaryProductionMethod: finalProfile.primaryProductionMethod,
        onCamera: finalProfile.onCamera,
      },
    });
    onComplete(finalProfile);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-6 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Editorial Hero */}
      <section className="text-center mb-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4a017] font-semibold mb-2 block">
          The Strategy Blueprint
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-normal leading-[1.15] tracking-tight text-[#1a1a1a] mb-2.5">
          Let's build your creator plan.
        </h1>
        <p className="font-sans text-neutral-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          Answer a few questions so CreatorFlow can recommend video ideas and workflows that actually fit your time, skills, and goals.
        </p>
      </section>

      {/* Editorial Stepper */}
      <div className="flex justify-center gap-3 sm:gap-6 mb-8 border-b border-black/[0.06] pb-3 overflow-x-auto">
        {STEPS.map((s) => {
          const isCurrent = step === s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`font-mono text-xs tracking-wider uppercase whitespace-nowrap pb-3 transition-all ${
                isCurrent
                  ? 'text-[#d4a017] border-b-2 border-[#d4a017] font-semibold -mb-[13px] opacity-100'
                  : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/80 opacity-50'
              }`}
            >
              0{s.num} {s.title}
            </button>
          );
        })}
      </div>

      {/* Step Container Card */}
      <div className="border border-black/[0.07] bg-white p-6 sm:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
        <div>
          {/* STEP 1: CREATOR STATUS */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
                  Do you already have a YouTube channel?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  This tells us if we are building momentum or starting fresh.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {[
                  {
                    id: 'yes',
                    title: 'Yes, I have one',
                    desc: 'Actively posting or growing my audience',
                  },
                  {
                    id: 'no',
                    title: 'No, starting fresh',
                    desc: 'Planning my very first set of videos',
                  },
                  {
                    id: 'dormant',
                    title: 'Restarting',
                    desc: "Have a channel but haven't posted in months",
                  },
                ].map((item) => {
                  const isActive = channelExists === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setChannelExists(item.id as any)}
                      className={`p-6 sm:p-8 text-center cursor-pointer border transition-all duration-300 ${
                        isActive
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] shadow-md'
                          : 'border-black/[0.07] bg-white text-[#1a1a1a] hover:border-[#d4a017] hover:shadow-lg hover:-translate-y-1'
                      }`}
                    >
                      <h3 className="font-serif text-xl sm:text-2xl font-normal mb-2">{item.title}</h3>
                      <p className={`text-xs leading-relaxed ${isActive ? 'opacity-80' : 'opacity-70 text-neutral-600'}`}>
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="text-center mt-6">
                <div className="bg-[#eeeae3] px-4 py-2 text-xs border border-[#e2ddd4] inline-block font-sans text-neutral-800">
                  <span className="opacity-60 font-mono text-[10px] uppercase tracking-wider">ASSIGNMENT:</span>{' '}
                  <strong className="font-semibold text-neutral-900">{getCreatorStage().toUpperCase()}</strong> &mdash;{' '}
                  <span>Custom zero-friction setup.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHANNEL DETAILS (If channel exists or dormant) */}
          {step === 2 && (
            <div className="space-y-6">
              {channelExists === 'no' ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                      What will your new channel focus on?
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Give us an idea of your planned topic (e.g. AI tools for students, phone video editing, cooking tips).
                    </p>
                  </div>
                  <input
                    type="text"
                    value={channelTopic}
                    onChange={(e) => setChannelTopic(e.target.value)}
                    placeholder="E.g., AI tools for everyday productivity"
                    className="w-full px-4 py-3 border border-black/[0.12] focus:outline-none focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] text-sm bg-white text-[#1a1a1a]"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">Tell us about your channel</h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Helps CreatorFlow tailor complexity and audience targeting to your current scale.
                    </p>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                      What's your channel about?
                    </label>
                    <input
                      type="text"
                      value={channelTopic}
                      onChange={(e) => setChannelTopic(e.target.value)}
                      placeholder="E.g., Tech reviews, coding tutorials, finance tips"
                      className="w-full px-4 py-3 border border-black/[0.12] focus:outline-none focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] text-sm bg-white text-[#1a1a1a]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                      How many subscribers do you currently have?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {['0–100', '100–1K', '1K–10K', '10K–100K', '100K+'].map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setSubscriberRange(range)}
                          className={`py-2.5 px-3 text-xs font-mono tracking-wider border text-center transition-all ${
                            subscriberRange === range
                              ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                              : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                      How often do you currently upload?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {['Daily', 'Several times a week', 'Weekly', 'Occasionally', 'Almost never'].map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setUploadFrequency(freq)}
                          className={`py-2.5 px-2.5 text-xs font-mono tracking-wider border text-center transition-all ${
                            uploadFrequency === freq
                              ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                              : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CREATOR GOALS */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">What's your primary goal right now?</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Choose one primary outcome. We treat this as a personal goal to guide content recommendations.
                </p>
              </div>

              {/* Primary Goal Radio Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Grow subscribers',
                  'Get more views',
                  'Build a personal brand',
                  'Earn from YouTube',
                  'Reach monetization',
                  'Promote a business',
                  'Build an audience',
                  'Learn content creation',
                  'Create Shorts',
                  'Create long-form videos',
                ].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setPrimaryGoal(goal)}
                    className={`py-3 px-4 text-left border text-xs font-medium transition-all flex items-center justify-between ${
                      primaryGoal === goal
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold shadow-xs'
                        : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                    }`}
                  >
                    <span>{goal}</span>
                    {primaryGoal === goal && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>

              {/* Goal Timeline */}
              <div className="pt-2">
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  How soon do you want to reach your main goal?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['No specific deadline', '3 months', '6 months', '1 year', 'As soon as realistic'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setGoalTimeline(time)}
                      className={`py-2.5 px-2 text-xs font-mono tracking-wider border text-center transition-all ${
                        goalTimeline === time
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-[#eeeae3]/80 border border-[#e2ddd4] text-xs text-[#1a1a1a] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#d4a017]" />
                <span>Transparent commitment: CreatorFlow never promises guaranteed monetization or virality. Recommendations align with good habits and production consistency.</span>
              </div>
            </div>
          )}

          {/* STEP 4: TIME & RESOURCES */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">Time & Production Resources</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Knowing your hardware and available hours prevents recommending overly complex videos.
                </p>
              </div>

              {/* Time Available */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  How much time can you spend creating content?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['Under 30 minutes/day', '30–60 minutes/day', '1–2 hours/day', '2–4 hours/day', '4+ hours/day'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setDailyTimeAvailable(time)}
                      className={`py-2.5 px-3 text-xs font-mono tracking-wider border text-center transition-all ${
                        dailyTimeAvailable === time
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware / Tools Owned */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  What equipment or devices do you currently have? (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Phone', 'Laptop / PC', 'Camera', 'Microphone', 'Video editor', 'Thumbnail editor', 'AI tools', 'Screen recorder', 'None yet'].map((dev) => {
                    const isSelected = availableDevices.includes(dev);
                    return (
                      <button
                        key={dev}
                        type="button"
                        onClick={() => toggleArrayItem(dev, availableDevices, setAvailableDevices)}
                        className={`py-2.5 px-3 text-xs font-mono tracking-wider border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                            : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                        }`}
                      >
                        <span>{dev}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#f8f7f4]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Tool Budget */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  How much are you willing to spend on tools?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['₹0 — Free only', 'Under ₹500/month', '₹500–₹1,000/month', '₹1,000–₹2,500/month', '₹2,500+/month'].map((budget) => (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => setMonthlyBudget(budget)}
                      className={`py-2.5 px-3 text-xs font-mono tracking-wider border text-center transition-all ${
                        monthlyBudget === budget
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                      }`}
                    >
                      {budget}
                    </button>
                  ))}
                </div>
                {monthlyBudget.includes('₹0') && (
                  <p className="text-xs text-[#d4a017] mt-2 font-medium">
                    ✓ Prioritizing 100% free software recommendations (CapCut Free, Canva Free, Audacity, OBS).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: PREFERENCES, STYLE & AI EXPERIENCE */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#1a1a1a]">Creator Style & Experience</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  How comfortable are you with video production and AI workflows?
                </p>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  How comfortable are you with creating videos?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Beginner', 'Some experience', 'Comfortable', 'Advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`py-2.5 px-2 text-xs font-mono tracking-wider border text-center transition-all ${
                        experienceLevel === lvl
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Style */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  What kind of creator do you want to become?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'Fast-growing creator',
                    'Educational creator',
                    'Entertainment creator',
                    'Professional creator',
                    'Personal brand',
                    'Faceless creator',
                    'Short-form creator',
                    'Long-form creator',
                    'Experimenter',
                  ].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setCreatorStyle(style)}
                      className={`py-2.5 px-3 text-xs font-mono tracking-wider border text-center transition-all ${
                        creatorStyle === style
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Production Methods & On-Camera Workflow */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  How do you produce your videos? (Select all that apply — optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Self-recorded presenter videos',
                    'AI presenter/avatar videos',
                    'Fully AI-generated videos',
                    'Faceless narration and voiceover',
                    'Screen recordings and tutorials',
                    'Presentation and slide-based videos',
                    'Mixed/hybrid production',
                  ].map((method) => {
                    const isSel = productionMethods.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => toggleArrayItem(method, productionMethods, setProductionMethods)}
                        className={`py-2 px-2.5 text-xs font-mono tracking-wider border text-left flex items-center justify-between transition-all ${
                          isSel
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                            : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                        }`}
                      >
                        <span>{method}</span>
                        {isSel && <Check className="w-3 h-3 text-[#f8f7f4] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                    Do you appear on camera?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: true, label: 'Yes, On-Camera' },
                      { val: false, label: 'No, Faceless' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setOnCamera(opt.val)}
                        className={`py-2 px-2.5 text-xs font-mono tracking-wider border text-center transition-all ${
                          onCamera === opt.val
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                            : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                    Preferred Output Language
                  </label>
                  <input
                    type="text"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    placeholder="E.g., English, Tamil, Hindi, Spanish"
                    className="w-full px-3 py-2 border border-black/[0.12] focus:outline-none focus:border-[#d4a017] text-xs bg-white text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="E.g., Curious students, busy founders"
                    className="w-full px-3 py-2 border border-black/[0.12] focus:outline-none focus:border-[#d4a017] text-xs bg-white text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                    AI Video Workflow (If applicable)
                  </label>
                  <input
                    type="text"
                    value={aiWorkflow}
                    onChange={(e) => setAiWorkflow(e.target.value)}
                    placeholder="E.g., Runway / Kling + CapCut voiceover"
                    className="w-full px-3 py-2 border border-black/[0.12] focus:outline-none focus:border-[#d4a017] text-xs bg-white text-[#1a1a1a]"
                  />
                </div>
              </div>

              {/* AI Needs */}
              <div>
                <label className="block font-mono text-xs text-neutral-600 uppercase tracking-wider mb-2">
                  What parts of creation would you like AI to assist with?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Ideas', 'Scripts', 'Voiceovers', 'Images', 'Editing', 'Captions', 'Thumbnails', 'SEO'].map((need) => {
                    const isSel = aiNeeds.includes(need);
                    return (
                      <button
                        key={need}
                        type="button"
                        onClick={() => toggleArrayItem(need, aiNeeds, setAiNeeds)}
                        className={`py-2 px-2.5 text-xs font-mono tracking-wider border text-left flex items-center justify-between transition-all ${
                          isSel
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                            : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                        }`}
                      >
                        <span>{need}</span>
                        {isSel && <Check className="w-3 h-3 text-[#f8f7f4]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PERSONALIZED CREATOR SCORECARD */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eeeae3] text-[#1a1a1a] font-mono text-[10px] tracking-wider uppercase border border-[#e2ddd4] mb-2">
                  <Check className="w-3 h-3 text-[#d4a017]" />
                  <span>Analysis Ready</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a] tracking-tight">Your Creator Plan</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Based on your goals and resources, here is your personalized production framework:
                </p>
              </div>

              {/* Scorecard 6-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Creator Stage</div>
                  <div className="font-serif text-xl font-normal text-[#1a1a1a] mt-1">{getCreatorStage()}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{experienceLevel} Level</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Primary Goal</div>
                  <div className="font-serif text-xl font-normal text-[#1a1a1a] mt-1 truncate">{primaryGoal}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Timeline: {goalTimeline}</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Available Time</div>
                  <div className="font-serif text-xl font-normal text-[#1a1a1a] mt-1">{dailyTimeAvailable}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Sustainable routine</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Tool Budget</div>
                  <div className="font-serif text-xl font-normal text-[#1a1a1a] mt-1">{monthlyBudget}</div>
                  <div className="text-[11px] text-[#d4a017] font-medium mt-0.5">Zero costly traps</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Best Format</div>
                  <div className="font-serif text-xl font-normal text-[#d4a017] mt-1">{getRecommendedFormat()}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Optimized for your pace</div>
                </div>

                <div className="p-4 bg-[#f8f7f4] border border-black/[0.07]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Recommended Pace</div>
                  <div className="font-serif text-xl font-normal text-[#1a1a1a] mt-1">{getRecommendedUploadPace()}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Focus on consistency</div>
                </div>
              </div>

              <div className="p-3 bg-[#eeeae3]/80 border border-[#e2ddd4] text-[11px] text-neutral-700 flex items-center justify-between">
                <span>Recommendations are based strictly on the information you provided.</span>
                <span className="font-mono text-neutral-500">Local Profile v3.0</span>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="font-mono text-xs tracking-widest text-[#1a1a1a]/60 hover:text-[#1a1a1a] uppercase transition-colors"
              >
                &larr; BACK
              </button>
            ) : (
              <div>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="font-mono text-xs tracking-widest text-[#1a1a1a]/60 hover:text-[#1a1a1a] uppercase transition-colors"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="font-mono bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] px-8 py-3 text-xs tracking-widest uppercase transition-colors shadow-xs"
              >
                CONTINUE &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="font-mono bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] px-8 py-3 text-xs tracking-widest uppercase transition-colors shadow-md"
              >
                LAUNCH CREATOR DASHBOARD &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
