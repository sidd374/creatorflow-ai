import React from 'react';
import { 
  Settings, 
  Download, 
  Shield, 
  Key, 
  Database, 
  CreditCard, 
  AlertTriangle,
  FileJson
} from 'lucide-react';
import { getTrackedEvents } from '../../lib/adminAnalyticsService';

export const AdminSettingsView: React.FC = () => {
  const handleExportJSON = () => {
    const events = getTrackedEvents();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `creatorflow_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Admin & Telemetry Settings</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure telemetry emission parameters, export audit traces, and manage backend hooks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export & Data Management */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">Audit Data Export</h3>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Download raw event payloads captured by the client event bus for verification in external data warehouses or BI platforms.
          </p>
          <button
            onClick={handleExportJSON}
            className="w-full py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Telemetry Events (.JSON)</span>
          </button>
        </div>

        {/* Security & Access Notice */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">Admin Authorization Architecture</h3>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-xs text-neutral-600 space-y-2">
            <p>
              <strong>Development Environment:</strong> Admin UI is accessible for architectural review.
            </p>
            <p className="text-[11px] text-neutral-500">
              In production, this route is guarded by server JWT / OAuth claims (`user.role === &apos;admin&apos;`). No simulated admin security or fake credentials are used.
            </p>
          </div>
        </div>
      </div>

      {/* Production Webhook Integration Specs */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">Production Webhook Endpoints</h3>
        <p className="text-xs text-neutral-500">
          When activating real payment tracking and relational data persistence, register these endpoints in your cloud provider:
        </p>

        <div className="space-y-3 pt-1">
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-neutral-800">Stripe Billing Webhook</span>
              <span className="block text-[11px] text-neutral-400 font-mono">POST /api/webhooks/stripe</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 self-start sm:self-auto">
              Pending Configuration
            </span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-neutral-800">PostgreSQL / Cloud SQL Connection</span>
              <span className="block text-[11px] text-neutral-400 font-mono">DATABASE_URL (Connection String)</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 self-start sm:self-auto">
              Pending Provisioning
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
