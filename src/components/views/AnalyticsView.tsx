import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Clock, 
  Percent, 
  Users, 
  Film, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  ArrowUpRight, 
  ExternalLink, 
  ThumbsUp, 
  MessageSquare,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { 
  VideoAnalytics, 
  VideoProject, 
  CreatorProfile 
} from '../../types';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { 
  getVideoAnalyticsList, 
  saveVideoAnalytics, 
  deleteVideoAnalytics, 
  exportAnalyticsJson, 
  exportAnalyticsCsv, 
  importAnalyticsJson,
  seedSampleTestAnalytics,
  clearDemoAnalytics
} from '../../lib/creatorStorage';
import { 
  calculateAnalyticsSummary, 
  generateAnalyticsInsights, 
  evaluateVideoPerformance, 
  formatWatchTime, 
  formatSecondsToTime 
} from '../../lib/analyticsEngine';
import { AnalyticsModal } from './AnalyticsModal';
import { 
  isAtLimit, 
  getLimit, 
  getStoredPlan 
} from '../../lib/planEntitlements';
import {
  executeIntelligence,
  IntelligenceClientError,
  IntelligenceExecutionResponse,
} from '../../lib/intelligenceClient';
import { ByokConnectionGate } from '../common/ByokConnectionGate';

interface AnalyticsViewProps {
  creatorProfile: CreatorProfile;
  projects?: VideoProject[];
  onOpenProject?: (projectId: string) => void;
  preselectedProjectId?: string | null;
  onClearPreselectedProject?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  creatorProfile,
  projects = [],
  onOpenProject,
  preselectedProjectId,
  onClearPreselectedProject,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analytics data state
  const [analyticsList, setAnalyticsList] = useState<VideoAnalytics[]>(() => getVideoAnalyticsList());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VideoAnalytics | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string | null>(preselectedProjectId || null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'ctr' | 'retention' | 'subs'>('recent');
  const [aiDiagnosisLoading, setAiDiagnosisLoading] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<IntelligenceExecutionResponse<any> | null>(null);
  const [analyticsByokError, setAnalyticsByokError] = useState<{ code: string; message: string } | null>(null);

  // Confirmation dialog state (in-app modal replacing window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  // Trigger modal if preselectedProjectId is passed
  useEffect(() => {
    if (preselectedProjectId) {
      setModalProjectId(preselectedProjectId);
      setEditingItem(null);
      setIsModalOpen(true);
      if (onClearPreselectedProject) {
        onClearPreselectedProject();
      }
    }
  }, [preselectedProjectId, onClearPreselectedProject]);

  // Derived summaries & insights
  const summary = useMemo(() => calculateAnalyticsSummary(analyticsList), [analyticsList]);
  const insights = useMemo(() => generateAnalyticsInsights(analyticsList), [analyticsList]);

  // Filtered & Sorted list
  const filteredList = useMemo(() => {
    return analyticsList
      .filter((item) => {
        const matchesSearch = 
          item.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.trafficSource && item.trafficSource.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesFormat = 
          formatFilter === 'All' ? true : item.format.toLowerCase().includes(formatFilter.toLowerCase());

        return matchesSearch && matchesFormat;
      })
      .sort((a, b) => {
        if (sortBy === 'views') return (b.views ?? -1) - (a.views ?? -1);
        if (sortBy === 'ctr') return (b.ctr ?? -1) - (a.ctr ?? -1);
        if (sortBy === 'retention') return (b.averagePercentageViewed ?? -1) - (a.averagePercentageViewed ?? -1);
        if (sortBy === 'subs') return (b.subscribersGained ?? -9999) - (a.subscribersGained ?? -9999);
        return new Date(b.publishedDate || b.createdAt).getTime() - new Date(a.publishedDate || a.createdAt).getTime();
      });
  }, [analyticsList, searchQuery, formatFilter, sortBy]);

  // Open modal handler with plan limit enforcement
  const handleOpenNewRecordModal = (projectId?: string | null) => {
    const nonDemoCount = analyticsList.filter((a) => !a.isDemoData && !a.id.startsWith('test-va-')).length;
    const plan = getStoredPlan();
    if (isAtLimit('analyticsRecords', nonDemoCount, plan)) {
      const limit = getLimit('analyticsRecords', plan);
      toast(
        'Analytics Limit Reached',
        `You have recorded ${nonDemoCount}/${limit} video entries on your ${plan.toUpperCase()} tier. Upgrade for expanded studio tracking.`,
        'info'
      );
      window.dispatchEvent(new CustomEvent('creatorflow_navigate', { detail: { view: 'pricing' } }));
      return;
    }
    setEditingItem(null);
    setModalProjectId(projectId || null);
    setIsModalOpen(true);
  };

  const handleRunAiDiagnosis = async () => {
    setAiDiagnosisLoading(true);
    setAnalyticsByokError(null);
    try {
      const realVideos = analyticsList.filter((a) => !a.isDemoData && !a.id.startsWith('test-va-'));
      const res = await executeIntelligence({
        task: 'analytics_intelligence',
        feature: 'analytics_diagnosis_byok',
        input: {
          topic: creatorProfile.channelTopic || creatorProfile.niche || 'YouTube Performance',
          language: creatorProfile.preferredLanguage || 'English',
          contextSnapshot: {
            summary,
            realCount: realVideos.length,
            videos: realVideos.slice(0, 15),
          },
        },
        enableWebResearch: false,
      });
      setAiDiagnosisResult(res);
      toast('AI Channel Diagnosis Ready', `Validated at ${res.qualityReport.score}/100 via ${res.model}.`, 'success');
    } catch (err: any) {
      if (err instanceof IntelligenceClientError && (err.requiresByok || err.isQuotaExceeded)) {
        setAnalyticsByokError({ code: err.code, message: err.message });
      } else {
        toast('Diagnosis Failed', err?.message || 'Unable to generate AI performance diagnosis.', 'error');
      }
    } finally {
      setAiDiagnosisLoading(false);
    }
  };

  // Save handler
  const handleSaveAnalytics = (item: VideoAnalytics) => {
    const isNew = !analyticsList.some((a) => a.id === item.id);
    if (isNew) {
      const nonDemoCount = analyticsList.filter((a) => !a.isDemoData && !a.id.startsWith('test-va-')).length;
      const plan = getStoredPlan();
      if (isAtLimit('analyticsRecords', nonDemoCount, plan)) {
        toast('Record Limit Reached', 'Cannot save additional records on current plan limit.', 'error');
        return;
      }
    }
    saveVideoAnalytics(item);
    const updated = getVideoAnalyticsList();
    setAnalyticsList(updated);
    toast('Analytics Saved', `Recorded metrics for "${item.videoTitle}".`, 'success');
  };

  // Delete handler
  const handleDeleteAnalytics = (id: string, title: string) => {
    setConfirmDialog({
      title: 'Remove Video Analytics',
      message: `Are you sure you want to remove recorded analytics for "${title}"? This action cannot be undone.`,
      confirmLabel: 'Remove Record',
      variant: 'danger',
      onConfirm: () => {
        deleteVideoAnalytics(id);
        const updated = getVideoAnalyticsList();
        setAnalyticsList(updated);
        toast('Record Removed', `Deleted analytics for "${title}".`, 'info');
      },
    });
  };

  // Seed sample test analytics
  const handleLoadSampleData = () => {
    const sample = seedSampleTestAnalytics();
    setAnalyticsList(sample);
    toast('Sample Analytics Loaded', '5 real-world creator sample records loaded to explore insights.', 'success');
  };

  // Clear only demo analytics
  const handleClearDemoData = () => {
    setConfirmDialog({
      title: 'Clear Demo Analytics',
      message: 'Remove all sample demo records? Any real video analytics you entered will remain safely preserved.',
      confirmLabel: 'Clear Demo Records',
      variant: 'danger',
      onConfirm: () => {
        const remaining = clearDemoAnalytics();
        setAnalyticsList(remaining);
        toast('Demo Data Cleared', 'Sample demo records removed. Your real analytics remain intact.', 'info');
      },
    });
  };

  // Clear all analytics
  const handleClearAll = () => {
    setConfirmDialog({
      title: 'Clear All Analytics Data',
      message: 'Are you sure you want to delete all saved video analytics records from your local storage? This action cannot be undone.',
      confirmLabel: 'Clear All Data',
      variant: 'danger',
      onConfirm: () => {
        localStorage.removeItem('creatorflow_video_analytics_v1');
        setAnalyticsList([]);
        toast('Analytics Cleared', 'All video records cleared from local storage.', 'info');
      },
    });
  };

  // Export handlers
  const handleExportCsv = () => {
    const csv = exportAnalyticsCsv();
    if (!csv) {
      toast('No data', 'Add video analytics before exporting.', 'error');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creatorflow-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Export Complete', 'Downloaded CSV file.', 'success');
  };

  const handleExportJson = () => {
    const jsonStr = exportAnalyticsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creatorflow-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Export Complete', 'Downloaded JSON backup.', 'success');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAnalyticsJson(content);
      if (res.success) {
        setAnalyticsList(getVideoAnalyticsList());
        toast('Import Succeeded', `Imported ${res.count} analytics records.`, 'success');
      } else {
        toast('Import Failed', res.error || 'Invalid file format.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Check unlinked projects
  const unlinkedProjects = useMemo(() => {
    const loggedProjectIds = new Set(analyticsList.map(a => a.videoProjectId).filter(Boolean));
    return projects.filter(p => !loggedProjectIds.has(p.id));
  }, [projects, analyticsList]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* 1. HEADER & CLEAR MANUAL DISCLAIMER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-lg border border-black/[0.08] shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-[#d4a017] uppercase font-semibold">
              Manual Analytics
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-mono">YouTube Studio Performance Log</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1a1a1a]">
            Creator Analytics & Growth
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl font-sans">
            Enter your YouTube Studio numbers to track performance inside CreatorFlow. 
            No fake telemetry or direct API sync needed — 100% deterministic local intelligence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            title="Export CSV spreadsheet"
            className="text-xs font-mono uppercase"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-neutral-500" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Import JSON backup"
            className="text-xs font-mono uppercase"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-neutral-500" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJsonFile}
            className="hidden"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewRecordModal(null)}
            className="text-xs font-mono uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 mr-1.5 text-[#d4a017]" />
            Add Video Results
          </Button>
        </div>
      </div>

      {/* 2. CREATOR ANALYTICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Videos */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Total Videos</span>
            <Film className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {summary.totalVideos}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              {summary.totalVideos === 1 ? '1 video logged' : `${summary.totalVideos} videos logged`}
            </div>
          </div>
        </div>

        {/* Total Views */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Total Views</span>
            <Eye className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {summary.totalViews.toLocaleString()}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              Across all videos
            </div>
          </div>
        </div>

        {/* Total Watch Time */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Total Watch Time</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {formatWatchTime(summary.totalWatchTimeMinutes)}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              {summary.totalWatchTimeMinutes.toLocaleString()} minutes
            </div>
          </div>
        </div>

        {/* Subscribers Gained */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Subscribers Gained</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {summary.totalSubscribersGained > 0 ? `+${summary.totalSubscribersGained}` : summary.totalSubscribersGained}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              From logged uploads
            </div>
          </div>
        </div>

        {/* Average CTR */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Average CTR</span>
            <Percent className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {summary.averageCtr !== null ? `${summary.averageCtr}%` : '—'}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              {summary.averageCtr !== null ? (
                summary.hasReliableBaseline ? (
                  <span className="text-neutral-600 font-medium">Channel average</span>
                ) : (
                  <span>Preliminary estimate</span>
                )
              ) : (
                'Add CTR to view'
              )}
            </div>
          </div>
        </div>

        {/* Average View Duration */}
        <div className="bg-white p-4 rounded-lg border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono text-[10px] uppercase text-neutral-500">Avg View Duration</span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <div className="font-serif text-2xl sm:text-3xl font-normal text-[#1a1a1a]">
              {summary.averageViewDurationSeconds !== null ? formatSecondsToTime(summary.averageViewDurationSeconds) : '—'}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              {summary.averagePercentageViewed !== null ? `${summary.averagePercentageViewed}% avg viewed` : 'Add AVD to view'}
            </div>
          </div>
        </div>
      </div>

      {/* Baseline Status & Integrity Note */}
      {analyticsList.length > 0 && (
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${summary.hasReliableBaseline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="font-bold text-neutral-800">
              {summary.hasReliableBaseline ? 'Channel Baseline Active' : 'Establishing Baseline'}
            </span>
            <span className="text-neutral-300">·</span>
            <span>{summary.baselineNote}</span>
          </div>
          {summary.realCount > 0 && (
            <span className="text-[11px] text-neutral-500">
              {summary.realCount} verified manual {summary.realCount === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
      )}

      {/* Demo Data Isolation Notice */}
      {summary.demoCount > 0 && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px] uppercase tracking-wider shrink-0">
              Sample Data Active
            </span>
            <p className="text-amber-900 text-xs">
              <strong>{summary.demoCount} sample records</strong> are loaded for testing. These demo records are tagged and can be cleared without affecting real data.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearDemoData}
            className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold shrink-0"
          >
            Clear Demo Data
          </Button>
        </div>
      )}

      {/* AI PERFORMANCE DIAGNOSIS CARD (BYOK GEMINI) */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#d4a017] rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Gemini Analytics Intelligence (BYOK)</span>
              </span>
              {aiDiagnosisResult && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Quality {aiDiagnosisResult.qualityReport.score}/100
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Analyzes strictly your real manual video logs ({summary.realCount} recorded) without fabricating metrics.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAiDiagnosis}
            disabled={aiDiagnosisLoading}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#d4a017]" />
            {aiDiagnosisLoading ? 'Diagnosing…' : 'Diagnose With Gemini (BYOK)'}
          </Button>
        </div>

        {analyticsByokError && (
          <ByokConnectionGate
            errorCode={analyticsByokError.code}
            message={analyticsByokError.message}
            compact
            onConnected={handleRunAiDiagnosis}
          />
        )}

        {aiDiagnosisResult?.data && (
          <div className="p-4 bg-[#f8f7f4] rounded-xl border border-black/[0.06] space-y-4 text-xs">
            <p className="text-sm font-medium text-neutral-900 leading-relaxed">
              {aiDiagnosisResult.data.diagnosisSummary}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.isArray(aiDiagnosisResult.data.strengths) && aiDiagnosisResult.data.strengths.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-emerald-200/70 space-y-1.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-800 block">
                    Observed Strengths
                  </span>
                  {aiDiagnosisResult.data.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-neutral-700">• {s}</p>
                  ))}
                </div>
              )}
              {Array.isArray(aiDiagnosisResult.data.bottlenecks) && aiDiagnosisResult.data.bottlenecks.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-amber-200/70 space-y-1.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-800 block">
                    Identified Bottlenecks
                  </span>
                  {aiDiagnosisResult.data.bottlenecks.map((b: string, i: number) => (
                    <p key={i} className="text-neutral-700">• {b}</p>
                  ))}
                </div>
              )}
            </div>
            {Array.isArray(aiDiagnosisResult.data.recommendations) && aiDiagnosisResult.data.recommendations.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 block">
                  Recommended Next Experiments
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {aiDiagnosisResult.data.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-black/[0.06] space-y-1">
                      <div className="font-bold text-neutral-900">{rec.title}</div>
                      <p className="text-neutral-600">{rec.action}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">{rec.expectedImpact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {aiDiagnosisResult.data.nextExperiment && (
              <div className="p-3 bg-white rounded-lg border border-[#d4a017]/40 text-neutral-800">
                <strong>Next Video Experiment:</strong> {aiDiagnosisResult.data.nextExperiment}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. UNLINKED PROJECTS PROMPT BANNER */}
      {unlinkedProjects.length > 0 && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <span className="font-bold text-amber-900">
                {unlinkedProjects.length} CreatorFlow {unlinkedProjects.length === 1 ? 'project' : 'projects'} ready for YouTube Studio results
              </span>
              <p className="text-amber-700 text-[11px]">
                Have you published "{unlinkedProjects[0].selectedTitle || unlinkedProjects[0].topic}"? Log its performance numbers.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewRecordModal(unlinkedProjects[0].id)}
            className="shrink-0 bg-white hover:bg-amber-100 border-amber-300 text-amber-900 text-xs font-semibold"
          >
            Add Results for "{unlinkedProjects[0].topic.slice(0, 20)}..."
          </Button>
        </div>
      )}

      {/* 4. EMPTY STATE (When no analytics exist) */}
      {analyticsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <BarChart3 className="w-8 h-8 text-neutral-600" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-neutral-900">No analytics yet</h2>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              Add your first video's results to start tracking your growth. 
              CreatorFlow will analyze your CTR, retention, and formats to reveal what worked and what to create next.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleOpenNewRecordModal(null)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Video Results
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleLoadSampleData}
              className="text-xs"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
              Load Sample Demo Data
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* 5. DETERMINISTIC GROWTH INTELLIGENCE PANELS ("What worked", "What needs improvement", "What to try next") */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* What Worked */}
            <Card className="border-neutral-200/90 shadow-xs bg-white">
              <CardHeader className="p-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <CardTitle className="text-sm font-bold text-neutral-900">What Worked</CardTitle>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Wins
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs text-neutral-700">
                {insights.whatWorked.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* What Needs Improvement */}
            <Card className="border-neutral-200/90 shadow-xs bg-white">
              <CardHeader className="p-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <CardTitle className="text-sm font-bold text-neutral-900">What Needs Improvement</CardTitle>
                </div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  Refinements
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs text-neutral-700">
                {insights.whatNeedsImprovement.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* What to Try Next */}
            <Card className="border-neutral-200/90 shadow-xs bg-white">
              <CardHeader className="p-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-rose-700" />
                  </div>
                  <CardTitle className="text-sm font-bold text-neutral-900">What to Try Next</CardTitle>
                </div>
                <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                  Next Actions
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs text-neutral-700">
                {insights.whatToTryNext.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 6. FORMAT & TRAFFIC SOURCE COMPARISONS */}
          {insights.formatComparison.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Format Comparison */}
              <div className="bg-white p-4.5 rounded-xl border border-neutral-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Format Performance Comparison
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {insights.formatComparison.length} formats
                  </span>
                </div>
                <div className="divide-y divide-neutral-100 text-xs">
                  {insights.formatComparison.map((fmt, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-neutral-900">{fmt.format}</div>
                        <div className="text-[11px] text-neutral-500">
                          {fmt.videoCount} {fmt.videoCount === 1 ? 'video' : 'videos'} · {fmt.totalViews.toLocaleString()} total views
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="font-mono font-bold text-neutral-800">
                            {fmt.avgCtr !== null ? `${fmt.avgCtr}%` : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Avg CTR</div>
                        </div>
                        <div>
                          <div className="font-mono font-bold text-neutral-800">
                            {fmt.avgPercentageViewed !== null ? `${fmt.avgPercentageViewed}%` : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Avg Retention</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traffic Breakdown */}
              <div className="bg-white p-4.5 rounded-xl border border-neutral-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Discovery & Traffic Sources
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    YouTube Studio Data
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {insights.trafficBreakdown.map((src, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-800">{src.source}</span>
                        <span className="font-mono text-neutral-600 text-[11px]">
                          {src.videoCount} {src.videoCount === 1 ? 'video' : 'videos'} ({src.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div 
                          className="h-full bg-neutral-800 rounded-full transition-all duration-300"
                          style={{ width: `${src.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. VIDEO LOG CATALOG / TABLE */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
            {/* Catalog Toolbar */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                  Logged Video Results
                </h3>
                <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                  {filteredList.length} of {analyticsList.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, topic..."
                    className="w-full text-xs rounded-lg border border-neutral-200 pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                {/* Format Filter */}
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="text-xs rounded-lg border border-neutral-200 px-2.5 py-1.5 bg-white text-neutral-700 font-medium focus:outline-none"
                >
                  <option value="All">All Formats</option>
                  <option value="Long-form">Long-form</option>
                  <option value="Short">Shorts</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Educational">Educational</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs rounded-lg border border-neutral-200 px-2.5 py-1.5 bg-white text-neutral-700 font-medium focus:outline-none"
                >
                  <option value="recent">Most Recent</option>
                  <option value="views">Most Views</option>
                  <option value="ctr">Highest CTR</option>
                  <option value="retention">Best Retention</option>
                  <option value="subs">Most Subs</option>
                </select>
              </div>
            </div>

            {/* List Table / Cards */}
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No videos match your search or filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredList.map((item) => {
                  const perf = evaluateVideoPerformance(item, {
                    avgCtr: summary.averageCtr,
                    avgRetention: summary.averagePercentageViewed,
                    hasReliableBaseline: summary.hasReliableBaseline,
                  });
                  return (
                    <div 
                      key={item.id}
                      className="p-4 sm:p-5 hover:bg-neutral-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left info */}
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            perf.tier === 'Strong' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : perf.tier === 'Healthy'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : perf.tier === 'Needs Attention'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {perf.tier}
                          </span>

                          {(item.isDemoData || item.id.startsWith('test-va-')) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                              Demo
                            </span>
                          )}

                          <span className="text-[11px] font-medium text-neutral-500">
                            {item.format}
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-[11px] text-neutral-400">
                            {item.publishedDate}
                          </span>
                          {item.trafficSource && (
                            <>
                              <span className="text-neutral-300">·</span>
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {item.trafficSource}
                              </span>
                            </>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-neutral-900">
                          {item.videoTitle}
                        </h4>

                        {item.notes && (
                          <p className="text-xs text-neutral-500 italic line-clamp-1">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      {/* Right Metrics Grid */}
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 text-xs">
                        {/* Views */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            {item.views !== undefined ? item.views.toLocaleString() : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Views</div>
                        </div>

                        {/* CTR */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            {item.ctr !== undefined ? `${item.ctr}%` : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">CTR</div>
                        </div>

                        {/* Watch Time */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            {item.watchTimeMinutes !== undefined ? formatWatchTime(item.watchTimeMinutes) : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Watch Time</div>
                        </div>

                        {/* Avg % Viewed */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            {item.averagePercentageViewed !== undefined ? `${item.averagePercentageViewed}%` : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Retention</div>
                        </div>

                        {/* Subs Gained */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            {item.subscribersGained !== undefined ? (item.subscribersGained > 0 ? `+${item.subscribersGained}` : item.subscribersGained) : '—'}
                          </div>
                          <div className="text-[10px] text-neutral-400">Subs Gained</div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-200">
                          {item.videoProjectId && onOpenProject && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenProject(item.videoProjectId!)}
                              title="Open original project in Video Builder"
                              className="px-2 py-1 text-[11px] h-7"
                            >
                              <Film className="w-3 h-3 text-neutral-600" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setModalProjectId(item.videoProjectId || null);
                              setIsModalOpen(true);
                            }}
                            title="Edit numbers"
                            className="px-2 py-1 text-[11px] h-7"
                          >
                            <Edit3 className="w-3 h-3 text-neutral-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnalytics(item.id, item.videoTitle)}
                            title="Delete record"
                            className="px-2 py-1 text-[11px] h-7 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Development / Reset Footer Note */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 px-1">
            <span>
              All analytics are stored locally on your device in browser localStorage.
            </span>
            <div className="flex items-center gap-3">
              {summary.demoCount > 0 && (
                <>
                  <button
                    onClick={handleClearDemoData}
                    className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
                  >
                    Clear Demo Data ({summary.demoCount})
                  </button>
                  <span>·</span>
                </>
              )}
              <button
                onClick={handleLoadSampleData}
                className="hover:text-neutral-700 transition-colors"
              >
                Load 5 Demo Records
              </button>
              <span>·</span>
              <button
                onClick={handleClearAll}
                className="text-rose-500 hover:text-rose-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </>
      )}

      {/* Analytics Entry / Edit Modal */}
      <AnalyticsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setModalProjectId(null);
        }}
        onSave={handleSaveAnalytics}
        initialData={editingItem}
        projects={projects}
        preselectedProjectId={modalProjectId}
      />

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirmDialog.variant === 'danger' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-neutral-100 text-neutral-800'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">{confirmDialog.title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Please confirm to proceed</p>
              </div>
            </div>
            
            <p className="text-xs text-neutral-600 leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.variant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className="text-xs font-semibold"
              >
                {confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
