import React, { useState } from 'react';
import { 
  VideoCreationBrief, 
  DeviceType, 
  PresentationStyleType, 
  RecordingCapabilityType, 
  ExistingAssetType, 
  VideoTypeOption, 
  ProductionLevelType, 
  PrimaryPriorityType, 
  SecondaryPriorityType, 
  VideoBudgetType, 
  AIAssistanceType 
} from '../../types/guidedWorkflow';
import { CreatorProfile } from '../../types';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  Tv, 
  Camera, 
  Gamepad2, 
  Mic, 
  PenTool, 
  Sliders, 
  Layers, 
  ShieldCheck, 
  Info,
  Clock,
  Zap,
  Target,
  FileText
} from 'lucide-react';

interface Step1CreationBriefProps {
  topic: string;
  creatorProfile: CreatorProfile;
  initialBrief: VideoCreationBrief;
  onSaveBrief: (brief: VideoCreationBrief) => void;
  onContinue: () => void;
}

export const Step1CreationBrief: React.FC<Step1CreationBriefProps> = ({
  topic,
  creatorProfile,
  initialBrief,
  onSaveBrief,
  onContinue,
}) => {
  const [subStep, setSubStep] = useState<number>(1); // 1 to 7, or 8 for Summary
  const [brief, setBrief] = useState<VideoCreationBrief>(initialBrief);
  const [showOverridePanel, setShowOverridePanel] = useState(false);

  const updateBrief = (patch: Partial<VideoCreationBrief>) => {
    const next = { ...brief, ...patch, updatedAt: new Date().toISOString() };
    setBrief(next);
    onSaveBrief(next);
  };

  const toggleArrayItem = <T,>(list: T[], item: T): T[] => {
    if (list.includes(item)) {
      const next = list.filter((i) => i !== item);
      return next.length > 0 ? next : [item]; // Keep at least one
    }
    return [...list, item];
  };

  const handleNextSubStep = () => {
    if (subStep < 8) {
      setSubStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onContinue();
    }
  };

  const handlePrevSubStep = () => {
    if (subStep > 1) {
      setSubStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto select-none">
      {/* Top Banner: Reusing Creator Profile */}
      <div className="bg-white border border-black/[0.08] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
                Your Saved Profile
              </span>
              <span className="text-neutral-300">·</span>
              <span className="font-mono text-[11px] text-neutral-500">Auto-configured</span>
            </div>
            <div className="text-neutral-700 font-sans">
              <strong>Skill:</strong> {creatorProfile.experienceLevel} &bull; <strong>Budget:</strong> {creatorProfile.monthlyBudget} &bull; <strong>Time:</strong> {creatorProfile.dailyTimeAvailable} &bull; <strong>Style:</strong> {creatorProfile.creatorStyle}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowOverridePanel(!showOverridePanel)}
            className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] py-1.5 px-3 border border-black/[0.1] bg-[#f8f7f4] self-start sm:self-auto shrink-0 transition-colors"
          >
            {showOverridePanel ? 'Hide Defaults' : 'Change for This Video'}
          </button>
        </div>

        {showOverridePanel && (
          <div className="mt-3 pt-3 border-t border-black/[0.06] text-xs text-neutral-600 space-y-2 bg-[#f8f7f4] p-3">
            <p>
              Adjusting options below customizes <em>this specific video</em> without altering your permanent channel profile settings.
            </p>
          </div>
        )}
      </div>

      {/* Main Form Box */}
      <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Step Header */}
        <div className="text-center max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Video Creation Brief
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-xs text-neutral-500">
              {subStep <= 7 ? `Step ${subStep} of 7` : 'Setup Summary'}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            {subStep === 1 && 'What will you use to create this video?'}
            {subStep === 2 && 'How do you want to present your video?'}
            {subStep === 3 && 'What can you create or record yourself?'}
            {subStep === 4 && 'Do you already have assets for this video?'}
            {subStep === 5 && 'What type of video do you want to make?'}
            {subStep === 6 && 'What kind of production do you want?'}
            {subStep === 7 && 'What is your primary priority?'}
            {subStep === 8 && 'Your Video Setup Summary'}
          </h2>

          <p className="text-xs text-neutral-500 mt-1">
            {subStep <= 7 
              ? 'Tell us your exact situation so CreatorFlow tailors the best ideas, workflows, and tools.' 
              : 'Review your video setup before analyzing the topic.'}
          </p>
        </div>

        {/* SUBSTEP 1: Available Devices */}
        {subStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Phone' as DeviceType, icon: '📱', desc: 'Smartphone recording & mobile editing' },
                { label: 'Laptop' as DeviceType, icon: '💻', desc: 'Portable PC/Mac for editing & screen capture' },
                { label: 'Desktop PC' as DeviceType, icon: '🖥️', desc: 'Stationary workstation with full power' },
                { label: 'Phone and Laptop' as DeviceType, icon: '📱+💻', desc: 'Shoot on phone, edit on laptop' },
                { label: 'Camera' as DeviceType, icon: '🎥', desc: 'DSLR / Mirrorless camera' },
                { label: 'Gaming setup' as DeviceType, icon: '🎮', desc: 'Console or PC game capture rig' },
                { label: 'Microphone' as DeviceType, icon: '🎙️', desc: 'Dedicated USB/XLR mic' },
                { label: 'Drawing tablet' as DeviceType, icon: '✍️', desc: 'Tablet for whiteboard/digital art' },
              ].map((item) => {
                const isSelected = brief.availableDevices.includes(item.label);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => updateBrief({ availableDevices: toggleArrayItem(brief.availableDevices, item.label) })}
                    className={`p-4 border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#f8f7f4] shadow-xs'
                        : 'border-black/[0.08] hover:border-[#d4a017] bg-white'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="space-y-0.5">
                      <div className="font-serif text-base font-normal text-[#1a1a1a] flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {isSelected && <span className="text-xs font-mono text-[#d4a017] font-bold">✓</span>}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-sans">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 text-center">
              Multiple selections allowed. Pick all equipment available for this video.
            </div>
          </div>
        )}

        {/* SUBSTEP 2: Presentation Style */}
        {subStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Face on camera' as PresentationStyleType, icon: '🎥', desc: 'Talking directly into camera/phone lens' },
                { label: 'Voice-over + visuals' as PresentationStyleType, icon: '🎙️', desc: 'Spoken narration over B-roll, slides, or stock' },
                { label: 'Faceless' as PresentationStyleType, icon: '🕶️', desc: 'Zero camera presence needed' },
                { label: 'Screen recording' as PresentationStyleType, icon: '🖥️', desc: 'Software walkthrough, coding, or web demos' },
                { label: 'Gameplay' as PresentationStyleType, icon: '🎮', desc: 'Recorded game footage with voice commentary' },
                { label: 'Whiteboard/drawing' as PresentationStyleType, icon: '✍️', desc: 'Hand-drawn sketches or digital diagrams' },
                { label: 'Text-based' as PresentationStyleType, icon: '📝', desc: 'On-screen captions and kinetic typography' },
                { label: 'Mixed format' as PresentationStyleType, icon: '🎬', desc: 'Blend of talking head, screen demo, and B-roll' },
              ].map((item) => {
                const isSelected = brief.presentationStyle.includes(item.label);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => updateBrief({ presentationStyle: toggleArrayItem(brief.presentationStyle, item.label) })}
                    className={`p-4 border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#f8f7f4] shadow-xs'
                        : 'border-black/[0.08] hover:border-[#d4a017] bg-white'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="space-y-0.5">
                      <div className="font-serif text-base font-normal text-[#1a1a1a] flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {isSelected && <span className="text-xs font-mono text-[#d4a017] font-bold">✓</span>}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-sans">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 text-center">
              Select one or combine multiple (e.g., Voice-over + screen recording).
            </div>
          </div>
        )}

        {/* SUBSTEP 3: Recording Capabilities */}
        {subStep === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                'Camera footage',
                'Phone footage',
                'Screen recordings',
                'Voice recording',
                'Gameplay',
                'Drawings',
                'Animations',
                'Photos',
                'Existing video clips',
                'None yet',
              ].map((cap) => {
                const isSelected = brief.recordingCapabilities.includes(cap as any);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => updateBrief({ recordingCapabilities: toggleArrayItem(brief.recordingCapabilities, cap as any) })}
                    className={`p-3 border text-left font-mono text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                        : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                    }`}
                  >
                    <span>{cap}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#d4a017]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBSTEP 4: Existing Assets */}
        {subStep === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                'My own footage',
                'Photos',
                'Screen recordings',
                'Voice recording',
                'Music',
                'Logo/branding',
                'Existing clips',
                'Nothing yet',
              ].map((asset) => {
                const isSelected = brief.existingAssets.includes(asset as any);
                return (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => updateBrief({ existingAssets: toggleArrayItem(brief.existingAssets, asset as any) })}
                    className={`p-3 border text-left font-mono text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                        : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                    }`}
                  >
                    <span>{asset}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#d4a017]" />}
                  </button>
                );
              })}
            </div>

            {!brief.existingAssets.includes('Nothing yet') && brief.existingAssets.length > 0 && (
              <div className="pt-2">
                <label className="font-mono text-xs uppercase tracking-wider text-neutral-600 block mb-1">
                  Optional Details on Existing Assets:
                </label>
                <input
                  type="text"
                  value={brief.existingAssetsDetail || ''}
                  onChange={(e) => updateBrief({ existingAssetsDetail: e.target.value })}
                  placeholder="E.g., 10 minutes of raw screen captures and 3 B-roll clips"
                  className="w-full p-3 bg-[#f8f7f4] border border-black/[0.12] text-xs font-sans text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
                />
              </div>
            )}
          </div>
        )}

        {/* SUBSTEP 5: Video Type & Preferred Duration */}
        {subStep === 5 && (
          <div className="space-y-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
                Primary Video Format
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  'Educational',
                  'Tutorial',
                  'Story',
                  'List',
                  'Explainer',
                  'Review',
                  'Comparison',
                  'News/Commentary',
                  'Documentary',
                  'Entertainment',
                  'Shorts',
                  'Other',
                ].map((type) => {
                  const isSelected = brief.videoType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateBrief({ 
                        videoType: type as any,
                        preferredDuration: type === 'Shorts' ? '45 sec' : '5 min'
                      })}
                      className={`py-2 px-3 border text-center font-mono text-xs transition-all ${
                        isSelected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06]">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
                Target Video Runtime
              </span>
              {brief.videoType === 'Shorts' ? (
                <div className="grid grid-cols-3 gap-2">
                  {['30 sec', '45 sec', '60 sec'].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => updateBrief({ preferredDuration: dur })}
                      className={`py-2.5 px-3 border text-center font-mono text-xs transition-all ${
                        brief.preferredDuration === dur
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['2 min', '3 min', '5 min', '8 min', '10 min', '10+ min'].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => updateBrief({ preferredDuration: dur })}
                      className={`py-2.5 px-2 border text-center font-mono text-xs transition-all ${
                        brief.preferredDuration === dur
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBSTEP 6: Production Level */}
        {subStep === 6 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Simple' as ProductionLevelType, icon: '⚡', desc: 'Fastest and easiest. Minimal cuts, single take or direct screen demo.' },
                { label: 'Clean & Professional' as ProductionLevelType, icon: '🎯', desc: 'Balanced quality and effort. Crisp audio, subtle zooms, and clean captions.' },
                { label: 'High Quality' as ProductionLevelType, icon: '🎬', desc: 'Multi-layer B-roll, custom color adjustment, structured pacing.' },
                { label: 'Advanced' as ProductionLevelType, icon: '🚀', desc: 'Complex multi-track audio mastering, motion graphics, cinematic depth.' },
              ].map((lvl) => {
                const isSelected = brief.productionLevel === lvl.label;
                return (
                  <button
                    key={lvl.label}
                    type="button"
                    onClick={() => updateBrief({ productionLevel: lvl.label })}
                    className={`p-5 border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] shadow-md'
                        : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{lvl.icon}</span>
                        {isSelected && <span className="font-mono text-xs text-[#d4a017] font-bold">Selected ✓</span>}
                      </div>
                      <h4 className="font-serif text-xl font-normal mb-1">{lvl.label}</h4>
                      <p className={`text-xs ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {lvl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBSTEP 7: Priorities, Budget & AI Assistance */}
        {subStep === 7 && (
          <div className="space-y-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
                Primary Goal for This Video
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  'Speed',
                  'Quality',
                  'Simplicity',
                  'Lowest cost',
                  'Learning',
                  'Growth',
                  'Experimenting',
                  'Professional appearance',
                ].map((prio) => {
                  const isSelected = brief.primaryPriority === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => updateBrief({ primaryPriority: prio as any })}
                      className={`py-2 px-3 border text-center font-mono text-xs transition-all ${
                        isSelected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      {prio}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06]">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
                Target Budget for This Video
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  '₹0 — Completely Free',
                  'Low Budget',
                  'Flexible Budget',
                  'Premium Tools',
                ].map((bud) => {
                  const isSelected = brief.videoBudget === bud;
                  return (
                    <button
                      key={bud}
                      type="button"
                      onClick={() => updateBrief({ videoBudget: bud as any })}
                      className={`py-2 px-3 border text-center font-mono text-xs transition-all ${
                        isSelected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      {bud}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06]">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold block mb-2">
                AI Assistance Preference
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'No AI' as AIAssistanceType, label: 'No AI', desc: 'Manual workflow only' },
                  { id: 'AI for Planning' as AIAssistanceType, label: 'AI for Planning', desc: 'Scripts & structures' },
                  { id: 'AI for Creation' as AIAssistanceType, label: 'AI for Creation', desc: 'Voice/visual tools' },
                  { id: 'AI Everywhere' as AIAssistanceType, label: 'AI Everywhere', desc: 'Full AI assist' },
                ].map((ai) => {
                  const isSelected = brief.aiAssistance === ai.id;
                  return (
                    <button
                      key={ai.id}
                      type="button"
                      onClick={() => updateBrief({ aiAssistance: ai.id })}
                      className={`p-2.5 border text-left transition-all ${
                        isSelected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4]'
                          : 'border-black/[0.08] hover:border-[#d4a017] bg-white text-[#1a1a1a]'
                      }`}
                    >
                      <div className="font-mono text-xs font-semibold">{ai.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>{ai.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBSTEP 8: Final Summary (Section 13) */}
        {subStep === 8 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Device</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.availableDevices.join(', ')}</span>
              </div>

              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Presentation</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.presentationStyle.join(' + ')}</span>
              </div>

              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Creation Skills</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.recordingCapabilities.slice(0, 2).join(', ')}</span>
              </div>

              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Video Format & Length</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.videoType} &bull; {brief.preferredDuration}</span>
              </div>

              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Production Level</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.productionLevel}</span>
              </div>

              <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06]">
                <span className="font-mono text-[10px] uppercase text-neutral-500 block">Budget & AI Preference</span>
                <span className="font-serif text-base text-[#1a1a1a] font-normal">{brief.videoBudget} &bull; {brief.aiAssistance}</span>
              </div>
            </div>

            <div className="p-4 bg-[#eeeae3] border border-[#e2ddd4] text-xs text-neutral-800 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#d4a017] shrink-0" />
              <div>
                <strong>Ready for topic analysis.</strong> CreatorFlow will formulate ideas tailored strictly to your {brief.availableDevices.join(' + ')} hardware and {brief.videoBudget} budget.
              </div>
            </div>
          </div>
        )}

        {/* Substep Navigation Bar */}
        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
          {subStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevSubStep}
              className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] flex items-center gap-1.5 py-2 px-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {subStep < 8 ? (
            <button
              type="button"
              onClick={handleNextSubStep}
              className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>{subStep === 7 ? 'View Setup Summary' : 'Next Question'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] px-3 py-2 border border-black/[0.08] bg-white"
              >
                Edit Setup
              </button>

              <button
                type="button"
                onClick={onContinue}
                className="px-7 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-md"
              >
                <span>Looks Good — Analyze My Topic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
