import React from 'react';
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  DollarSign, 
  Activity, 
  GitFork, 
  Sparkles, 
  Server, 
  Settings, 
  ArrowLeft,
  ShieldAlert,
  Database,
  ExternalLink
} from 'lucide-react';
import { AdminTab } from '../../types/adminAnalytics';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

const TABS: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'product_usage', label: 'Product Usage', icon: Activity },
  { id: 'conversion', label: 'Conversion', icon: GitFork },
  { id: 'feature_performance', label: 'Feature Performance', icon: Sparkles },
  { id: 'system', label: 'System', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#fbfbfa] text-neutral-900 font-sans flex flex-col">
      {/* Top Admin Notice Bar */}
      <div className="bg-amber-50 border-b border-amber-200/70 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-amber-900 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-semibold">DEVELOPMENT ONLY ACCESS:</span>
          <span className="text-amber-800">
            Admin authentication & database not yet connected. Displaying local architecture and un-faked analytics telemetry.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Dev Preview
          </span>
          <button
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1 font-semibold text-neutral-800 hover:text-black underline underline-offset-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Creator Studio
          </button>
        </div>
      </div>

      {/* Main Admin Header */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                CF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-neutral-900 text-base sm:text-lg tracking-tight">
                    CreatorFlow Admin Console
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                    Analytics
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 hidden sm:block">
                  Platform Telemetry, Funnels & Executive Metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                <Database className="w-3.5 h-3.5 text-neutral-400" />
                <span>DB:</span>
                <span className="font-mono text-neutral-500 font-semibold">Disconnected</span>
              </div>
              <button
                onClick={onExitAdmin}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Creator Studio</span>
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-neutral-100">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm'
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

      {/* Main Admin Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Admin Minimal Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4 px-4 sm:px-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-neutral-800">CreatorFlow Admin System</span>
            <span>&bull;</span>
            <span>v3.4.0 Production Architecture</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Real data telemetry policy enforced &bull; No fake metrics or simulated revenue
          </div>
        </div>
      </footer>
    </div>
  );
};
