import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Bug, 
  CheckCircle2, 
  FileCode, 
  HelpCircle 
} from 'lucide-react';
import { ProductErrorRecord } from '../../types/ownerAnalytics';

interface OwnerErrorsTabProps {
  errors: ProductErrorRecord[];
}

export const OwnerErrorsTab: React.FC<OwnerErrorsTabProps> = ({ errors }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Product Error &amp; Failure Analytics
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Diagnostic incident log: failed saves, generation timeouts, and workflow exceptions. Zero private tokens or credentials stored.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
          {errors.length} incident categories logged
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center max-w-lg mx-auto shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-neutral-900 text-sm">
            Zero Product Exceptions Recorded
          </h3>
          <p className="text-xs text-neutral-500">
            No save failures, workflow timeouts, or generation crashes logged in this timeframe.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Error Type</th>
                  <th className="py-3 px-3">Associated Feature</th>
                  <th className="py-3 px-3 text-center">Occurrences</th>
                  <th className="py-3 px-3 text-center">Affected Accounts</th>
                  <th className="py-3 px-3">Last Recorded</th>
                  <th className="py-3 px-4">Message Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {errors.map((err) => (
                  <tr key={err.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {err.errorType}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 font-mono text-[11px]">
                      {err.feature || 'general_workflow'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-neutral-900">
                      {err.occurrenceCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-neutral-700">
                      {err.affectedAccountsCount}
                    </td>
                    <td className="py-3 px-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] truncate max-w-xs">
                      {err.lastMessageSnippet || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
