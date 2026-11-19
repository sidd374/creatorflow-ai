import React from 'react';
import { WorkflowYoutubeSettings } from '../../types/guidedWorkflow';
import { Check, Info, ShieldCheck, Globe, Lock, Users, Film, Sliders } from 'lucide-react';

interface Step7YoutubeSettingsProps {
  settings: WorkflowYoutubeSettings;
  onUpdateSettings: (settings: WorkflowYoutubeSettings) => void;
  onContinue: () => void;
}

export const Step7YoutubeSettings: React.FC<Step7YoutubeSettingsProps> = ({
  settings,
  onUpdateSettings,
  onContinue,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 10 of 11 — Studio Checklist
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          YouTube Upload Settings
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          Reference configuration to apply directly inside your YouTube Studio upload modal.
        </p>

        {/* Studio Disclaimer Notice */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#eeeae3] border border-[#e2ddd4] text-[11px] font-mono text-neutral-700">
          <Info className="w-3.5 h-3.5 text-[#d4a017]" />
          <span>Apply these settings inside studio.youtube.com when uploading your exported video file</span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Visibility */}
        <div className="bg-white border border-black/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-normal text-[#1a1a1a]">1. Visibility</span>
            <Lock className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xs text-neutral-500">
            Publish as Unlisted first for 15 minutes to let YouTube process high-definition 1080p and verify copyright checks before going Public.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(['Public', 'Unlisted', 'Private', 'Schedule'] as const).map((vis) => (
              <button
                key={vis}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, visibility: vis })}
                className={`py-2 px-3 font-mono text-xs uppercase tracking-wider border text-center transition-all ${
                  settings.visibility === vis
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                    : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div className="bg-white border border-black/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-normal text-[#1a1a1a]">2. COPPA Audience</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xs text-neutral-500">
            Federal COPPA law compliance. Unless this video is specifically intended for children under 13, select "Not made for kids" to enable comments and notifications.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(['Not made for kids', 'Made for kids'] as const).map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, audience: aud })}
                className={`py-2 px-2.5 font-mono text-xs uppercase tracking-wider border text-center transition-all ${
                  settings.audience === aud
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-semibold'
                    : 'border-black/[0.08] hover:border-[#d4a017] text-[#1a1a1a] bg-white'
                }`}
              >
                {aud}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="bg-white border border-black/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-normal text-[#1a1a1a]">3. Channel Category</span>
            <Film className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xs text-neutral-500">
            Categorizes your video in browse features and recommendations.
          </p>
          <select
            value={settings.category}
            onChange={(e) => onUpdateSettings({ ...settings, category: e.target.value })}
            className="w-full p-2.5 bg-[#f8f7f4] border border-black/[0.12] text-xs font-mono text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
          >
            <option value="Howto & Style">Howto & Style (Recommended for tutorials)</option>
            <option value="Education">Education</option>
            <option value="Science & Technology">Science & Technology</option>
            <option value="Entertainment">Entertainment</option>
            <option value="People & Blogs">People & Blogs</option>
          </select>
        </div>

        {/* Language & Captions */}
        <div className="bg-white border border-black/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-normal text-[#1a1a1a]">4. Language & Certification</span>
            <Globe className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-xs text-neutral-500">
            Tells YouTube which subtitle models to train and match with viewer preferences.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={settings.language}
              onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
              className="p-2 bg-[#f8f7f4] border border-black/[0.12] text-xs font-mono text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Kannada">Kannada</option>
              <option value="Malayalam">Malayalam</option>
            </select>
            <div className="p-2 bg-[#f8f7f4] border border-black/[0.06] text-[10px] font-mono text-neutral-600 flex items-center">
              Caption Cert: None
            </div>
          </div>
        </div>

        {/* License & Embedding (Full-width) */}
        <div className="bg-white border border-black/[0.08] p-5 sm:col-span-2 space-y-4">
          <span className="font-serif text-lg font-normal text-[#1a1a1a] block">
            5. Distribution & Licensing
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex items-start gap-3 p-3 bg-[#f8f7f4] border border-black/[0.05] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowEmbedding}
                onChange={(e) => onUpdateSettings({ ...settings, allowEmbedding: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <strong className="font-mono text-xs uppercase text-[#1a1a1a] block">Allow Embedding</strong>
                <span className="text-neutral-500 text-[11px]">Permits other websites and blogs to embed your video, boosting views.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-[#f8f7f4] border border-black/[0.05] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.publishToSubscriptions}
                onChange={(e) => onUpdateSettings({ ...settings, publishToSubscriptions: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <strong className="font-mono text-xs uppercase text-[#1a1a1a] block">Publish to Subscriptions</strong>
                <span className="text-neutral-500 text-[11px]">Pushes notification to subscribers feed upon publishing.</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
