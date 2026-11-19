import React from 'react';
import { RecommendedVideoIdea } from '../../types';
import { CreationMethodType } from '../../types/guidedWorkflow';
import { Sparkles, Check, Film, Image as ImageIcon, Video, Mic, Monitor, Gamepad2, BookOpen, Scissors, HelpCircle, ArrowRight } from 'lucide-react';

interface Step2CreationMethodProps {
  selectedIdea: RecommendedVideoIdea | null;
  creationMethod: CreationMethodType | null;
  onSelectMethod: (method: CreationMethodType) => void;
  onContinue: () => void;
}

export const Step2CreationMethod: React.FC<Step2CreationMethodProps> = ({
  selectedIdea,
  creationMethod,
  onSelectMethod,
  onContinue,
}) => {
  const methods: Array<{
    id: CreationMethodType;
    icon: any;
    title: string;
    badge: string;
    description: string;
    bullets: string[];
    isPopular?: boolean;
  }> = [
    {
      id: 'ai_animation',
      icon: Film,
      title: 'AI Animation',
      badge: 'AI Powered',
      description: 'Create animated scenes using AI video/animation tools, with characters, scenes, narration and prompts.',
      bullets: [
        'Character Bible with visual consistency rules',
        'Master reference prompts & scene-by-scene motion prompts',
        'AI voice generation & sound-design direction',
        'Works with Runway, Kling, Luma, Pika, Midjourney',
      ],
      isPopular: true,
    },
    {
      id: 'ai_image_to_video',
      icon: ImageIcon,
      title: 'AI Image → Video',
      badge: 'Two-Stage AI',
      description: 'Generate master scene images and convert them into cinematic motion clips using image-to-video AI.',
      bullets: [
        'High-control character & environment reference images',
        'Image-to-video motion intensity prompts',
        'Camera movement & transition control',
        'Zero camera or studio gear needed',
      ],
    },
    {
      id: 'faceless',
      icon: Video,
      title: 'Faceless Video',
      badge: 'High Retention',
      description: 'High-retention voice-over over curated stock footage, motion graphics, and visual B-roll.',
      bullets: [
        'Complete voiceover script & timed visual cue plan',
        'Curated stock footage search terms & sound effects',
        'Dynamic on-screen text & auto-caption guidelines',
        'Fast turnaround on CapCut, Premiere, or DaVinci',
      ],
      isPopular: true,
    },
    {
      id: 'whiteboard',
      icon: Sparkles,
      title: 'Whiteboard Animation',
      badge: 'Educational',
      description: 'Hand-drawn illustrations, sequential diagrams, and visual whiteboard explanations.',
      bullets: [
        'Structured board layout & drawing sequence order',
        'Icon & illustration placement roadmap',
        'Synchronized voiceover & drawing speed pacing',
        'Works with VideoScribe, Doodly, Canva, or iPad',
      ],
    },
    {
      id: 'talking_head',
      icon: Mic,
      title: 'Talking Head',
      badge: 'Personal Brand',
      description: 'On-camera personal delivery with clean jump cuts, lower-thirds, and visual b-roll overlays.',
      bullets: [
        'Teleprompter-ready bullet points & delivery hooks',
        'Shot list, camera eye-line, & lighting guides',
        'B-roll cutaway placement & zoom rhythm',
        'Fast recording on phone or camera',
      ],
    },
    {
      id: 'screen_recording',
      icon: Monitor,
      title: 'Screen Recording',
      badge: 'Tutorials & Tech',
      description: 'Software walkthroughs, click-by-click tutorials, and desktop UI demonstrations.',
      bullets: [
        'Sequential screen action steps & click order',
        'Cursor zoom callouts & highlight focus points',
        'Audio setup & lossless OBS/Loom settings',
        'Zero face recording needed',
      ],
    },
    {
      id: 'gameplay',
      icon: Gamepad2,
      title: 'Gameplay & Commentary',
      badge: 'Gaming',
      description: 'Commentary, highlighted gaming moments, dynamic zooms, and reaction overlays.',
      bullets: [
        'Commentary flow & punchy reaction markers',
        'Moment highlight cues & sound-effect drops',
        'Audio ducking & energetic pacing',
        'Quick capture on PC or Console',
      ],
    },
    {
      id: 'documentary',
      icon: BookOpen,
      title: 'Documentary / Video Essay',
      badge: 'Deep Dive',
      description: 'Deep-dive video essays with narrative chapters, archival assets, and structured research.',
      bullets: [
        'Multi-chapter narrative story arc & pacing',
        'Archival asset checklist & map/chart callouts',
        'Fact-check placeholders & research tags',
        'Cinematic soundscape & pacing guide',
      ],
    },
    {
      id: 'manual_editing',
      icon: Scissors,
      title: 'Manual Editing',
      badge: 'Classic Craft',
      description: 'Custom timeline assembly with your own recorded footage, cuts, and transitions.',
      bullets: [
        'Multi-track timeline sequence & cut plan',
        'Vocal cleanup & background music mixing',
        'Color grade & graphic lower-third templates',
        'Complete creative control',
      ],
    },
    {
      id: 'other',
      icon: HelpCircle,
      title: 'Custom / Mixed Format',
      badge: 'Hybrid',
      description: 'Experimental or custom mixed-media formats combining animation, live-action, and screen capture.',
      bullets: [
        'Hybrid asset pipeline & modular scenes',
        'Flexible production framework',
        'Custom workflow checklist',
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Pinned Selected Video Card */}
      {selectedIdea && (
        <div className="bg-[#eeeae3] border border-[#e2ddd4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Selected Video Idea
            </span>
            <div className="font-serif text-lg sm:text-xl font-normal text-[#1a1a1a]">
              {selectedIdea.title}
            </div>
            <div className="text-xs text-neutral-600">
              {selectedIdea.format} &bull; Difficulty: {selectedIdea.difficulty} &bull; Est. {selectedIdea.estimatedTime}
            </div>
          </div>
          <div className="px-3 py-1 bg-[#1a1a1a] text-[#f8f7f4] font-mono text-[10px] uppercase tracking-wider font-semibold self-start sm:self-auto">
            {selectedIdea.creatorFitScore} Fit
          </div>
        </div>
      )}

      {/* Main Question */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 4 of 11 — Creation Method
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          How do you want to create this video?
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          Choose your production method. We will tailor the video setup, recommended tools, and generation kit to match your exact workflow.
        </p>
      </div>

      {/* Method Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map((m) => {
          const isSelected = creationMethod === m.id;
          const IconComp = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => onSelectMethod(m.id)}
              className={`p-5 border cursor-pointer transition-all duration-200 flex flex-col justify-between rounded-none ${
                isSelected
                  ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] shadow-md ring-1 ring-[#1a1a1a]'
                  : 'border-black/[0.08] bg-white text-[#1a1a1a] hover:border-[#d4a017] hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${isSelected ? 'bg-white/10 text-white' : 'bg-[#f8f7f4] text-[#1a1a1a]'}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="font-serif text-xl font-normal">{m.title}</span>
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 ${
                    isSelected ? 'bg-[#333] text-[#f8f7f4]' : 'bg-[#eeeae3] text-[#1a1a1a]'
                  }`}>
                    {m.badge}
                  </span>
                </div>

                <p className={`text-xs mb-4 leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {m.description}
                </p>

                <div className={`space-y-1.5 pt-3 border-t ${isSelected ? 'border-white/10' : 'border-black/[0.06]'}`}>
                  {m.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className={`mt-0.5 ${isSelected ? 'text-[#d4a017]' : 'text-[#d4a017]'}`}>&bull;</span>
                      <span className={isSelected ? 'text-neutral-300' : 'text-neutral-600'}>
                        {bullet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between border-t border-dashed border-current/10">
                <span className={`font-mono text-[10px] uppercase tracking-wider ${isSelected ? 'text-[#d4a017]' : 'text-neutral-400'}`}>
                  {isSelected ? '✓ Method Selected' : 'Click to Select'}
                </span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  isSelected ? 'border-[#d4a017] bg-[#d4a017] text-[#1a1a1a]' : 'border-neutral-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Continue */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!creationMethod}
          className={`px-8 py-3.5 font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center gap-2 ${
            creationMethod
              ? 'bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#333] cursor-pointer shadow-sm'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          }`}
        >
          <span>Continue to Video Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
