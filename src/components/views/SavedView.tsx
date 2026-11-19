import React, { useState } from 'react';
import { Bookmark, Search, Trash2, ArrowRight, Download, Calendar, Layers } from 'lucide-react';
import { ContentPack } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface SavedViewProps {
  packs: ContentPack[];
  onOpenPack: (packId: string) => void;
  onRemovePack: (packId: string) => void;
  onNavigate: (view: string) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  packs,
  onOpenPack,
  onRemovePack,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const filteredPacks = packs.filter(
    (p) =>
      p.topic.toLowerCase().includes(search.toLowerCase()) ||
      p.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Creator Library
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-mono">{packs.length} Saved Blueprint{packs.length === 1 ? '' : 's'}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            Saved Content Packs
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
            Access your bookmarked content blueprints, ready to copy and publish.
          </p>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved packs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-md border border-black/[0.12] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] placeholder:text-neutral-400"
          />
        </div>
      </div>

      {filteredPacks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-black/[0.08] shadow-xs">
          <Bookmark className="w-10 h-10 text-[#d4a017] mx-auto mb-3" />
          <h3 className="font-serif text-xl font-normal text-[#1a1a1a] mb-1">No saved packs found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4 font-sans">
            Generate a content pack on the dashboard and click "Save Pack" to store your blueprints here.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('dashboard')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="font-mono text-xs uppercase tracking-wider"
          >
            Create Content Pack
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPacks.map((pack) => (
            <div
              key={pack.id}
              className="p-5 bg-white rounded-lg border border-black/[0.08] hover:border-[#d4a017] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1 font-mono text-[10px]">
                  <span className="font-semibold text-neutral-800 uppercase">{pack.platform}</span>
                  <span>·</span>
                  <span>{pack.language}</span>
                  <span>·</span>
                  <span>{pack.tone}</span>
                  <span>·</span>
                  <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-serif text-lg font-normal text-[#1a1a1a] group-hover:text-[#d4a017] transition-colors">
                  {pack.topic}
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-2 font-mono text-[11px]">
                  <span>{pack.titles.length} Titles</span>
                  <span>·</span>
                  <span>{pack.hooks.length} Hooks</span>
                  <span>·</span>
                  <span>Shorts Script ({pack.shortsScript.duration})</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenPack(pack.id);
                    onNavigate('content-pack');
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs h-9 bg-white font-mono uppercase tracking-wider"
                >
                  Open Pack
                </Button>
                <button
                  onClick={() => onRemovePack(pack.id)}
                  className="p-2 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
