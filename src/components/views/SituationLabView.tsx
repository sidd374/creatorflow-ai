import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Plus,
  Clock,
  Trash2,
  ClipboardCheck,
  Lightbulb,
} from 'lucide-react';
import { CreatorProfile, VideoAnalytics, VideoProject } from '../../types';
import { SITUATION_SCENARIOS } from '../../lib/situationLibrary';
import {
  SituationCase,
  SituationCaseStatus,
  createSituationCase,
  updateSituationCaseStatus,
  addSituationCaseNote,
  diagnoseCreatorSituation,
} from '../../lib/situationLabEngine';
import {
  getIsolatedSituationCases,
  saveIsolatedSituationCases,
  getActiveAccountId,
} from '../../lib/accountStorage';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';

interface SituationLabViewProps {
  creatorProfile: CreatorProfile;
  analyticsList: VideoAnalytics[];
  projects: VideoProject[];
  onNavigate: (view: string) => void;
}

const STATUS_STYLES: Record<SituationCaseStatus, string> = {
  Diagnosed: 'bg-stone-100 text-stone-800 border-stone-300',
  Testing: 'bg-amber-50 text-amber-800 border-amber-300',
  Improved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'Needs Follow-up': 'bg-rose-50 text-rose-800 border-rose-300',
};

const CASE_STATUSES: SituationCaseStatus[] = [
  'Diagnosed',
  'Testing',
  'Improved',
  'Needs Follow-up',
];

