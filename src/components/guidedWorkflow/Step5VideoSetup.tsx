import React, { useState } from 'react';
import { CreatorProfile, RecommendedVideoIdea } from '../../types';
import {
  VideoCreationBrief,
  CreationMethodType,
  DeviceType,
  PresentationStyleType,
  VideoTypeOption,
  ProductionLevelType,
  VideoBudgetType,
  AIAssistanceType,
} from '../../types/guidedWorkflow';
import { canAccess } from '../../lib/planEntitlements';
import { 
  Sparkles, 
  Settings, 
  Check, 
  Clock, 
  Sliders, 
  User, 
  Users,
  Laptop, 
  Mic, 
  Volume2, 
  Palette, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Edit3,
  Lock
} from 'lucide-react';

interface Step5VideoSetupProps {
  creationMethod: CreationMethodType | null;
  selectedIdea: RecommendedVideoIdea | null;
  creatorProfile: CreatorProfile;
  creationBrief: VideoCreationBrief;
  onUpdateBrief: (brief: VideoCreationBrief) => void;
  onContinue: () => void;
}

export const Step5VideoSetup: React.FC<Step5VideoSetupProps> = ({
  creationMethod,
  selectedIdea,
  creatorProfile,
  creationBrief,
  onUpdateBrief,
  onContinue,
}) => {
  const [customizing, setCustomizing] = useState<boolean>(false);

  const getMethodTitle = (method: CreationMethodType | null) => {
    switch (method) {
      case 'ai_animation': return 'AI Animation';
      case 'ai_image_to_video': return 'AI Image → Video';
      case 'faceless': return 'Faceless Video';
      case 'whiteboard': return 'Whiteboard Animation';
      case 'talking_head': return 'Talking Head';
      case 'screen_recording': return 'Screen Recording';
      case 'gameplay': return 'Gameplay';
      case 'documentary': return 'Documentary / Video Essay';
      case 'manual_editing': return 'Manual Editing';
      default: return 'Production';
    }
  };

  const methodTitle = getMethodTitle(creationMethod);

  // Field mutators
  const updateField = <K extends keyof VideoCreationBrief>(key: K, value: VideoCreationBrief[K]) => {
    onUpdateBrief({
      ...creationBrief,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 5 of 11 — Video Setup & Parameters
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Let's set up your {methodTitle}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          We've preloaded parameters from your permanent Creator Profile. You can use defaults or customize specifically for this video.
        </p>
      </div>

      {/* Mode Selection Pill */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-[#eeeae3] border border-[#e2ddd4]">
          <button
            type="button"
            onClick={() => setCustomizing(false)}
            className={`px-5 py-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center gap-2 ${
              !customizing
                ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-xs'
                : 'text-neutral-600 hover:text-[#1a1a1a]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4a017]" />
            <span>Use Creator Profile (Default)</span>
          </button>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className={`px-5 py-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center gap-2 ${
              customizing
                ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-xs'
                : 'text-neutral-600 hover:text-[#1a1a1a]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#d4a017]" />
            <span>Customize for This Video</span>
          </button>
        </div>
      </div>

      {!customizing ? (
        /* Summary of Creator Profile Applied */
        <div className="bg-white border border-black/[0.08] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Active Video Configuration
              </span>
              <h3 className="font-serif text-xl font-normal text-[#1a1a1a]">
                Standard Creator Profile Settings
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="font-mono text-[11px] uppercase tracking-wider text-[#d4a017] hover:underline flex items-center gap-1.5 font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change for This Video</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Target Duration</span>
              <div className="font-medium text-sm text-[#1a1a1a]">{creationBrief.preferredDuration || '5 minutes'}</div>
              <span className="text-[11px] text-neutral-500">Long-form educational standard</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Video Type</span>
              <div className="font-medium text-sm text-[#1a1a1a]">{creationBrief.videoType || 'Educational'}</div>
              <span className="text-[11px] text-neutral-500">Matches channel niche</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Voice & Narration</span>
              <div className="font-medium text-sm text-[#1a1a1a]">
                {creationBrief.aiAssistance.includes('AI') ? 'AI Voiceover' : 'Own Voice Recording'}
              </div>
              <span className="text-[11px] text-neutral-500">Studio quality delivery</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Primary Device</span>
              <div className="font-medium text-sm text-[#1a1a1a]">{creationBrief.availableDevices.join(', ') || 'Laptop'}</div>
              <span className="text-[11px] text-neutral-500">Hardware baseline</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Video Budget</span>
              <div className="font-medium text-sm text-[#1a1a1a]">{creationBrief.videoBudget || '₹0 — Completely Free'}</div>
              <span className="text-[11px] text-neutral-500">Prioritizes free tiers</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Quality Target</span>
              <div className="font-medium text-sm text-[#1a1a1a]">{creationBrief.productionLevel || 'Clean & Professional'}</div>
              <span className="text-[11px] text-neutral-500">1080p 60fps standard</span>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
              <span className="font-mono text-[10px] uppercase text-neutral-400 block font-semibold">Character Cast</span>
              <div className="font-medium text-sm text-[#1a1a1a]">
                {creationBrief.characterCast === 'multi' 
                  ? 'Multi-Character Cast (Alex + Maya)' 
                  : creationBrief.characterCast === 'none' 
                  ? 'No Characters (Direct Visuals)' 
                  : 'Single Protagonist (Alex the Creator)'}
              </div>
              <span className="text-[11px] text-neutral-500">Consistent visual identity</span>
            </div>
          </div>
        </div>
      ) : (
        /* Video-Specific Overrides Form */
        <div className="bg-white border border-black/[0.08] p-6 space-y-6">
          <div className="border-b border-black/[0.06] pb-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4a017] font-semibold block">
              Video-Specific Overrides
            </span>
            <h3 className="font-serif text-xl font-normal text-[#1a1a1a]">
              Customize Parameters For This Single Video
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              These settings apply only to this video project and will not overwrite your permanent profile.
            </p>
          </div>

          <div className="space-y-5">
            {/* 1. Target Duration */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-2">
                Target Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['< 60 seconds (Shorts)', '3-5 minutes', '5-8 minutes', '10+ minutes'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => updateField('preferredDuration', dur)}
                    className={`p-3 border text-left text-xs font-mono transition-all ${
                      creationBrief.preferredDuration === dur
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Video Format / Type */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-2">
                Video Type & Narrative Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Educational', 'Tutorial', 'Story', 'Explainer'] as VideoTypeOption[]).map((vType) => (
                  <button
                    key={vType}
                    type="button"
                    onClick={() => updateField('videoType', vType)}
                    className={`p-3 border text-left text-xs font-mono transition-all ${
                      creationBrief.videoType === vType
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                    }`}
                  >
                    {vType}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Budget for this video */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-2">
                Budget for this Video
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['₹0 — Completely Free', 'Low Budget', 'Flexible Budget', 'Premium Tools'] as VideoBudgetType[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => updateField('videoBudget', b)}
                    className={`p-3 border text-left text-xs font-mono transition-all ${
                      creationBrief.videoBudget === b
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. AI Assistance Preference */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-2">
                AI Assistance Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['AI Everywhere', 'AI for Creation', 'AI for Planning', 'No AI'] as AIAssistanceType[]).map((ai) => (
                  <button
                    key={ai}
                    type="button"
                    onClick={() => updateField('aiAssistance', ai)}
                    className={`p-3 border text-left text-xs font-mono transition-all ${
                      creationBrief.aiAssistance === ai
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                    }`}
                  >
                    {ai}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Production Quality Target */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block mb-2">
                Target Quality Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Simple', 'Clean & Professional', 'High Quality', 'Advanced'] as ProductionLevelType[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => updateField('productionLevel', lvl)}
                    className={`p-3 border text-left text-xs font-mono transition-all ${
                      creationBrief.productionLevel === lvl
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Character Cast & Multi-Character Continuity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Character Cast & Continuity
                </label>
                {canAccess('multi_character_planning') && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#b3860d] font-bold">
                    MAX Entitlement Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('characterCast', 'single')}
                  className={`p-3 border text-left text-xs font-mono transition-all space-y-1 ${
                    (creationBrief.characterCast || 'single') === 'single'
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                      : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <User className="w-3.5 h-3.5 text-[#d4a017]" />
                    <span>Single Protagonist</span>
                  </div>
                  <p className={`text-[10px] ${
                    (creationBrief.characterCast || 'single') === 'single' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    1 Recurring Host (Alex the Creator) across all scenes
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (canAccess('multi_character_planning')) {
                      updateField('characterCast', 'multi');
                    }
                  }}
                  className={`p-3 border text-left text-xs font-mono transition-all space-y-1 relative ${
                    creationBrief.characterCast === 'multi'
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                      : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                  } ${!canAccess('multi_character_planning') ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Users className="w-3.5 h-3.5 text-[#d4a017]" />
                      <span>Multi-Character</span>
                    </div>
                    {!canAccess('multi_character_planning') && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-neutral-200 text-neutral-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> MAX
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] ${
                    creationBrief.characterCast === 'multi' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    2+ Co-Hosts (Alex + Maya) with interaction rules & dialogue handoffs
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateField('characterCast', 'none')}
                  className={`p-3 border text-left text-xs font-mono transition-all space-y-1 ${
                    creationBrief.characterCast === 'none'
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                      : 'border-black/[0.08] bg-[#f8f7f4] text-[#1a1a1a] hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>Direct / No Cast</span>
                  </div>
                  <p className={`text-[10px] ${
                    creationBrief.characterCast === 'none' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    Screen recordings, motion graphics, or faceless stock
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Action */}
      <div className="pt-2 flex justify-between items-center">
        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
          <span>Next: Discover curated free & pro tools for {methodTitle}</span>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="px-8 py-3.5 bg-[#1a1a1a] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#333] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <span>Continue to Tool Selection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
