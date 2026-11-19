import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Terminal, 
  RotateCw, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  FileJson,
  Download,
  Info
} from 'lucide-react';
import { getStoredEvents, clearStoredEvents } from '../../lib/analyticsService';
import { SystemTelemetryData } from '../../types/ownerAnalytics';

interface OwnerSystemTabProps {
  systemData: SystemTelemetryData;
  totalEvents: number;
  userEmail: string;
}

export const OwnerSystemTab: React.FC<OwnerSystemTabProps> = ({
  systemData,
  totalEvents,
  userEmail,
}) => {
  const [events, setEvents] = useState(() => getStoredEvents());

  useEffect(() => {
    const handleUpdate = () => {
      setEvents(getStoredEvents());
    };
    window.addEventListener('creatorflow_event_logged', handleUpdate);
    return () => window.removeEventListener('creatorflow_event_logged', handleUpdate);
  }, []);

  const handleClear = () => {
    if (confirm('Clear local product telemetry buffer?')) {
      clearStoredEvents();
      setEvents([]);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creatorflow_telemetry_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            System &amp; Telemetry Infrastructure
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real system metrics and telemetry stream diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Telemetry JSON</span>
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Buffer</span>
          </button>
        </div>
      </div>

      {/* Telemetry Configuration Card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-neutral-700" />
          <span>Application Telemetry Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Telemetry Collector</span>
            <span className="text-sm font-bold text-neutral-900 mt-1 block">Local + Express Ingest</span>
            <span className="text-[10px] text-neutral-500">{totalEvents} events in memory</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">System Monitoring</span>
            <span className="text-sm font-bold text-amber-700 mt-1 block">Not Configured</span>
            <span className="text-[10px] text-neutral-500">APM / Prometheus pending</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Service Availability</span>
            <span className="text-sm font-bold text-neutral-500 mt-1 block">
              {systemData.serviceAvailabilityPct !== null ? `${systemData.serviceAvailabilityPct}%` : 'System telemetry not configured'}
            </span>
            <span className="text-[10px] text-neutral-400">Honest reporting rule</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Payment System</span>
            <span className="text-sm font-bold text-neutral-700 mt-1 block">Cashfree Postponed</span>
            <span className="text-[10px] text-neutral-500">Zero fake revenue shown</span>
          </div>
        </div>
      </div>

      {/* Event Stream Log */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>Recent Product Telemetry Events ({events.length})</span>
          </h4>
          <span className="text-[11px] font-mono text-neutral-400">Real timestamps only</span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No telemetry events recorded yet. Perform actions in CreatorFlow (generate idea, create project, etc.) to watch live events log here.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {events.slice(-30).reverse().map((e) => (
              <div key={e.id} className="p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-200/60 font-mono text-[11px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-bold text-neutral-900 truncate">{e.eventName}</span>
                  <span className="text-neutral-400">·</span>
                  <span className="text-neutral-600 truncate">{e.accountId}</span>
                  {e.feature && (
                    <span className="px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700 text-[10px]">
                      {e.feature}
                    </span>
                  )}
                </div>
                <span className="text-neutral-400 text-[10px] shrink-0">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
