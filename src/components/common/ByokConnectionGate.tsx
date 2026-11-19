import React, { useState } from 'react';
import {
  Key,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import {
  navigateToByokSettings,
  saveByokKey,
} from '../../lib/intelligenceClient';

interface ByokConnectionGateProps {
  errorCode?: string | null;
  message?: string | null;
  compact?: boolean;
  onConnected?: () => void;
}

export const ByokConnectionGate: React.FC<ByokConnectionGateProps> = ({
  errorCode,
  message,
  compact = false,
  onConnected,
}) => {
  const [inlineOpen, setInlineOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);

  const isQuotaError =
    errorCode === 'QUOTA_EXCEEDED' || errorCode === 'RATE_LIMIT_EXCEEDED';
  const isInvalidError = errorCode === 'INVALID_API_KEY';

  const heading = isQuotaError
    ? 'Gemini API Key Quota / Rate Limit Reached'
    : isInvalidError
    ? 'Gemini API Key Rejected'
    : 'Connect Your Gemini API Key (BYOK)';

  const description =
    message ||
    (isQuotaError
      ? 'Your connected Gemini key exceeded its Google AI Studio quota. Note that keys within the same Google Cloud project share project-level limits.'
      : isInvalidError
      ? 'Your stored Gemini API key is invalid or revoked. Update your key to resume personalized AI generation.'
      : 'CreatorFlow runs every AI feature using your own personal Gemini API key—encrypted securely at rest on our server and never shared.');

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setInlineSuccess(null);
    if (!apiKeyInput.trim()) {
      setInlineError('Paste your valid Gemini API key.');
      return;
    }
    setSaving(true);
    try {
      const res = await saveByokKey({
        apiKey: apiKeyInput.trim(),
        verifyConnection: true,
      });
      if (res.testResult && !res.testResult.ok) {
        setInlineError(res.testResult.message || 'Key saved, but connection verification failed. Click Test Key in Settings.');
        return;
      }
      setApiKeyInput('');
      setInlineSuccess(res.testResult?.message || 'Gemini API key verified & connected cleanly.');
      setInlineOpen(false);
      onConnected?.();
    } catch (err: any) {
      setInlineError(err?.message || 'Unable to verify Gemini API key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`border rounded-lg bg-[#f8f7f4] ${
        isQuotaError || isInvalidError
          ? 'border-amber-300 bg-amber-50/70'
          : 'border-[#d4a017]/40'
      } ${compact ? 'p-4' : 'p-5 sm:p-6'} space-y-3`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            isQuotaError || isInvalidError
              ? 'bg-amber-100 text-amber-800'
              : 'bg-[#1a1a1a] text-[#d4a017]'
          }`}
        >
          {isQuotaError || isInvalidError ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Key className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-base font-medium text-[#1a1a1a]">
              {heading}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white border border-black/[0.08] text-neutral-600 rounded">
              BYOK Required
            </span>
          </div>
          <p className="text-xs text-neutral-700 leading-relaxed font-sans">
            {description}
          </p>
          <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              Encrypted server-side with AES-256-GCM. Keys in the same Google Cloud project share quota.
            </span>
          </p>
        </div>
      </div>

      {inlineSuccess && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{inlineSuccess}</span>
        </div>
      )}

      {inlineOpen ? (
        <form onSubmit={handleQuickSave} className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your Gemini API key..."
              autoComplete="off"
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-black/15 rounded focus:outline-none focus:border-[#1a1a1a]"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing…</span>
                </>
              ) : (
                <span>Verify &amp; Connect</span>
              )}
            </button>
          </div>
          {inlineError && (
            <p className="text-xs text-red-700 font-medium">{inlineError}</p>
          )}
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline hover:text-[#1a1a1a]"
            >
              <span>Get a free Gemini key in Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => setInlineOpen(false)}
              className="text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setInlineOpen(true)}
            className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-[11px] uppercase font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isInvalidError ? 'Update Gemini Key' : 'Quick Connect Gemini Key'}</span>
          </button>
          <button
            type="button"
            onClick={navigateToByokSettings}
            className="px-3.5 py-2 bg-white hover:bg-neutral-100 text-[#1a1a1a] border border-black/15 font-mono text-[11px] uppercase font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Open Settings &rarr; Gemini API</span>
          </button>
        </div>
      )}
    </div>
  );
};
