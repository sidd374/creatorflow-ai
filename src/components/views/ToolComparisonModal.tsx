import React, { useEffect } from 'react';
import { X, Check, ExternalLink, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { ScoredTool } from '../../lib/toolRecommendationEngine';
import { Button } from '../ui/Button';

interface ToolComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ScoredTool[];
  onRemoveTool: (toolId: string) => void;
  onSelectTool: (tool: ScoredTool) => void;
  selectedToolIds: Record<string, string>;
}

export const ToolComparisonModal: React.FC<ToolComparisonModalProps> = ({
  isOpen,
  onClose,
  tools,
  onRemoveTool,
  onSelectTool,
  selectedToolIds,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between gap-4 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-900" />
            <h2 className="text-base sm:text-lg font-black text-neutral-900">
              Tool Comparison ({tools.length}/3)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-5 overflow-y-auto overflow-x-auto flex-1">
          {tools.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No tools selected for comparison. Click "Compare" on up to 3 tool cards.
            </div>
          ) : (
            <div className="min-w-[620px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="py-3 px-3 font-semibold text-neutral-400 uppercase text-[10px] w-28">
                      Feature
                    </th>
                    {tools.map((tool) => (
                      <th key={tool.id} className="py-3 px-4 text-neutral-900 font-bold">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-black">{tool.name}</div>
                            <span className="text-[10px] text-neutral-500 font-normal">
                              {tool.category}
                            </span>
                          </div>
                          <button
                            onClick={() => onRemoveTool(tool.id)}
                            className="text-neutral-400 hover:text-rose-600 p-0.5 rounded"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {/* Cost / Plan */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Cost</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4 font-semibold text-neutral-900">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                          t.availability === 'Free' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {t.availability}
                        </span>
                        <div className="text-[11px] text-neutral-500 mt-1">{t.pricingNote}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Difficulty */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Difficulty</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4">
                        <span className="font-semibold text-neutral-800">{t.difficulty}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Match Fit */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Fit Score</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          t.matchLevel === 'Best match'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {t.matchLevel} ({t.fitScore}/100)
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Best For */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Best For</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4 text-neutral-700 leading-relaxed">
                        {t.bestFor}
                      </td>
                    ))}
                  </tr>

                  {/* Main Advantage */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Benefit</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4 text-neutral-700 leading-relaxed">
                        {t.mainBenefit}
                      </td>
                    ))}
                  </tr>

                  {/* Limitations */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Limitations</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4 text-neutral-500 leading-relaxed">
                        {t.limitations}
                      </td>
                    ))}
                  </tr>

                  {/* Hardware / Devices */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Devices</td>
                    {tools.map((t) => (
                      <td key={t.id} className="py-3 px-4">
                        <div className="text-neutral-700">{t.deviceSupport.join(', ')}</div>
                        {t.demandsHardware && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium mt-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>May require a stronger computer</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Actions */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-neutral-500 text-[11px]">Selection</td>
                    {tools.map((t) => {
                      const isSelected = selectedToolIds[t.categoryKey] === t.id;
                      return (
                        <td key={t.id} className="py-3 px-4">
                          <Button
                            variant={isSelected ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => onSelectTool(t)}
                            leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
                            className={`text-xs w-full ${
                              isSelected
                                ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                            }`}
                          >
                            {isSelected ? 'Active in Stack' : 'Choose Tool'}
                          </Button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span>Compare up to 3 tools across cost, hardware, and fit.</span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
