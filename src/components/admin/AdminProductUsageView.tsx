import React from 'react';
import { 
  Activity, 
  Lightbulb, 
  FolderGit2, 
  Film, 
  User, 
  FileText, 
  Package, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { getProductUsageStats } from '../../lib/adminAnalyticsService';

export const AdminProductUsageView: React.FC = () => {
  const usage = getProductUsageStats();

  const METRIC_ROWS = [
    {
      label: 'Ideas Generated',
      desc: 'Viral and strategic video concepts generated for creators',
      icon: Lightbulb,
      data: usage.ideasGenerated,
    },
    {
      label: 'Projects Created',
      desc: 'Dedicated production project workspaces initialized',
      icon: FolderGit2,
      data: usage.projectsCreated,
    },
    {
      label: 'Video Prompts Generated',
      desc: 'AI video generation tool-specific prompts compiled',
      icon: Film,
      data: usage.videoPromptsGenerated,
    },
    {
      label: 'Characters Created',
      desc: 'Consistent Character Bibles and locks established',
      icon: User,
      data: usage.charactersCreated,
    },
    {
      label: 'Scripts Generated',
      desc: 'Full scene scripts and narration lines produced',
      icon: FileText,
      data: usage.scriptsGenerated,
    },
    {
      label: 'Content Packs Exported',
      desc: 'Titles, descriptions, tags, and timestamps downloaded',
      icon: Package,
      data: usage.contentPacksExported,
    },
    {
      label: 'Full Workflows Completed',
      desc: 'All 4 guided creation stages executed end-to-end',
      icon: CheckCircle2,
      data: usage.fullWorkflowsCompleted,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Product Usage Analytics</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit actual volume of creator generation operations across daily, weekly, and monthly windows.
          </p>
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Core Operation</th>
                <th className="py-3 px-4">Daily (24h)</th>
                <th className="py-3 px-4">Weekly (7d)</th>
                <th className="py-3 px-4">Monthly (30d)</th>
                <th className="py-3 px-4">Total Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {METRIC_ROWS.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.label} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 text-xs">{row.label}</p>
                          <p className="text-[11px] text-neutral-400">{row.desc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-800">
                      {row.data.daily}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-800">
                      {row.data.weekly}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-800">
                      {row.data.monthly}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      {row.data.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