export const SituationLabView: React.FC<SituationLabViewProps> = ({
  creatorProfile,
  analyticsList,
  projects,
  onNavigate,
}) => {
  const { toast } = useToast();
  const accountId = getActiveAccountId();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SITUATION_SCENARIOS[0].id);
  const [situationNotes, setSituationNotes] = useState<string>('');
  const [cases, setCases] = useState<SituationCase[]>(() =>
    getIsolatedSituationCases(accountId) as SituationCase[]
  );
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => {
    const initial = getIsolatedSituationCases(accountId) as SituationCase[];
    return initial.length > 0 ? initial[0].id : null;
  });
  const [newCaseNote, setNewCaseNote] = useState<string>('');

  // Reload cases if account changes or workspace hydrates from cloud
  useEffect(() => {
    const reload = () => {
      const loaded = getIsolatedSituationCases(getActiveAccountId()) as SituationCase[];
      setCases(loaded);
      setActiveCaseId((prev) =>
        prev && loaded.some((c) => c.id === prev) ? prev : loaded[0]?.id || null
      );
    };
    window.addEventListener('creatorflow_workspace_hydrated', reload);
    return () => window.removeEventListener('creatorflow_workspace_hydrated', reload);
  }, []);

  const persistCases = (next: SituationCase[]) => {
    setCases(next);
    saveIsolatedSituationCases(next, getActiveAccountId());
  };

  const activeCase = cases.find((c) => c.id === activeCaseId) || null;

  // Live preview of channel evidence before running a tracked case
  const livePreview = diagnoseCreatorSituation({
    scenarioId: selectedScenarioId,
    situationText: situationNotes,
    profile: creatorProfile,
    analyticsList,
    projects,
  });

  const handleRunDiagnosis = () => {
    const created = createSituationCase({
      scenarioId: selectedScenarioId,
      situationText: situationNotes,
      profile: creatorProfile,
      analyticsList,
      projects,
    });
    const next = [created, ...cases];
    persistCases(next);
    setActiveCaseId(created.id);
    setSituationNotes('');
    toast('Situation Case Created', 'Evidence and testable hypotheses logged to your tracker.', 'success');
  };

  const handleStatusChange = (caseId: string, nextStatus: SituationCaseStatus) => {
    const updated = updateSituationCaseStatus(cases, caseId, nextStatus);
    persistCases(updated);
    toast('Status Updated', `Case marked as "${nextStatus}".`, 'info');
  };

  const handleAddNote = (caseId: string) => {
    if (!newCaseNote.trim()) return;
    const updated = addSituationCaseNote(cases, caseId, newCaseNote);
    persistCases(updated);
    setNewCaseNote('');
    toast('Experiment Note Added', 'Saved observation to your Situation Lab log.', 'success');
  };

  const handleDeleteCase = (caseId: string) => {
    const next = cases.filter((c) => c.id !== caseId);
    persistCases(next);
    if (activeCaseId === caseId) {
      setActiveCaseId(next[0]?.id || null);
    }
    toast('Case Removed', 'Deleted case from your Situation Lab history.', 'info');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/[0.06] pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-[#d4a017] font-semibold">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Creator Diagnostics &amp; Experiment Log</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            Creator Situation Lab
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            Diagnose channel bottlenecks cleanly. Verified facts from your analytics, profile, and drafts are strictly separated from testable hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-white border border-black/[0.08] font-mono text-xs text-neutral-700">
            Real Videos Logged:{' '}
            <strong className="text-[#1a1a1a]">{livePreview.realAnalyticsCount}</strong>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#d4a017] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            Open Analytics
          </button>
        </div>
      </div>

      {/* Diagnostic Composer */}
      <div className="bg-white border border-black/[0.08] p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-normal text-[#1a1a1a]">
              1. Describe Your Current Channel Situation
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select the bottleneck closest to what you see in YouTube Studio, or add specifics below.
            </p>
          </div>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border font-semibold self-start sm:self-auto ${
              livePreview.dataSufficiency === 'sufficient'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {livePreview.dataSufficiency === 'sufficient'
              ? `Metrics Baseline Ready (${livePreview.realAnalyticsCount} Videos)`
              : livePreview.dataSufficiency === 'sparse'
                ? 'Sparse Metrics (1 Video Logged)'
                : 'No Real Analytics Yet — Profile & Workflow Mode'}
          </span>
        </div>

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SITUATION_SCENARIOS.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`text-left p-3.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] border-[#1a1a1a] shadow-xs'
                    : 'bg-[#f8f7f4] text-[#1a1a1a] border-black/[0.08] hover:border-[#d4a017]'
                }`}
              >
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider font-semibold block mb-1 ${
                    isSelected ? 'text-[#d4a017]' : 'text-neutral-500'
                  }`}
                >
                  {sc.shortTag}
                </span>
                <div className="text-xs font-semibold leading-snug">{sc.label}</div>
              </button>
            );
          })}
        </div>

        {/* Context Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700 block">
            Additional Observation or Specific Video Context (Optional):
          </label>
          <textarea
            rows={2}
            value={situationNotes}
            onChange={(e) => setSituationNotes(e.target.value)}
            placeholder="E.g., My last two tech tutorials got impressions from Browse features, but CTR stayed flat and viewers dropped around 0:20..."
            className="w-full p-3 bg-[#f8f7f4] border border-black/[0.1] text-xs text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a]"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-neutral-500">
            Zero fabricated benchmarks · Stored privately in your workspace
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleRunDiagnosis}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#1a1a1a] hover:bg-[#d4a017] text-white text-xs font-mono uppercase tracking-wider"
          >
            Run Situation Diagnosis
          </Button>
        </div>
      </div>

      {/* Main Workspace Split: Tracked Cases List + Active Case Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tracked Cases */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-neutral-700">
              Tracked Cases ({cases.length})
            </h3>
          </div>

          {cases.length === 0 ? (
            <div className="p-6 bg-white border border-black/[0.08] text-center space-y-2">
              <FlaskConical className="w-6 h-6 text-neutral-400 mx-auto" />
              <div className="font-serif text-base text-[#1a1a1a]">No cases logged yet</div>
              <p className="text-xs text-neutral-500">
                Select a scenario above and run your first structured diagnosis to start tracking experiments.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cases.map((c) => {
                const isActive = c.id === activeCase?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveCaseId(c.id)}
                    className={`p-4 border cursor-pointer transition-all space-y-2 ${
                      isActive
                        ? 'bg-white border-[#1a1a1a] ring-1 ring-[#1a1a1a] shadow-xs'
                        : 'bg-white border-black/[0.08] hover:border-black/[0.25]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 border font-semibold ${
                          STATUS_STYLES[c.status]
                        }`}
                      >
                        {c.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(c.id);
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove case"
                        aria-label="Remove case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs font-semibold text-[#1a1a1a] leading-snug">
                      {c.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>{c.diagnosis.shortTag}</span>
                      <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Diagnosis Detail (or Live Preview when no saved case selected) */}
        <div className="lg:col-span-8">
          {(() => {
            const shownDiagnosis = activeCase ? activeCase.diagnosis : livePreview;
            return (
              <div className="bg-white border border-black/[0.08] p-6 space-y-6 shadow-2xs">
                {/* Case Header & Longitudinal Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-black/[0.06] pb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4a017] font-semibold block">
                      {activeCase ? 'Tracked Situation Case' : 'Live Diagnostic Preview'} &bull;{' '}
                      {shownDiagnosis.shortTag}
                    </span>
                    <h2 className="font-serif text-2xl font-normal text-[#1a1a1a] mt-0.5">
                      {activeCase ? activeCase.title : shownDiagnosis.scenarioTitle}
                    </h2>
                    {activeCase?.userContextNotes && (
                      <p className="text-xs text-neutral-600 mt-1 italic">
                        "{activeCase.userContextNotes}"
                      </p>
                    )}
                  </div>

                  {activeCase && (
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {CASE_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(activeCase.id, st)}
                          className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border font-semibold transition-all cursor-pointer ${
                            activeCase.status === st
                              ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                              : 'bg-[#f8f7f4] text-neutral-600 border-black/[0.08] hover:border-black/[0.25]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Honest Data Sufficiency Notice */}
                {shownDiagnosis.honestyNotice && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold">Honest Data Notice</div>
                      <p className="leading-relaxed">{shownDiagnosis.honestyNotice}</p>
                    </div>
                  </div>
                )}

                {/* Panel 1: Verified Evidence (Strictly factual) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">
                      Verified Channel &amp; Workflow Evidence (Observed Facts Only)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {shownDiagnosis.verifiedEvidence.map((ev, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#f8f7f4] border border-black/[0.06] flex items-start gap-2.5 text-xs text-neutral-800"
                      >
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-white border border-black/[0.08] text-neutral-600 shrink-0">
                          {ev.source}
                        </span>
                        <span className="leading-relaxed">{ev.fact}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Testable Hypotheses */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#d4a017]" />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">
                      Testable Hypotheses (Not Algorithm Claims)
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {shownDiagnosis.hypotheses.map((hyp, i) => (
                      <div
                        key={i}
                        className="p-4 bg-[#faf9f5] border border-[#e5dec9] space-y-1.5 text-xs"
                      >
                        <div className="font-semibold text-[#1a1a1a]">{hyp.statement}</div>
                        <div className="text-neutral-600 leading-relaxed">
                          <strong className="font-mono text-[10px] uppercase text-[#b3860d]">
                            How to Test:
                          </strong>{' '}
                          {hyp.testToValidate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Follow-up Questions */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-neutral-600" />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">
                      Clarifying Checks Before Your Next Upload
                    </h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-neutral-700 bg-[#f8f7f4] p-4 border border-black/[0.06]">
                    {shownDiagnosis.followUpQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono font-bold text-[#d4a017] shrink-0">?</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Panel 4: Next Actions */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1a1a1a]" />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">
                      Recommended Next Experiments
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shownDiagnosis.nextActions.map((act, i) => (
                      <div
                        key={i}
                        className="p-4 bg-[#f8f7f4] border border-black/[0.08] flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-[#1a1a1a]">{act.title}</div>
                          <p className="text-xs text-neutral-600 leading-relaxed">{act.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate(act.targetView)}
                          className="self-start inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold text-[#1a1a1a] hover:text-[#d4a017] transition-colors cursor-pointer"
                        >
                          <span>Go to {act.targetView.replace('-', ' ')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Longitudinal Case Notes Log */}
                {activeCase && (
                  <div className="pt-4 border-t border-black/[0.06] space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]">
                        Experiment Log &amp; Results Notes
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCaseNote}
                        onChange={(e) => setNewCaseNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote(activeCase.id)}
                        placeholder="Record test outcome (e.g., Tested 3-word thumbnail overlay; uploaded Part 2)..."
                        className="flex-1 p-2.5 bg-[#f8f7f4] border border-black/[0.1] text-xs focus:outline-none focus:border-[#1a1a1a]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddNote(activeCase.id)}
                        className="text-xs font-mono uppercase tracking-wider shrink-0"
                      >
                        Log Note
                      </Button>
                    </div>

                    {activeCase.notes.length > 0 && (
                      <div className="space-y-2">
                        {activeCase.notes.map((n) => (
                          <div
                            key={n.id}
                            className="p-3 bg-[#f8f7f4] border border-black/[0.06] flex items-start justify-between gap-3 text-xs"
                          >
                            <span className="text-neutral-800 leading-relaxed">{n.text}</span>
                            <span className="font-mono text-[10px] text-neutral-400 shrink-0">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
