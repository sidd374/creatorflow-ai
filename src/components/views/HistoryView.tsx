import React from 'react';
import { History, ArrowRight, Clock, CheckCircle2, RotateCw } from 'lucide-react';
import { ContentPack } from '../../types';
import { Button } from '../ui/Button';

interface HistoryViewProps {
  packs: ContentPack[];
  onOpenPack: (packId: string) => void;
  onNavigate: (view: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  packs,
  onOpenPack,
  onNavigate,
}) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      <div className="pb-4 border-b border-black/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
            Audit Log
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs text-neutral-500 font-mono">Generation Timeline</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Generation History
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
          Complete log of video packages and individual tools executed across sessions.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-black/[0.08] shadow-xs overflow-hidden">
        {packs.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-[#eeeae3] text-[#d4a017] flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-normal text-[#1a1a1a] mb-1">
              No Generation History Yet
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6 font-sans">
              When you generate full YouTube content packages or individual tool outputs, your audit log will appear here.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-mono uppercase tracking-wider"
            >
              Start on Dashboard
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {packs.map((pack) => (
              <div key={pack.id} className="p-5 sm:p-6 hover:bg-[#f8f7f4] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded bg-[#eeeae3] text-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5 border border-[#e2ddd4]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1 font-mono text-[10px]">
                      <span className="font-semibold text-neutral-800 uppercase">{pack.platform} Full Pack</span>
                      <span>·</span>
                      <span>{pack.language}</span>
                      <span>·</span>
                      <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-serif text-lg font-normal text-[#1a1a1a]">
                      {pack.topic}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-mono text-[11px]">
                      <span>5 Titles</span>
                      <span>·</span>
                      <span>3 Hooks</span>
                      <span>·</span>
                      <span>SEO Meta</span>
                      <span>·</span>
                      <span>Shorts Script</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenPack(pack.id);
                      onNavigate('content-pack');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="text-xs bg-white h-9 font-mono uppercase tracking-wider"
                  >
                    View Blueprint
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
