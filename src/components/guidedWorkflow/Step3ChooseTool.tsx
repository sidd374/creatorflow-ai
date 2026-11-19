import React, { useState } from 'react';
import { WorkflowToolInfo } from '../../types/guidedWorkflow';
import { Check, ExternalLink, X, SlidersHorizontal, Info, ShieldCheck, ArrowRight, Sparkles, Layers, Terminal, Film, Mic, Scissors, Video } from 'lucide-react';

interface Step3ChooseToolProps {
  tools: WorkflowToolInfo[];
  selectedTool: WorkflowToolInfo | null;
  onSelectTool: (tool: WorkflowToolInfo) => void;
  creationMethod: string;
  onContinue: () => void;
}

export const Step3ChooseTool: React.FC<Step3ChooseToolProps> = ({
  tools,
  selectedTool,
  onSelectTool,
  creationMethod,
  onContinue,
}) => {
  const [detailModalTool, setDetailModalTool] = useState<WorkflowToolInfo | null>(null);

  const isAIWorkflow = creationMethod === 'ai_animation' || creationMethod === 'ai_image_to_video' || creationMethod === 'ai_assisted';

  const formatMethodName = (method: string) => {
    switch (method) {
      case 'ai_animation': return 'AI Animation';
      case 'ai_image_to_video': return 'AI Image → Video';
      case 'faceless': return 'Faceless Video';
      case 'whiteboard': return 'Whiteboard Animation';
      case 'talking_head': return 'Talking Head';
      case 'screen_recording': return 'Screen Recording';
      case 'gameplay': return 'Gameplay';
      case 'documentary': return 'Documentary';
      case 'manual_editing': return 'Manual Editing';
      default: return method || 'Production';
    }
  };

  const getToolInputs = (tool: WorkflowToolInfo) => {
    if (tool.workflowProfile?.requiredInputs && tool.workflowProfile.requiredInputs.length > 0) {
      return tool.workflowProfile.requiredInputs;
    }
    const name = tool.name.toLowerCase();
    if (name.includes('flow') || name.includes('runway') || name.includes('kling') || name.includes('luma') || name.includes('pika')) {
      return ['Text scene prompts', 'Character consistency block', 'Aspect ratio (16:9)'];
    }
    if (name.includes('elevenlabs') || name.includes('audacity')) {
      return ['Narration script text', 'Voice pacing setting', 'Audio format'];
    }
    return ['Scene video clips', 'Voiceover audio track', 'Background music'];
  };

  // Group tools into dedicated architectural categories
  const primaryGenerators = tools.filter((t) => t.toolCategory === 'ai_generator');
  const voiceTools = tools.filter((t) => t.toolCategory === 'voice_audio');
  const editingTools = tools.filter((t) => t.toolCategory === 'editing_assembly');
  const captureTools = tools.filter((t) => t.toolCategory === 'screen_capture' || t.toolCategory === 'whiteboard' || t.toolCategory === 'design');

  const handleSelect = (tool: WorkflowToolInfo) => {
    onSelectTool(tool);
  };

  const renderToolCard = (tool: WorkflowToolInfo, isPrimaryCategory: boolean = false) => {
    const isSelected = selectedTool?.id === tool.id;
    const inputs = getToolInputs(tool);

    return (
      <div
        key={tool.id}
        className={`p-5 border bg-white flex flex-col justify-between transition-all duration-200 ${
          isSelected
            ? 'border-[#1a1a1a] ring-2 ring-[#1a1a1a] shadow-md'
            : 'border-black/[0.08] hover:border-[#d4a017] shadow-xs'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  {tool.name}
                </h3>
                {tool.providerUrl && (
                  <a
                    href={tool.providerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-neutral-700"
                    title="Official Website"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="text-xs text-neutral-600 mt-0.5">
                <strong>Best for:</strong> {tool.bestFor}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 bg-[#eeeae3] text-[#1a1a1a] border border-[#e2ddd4] shrink-0 font-semibold">
                {tool.difficulty}
              </span>
              {tool.generationType && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4a017] font-semibold">
                  {tool.generationType}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#d4a017] font-semibold">{tool.cost}</span>
            <span className="text-neutral-300">&bull;</span>
            <span className="text-neutral-500">Works on: {tool.worksOn.join(', ')}</span>
          </div>

          <p className="text-xs text-neutral-700 leading-relaxed bg-[#f8f7f4] p-2.5 border border-black/[0.04]">
            <strong className="text-[#1a1a1a]">Why CreatorFlow recommends it:</strong> {tool.whyFitsVideo}
          </p>

          {/* Inputs required */}
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase text-neutral-500 font-semibold block flex items-center gap-1">
              <Terminal className="w-3 h-3 text-[#d4a017]" />
              <span>What inputs this tool needs:</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {inputs.map((inp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-[#eeeae3] text-[10px] font-mono text-neutral-700 border border-[#e2ddd4]"
                >
                  {inp}
                </span>
              ))}
            </div>
          </div>

          {/* Limitations */}
          <div className="space-y-1 text-xs text-neutral-500">
            <span className="font-mono text-[10px] uppercase text-neutral-400 font-semibold block">
              Limitations to know:
            </span>
            <ul className="space-y-0.5">
              {tool.limitations.slice(0, 2).map((lim, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-neutral-400 font-mono text-[9px] mt-0.5">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDetailModalTool(tool)}
            className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 hover:text-[#1a1a1a] cursor-pointer"
          >
            View Specs
          </button>
          <button
            type="button"
            onClick={() => handleSelect(tool)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#1a1a1a] text-white ring-1 ring-[#1a1a1a]'
                : 'bg-[#eeeae3] text-[#1a1a1a] hover:bg-[#d4a017] hover:text-white'
            }`}
          >
            {isSelected ? '✓ Selected' : 'Choose This Tool'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 6 of 11 — Production Tools
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          {isAIWorkflow ? 'Choose your AI Animation Tool' : `Choose your ${formatMethodName(creationMethod)} Tool`}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          {isAIWorkflow
            ? 'Select your primary AI generation platform. CreatorFlow will generate tool-specific prompt structures and motion commands.'
            : 'Select the primary software for this video. CreatorFlow will generate exact instructions and timeline blueprints.'}
        </p>

        {/* Verification Note */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#eeeae3] border border-[#e2ddd4] text-[11px] font-mono text-neutral-700">
          <Info className="w-3.5 h-3.5 text-[#d4a017]" />
          <span>Capability verification active — exact prompt syntax mapped to selected platform</span>
        </div>
      </div>

      {/* Active Selected Tool Banner */}
      {selectedTool && (
        <div className="bg-[#1a1a1a] text-[#f8f7f4] p-5 border border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4a017] font-semibold">
                ✓ Primary Tool Selected
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-xs text-neutral-400 font-mono">{selectedTool.cost}</span>
            </div>
            <div className="font-serif text-2xl font-normal text-white flex items-center gap-2">
              <span>{selectedTool.name}</span>
              {selectedTool.providerUrl && (
                <a
                  href={selectedTool.providerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-400 hover:text-white font-mono flex items-center gap-0.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-neutral-300 max-w-xl">
              <strong className="text-white">Why CreatorFlow recommends it:</strong> {selectedTool.whyFitsVideo}
            </p>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="px-7 py-3 bg-[#d4a017] hover:bg-[#b8890f] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors shrink-0 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Next: Get Your Creation Kit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: PRIMARY AI VIDEO & ANIMATION GENERATION TOOLS */}
      {isAIWorkflow && primaryGenerators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-black/[0.08] pb-2">
            <Film className="w-4 h-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold">
              Primary AI Video & Animation Generators
            </span>
            <span className="text-xs text-neutral-500 font-mono">(Tools that create the actual video clips)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryGenerators.map((tool) => renderToolCard(tool, true))}
          </div>
        </div>
      )}

      {/* Non-AI Primary Capture / Software (Screen Recording / Whiteboard / Talking Head) */}
      {!isAIWorkflow && captureTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-black/[0.08] pb-2">
            <Video className="w-4 h-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold">
              Primary Recording & Capture Tools
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {captureTools.map((tool) => renderToolCard(tool, true))}
          </div>
        </div>
      )}

      {/* SECTION 2: VOICE & AUDIO TOOLS */}
      {voiceTools.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-black/[0.08] pb-2">
            <Mic className="w-4 h-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold">
              Voice & Audio Polish
            </span>
            <span className="text-xs text-neutral-500 font-mono">(Optional tools for narration and audio mastering)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voiceTools.map((tool) => renderToolCard(tool))}
          </div>
        </div>
      )}

      {/* SECTION 3: EDITING & ASSEMBLY TOOLS */}
      {editingTools.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-black/[0.08] pb-2">
            <Scissors className="w-4 h-4 text-[#d4a017]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#1a1a1a] font-bold">
              Editing & Timeline Assembly
            </span>
            <span className="text-xs text-neutral-500 font-mono">(Tools to assemble generated clips, auto-captions, and music)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingTools.map((tool) => renderToolCard(tool))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-black max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-black/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#1a1a1a]">
                  {detailModalTool.name}
                </h3>
                <span className="font-mono text-xs text-[#d4a017] font-semibold">{detailModalTool.cost}</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalTool(null)}
                className="p-1 hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <strong className="block text-neutral-700 mb-1">What you'll use it for:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
                  {detailModalTool.whatYouWillUseItFor.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="block text-neutral-700 mb-1">Advantages:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
                  {detailModalTool.advantages.map((adv, idx) => (
                    <li key={idx}>{adv}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="block text-neutral-700 mb-1">Limitations:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
                  {detailModalTool.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.08] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailModalTool(null)}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 font-mono text-xs uppercase cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelect(detailModalTool);
                  setDetailModalTool(null);
                }}
                className="px-4 py-2 bg-[#1a1a1a] text-white font-mono text-xs uppercase cursor-pointer"
              >
                Select {detailModalTool.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Action */}
      <div className="pt-4 flex justify-between items-center">
        <div className="text-xs text-neutral-500">
          {selectedTool ? `Selected: ${selectedTool.name}` : 'Please select a tool to generate requirements'}
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedTool}
          className={`px-8 py-3.5 font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center gap-2 ${
            selectedTool
              ? 'bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#333] cursor-pointer shadow-sm'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          }`}
        >
          <span>Continue to Creation Kit</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
