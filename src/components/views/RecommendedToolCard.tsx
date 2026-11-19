import React from 'react';
import { 
  Check, 
  ExternalLink, 
  Info, 
  Sparkles, 
  Laptop, 
  AlertTriangle, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { ToolRecommendation } from '../../types';
import { ScoredTool } from '../../lib/toolRecommendationEngine';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface RecommendedToolCardProps {
  tool: ScoredTool;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: (tool: ScoredTool) => void;
  onOpenDetails: (tool: ScoredTool) => void;
  onToggleCompare: (tool: ScoredTool) => void;
  canCompare: boolean;
  isFreeBudget: boolean;
}

export const RecommendedToolCard: React.FC<RecommendedToolCardProps> = ({
  tool,
  isSelected,
  isCompared,
  onSelect,
  onOpenDetails,
  onToggleCompare,
  canCompare,
  isFreeBudget,
}) => {
  const isFree = tool.availability === 'Free';
  const isFreemium = tool.availability === 'Freemium';
  const isPaid = tool.availability.includes('Paid');

  return (
    <Card 
      className={`flex flex-col h-full bg-white transition-all duration-200 border ${
        isSelected 
          ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900' 
          : 'border-neutral-200/85 hover:border-neutral-300 shadow-xs'
      }`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1 space-y-3.5">
        {/* Top Badges & Match Score */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
              {tool.category}
            </span>

            {/* Free / Paid badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isFree 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' 
                : isFreemium
                ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80'
            }`}>
              {tool.availability}
            </span>

            {/* Difficulty Badge */}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
              {tool.difficulty}
            </span>
          </div>

          {/* Qualitative Match Badge */}
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              tool.matchLevel === 'Best match'
                ? 'bg-emerald-100 text-emerald-900 font-mono font-bold'
                : tool.matchLevel === 'Strong match'
                ? 'bg-neutral-100 text-neutral-800 font-mono'
                : 'bg-neutral-50 text-neutral-600 font-mono'
            }`}>
              {tool.matchLevel}
            </span>
          </div>
        </div>

        {/* Tool Name & Best For */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-1.5">
              <span>{tool.name}</span>
              {tool.matchLevel === 'Best match' && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded">
                  Recommended
                </span>
              )}
            </h3>

            {isSelected && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Active Tool
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
            <strong className="font-semibold text-neutral-700">Best for:</strong> {tool.bestFor}
          </p>
        </div>

        {/* Compact Metadata Rows */}
        <div className="space-y-1.5 text-[11px] bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-200/60">
          <div className="flex items-start gap-1.5 text-neutral-700">
            <span className="font-semibold text-neutral-900 shrink-0">Benefit:</span>
            <span className="text-neutral-600 line-clamp-2">{tool.mainBenefit}</span>
          </div>
          <div className="flex items-start gap-1.5 text-neutral-600">
            <span className="font-semibold text-neutral-800 shrink-0">Limitations:</span>
            <span className="text-neutral-500 line-clamp-1">{tool.limitations}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-600 pt-0.5">
            <Laptop className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="truncate">Devices: {tool.deviceSupport.join(', ')}</span>
          </div>
          {tool.demandsHardware && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>May require a stronger computer</span>
            </div>
          )}
        </div>

        {/* Profile-Specific Fit Highlights */}
        {tool.reasons && tool.reasons.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Why this fits you
            </span>
            <ul className="text-xs text-neutral-600 space-y-0.5">
              {tool.reasons.slice(0, 2).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span className="line-clamp-1">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1" />

        {/* Pricing Note */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <span>{tool.pricingNote}</span>
          <button
            onClick={() => onToggleCompare(tool)}
            disabled={!isCompared && !canCompare}
            className={`text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              isCompared 
                ? 'text-rose-600 font-bold' 
                : canCompare 
                ? 'text-neutral-600 hover:text-neutral-900' 
                : 'text-neutral-300 cursor-not-allowed'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isCompared ? 'Comparing' : 'Compare'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDetails(tool)}
            className="text-xs"
          >
            View Details
          </Button>

          <Button
            variant={isSelected ? 'outline' : 'primary'}
            size="sm"
            onClick={() => onSelect(tool)}
            className={`text-xs font-semibold ${
              isSelected 
                ? 'border-neutral-900 text-neutral-900 hover:bg-neutral-100' 
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            {isSelected ? 'Change Tool' : 'Choose Tool'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
