import React from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  GitFork, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Server, 
  ArrowLeft,
  Shield,
  Layers
} from 'lucide-react';
import { OwnerTab, AnalyticsDateRange } from '../../types/ownerAnalytics';

interface OwnerLayoutProps {
  currentTab: OwnerTab;
  onSelectTab: (tab: OwnerTab) => void;
  onExitOwner: () => void;
  dateRange: AnalyticsDateRange;
  onSelectDateRange: (range: AnalyticsDateRange) => void;
  userEmail: string;
  userRole: string;
  isBackendConnected: boolean;
  children: React.ReactNode;
}

const TABS: Array<{ id: OwnerTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'engagement', label: 'Engagement', icon: Activity },
  { id: 'funnel', label: 'Funnel', icon: GitFork },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'retention', label: 'Retention', icon: Clock },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
  { id: 'system', label: 'System', icon: Server },
];

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitOwner,
  dateRange,
  onSelectDateRange,
  userEmail,
  userRole,
  isBackendConnected,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#fbfbfa] text-neutral-900 font-sans flex flex-col">
      {/* Top Owner Authority Notice */}
      <div className="bg-neutral-900 text-neutral-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="font-semibold text-white tracking-wider uppercase text-[11px]">
            Owner &amp; Product Intelligence Console
          </span>
          <span className="text-neutral-400 hidden sm:inline">&bull;</span>
          <span className="text-neutral-300 hidden sm:inline text-[11px]">
            Logged in as <strong className="text-amber-300 font-mono">{userEmail}</strong> ({userRole.toUpperCase()})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-white/10 text-neutral-200 border border-white/15">
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            {isBackendConnected ? 'Server Connected' : 'Local + Server Sync'}
          </span>
          <button
            onClick={onExitOwner}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Studio
          </button>
        </div>
      </div>

      {/* Main Owner Header with Navigation & Date Filter */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto sm:h-16 py-3 sm:py-0 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-serif font-bold text-sm tracking-wider shadow-sm">
                CF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-neutral-900 text-base sm:text-lg tracking-tight font-serif">
                    CreatorFlow Analytics
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Product Intel
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 hidden sm:block">
                  Internal Product Usage, Funnel Progression &amp; Retention Analytics
                </p>
              </div>
            </div>

            {/* Date Range Filter (Today, 7 days, 30 days, 90 days, Custom) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-neutral-500 font-medium hidden md:inline">Range:</span>
              <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200/80 text-xs font-medium">
                {(['today', '7d', '30d', '90d'] as AnalyticsDateRange[]).map((r) => {
                  const labelMap: Record<AnalyticsDateRange, string> = {
                    today: 'Today',
                    '7d': '7 Days',
                    '30d': '30 Days',
                    '90d': '90 Days',
                    custom: 'Custom',
                  };
                  const isSelected = dateRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onSelectDateRange(r)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-neutral-900 font-bold shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {labelMap[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Owner Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-neutral-100">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4 px-4 sm:px-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-neutral-800">CreatorFlow Internal Owner Console</span>
            <span>&bull;</span>
            <span>Real account-based telemetry &bull; Zero synthetic numbers</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Customer Creator Analytics completely isolated
          </div>
        </div>
      </footer>
    </div>
  );
};
