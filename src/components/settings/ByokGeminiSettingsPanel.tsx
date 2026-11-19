import React, { useEffect, useState } from 'react';
import {
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Activity,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  AiUsageMetricsRecord,
  ByokKeyMetadata,
  CLIENT_SUPPORTED_GEMINI_MODELS,
  GeminiDiagnosticInfo,
  GeminiModelId,
  SupportedGeminiModel,
  deleteByokKey,
  fetchByokStatus,
  saveByokKey,
  testByokKey,
  updateByokModel,
} from '../../lib/intelligenceClient';
import { useToast } from '../ui/Toast';

export const ByokGeminiSettingsPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<ByokKeyMetadata | null>(null);
  const [models, setModels] = useState<SupportedGeminiModel[]>(
    CLIENT_SUPPORTED_GEMINI_MODELS
  );
  const [usage, setUsage] = useState<AiUsageMetricsRecord | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] =
    useState<GeminiModelId>('gemini-4-hydrogen');
  const [saving, setSaving] = useState(false);
  const [testingModel, setTestingModel] = useState<GeminiModelId | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [switchingModel, setSwitchingModel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recentDiagnostic, setRecentDiagnostic] = useState<GeminiDiagnosticInfo | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchByokStatus();
      setMetadata(data.metadata);
      setModels(data.models);
      setUsage(data.usage);
      setSelectedModel(data.metadata.selectedModel);
      if (data.metadata.lastDiagnostic) {
        setRecentDiagnostic(data.metadata.lastDiagnostic);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Unable to load Gemini API status.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const onUpdated = () => {
      loadStatus();
    };
    window.addEventListener('creatorflow_byok_updated', onUpdated);
    return () => window.removeEventListener('creatorflow_byok_updated', onUpdated);
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!apiKeyInput.trim()) {
      setFeedback({
        type: 'error',
        text: 'Paste your Gemini API key from Google AI Studio.',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await saveByokKey({
        apiKey: apiKeyInput.trim(),
        selectedModel,
        verifyConnection: true,
      });
      setApiKeyInput('');
      setMetadata(res.metadata);
      if (res.testResult?.diagnostic) {
        setRecentDiagnostic(res.testResult.diagnostic);
      }
      const testPassed = !res.testResult || res.testResult.ok;
      setFeedback({
        type: testPassed ? 'success' : 'error',
        text: res.testResult?.message || 'Gemini API key encrypted and connected.',
      });
      if (testPassed) {
        toast('Gemini Key Connected', 'Your BYOK key passed live verification and is ready.', 'success');
      } else {
        toast('Key Saved — Connection Issue', res.testResult?.message || 'Check diagnostic details and retry.', 'warning');
      }
      await loadStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Unable to verify or store your Gemini API key.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (targetModel?: GeminiModelId) => {
    const modelToTest = targetModel || selectedModel;
    setFeedback(null);
    setTestingModel(modelToTest);
    try {
      const res = await testByokKey({
        ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        modelId: modelToTest,
      });
      if (res.metadata) setMetadata(res.metadata);
      if (res.diagnostic) setRecentDiagnostic(res.diagnostic);
      setFeedback({
        type: res.ok ? 'success' : 'error',
        text: `${res.message}${res.latencyMs ? ` (${res.latencyMs}ms)` : ''}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Connection test failed.',
      });
    } finally {
      setTestingModel(null);
    }
  };

  const handleModelChange = async (nextModel: GeminiModelId) => {
    setSelectedModel(nextModel);
    if (!metadata?.hasKey) return;
    setSwitchingModel(true);
    setFeedback(null);
    try {
      const updated = await updateByokModel(nextModel);
      setMetadata(updated);
      setFeedback({
        type: 'success',
        text: `Switched active Gemini model to ${nextModel}.`,
      });
      toast('Model Updated', `Now using ${nextModel}.`, 'success');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to update model selection.',
      });
    } finally {
      setSwitchingModel(false);
    }
  };

  const handleDeleteKey = async () => {
    setDeleting(true);
    setFeedback(null);
    try {
      const next = await deleteByokKey();
      setMetadata(next);
      setRecentDiagnostic(null);
      setConfirmDelete(false);
      setApiKeyInput('');
      setFeedback({
        type: 'success',
        text: 'Your Gemini API key and encrypted credential record have been deleted.',
      });
      toast('Gemini Key Removed', 'Encrypted credential wiped from server.', 'success');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to delete key.',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !metadata) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-xs font-mono text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading BYOK Gemini configuration…</span>
      </div>
    );
  }

  const status = metadata?.status || 'unconfigured';
  const statusBadge =
    status === 'connected'
      ? { label: 'Connected', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      : status === 'invalid'
      ? { label: 'Invalid Key', cls: 'bg-red-50 text-red-800 border-red-200' }
      : status === 'quota_exceeded' || status === 'rate_limited'
      ? { label: 'Quota / Rate Limit', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
      : status === 'error'
      ? { label: 'Needs Attention', cls: 'bg-red-50 text-red-800 border-red-200' }
      : { label: 'Not Connected', cls: 'bg-neutral-100 text-neutral-700 border-neutral-200' };

  const activeDiagnostic = recentDiagnostic || metadata?.lastDiagnostic || null;
  const totalTokens = usage ? usage.totalInputTokens + usage.totalOutputTokens : 0;

  return (
    <div className="space-y-6 select-text">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-neutral-900">
              Gemini API Key (Bring Your Own Key)
            </h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded border ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Provider: Google AI Studio · Encrypted with AES-256-GCM at rest per account UID and verified via minimal live text-only test.
          </p>
        </div>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-mono rounded inline-flex items-center gap-1.5 shrink-0"
        >
          <span>Google AI Studio</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {metadata?.hasKey && (
        <div className="p-4 rounded-lg border border-black/[0.08] bg-[#f8f7f4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase text-neutral-500">
              Provider: Google AI Studio · Stored Key Fingerprint
            </div>
            <div className="font-mono text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#d4a017]" />
              <span>{metadata.maskedHint || `••••••••${metadata.keyLast4 || ''}`}</span>
            </div>
            <div className="text-[11px] text-neutral-500">
              Active Model: <strong className="font-mono text-neutral-800">{metadata.selectedModel}</strong>
              {metadata.lastTestedAt && (
                <span>
                  {' '}
                  · Last tested {new Date(metadata.lastTestedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestConnection()}
              disabled={testingModel !== null}
              className="px-3 py-2 bg-white hover:bg-neutral-100 border border-black/15 text-xs font-mono uppercase font-semibold rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testingModel === selectedModel ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Test Key</span>
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-xs font-mono uppercase font-semibold rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeleteKey}
                  disabled={deleting}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase font-semibold rounded cursor-pointer"
                >
                  {deleting ? 'Removing…' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-2 text-xs text-neutral-600 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {metadata?.lastError && !feedback && (
        <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>{metadata.lastError}</span>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Safe Connection Diagnostics (no secrets logged or shown) */}
      {activeDiagnostic && (
        <div className="p-3.5 rounded-lg border border-black/[0.08] bg-neutral-50 text-[11px] font-mono text-neutral-700 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
            Latest Connection Diagnostics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-neutral-400">Model:</span>{' '}
              <span className="text-neutral-900">{activeDiagnostic.model}</span>
            </div>
            <div>
              <span className="text-neutral-400">Phase:</span>{' '}
              <span className="text-neutral-900">{activeDiagnostic.failurePhase}</span>
            </div>
            <div>
              <span className="text-neutral-400">HTTP Status:</span>{' '}
              <span className="text-neutral-900">
                {activeDiagnostic.httpStatus !== null ? activeDiagnostic.httpStatus : 'No response'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Elapsed:</span>{' '}
              <span className="text-neutral-900">{activeDiagnostic.elapsedMs}ms</span>
            </div>
          </div>
          {(activeDiagnostic.googleErrorCode || activeDiagnostic.googleRequestId) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-neutral-500 pt-0.5">
              {activeDiagnostic.googleErrorCode && (
                <span>Code: {activeDiagnostic.googleErrorCode}</span>
              )}
              {activeDiagnostic.googleRequestId && (
                <span>Request ID: {activeDiagnostic.googleRequestId}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connect / Replace Form */}
      <form onSubmit={handleSaveKey} className="space-y-3">
        <label className="block text-xs font-bold text-neutral-800">
          {metadata?.hasKey ? 'Replace Connected Gemini API Key' : 'Connect Gemini API Key'}
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your Gemini API key..."
            autoComplete="off"
            className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-black/15 rounded focus:outline-none focus:border-[#1a1a1a]"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase font-semibold rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying &amp; Saving…</span>
              </>
            ) : (
              <span>{metadata?.hasKey ? 'Update & Test Key' : 'Connect & Test Key'}</span>
            )}
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>
            Never stored in browser localStorage, never exposed in frontend code, and encrypted per user UID.
          </span>
        </p>
      </form>

      {/* Gemini Model Selector: displays ONLY model name, actual model ID, access tier, and short description */}
      <div className="space-y-3 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#d4a017]" />
              <span>Active Gemini Model</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Free-tier keys support Gemini 4 Hydrogen and Gemini 3.1 Flash Lite. Argon &amp; Carbon require a paid billing-enabled API key and are never selected automatically.
            </p>
          </div>
          {switchingModel && <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {models.map((m) => {
            const isSelected = selectedModel === m.id;
            const isTestingThisModel = testingModel === m.id;
            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-[#1a1a1a] bg-[#f8f7f4] ring-1 ring-[#1a1a1a]'
                    : 'border-black/[0.08] bg-white hover:border-black/25'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleModelChange(m.id)}
                  className="text-left w-full cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-serif text-sm font-semibold text-neutral-900">
                        {m.label}
                      </div>
                      <div className="font-mono text-[11px] text-neutral-500 mt-0.5">
                        {m.id}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${
                        m.tier === 'paid_required'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed mt-1.5">
                    {m.description}
                  </p>
                </button>

                {(metadata?.hasKey || apiKeyInput.trim()) && (
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
                    <span className="text-[10px] font-mono uppercase text-neutral-400">
                      {isSelected ? 'Selected' : 'Available'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(m.id)}
                      disabled={testingModel !== null}
                      className="text-[11px] font-mono font-semibold text-[#1a1a1a] hover:text-[#d4a017] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingThisModel ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Test {m.id}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quota Sharing Notice */}
      <div className="p-3.5 rounded-lg bg-neutral-50 border border-black/[0.08] text-xs text-neutral-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-neutral-900">Google Cloud Project Quota Notice</div>
          <p className="text-[11px] leading-relaxed text-neutral-600">
            {metadata?.quotaNotice}
          </p>
        </div>
      </div>

      {/* Real Per-User AI Usage Analytics */}
      {usage && (
        <div className="pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#d4a017]" />
              <span>Your Real AI Execution Metrics</span>
            </h3>
            <span className="text-[11px] text-neutral-500">
              Tokens reflect actual provider metadata only (0 on failed/timed-out runs)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-[#f8f7f4] border border-black/[0.06]">
              <div className="text-[10px] font-mono uppercase text-neutral-500">Total Runs</div>
              <div className="text-lg font-bold text-neutral-900">{usage.totalCalls}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/70">
              <div className="text-[10px] font-mono uppercase text-emerald-700">Succeeded</div>
              <div className="text-lg font-bold text-emerald-900">{usage.successfulCalls}</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50/60 border border-red-200/70">
              <div className="text-[10px] font-mono uppercase text-red-700">Failed</div>
              <div className="text-lg font-bold text-red-900">{usage.failedCalls}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#f8f7f4] border border-black/[0.06]">
              <div className="text-[10px] font-mono uppercase text-neutral-500">Cache Hits</div>
              <div className="text-lg font-bold text-neutral-900">{usage.cacheHits}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#f8f7f4] border border-black/[0.06]">
              <div className="text-[10px] font-mono uppercase text-neutral-500">Auto Repairs</div>
              <div className="text-lg font-bold text-neutral-900">{usage.validationRepairs}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#f8f7f4] border border-black/[0.06]">
              <div className="text-[10px] font-mono uppercase text-neutral-500">Total Tokens</div>
              <div className="text-lg font-bold text-neutral-900">
                {totalTokens.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
