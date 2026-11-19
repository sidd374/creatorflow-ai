import React from 'react';
import { 
  GitFork, 
  ArrowDown, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  TrendingDown,
  Compass
} from 'lucide-react';
import { getConversionFunnel } from '../../lib/adminAnalyticsService';

export const AdminConversionView: React.FC = () => {
  const funnel = getConversionFunnel();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Conversion Funnel</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Identify exact drop-off stages from initial landing page visit to paid recurring subscriber.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
            Funnel Steps: 9 Stages
          </span>
        </div>
      </div>

      {/* Analysis Callout Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-sm flex items-start gap-3">
          <Compass className="w-5 h-5 text-neutral-800 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Where are users leaving CreatorFlow?
            </h4>
            <p className="text-xs text-neutral-600">
              {funnel.highestDropOffStage ? (
                <span>
                  The steepest attrition point is currently at <strong className="text-neutral-900">{funnel.highestDropOffStage}</strong>. Focus onboarding guidance and value reinforcement here.
                </span>
              ) : (
                <span>
                  No telemetry drop-offs detected yet. As creators advance through stages, conversion leak points will highlight automatically.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-sm flex items-start gap-3">
          <GitFork className="w-5 h-5 text-neutral-800 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              End-to-End Pipeline Conversion
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-neutral-900">
                {funnel.overallConversionRate !== null ? `${funnel.overallConversionRate}%` : 'No data yet'}
              </span>
              <span className="text-[11px] text-neutral-400">Visitor-to-Subscriber efficiency</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9-Stage Visual Funnel Stack */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">Full Acquisition & Activation Path</h3>

        <div className="space-y-3 pt-2">
          {funnel.stages.map((stage, idx) => {
            const hasData = stage.enteredCount !== null && stage.completedCount !== null;
            const completionPct = (stage.enteredCount && stage.enteredCount > 0)
              ? Math.round(((stage.completedCount || 0) / stage.enteredCount) * 100)
              : 0;

            return (
              <div key={stage.id} className="relative">
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-neutral-900 text-xs sm:text-sm">{stage.label}</h4>
                        <p className="text-[11px] text-neutral-500">{stage.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs justify-end">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Entered</span>
                        <span className="font-mono font-medium text-neutral-800">
                          {stage.enteredCount !== null ? stage.enteredCount : 'No data yet'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Completed</span>
                        <span className="font-mono font-bold text-neutral-900">
                          {stage.completedCount !== null ? stage.completedCount : 'No data yet'}
                        </span>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Drop-off</span>
                        <span className={`font-mono font-bold ${
                          (stage.dropOffRate || 0) > 40 ? 'text-rose-600' : 'text-neutral-700'
                        }`}>
                          {stage.dropOffRate !== null ? `${stage.dropOffRate}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {hasData && (
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-neutral-900 h-full rounded-full transition-all"
                        style={{ width: `${completionPct}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Down Arrow separator except for last */}
                {idx < funnel.stages.length - 1 && (
                  <div className="flex justify-center my-1 text-neutral-300">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
