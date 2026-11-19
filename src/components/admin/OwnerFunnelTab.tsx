import React from 'react';
import { 
  GitFork, 
  ArrowDown, 
  Compass, 
  Layers, 
  TrendingDown, 
  AlertCircle 
} from 'lucide-react';
import { FunnelStageData, WorkflowProgressionData, AnalyticsDateRange } from '../../types/ownerAnalytics';

interface OwnerFunnelTabProps {
  funnelStages: FunnelStageData[];
  workflowStages: WorkflowProgressionData[];
  dateRange: AnalyticsDateRange;
}

export const OwnerFunnelTab: React.FC<OwnerFunnelTabProps> = ({
  funnelStages,
  workflowStages,
  dateRange,
}) => {
  // Find biggest funnel drop-off
  let highestDropStage: FunnelStageData | null = null;
  let maxDrop = -1;
  funnelStages.forEach((s) => {
    if (s.dropOffRate !== null && s.dropOffRate > maxDrop) {
      maxDrop = s.dropOffRate;
      highestDropStage = s;
    }
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Product &amp; Guided Workflow Funnels
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Identify exact stages where creators advance or drop off across the entire CreatorFlow lifecycle.
          </p>
        </div>
      </div>

      {/* SECTION 1: 10-STAGE PRODUCT ACQUISITION & ACTIVATION FUNNEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold text-sm text-neutral-900">
              10-Stage Product Activation Funnel
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Landing → Paid
          </span>
        </div>

        {/* Highest Drop-off Highlight */}
        {highestDropStage && (
          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/50 flex items-start gap-2.5 text-xs text-rose-900">
            <TrendingDown className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Primary Drop-off Bottleneck: </strong>
              <span>
                {(highestDropStage as any).name} experienced a {maxDrop}% attrition rate. Review onboarding simplicity or friction points at this junction.
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
          {funnelStages.map((stage, idx) => {
            const hasData = stage.userCount > 0;
            const topStageCount = funnelStages[0]?.userCount || 1;
            const relativePct = topStageCount > 0 ? Math.round((stage.userCount / topStageCount) * 100) : 0;

            return (
              <div key={stage.id} className="relative">
                <div className="p-3.5 rounded-xl border border-neutral-200/90 bg-neutral-50/60 hover:bg-neutral-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {stage.stepNumber}
                      </span>
                      <span className="font-semibold text-neutral-900 text-xs sm:text-sm">
                        {stage.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-5 text-xs justify-end">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Accounts</span>
                        <span className="font-mono font-bold text-neutral-900">{stage.userCount}</span>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Conversion</span>
                        <span className="font-mono font-medium text-neutral-700">
                          {stage.conversionFromPrev !== null ? `${stage.conversionFromPrev}%` : '—'}
                        </span>
                      </div>

                      <div className="text-right min-w-[65px]">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Drop-off</span>
                        <span className={`font-mono font-bold ${
                          (stage.dropOffRate || 0) > 40 ? 'text-rose-600' : 'text-neutral-600'
                        }`}>
                          {stage.dropOffRate !== null ? `${stage.dropOffRate}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Relative bar */}
                  {hasData && (
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-neutral-900 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(5, relativePct)}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {idx < funnelStages.length - 1 && (
                  <div className="flex justify-center my-1 text-neutral-300">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: 11-STAGE GUIDED WORKFLOW PROGRESSION */}
      <div className="space-y-4 pt-4 border-t border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-neutral-800" />
            <h3 className="font-bold text-sm text-neutral-900">
              Guided Video Workflow Progression (11 Steps)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Brief → Finish
          </span>
        </div>

        <p className="text-xs text-neutral-500">
          Tracks progression through the CreatorFlow guided journey to discover where creators encounter friction.
        </p>

        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Step</th>
                  <th className="py-3 px-4">Workflow Stage</th>
                  <th className="py-3 px-4 text-center">Entered</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-right">Drop-off to Next</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {workflowStages.map((st) => (
                  <tr key={st.step} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      Step {st.step}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-800">
                      {st.name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-neutral-900">
                      {st.usersEntered}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-neutral-700">
                      {st.usersCompleted}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-700">
                      {st.dropOffRate !== null ? `${st.dropOffRate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
