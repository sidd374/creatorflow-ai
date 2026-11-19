import React, { useState } from 'react';
import { CreatorWorkflowState, VideoCreationBrief, TopicIntent } from '../../types/guidedWorkflow';
import { CreatorProfile } from '../../types';
import { analyzeTopic, TopicProfile, extractTopicIntent } from '../../lib/topicAnalyzer';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Search, 
  Compass, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Zap,
  Tag,
  Edit2,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

interface Step2TopicAnalysisProps {
  topic: string;
  brief: VideoCreationBrief;
  creatorProfile: CreatorProfile;
  topicIntent?: TopicIntent;
  onUpdateTopicIntent?: (intent: TopicIntent) => void;
  onContinue: () => void;
  onEditBrief: () => void;
}

export const Step2TopicAnalysis: React.FC<Step2TopicAnalysisProps> = ({
  topic,
  brief,
  creatorProfile,
  topicIntent: initialTopicIntent,
  onUpdateTopicIntent,
  onContinue,
  onEditBrief,
}) => {
  const profile: TopicProfile = React.useMemo(() => {
    return analyzeTopic(topic || 'YouTube Content Strategy', brief.presentationStyle[0]);
  }, [topic, brief.presentationStyle]);

  const [intent, setIntent] = useState<TopicIntent>(() => {
    return initialTopicIntent || profile.topicIntent || extractTopicIntent(topic, {
      profileFormat: brief.presentationStyle[0] || 'Whiteboard Animation',
      profileAudience: creatorProfile.primaryGoal,
      profileGoal: creatorProfile.primaryGoal,
    });
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editableTopic, setEditableTopic] = useState(intent.coreTopic);
  const [editableFormat, setEditableFormat] = useState(intent.presentationFormat || 'Whiteboard Animation');
  const [editableGoal, setEditableGoal] = useState(intent.intent || 'Educational');
  const [editableAudience, setEditableAudience] = useState(intent.audience || 'Beginner YouTube creators');

  const handleSaveEdit = () => {
    const updated: TopicIntent = {
      ...intent,
      coreTopic: editableTopic,
      subject: editableTopic,
      presentationFormat: editableFormat,
      intent: editableGoal,
      audience: editableAudience,
    };
    setIntent(updated);
    if (onUpdateTopicIntent) {
      onUpdateTopicIntent(updated);
    }
    setIsEditing(false);
  };

  const searchIntentDesc = {
    tutorial: 'Actionable How-To & Step-by-Step Guidance',
    recommendation: 'Curated List of Tools & Resources',
    explanation: 'Educational Deep-Dive & Reasoning',
    guide: 'Comprehensive End-to-End Playbook',
    comparison: 'Side-by-Side Head-to-Head Evaluation',
    list: 'High-Paced Ranked Numbered Items',
    documentary: 'In-Depth Chronological Investigation',
    story: 'Narrative Experience & Lessons Learned',
    general: 'General Creator Niche Exploration',
    question: 'Curiosity-Driven Problem Solving',
  }[profile.intent] || 'Educational Insight';

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      {/* Top Banner: Brief Summary */}
      <div className="bg-[#eeeae3] border border-[#e2ddd4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a1a1a] text-[#f8f7f4] flex items-center justify-center font-serif text-sm">
            💡
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
              Original Topic Input
            </div>
            <div className="font-serif text-base font-normal text-[#1a1a1a]">
              "{topic}"
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-neutral-600 bg-white px-2.5 py-1 border border-black/[0.08]">
            {brief.availableDevices[0] || 'Laptop'} &bull; {brief.videoBudget}
          </span>
          <button
            type="button"
            onClick={onEditBrief}
            className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] underline decoration-neutral-400 ml-1"
          >
            Edit Brief
          </button>
        </div>
      </div>

      {/* Main Analysis Container */}
      <div className="bg-white border border-black/[0.08] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center max-w-xl mx-auto mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Step 2 of 10
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-xs text-neutral-500">
              Topic Intent & Constraint Separation
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            Topic Understanding & Angle
          </h2>

          <p className="text-xs text-neutral-500 mt-1">
            CreatorFlow separates <strong>WHAT</strong> you're teaching from <strong>HOW</strong> you're presenting it, so presentation styles never overwrite your subject.
          </p>
        </div>

        {/* SECTION 7: INTERPRETATION CARD */}
        <div className="bg-[#f8f7f4] border border-[#1a1a1a]/15 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4a017] font-semibold block">
                Semantic Understanding
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1a1a1a]">
                CreatorFlow understood your video as
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>✓ Topic understood correctly</span>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] p-1 border border-black/[0.1] bg-white flex items-center gap-1 px-2"
                  title="Edit interpretation"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {/* Topic */}
              <div className="p-3.5 bg-white border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Topic (Subject)
                </span>
                <div className="font-serif text-base text-[#1a1a1a] font-normal leading-snug">
                  {intent.coreTopic}
                </div>
              </div>

              {/* Format */}
              <div className="p-3.5 bg-white border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Format
                </span>
                <div className="font-serif text-base text-[#1a1a1a] font-normal leading-snug">
                  {intent.presentationFormat || 'Whiteboard Animation'}
                </div>
              </div>

              {/* Style */}
              <div className="p-3.5 bg-white border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Style
                </span>
                <div className="font-serif text-base text-[#1a1a1a] font-normal leading-snug">
                  {brief.presentationStyle.slice(0, 2).join(' + ') || 'Faceless + Voice-over'}
                </div>
              </div>

              {/* Goal */}
              <div className="p-3.5 bg-white border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Goal
                </span>
                <div className="font-serif text-base text-[#1a1a1a] font-normal leading-snug capitalize">
                  {intent.intent} / {creatorProfile.primaryGoal || 'Growth'}
                </div>
              </div>

              {/* Audience */}
              <div className="p-3.5 bg-white border border-black/[0.08] space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Audience
                </span>
                <div className="font-serif text-base text-[#1a1a1a] font-normal leading-snug">
                  {intent.audience || 'Beginner YouTube creators'}
                </div>
              </div>
            </div>
          ) : (
            /* Editing State */
            <div className="bg-white border border-black/[0.1] p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-mono text-[10px] uppercase text-neutral-600 block mb-1 font-semibold">
                    Core Topic / Subject:
                  </label>
                  <input
                    type="text"
                    value={editableTopic}
                    onChange={(e) => setEditableTopic(e.target.value)}
                    className="w-full p-2 border border-black/[0.15] font-sans text-xs bg-[#f8f7f4] text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase text-neutral-600 block mb-1 font-semibold">
                    Presentation Format:
                  </label>
                  <select
                    value={editableFormat}
                    onChange={(e) => setEditableFormat(e.target.value)}
                    className="w-full p-2 border border-black/[0.15] font-sans text-xs bg-[#f8f7f4] text-[#1a1a1a]"
                  >
                    <option value="Whiteboard Animation">Whiteboard Animation</option>
                    <option value="Screen Recording">Screen Recording</option>
                    <option value="Talking Head">Talking Head</option>
                    <option value="Faceless / Voice-over">Faceless / Voice-over</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Shorts">Shorts</option>
                    <option value="Slide Presentation">Slide Presentation</option>
                    <option value="Motion Graphics / Animation">Motion Graphics / Animation</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase text-neutral-600 block mb-1 font-semibold">
                    Intent / Goal:
                  </label>
                  <input
                    type="text"
                    value={editableGoal}
                    onChange={(e) => setEditableGoal(e.target.value)}
                    className="w-full p-2 border border-black/[0.15] font-sans text-xs bg-[#f8f7f4] text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase text-neutral-600 block mb-1 font-semibold">
                    Target Audience:
                  </label>
                  <input
                    type="text"
                    value={editableAudience}
                    onChange={(e) => setEditableAudience(e.target.value)}
                    className="w-full p-2 border border-black/[0.15] font-sans text-xs bg-[#f8f7f4] text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Save Understanding</span>
                </button>
              </div>
            </div>
          )}

          {/* Excluded Misinterpretations Banner */}
          {intent.excludedInterpretations && intent.excludedInterpretations.length > 0 && (
            <div className="pt-2 border-t border-black/[0.06] text-[11px] text-neutral-500 font-sans flex items-center gap-2">
              <span className="font-mono uppercase font-semibold text-neutral-400">Guarded Exclusions:</span>
              <span>CreatorFlow will strictly reject titles like "{intent.excludedInterpretations[0]}" to keep focus purely on your subject.</span>
            </div>
          )}
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
            <div className="flex items-center gap-2 text-neutral-600 font-mono text-[11px] uppercase tracking-wider">
              <Search className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Search Intent</span>
            </div>
            <div className="font-serif text-lg text-[#1a1a1a] capitalize">
              {profile.intent}
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              {searchIntentDesc}
            </p>
          </div>

          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
            <div className="flex items-center gap-2 text-neutral-600 font-mono text-[11px] uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Niche Sector</span>
            </div>
            <div className="font-serif text-lg text-[#1a1a1a]">
              {profile.detectedNiche || creatorProfile.channelTopic || 'Creator Growth'}
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              Targeted for {intent.presentationFormat} viewers
            </p>
          </div>

          <div className="p-4 bg-[#f8f7f4] border border-black/[0.06] space-y-1">
            <div className="flex items-center gap-2 text-neutral-600 font-mono text-[11px] uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-[#d4a017]" />
              <span>Creator Advantage</span>
            </div>
            <div className="font-serif text-lg text-[#1a1a1a]">
              High Relevance
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              Aligned with your {creatorProfile.experienceLevel} level & {brief.videoBudget}
            </p>
          </div>
        </div>

        {/* Semantic Keyword Clusters */}
        <div className="border-t border-black/[0.06] pt-5 space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-semibold flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#d4a017]" />
            <span>Target Semantic Keywords (Pure Subject Only)</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {profile.keywords.slice(0, 10).map((kw, i) => (
              <span
                key={i}
                className="font-mono text-xs px-2.5 py-1 bg-[#f8f7f4] border border-black/[0.08] text-[#1a1a1a]"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>

        {/* Actionable Strategy Box */}
        <div className="border-t border-black/[0.06] pt-5 p-4 bg-[#f8f7f4] border border-black/[0.08] flex items-start gap-3.5">
          <Zap className="w-5 h-5 text-[#d4a017] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-serif text-base text-[#1a1a1a] font-normal">
              Recommended Format Strategy:
            </div>
            <p className="text-neutral-600 leading-relaxed font-sans">
              Since you're using <strong>{intent.presentationFormat}</strong> for <strong>"{intent.coreTopic}"</strong>, your video ideas will use structured visual frameworks, diagrams, and concise narration without requiring studio cameras.
            </p>
          </div>
        </div>

        {/* Navigation / Continue Bar */}
        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
          <button
            type="button"
            onClick={onEditBrief}
            className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-[#1a1a1a] py-2 px-3"
          >
            ← Back to Brief
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="px-7 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shadow-md"
          >
            <span>Continue to Video Ideas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
