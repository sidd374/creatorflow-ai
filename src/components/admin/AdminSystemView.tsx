import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  CreditCard, 
  Activity, 
  Terminal, 
  RotateCw, 
  Trash2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Send
} from 'lucide-react';
import { 
  getSystemServicesStatus, 
  getTrackedEvents, 
  trackAdminEvent, 
  clearTrackedEvents 
} from '../../lib/adminAnalyticsService';
import { AdminTelemetryEvent } from '../../types/adminAnalytics';

export const AdminSystemView: React.FC = () => {
  const [events, setEvents] = useState<AdminTelemetryEvent[]>(() => getTrackedEvents());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setEvents(getTrackedEvents());
    };
    window.addEventListener('creatorflow_admin_event_logged', handleUpdate);
    return () => window.removeEventListener('creatorflow_admin_event_logged', handleUpdate);
  }, []);

  const systemServices = getSystemServicesStatus();

  const handleSendTestPing = () => {
    trackAdminEvent('custom_event', {
      action: 'system_health_ping',
      sender: 'admin_dashboard',
      timestamp: new Date().toISOString(),
    });
    setRefreshKey((k) => k + 1);
  };

  const handleClearLog = () => {
    if (confirm('Clear all local telemetry event logs?')) {
      clearTrackedEvents();
      setEvents([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">System Infrastructure & Telemetry</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit backend connectivity, webhook endpoints, and inspect real client telemetry event payloads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendTestPing}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Telemetry Ping</span>
          </button>
          <button
            onClick={handleClearLog}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Clear Event Log</span>
          </button>
        </div>
      </div>

      {/* System Services Status Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-neutral-50/70 border-b border-neutral-200">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Infrastructure & Integration Health
          </h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {systemServices.map((svc) => (
            <div key={svc.service} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-neutral-900">{svc.service}</span>
                  {svc.status === 'connected' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : svc.status === 'ready_local' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                      <Activity className="w-3 h-3" /> Ready (In-Memory/Local)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                      <XCircle className="w-3 h-3 text-neutral-400" /> Disconnected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500">{svc.details}</p>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap">
                Audited: {new Date(svc.lastChecked).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Telemetry Event Inspector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neutral-600" />
              Live Telemetry Event Log ({events.length} events)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Real recorded events captured in local buffer queue (`cf_admin_telemetry_events_v1`).
            </p>
          </div>
          <span className="text-[11px] font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-600">
            Storage: LocalStorage
          </span>
        </div>

        <div className="bg-neutral-900 text-neutral-200 rounded-lg p-4 font-mono text-[11px] max-h-80 overflow-y-auto space-y-2 border border-neutral-800">
          {events.length > 0 ? (
            events.slice().reverse().map((evt) => (
              <div key={evt.id} className="border-b border-neutral-800/80 pb-2 mb-2 last:border-b-0 last:mb-0">
                <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                  <span className="text-amber-400 font-semibold">{evt.type}</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()} &bull; ID: {evt.id}</span>
                </div>
                <div className="text-neutral-300 mt-0.5 break-all">
                  <span className="text-neutral-500">Account:</span> {evt.accountId} | <span className="text-neutral-500">Payload:</span> {JSON.stringify(evt.properties)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-neutral-500">
              No telemetry events recorded yet. Click &quot;Test Telemetry Ping&quot; or browse CreatorFlow to trigger events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
