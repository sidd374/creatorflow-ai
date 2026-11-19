import React, { useState } from 'react';
import { WorkflowDiscovery } from '../../types/guidedWorkflow';
import { Copy, Check, Hash, Search, Tag, Plus, X } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface Step6DiscoveryProps {
  discovery: WorkflowDiscovery;
  onUpdateDiscovery: (disc: WorkflowDiscovery) => void;
  onContinue: () => void;
}

type DiscoveryTab = 'Keywords' | 'Hashtags' | 'Tags';

export const Step6Discovery: React.FC<Step6DiscoveryProps> = ({
  discovery,
  onUpdateDiscovery,
  onContinue,
}) => {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('Keywords');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const { toast } = useToast();

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast('Copied', `${label} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopyAll = (list: string[], label: string) => {
    const text = activeTab === 'Tags' ? list.join(', ') : list.join(' ');
    handleCopy(text, `all_${activeTab}`, `${label} list`);
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const item = newItemText.trim();

    if (activeTab === 'Keywords') {
      onUpdateDiscovery({ ...discovery, keywords: [...discovery.keywords, item] });
    } else if (activeTab === 'Hashtags') {
      const tag = item.startsWith('#') ? item : `#${item.replace(/\s+/g, '')}`;
      onUpdateDiscovery({ ...discovery, hashtags: [...discovery.hashtags, tag] });
    } else if (activeTab === 'Tags') {
      onUpdateDiscovery({ ...discovery, tags: [...discovery.tags, item] });
    }
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    if (activeTab === 'Keywords') {
      onUpdateDiscovery({
        ...discovery,
        keywords: discovery.keywords.filter((_, i) => i !== index),
      });
    } else if (activeTab === 'Hashtags') {
      onUpdateDiscovery({
        ...discovery,
        hashtags: discovery.hashtags.filter((_, i) => i !== index),
      });
    } else if (activeTab === 'Tags') {
      onUpdateDiscovery({
        ...discovery,
        tags: discovery.tags.filter((_, i) => i !== index),
      });
    }
  };

  const currentList = activeTab === 'Keywords' 
    ? discovery.keywords 
    : activeTab === 'Hashtags' 
    ? discovery.hashtags 
    : discovery.tags;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold block mb-1">
          Step 9 of 11 — Search & Discovery
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
          Keywords, Hashtags & Tags
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl mx-auto">
          Optimized search signals to help the YouTube algorithm categorize your video and target search queries.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-black/[0.08] shadow-xs">
        <div className="flex border-b border-black/[0.06] overflow-x-auto">
          {[
            { id: 'Keywords' as DiscoveryTab, label: 'Keywords', icon: Search, count: discovery.keywords.length },
            { id: 'Hashtags' as DiscoveryTab, label: 'Hashtags', icon: Hash, count: discovery.hashtags.length },
            { id: 'Tags' as DiscoveryTab, label: 'Video Tags', icon: Tag, count: discovery.tags.length },
          ].map((t) => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-3 px-4 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[#d4a017] text-[#1a1a1a] bg-[#f8f7f4] font-semibold'
                    : 'border-transparent text-neutral-500 hover:text-[#1a1a1a] hover:bg-stone-50/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#d4a017]' : 'text-neutral-400'}`} />
                <span>{t.label}</span>
                <span className="text-[10px] opacity-60">({t.count})</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
            <div className="text-xs text-neutral-500 font-mono">
              {activeTab === 'Tags' 
                ? 'Comma-separated keywords for YouTube Studio "Tags" box.' 
                : activeTab === 'Hashtags' 
                ? 'Hashtags placed at the bottom of your description or title.'
                : 'Primary search terms to incorporate naturally into your description.'}
            </div>

            <button
              type="button"
              onClick={() => handleCopyAll(currentList, activeTab)}
              className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-[#f8f7f4] font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
            >
              {copiedKey === `all_${activeTab}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy All {activeTab}</span>
            </button>
          </div>

          {/* Items List as Clean Cards */}
          <div className="flex flex-wrap gap-2">
            {currentList.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-[#f8f7f4] border border-black/[0.08] flex items-center gap-2 text-xs font-mono text-[#1a1a1a] group"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(item, `item_${idx}`, item)}
                  className="text-neutral-400 hover:text-[#1a1a1a] transition-colors"
                  title="Copy individual item"
                >
                  {copiedKey === `item_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-neutral-300 hover:text-rose-600 transition-colors"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom item input */}
          <div className="flex items-center gap-2 max-w-md pt-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder={`Add custom ${activeTab.toLowerCase().slice(0, -1)}...`}
              className="flex-1 p-2 bg-white border border-black/[0.12] text-xs font-mono text-[#1a1a1a] focus:outline-none focus:border-[#d4a017]"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-black/[0.1] font-mono text-xs text-[#1a1a1a] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
