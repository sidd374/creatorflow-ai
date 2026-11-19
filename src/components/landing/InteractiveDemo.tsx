import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Sparkles, 
  Play, 
  Layers, 
  FileText, 
  Clapperboard, 
  Share2, 
  ArrowRight,
  Search,
  CheckCircle2,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface DemoTopicData {
  topic: string;
  niche: string;
  angle: {
    hookPremise: string;
    curiosityGap: string;
    targetViewer: string;
    estimatedRetentionFocus: string;
  };
  titles: Array<{
    text: string;
    style: string;
    charCount: number;
    predictedCtr: string;
  }>;
  hooks: Array<{
    type: string;
    hook: string;
    deliveryTip: string;
  }>;
  scriptBeats: Array<{
    timestamp: string;
    beat: string;
    audio: string;
    visual: string;
  }>;
  creationKit: {
    engineRecommended: string;
    aspectRatio: string;
    clips: Array<{
      clipNumber: number;
      duration: string;
      visualPrompt: string;
      motionPrompt: string;
      cameraMove: string;
    }>;
  };
  publishing: {
    descriptionHook: string;
    chapters: Array<{ time: string; title: string }>;
    tags: string[];
    hashtags: string[];
    pinnedQuestion: string;
  };
}

const PRESET_TOPICS: DemoTopicData[] = [
  {
    topic: 'Why You Cannot Run in Your Dreams (Solved)',
    niche: 'Neuroscience & Human Psychology',
    angle: {
      hookPremise: 'Ever tried to run in a dream and felt like moving through wet concrete? There is a fascinating neurological explanation.',
      curiosityGap: 'Connects the universally relatable sensation of dream paralysis to evolutionary biology and the brainstem.',
      targetViewer: 'Curious minds, students, science YouTube viewers aged 18–35.',
      estimatedRetentionFocus: 'First 5 seconds must validate the physical sensation before introducing scientific jargon.',
    },
    titles: [
      { text: 'Why You Cannot Run in Dreams (It’s Not Weakness)', style: 'Curiosity Loop', charCount: 48, predictedCtr: '9.4%' },
      { text: 'The Evolutionary Reason Your Brain Paralyzes You in Sleep', style: 'Authority & Science', charCount: 57, predictedCtr: '8.8%' },
      { text: 'I Asked a Neuroscientist Why We Move in Slow Motion in Dreams', style: 'First-Person Test', charCount: 59, predictedCtr: '9.1%' },
    ],
    hooks: [
      {
        type: 'Physical Sensation',
        hook: 'Ever tried to sprint or punch in a dream, and your arms felt like they were cast in 500-pound concrete?',
        deliveryTip: 'Start in a tight close-up, match your facial expression to physical strain, and pause 1 second before the reveal.',
      },
      {
        type: 'Pattern Interrupt',
        hook: 'That slow-motion lag in your nightmare wasn\'t weakness. It was an emergency biological killswitch.',
        deliveryTip: 'Deliver with authoritative, calm tone; snap fingers on "killswitch" as visual cuts to brainstem diagram.',
      },
      {
        type: 'Cliffhanger Stakes',
        hook: 'If your brain didn\'t paralyze your spinal cord right now, you would physically leap through your bedroom window.',
        deliveryTip: 'Whisper the opening three words, then bring volume up firmly for the stakes statement.',
      },
    ],
    scriptBeats: [
      {
        timestamp: '00:00 - 00:06',
        beat: 'The Dream Lag Hook',
        audio: 'Ever tried to punch or sprint in a dream, and your limbs felt like 500-pound weights?',
        visual: 'Fast forward running motion suddenly freezing into high-contrast slow-motion blur.',
      },
      {
        timestamp: '00:06 - 00:18',
        beat: 'The Biology Reveal',
        audio: 'That is not weakness. That is an evolutionary biological safety lock called REM Atonia.',
        visual: 'Split screen: Sleeping human profile with glowing electric blue neural impulses halting at the spine.',
      },
      {
        timestamp: '00:18 - 00:32',
        beat: 'The Mechanism',
        audio: 'Your motor cortex sends full-throttle commands, but your brainstem floods the spinal cord with glycine to keep you safe.',
        visual: '3D neural synapse simulation showing neurochemical transmitters blocking muscular receptors.',
      },
      {
        timestamp: '00:32 - 00:45',
        beat: 'The Disconnect & Resolution',
        audio: 'Because your brain receives zero sensory feedback from actual limbs, it registers the gap as extreme resistance.',
        visual: 'Creator returns to camera with onscreen kinetic typography: "Sensory Lag = Infinite Mass".',
      },
    ],
    creationKit: {
      engineRecommended: 'Google Flow / Kling AI v1.5',
      aspectRatio: '16:9 Landscape & 9:16 Shorts',
      clips: [
        {
          clipNumber: 1,
          duration: '10s',
          visualPrompt: 'Cinematic first-person perspective running through an endless dimly lit brutalist corridor, feet sinking into heavy viscous dark mist, volumetric overhead light beams, anamorphic lens, 8k.',
          motionPrompt: 'Camera forward dolly track decelerating rapidly, heavy inertia, motion blur intensifying gradually.',
          cameraMove: 'Fast Push-In with sudden viscous dampening',
        },
        {
          clipNumber: 2,
          duration: '10s',
          visualPrompt: 'Detailed medical visualization of human brainstem and spinal cord illuminated in luminescent electric cyan and amber energy pulses against obsidian black void, anatomical clarity.',
          motionPrompt: 'Slow 360 rotation around cervical vertebrae as cyan electrical signals diminish at the synaptic threshold.',
          cameraMove: 'Orbital Slow Pan with macro focus lock',
        },
        {
          clipNumber: 3,
          duration: '10s',
          visualPrompt: 'Photorealistic close-up of human eye in REM sleep, eyelids fluttering under soft warm tungsten bedroom lamp, macro skin texture, cinematic shallow depth of field.',
          motionPrompt: 'Gentle micro-handheld drift, steady subtle eye movement behind eyelid.',
          cameraMove: 'Extreme Close-Up Macro Drift',
        },
      ],
    },
    publishing: {
      descriptionHook: 'Why does your body feel like wet cement whenever you try to run in a dream? Here is the neuroscience behind REM Atonia.',
      chapters: [
        { time: '00:00', title: 'The Universal Dream Sensation' },
        { time: '00:45', title: 'What is REM Atonia?' },
        { time: '02:10', title: 'Why the Motor Cortex Lags' },
        { time: '04:30', title: 'Sleep Paralysis vs. Dream Resistance' },
        { time: '06:15', title: 'How to Lucidly Break Free' },
      ],
      tags: ['neuroscience', 'dream psychology', 'REM atonia', 'sleep science', 'lucid dreaming', 'brain facts', 'why cant i run in dreams'],
      hashtags: ['#SleepScience', '#Neuroscience', '#DreamFacts', '#PsychologyExplained'],
      pinnedQuestion: 'What is the single weirdest recurring dream or lag sensation you have ever experienced? Drop your dream below—I am reading and replying to the top 20!',
    },
  },
  {
    topic: '10 AI Coding Tools in 2026 That Actually Replace Junior Devs',
    niche: 'Software Engineering & AI Tools',
    angle: {
      hookPremise: 'The barrier between junior engineer and autonomous agent has vanished. Here is an architectural audit of the real 2026 developer stack.',
      curiosityGap: 'Avoids generic hype and cuts directly to which tools actually pass production test suites and write real PRs.',
      targetViewer: 'Software developers, computer science students, engineering managers.',
      estimatedRetentionFocus: 'Must open with real code diffs and concrete productivity benchmarks rather than promotional marketing claims.',
    },
    titles: [
      { text: '10 AI Tools That Made 90% of Junior Dev Tasks Obsolete', style: 'Shock & Reality', charCount: 52, predictedCtr: '9.6%' },
      { text: 'I Tested Every AI Coding Agent in 2026 (The Brutal Truth)', style: 'First-Person Authority', charCount: 56, predictedCtr: '9.1%' },
      { text: 'The Software Engineer Stack in 2026: What Still Matters', style: 'Strategic Career', charCount: 54, predictedCtr: '8.7%' },
    ],
    hooks: [
      {
        type: 'Reality Check',
        hook: 'If your coding workflow looks the exact same as it did 12 months ago, you are already being outpaced by 10x.',
        deliveryTip: 'Open directly with an IDE screen capture showing automated code generation passing 48 unit tests.',
      },
      {
        type: 'Stakes & Shift',
        hook: 'Writing boilerplate syntax is dead. In 2026, software engineering is architecture, evaluation, and system design.',
        deliveryTip: 'Firm, conversational pace with direct eye contact; don\'t sound pessimistic, sound like an experienced mentor.',
      },
      {
        type: 'Benchmark Proof',
        hook: 'We gave 5 junior engineer tasks to 10 AI coding engines. Only 3 survived production code review.',
        deliveryTip: 'Hold up a physical red pen or point to a terminal fail log before revealing the top performers.',
      },
    ],
    scriptBeats: [
      {
        timestamp: '00:00 - 00:05',
        beat: 'The Paradigm Shift Hook',
        audio: 'If your daily engineering workflow looks identical to 2024, you are already being outpaced.',
        visual: 'Split screen: Manual typing versus automated agent generating a full REST API with unit tests.',
      },
      {
        timestamp: '00:05 - 00:15',
        beat: 'The 3 Categories',
        audio: 'Today we are evaluating code engines across three categories: autocomplete, repo-level agents, and autonomous PR reviewers.',
        visual: 'Clean 3-column architecture diagram highlighting IDE integration, Terminal CLI, and CI/CD pipelines.',
      },
      {
        timestamp: '00:15 - 00:30',
        beat: 'The Top Autonomous Agent',
        audio: 'Tool number one doesn\'t just suggest lines—it clones your repo, reproduces the bug, and pushes a verified Git branch.',
        visual: 'Terminal window streaming automated bash commands, green test suite passing indicator.',
      },
      {
        timestamp: '00:30 - 00:45',
        beat: 'The New Career Rule',
        audio: 'The creators who win this decade aren\'t typing syntax; they are orchestrating intelligent systems.',
        visual: 'Creator looking to camera with actionable summary checklist onscreen.',
      },
    ],
    creationKit: {
      engineRecommended: 'Kling AI / Leonardo Motion',
      aspectRatio: '16:9 Landscape',
      clips: [
        {
          clipNumber: 1,
          duration: '10s',
          visualPrompt: 'Minimalist software engineer workspace at night, dark oak desk with dual OLED monitors displaying clean code and green terminal output, soft amber desk lamp, shallow depth of field, 8k.',
          motionPrompt: 'Slow cinematic tracking shot panning left-to-right across mechanical keyboard and glowing displays.',
          cameraMove: 'Lateral Slider Pan with soft depth shift',
        },
        {
          clipNumber: 2,
          duration: '10s',
          visualPrompt: 'Futuristic abstract holographic data visualization of connected git branches and pull requests merging seamlessly in golden and cobalt light streams, clean corporate aesthetic.',
          motionPrompt: 'Gentle particle flow inward toward a central luminous node.',
          cameraMove: 'Center Zoom with slow orbit',
        },
      ],
    },
    publishing: {
      descriptionHook: 'The software engineering landscape has fundamentally transformed. Here is an honest architectural audit of the top 10 AI developer tools.',
      chapters: [
        { time: '00:00', title: 'The End of Boilerplate Syntax' },
        { time: '01:15', title: 'Autonomous Repo Agents vs. Autocomplete' },
        { time: '04:20', title: 'The Top 3 Tools for Production Code' },
        { time: '07:45', title: 'Real Cost & Quota Benchmarks' },
        { time: '11:00', title: 'How to Future-Proof Your Engineering Career' },
      ],
      tags: ['ai coding tools', 'software engineering 2026', 'ai developer agents', 'cursor ai', 'github copilot', 'coding in 2026', 'programming'],
      hashtags: ['#SoftwareEngineering', '#AICoding', '#DevTools', '#TechCareers'],
      pinnedQuestion: 'Which AI developer tool has had the biggest impact on your daily workflow this year? Share your setup below!',
    },
  },
  {
    topic: 'How to Build a Frictionless Second Brain in Notion',
    niche: 'Productivity & Digital Organization',
    angle: {
      hookPremise: 'Most Notion dashboards fail because they are over-engineered aesthetic traps. Here is the minimalist 3-database system that actually works.',
      curiosityGap: 'Challenges the trap of complex dashboards and offers a sustainable, lightweight personal knowledge architecture.',
      targetViewer: 'Knowledge workers, content creators, college students, founders.',
      estimatedRetentionFocus: 'Demonstrate the exact failure mode within the first 10 seconds to validate viewer frustration.',
    },
    titles: [
      { text: 'Why 99% of Notion Second Brains Fail (And What Actually Works)', style: 'Problem & Solution', charCount: 60, predictedCtr: '9.3%' },
      { text: 'The Minimalist Notion System I Use to Run a 6-Figure Studio', style: 'Practical Authority', charCount: 58, predictedCtr: '8.9%' },
      { text: 'Stop Over-Designing Notion: You Only Need 3 Databases', style: 'Pattern Interrupt', charCount: 52, predictedCtr: '9.5%' },
    ],
    hooks: [
      {
        type: 'Shared Frustration',
        hook: 'You spent 6 hours building an aesthetic Notion dashboard last Sunday, and by Wednesday you haven\'t opened it once. Here is why.',
        deliveryTip: 'Deliver with empathetic, knowing smile; pan down from creator to a cluttered, empty notebook.',
      },
      {
        type: 'Counter-Intuitive Truth',
        hook: 'The more customized your Notion workspace is, the more likely you are to abandon it completely.',
        deliveryTip: 'State clearly with quiet confidence; display side-by-side screenshot of 40 relational databases vs 3 clean ones.',
      },
      {
        type: 'Frictionless Promise',
        hook: 'If capturing a thought takes more than 3 seconds and two clicks, your system is already broken.',
        deliveryTip: 'Show stopwatch on screen counting to 2.5 seconds as a fleeting idea gets recorded effortlessly.',
      },
    ],
    scriptBeats: [
      {
        timestamp: '00:00 - 00:06',
        beat: 'The Aesthetic Trap Hook',
        audio: 'You spent six hours setting up custom Notion widgets, and by Wednesday you stopped opening the app.',
        visual: 'Montage of over-engineered, complex dashboards fading to a clean blank page.',
      },
      {
        timestamp: '00:06 - 00:18',
        beat: 'The 3-Database Core',
        audio: 'A sustainable Second Brain only requires three tables: Projects, Resources, and a zero-friction Inbox.',
        visual: 'Clean minimalist Notion canvas with three primary database cards highlighted in warm gold accent.',
      },
      {
        timestamp: '00:18 - 00:32',
        beat: 'The 3-Second Capture Rule',
        audio: 'Capture into the Inbox without tagging or sorting. Process only when you are in creative execution mode.',
        visual: 'Mobile screen recording showing Quick Capture widget recording an idea in 1.8 seconds.',
      },
      {
        timestamp: '00:32 - 00:45',
        beat: 'Actionable Workflow',
        audio: 'Your second brain isn\'t an archive of what you read; it\'s an engine for what you create next.',
        visual: 'Creator looking to camera, gesturing to actionable template link on screen.',
      },
    ],
    creationKit: {
      engineRecommended: 'Google Flow / Cinematic Studio',
      aspectRatio: '16:9 Landscape',
      clips: [
        {
          clipNumber: 1,
          duration: '10s',
          visualPrompt: 'Minimalist Scandinavian studio desk in soft natural morning sunlight, ceramic coffee mug, natural linen notebook, sleek matte laptop with clean monochrome typography interface, 8k.',
          motionPrompt: 'Slow gentle tilt-down from potted bonsai plant to clean laptop workspace.',
          cameraMove: 'Vertical Jib Tilt-Down with soft natural lighting',
        },
        {
          clipNumber: 2,
          duration: '10s',
          visualPrompt: 'Overhead flat-lay view of human hands sketching clean structural architecture nodes with fountain pen on textured cream cardstock, cinematic contrast, editorial lighting.',
          motionPrompt: 'Gentle slow push-in focusing on the precision of the ink lines.',
          cameraMove: 'Overhead Slow Push-In with crisp focal lock',
        },
      ],
    },
    publishing: {
      descriptionHook: 'Stop falling for over-engineered productivity templates. Here is how to build a frictionless, sustainable personal knowledge operating system.',
      chapters: [
        { time: '00:00', title: 'The Productivity Trap' },
        { time: '01:20', title: 'Why Complex Systems Get Abandoned' },
        { time: '03:15', title: 'The 3 Essential Databases' },
        { time: '06:00', title: 'The 3-Second Capture Workflow' },
        { time: '08:45', title: 'Weekly Review without Overwhelm' },
      ],
      tags: ['notion second brain', 'productivity systems', 'digital minimalism', 'notion setup', 'personal knowledge management', 'pkm', 'study workflow'],
      hashtags: ['#Notion', '#Productivity', '#SecondBrain', '#CreatorWorkflow'],
      pinnedQuestion: 'What is the biggest friction point in your current note-taking or planning routine? Let\'s discuss in the comments!',
    },
  },
];

