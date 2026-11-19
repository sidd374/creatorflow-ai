import React, { useState } from 'react';
import { Copy, Check, RotateCw, Lock, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { isCopyAllowedForPlan } from '../../lib/planEntitlements';

interface ResultCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  contentToCopy: string;
  onRegenerate?: () => void;
  onCopy?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  subtitle,
  badge,
  icon,
  contentToCopy,
  onRegenerate,
  onCopy,
  children,
  className = '',
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  const copyPermission = isCopyAllowedForPlan();

  const handleCopy = async () => {
    if (!copyPermission.allowed) {
      toast(
        'Upgrade to Copy',
        copyPermission.message || 'Ready to use. Upgrade to Pro to copy this result instantly.',
        'info'
      );
      window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
      return;
    }

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setIsCopied(true);
      if (onCopy) onCopy();
      toast('Copied to clipboard', `Copied ${title} to your clipboard.`, 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast('Copy failed', 'Please select and copy manually.', 'error');
    }
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    toast('Generating variation', 'Creating a fresh variation based on your selected tone and topic.', 'info');
    if (onRegenerate) onRegenerate();
    setTimeout(() => {
      setIsRegenerating(false);
    }, 600);
  };

  return (
    <Card className={`overflow-hidden border border-black/[0.08] shadow-xs rounded-lg ${className}`}>
      <CardHeader className="py-3.5 px-5 sm:px-6 bg-[#f8f7f4] border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-[#1a1a1a]">{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-serif font-semibold text-[#1a1a1a] tracking-tight">
                {title}
              </CardTitle>
              {badge && (
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  · {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!copyPermission.allowed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={<Lock className="w-3.5 h-3.5 text-[#d4a017]" />}
              className="text-xs h-8 bg-[#eeeae3] hover:bg-[#e4ded3] text-[#1a1a1a] border-[#ded8cd] font-mono uppercase tracking-wider font-semibold"
              title="Unlock instant copying with Pro"
            >
              <span>Unlock Copy</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
              className="text-xs h-8 bg-white font-mono uppercase tracking-wider"
            >
              {isCopied ? 'Copied' : 'Copy'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-[#d4a017]' : 'text-neutral-500'}`} />}
            className="text-xs h-8 font-mono uppercase tracking-wider"
          >
            Regenerate
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 bg-white">
        {/* Clearly visible result without blurring */}
        {children}

        {/* Free tier generation 2 conversion banner below result */}
        {!copyPermission.allowed && (
          <div className="mt-4 p-3 bg-[#f8f7f4] border border-dashed border-[#ded8cd] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <Lock className="w-4 h-4 text-[#d4a017] shrink-0" />
              <span>
                <strong>Ready to use.</strong> Upgrade to Pro to copy this result instantly into YouTube Studio.
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }))}
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-[#d4a017] hover:underline shrink-0 cursor-pointer"
            >
              <span>Upgrade to Pro</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