interface InteractiveDemoProps {
  onStartCreating: () => void;
}

export const InteractiveDemo: React.FC<InteractiveDemoProps> = ({ onStartCreating }) => {
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'angle' | 'titles' | 'script' | 'kit' | 'publishing'>('titles');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const { toast } = useToast();

  const currentData: DemoTopicData = isCustomMode && customInput.trim()
    ? {
        topic: customInput.trim(),
        niche: 'Custom Creator Topic',
        angle: {
          hookPremise: `Exploring "${customInput.trim()}" through a distinct creator perspective with algorithmic retention framing.`,
          curiosityGap: `Connects core questions around "${customInput.trim()}" to high-CTR psychological tension.`,
          targetViewer: 'Targeted YouTube audience interested in this specific niche and practical breakdowns.',
          estimatedRetentionFocus: 'Deliver the core value promise in the first 5 seconds before expanding into key arguments.',
        },
        titles: [
          { text: `${customInput.trim()} (The Complete 2026 Breakdown)`, style: 'Curiosity Loop', charCount: customInput.trim().length + 33, predictedCtr: '9.2%' },
          { text: `Why Everyone is Talking About ${customInput.trim()}`, style: 'Trend Velocity', charCount: customInput.trim().length + 34, predictedCtr: '8.8%' },
          { text: `What Nobody Tells You About ${customInput.trim()}`, style: 'Insider Reality', charCount: customInput.trim().length + 31, predictedCtr: '9.5%' },
        ],
        hooks: [
          {
            type: 'Pattern Interrupt',
            hook: `Most people misunderstand ${customInput.trim()}. Here is the single fact that changes everything.`,
            deliveryTip: 'Deliver with steady confidence directly to camera, followed by a 1-second visual pause.',
          },
          {
            type: 'Stakes & Impact',
            hook: `If you are looking into ${customInput.trim()} this year, this 5-minute breakdown will save you dozens of wasted hours.`,
            deliveryTip: 'Raise energy on the stakes statement and transition immediately into beat one.',
          },
        ],
        scriptBeats: [
          { timestamp: '00:00 - 00:05', beat: 'The Hook', audio: `Here is the truth about ${customInput.trim()}.`, visual: 'Dynamic fast cut establishing immediate topic context.' },
          { timestamp: '00:05 - 00:18', beat: 'Core Context', audio: 'Why this topic is gaining velocity right now.', visual: 'Motion graphics illustrating key data points and context.' },
          { timestamp: '00:18 - 00:35', beat: 'The Deep Dive', audio: 'Step-by-step breakdown of the mechanics and implications.', visual: 'Demonstration footage and clean visual proof.' },
          { timestamp: '00:35 - 00:45', beat: 'Key Takeaway', audio: 'The single conclusion you should apply immediately.', visual: 'Direct-to-camera wrap-up with summary checklist onscreen.' },
        ],
        creationKit: {
          engineRecommended: 'Google Flow / Kling AI / Leonardo',
          aspectRatio: '16:9 Landscape',
          clips: [
            {
              clipNumber: 1,
              duration: '10s',
              visualPrompt: `Cinematic wide-angle view representing ${customInput.trim()}, clean architectural lines, soft natural lighting, depth of field, 8k resolution.`,
              motionPrompt: 'Smooth continuous dolly push-in with subtle atmospheric particles.',
              cameraMove: 'Push-In with focal track',
            },
          ],
        },
        publishing: {
          descriptionHook: `Everything you need to know about ${customInput.trim()} in one concise, actionable YouTube package.`,
          chapters: [
            { time: '00:00', title: 'Introduction' },
            { time: '01:15', title: 'Core Mechanics' },
            { time: '03:45', title: 'Practical Application' },
            { time: '06:00', title: 'Summary & Next Steps' },
          ],
          tags: [customInput.toLowerCase().slice(0, 30), 'youtube tutorial', 'creator breakdown', 'video strategy'],
          hashtags: ['#YouTubeCreator', '#Strategy', '#ContentCreation'],
          pinnedQuestion: `What is your biggest takeaway regarding ${customInput.trim()}? Drop your thoughts below!`,
        },
      }
    : PRESET_TOPICS[selectedTopicIndex];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast('Copied to clipboard', 'Text ready to paste into YouTube Studio or your teleprompter.', 'success');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim().length > 3) {
      setIsCustomMode(true);
      toast('Custom Topic Analyzed', `Generated demonstration package for "${customInput.trim()}".`, 'info');
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden font-sans">
      {/* Top Banner with Clear Transparency Notice */}
      <div className="bg-[#faf9f5] border-b border-black/[0.06] px-5 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#d4a017]" />
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-800 font-semibold">
            Interactive Product Demonstration
          </span>
          <span className="text-neutral-300 hidden sm:inline">·</span>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Deterministic sample data showcasing the 5-step workspace transformation
          </span>
        </div>
        <div className="text-[11px] font-mono text-neutral-500 bg-white px-2.5 py-1 rounded border border-black/[0.06]">
          Real Multi-Clip Pipeline
        </div>
      </div>

      {/* Topic Selection Bar */}
      <div className="p-5 sm:p-8 border-b border-black/[0.06] bg-white">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider font-mono">
              1. Choose or Enter a Seed Video Topic
            </span>
            <span className="text-xs text-neutral-400">
              Select a sample to preview instant generation
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PRESET_TOPICS.map((t, idx) => {
              const isSelected = !isCustomMode && selectedTopicIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setSelectedTopicIndex(idx);
                  }}
                  className={`text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] shadow-xs'
                      : 'border-black/[0.08] bg-[#faf9f5] text-neutral-700 hover:border-black/20 hover:bg-white'
                  }`}
                >
                  <div className={`font-mono text-[10px] mb-1 font-semibold ${isSelected ? 'text-[#d4a017]' : 'text-neutral-400'}`}>
                    {t.niche}
                  </div>
                  <div className="font-semibold line-clamp-2 leading-snug">
                    {t.topic}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Topic Input */}
          <form onSubmit={handleCustomSubmit} className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or type any sample topic (e.g., 'How to start a podcast on a budget')..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#faf9f5] focus:bg-white border border-black/[0.1] rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={customInput.trim().length <= 3}
              className="px-5 py-2.5 bg-[#1a1a1a] disabled:bg-neutral-300 text-white font-mono text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:cursor-not-allowed"
            >
              Analyze Topic
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Tabs Header */}
      <div className="bg-[#faf9f5] border-b border-black/[0.06] px-5 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-black/[0.06] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('titles')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'titles'
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Titles & Hooks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('angle')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'angle'
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Angle & Audience</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('script')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'script'
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span>Script Beats</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kit')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'kit'
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5 text-neutral-400" />
              <span>Creation Kit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('publishing')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'publishing'
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Publishing Studio</span>
            </button>
          </div>

          <span className="font-mono text-[11px] text-neutral-500 hidden md:inline shrink-0">
            Topic: <span className="text-neutral-900 font-semibold truncate max-w-xs inline-block align-bottom">{currentData.topic}</span>
          </span>
        </div>
      </div>

      {/* Tab Content Display Area */}
      <div className="p-5 sm:p-8 bg-white min-h-[380px]">
        <div className="max-w-4xl mx-auto">
          {/* TAB 1: TITLES & HOOKS */}
          {activeTab === 'titles' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* CTR-Engineered Titles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
                    High-CTR Title Formulas (<span className="text-emerald-700">Under 60 Chars for Mobile</span>)
                  </span>
                  <span className="text-xs text-neutral-400">Click to copy</span>
                </div>
                <div className="space-y-2.5">
                  {currentData.titles.map((title, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-black/[0.08] bg-[#faf9f5] hover:bg-white hover:border-black/20 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-semibold text-neutral-400 w-5">
                          0{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            {title.text}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                            <span>{title.style}</span>
                            <span>·</span>
                            <span>{title.charCount} characters</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-xs text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                          CTR {title.predictedCtr}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(title.text, `title-${idx}`)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          aria-label="Copy title"
                        >
                          {copiedKey === `title-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* First-5-Second Retention Hooks */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
                    First-5-Second Retention Hooks & Director Notes
                  </span>
                  <span className="text-xs text-neutral-400">Psychology-tested openers</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentData.hooks.map((hook, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-semibold text-[#d4a017] uppercase">
                            {hook.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(hook.hook, `hook-${idx}`)}
                            className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-mono cursor-pointer"
                          >
                            {copiedKey === `hook-${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy
                          </button>
                        </div>
                        <p className="text-xs font-medium text-neutral-900 leading-relaxed italic">
                          "{hook.hook}"
                        </p>
                      </div>
                      <div className="pt-2 border-t border-black/[0.06] text-[11px] text-neutral-600">
                        <span className="font-semibold text-neutral-800">Delivery Cue:</span> {hook.deliveryTip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANGLE & AUDIENCE */}
          {activeTab === 'angle' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-2">
                <span className="font-mono text-xs font-bold text-neutral-800 uppercase block">
                  Core Content Angle & Hook Premise
                </span>
                <p className="text-sm text-neutral-800 leading-relaxed font-serif">
                  {currentData.angle.hookPremise}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-1.5">
                  <span className="font-mono text-[11px] font-semibold text-neutral-500 uppercase block">
                    Curiosity Gap Architecture
                  </span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {currentData.angle.curiosityGap}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-1.5">
                  <span className="font-mono text-[11px] font-semibold text-neutral-500 uppercase block">
                    Target Viewer Archetype
                  </span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {currentData.angle.targetViewer}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 flex items-start gap-2.5 text-xs text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Retention Strategy Note: </span>
                  <span>{currentData.angle.estimatedRetentionFocus}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCRIPT BEATS */}
          {activeTab === 'script' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <span className="font-mono text-xs font-bold text-neutral-900 uppercase">
                  45-Second Shorts Video Beat Outline
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentData.scriptBeats.map(b => `[${b.timestamp}] ${b.beat}\nAudio: ${b.audio}\nVisual: ${b.visual}`).join('\n\n'), 'all-beats')}
                  className="text-xs font-mono text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'all-beats' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Full Beats
                </button>
              </div>

              <div className="space-y-2.5">
                {currentData.scriptBeats.map((beat, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-3.5 rounded-xl border border-black/[0.08] bg-[#faf9f5] grid grid-cols-1 md:grid-cols-12 gap-3"
                  >
                    <div className="md:col-span-3 flex md:flex-col justify-between md:justify-start gap-1">
                      <span className="font-mono text-xs font-semibold text-[#1a1a1a]">
                        {beat.timestamp}
                      </span>
                      <span className="font-mono text-[11px] text-[#d4a017] uppercase font-semibold">
                        {beat.beat}
                      </span>
                    </div>
                    <div className="md:col-span-9 space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-neutral-900">Audio Dialogue: </span>
                        <span className="text-neutral-700 font-medium">"{beat.audio}"</span>
                      </div>
                      <div className="text-neutral-500">
                        <span className="font-semibold text-neutral-700">Visual Director Cue: </span>
                        <span>{beat.visual}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CREATION KIT */}
          {activeTab === 'kit' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono uppercase font-bold text-neutral-900">Calibrated Multi-Clip Prompts:</span>
                  <span className="font-mono text-[#d4a017] font-semibold">{currentData.creationKit.engineRecommended}</span>
                </div>
                <span className="font-mono text-[11px] text-neutral-400">
                  Format: {currentData.creationKit.aspectRatio}
                </span>
              </div>

              <div className="space-y-3">
                {currentData.creationKit.clips.map((clip, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-[#1a1a1a] text-white px-2 py-0.5 rounded">
                          Shot #{clip.clipNumber}
                        </span>
                        <span className="font-mono text-xs text-neutral-500">({clip.duration})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(clip.visualPrompt, `clip-${cIdx}`)}
                        className="text-xs font-mono text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `clip-${cIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Prompt
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono text-[11px] uppercase text-neutral-500 block mb-0.5">Visual Scene Prompt:</span>
                        <p className="font-mono text-neutral-800 bg-white p-2.5 rounded-lg border border-black/[0.06] text-[11px] leading-relaxed">
                          {clip.visualPrompt}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="font-semibold text-neutral-700">Motion Direction: </span>
                          <span className="text-neutral-600">{clip.motionPrompt}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-700">Camera Movement: </span>
                          <span className="text-neutral-600">{clip.cameraMove}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PUBLISHING STUDIO */}
          {activeTab === 'publishing' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-900 uppercase">
                    YouTube SEO Description & Chapters
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${currentData.publishing.descriptionHook}\n\nTimestamps:\n${currentData.publishing.chapters.map(c => `${c.time} - ${c.title}`).join('\n')}\n\n${currentData.publishing.hashtags.join(' ')}`, 'pub-desc')}
                    className="text-xs font-mono text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'pub-desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    Copy Description
                  </button>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed font-sans">
                  {currentData.publishing.descriptionHook}
                </p>
                <div className="pt-2 font-mono text-[11px] text-neutral-600 space-y-1 border-t border-black/[0.06]">
                  <span className="font-semibold text-neutral-800 block mb-1">Chapters:</span>
                  {currentData.publishing.chapters.map((ch, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-[#d4a017] font-semibold">{ch.time}</span>
                      <span>{ch.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-2">
                  <span className="font-mono text-[11px] font-bold text-neutral-800 uppercase block">
                    Target Search Tags ({currentData.publishing.tags.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentData.publishing.tags.map((tag, idx) => (
                      <span key={idx} className="text-[11px] font-mono text-neutral-700 bg-white px-2 py-0.5 rounded border border-black/[0.06]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-2">
                  <span className="font-mono text-[11px] font-bold text-neutral-800 uppercase block">
                    Algorithmic Hashtags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentData.publishing.hashtags.map((ht, idx) => (
                      <span key={idx} className="text-[11px] font-mono text-[#d4a017] bg-white px-2 py-0.5 rounded border border-black/[0.06] font-semibold">
                        {ht}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-black/[0.08] bg-[#faf9f5] space-y-1.5">
                <span className="font-mono text-[11px] font-bold text-neutral-800 uppercase block">
                  Pinned Community Engagement Prompt
                </span>
                <p className="text-xs text-neutral-700 leading-relaxed italic">
                  "{currentData.publishing.pinnedQuestion}"
                </p>
              </div>
            </div>
          )}

          {/* Bottom Conversion CTA Strip */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-500">
              <span>Ready to generate full packages like this for your own YouTube channel?</span>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onStartCreating}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider"
            >
              Start Creating in Studio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
