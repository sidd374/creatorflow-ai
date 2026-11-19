import React, { useState, useEffect } from 'react';
import { 
  OwnerTab, 
  AnalyticsDateRange 
} from '../../types/ownerAnalytics';
import { 
  getOwnerOverviewMetrics, 
  getOwnerUserList, 
  getProductFunnelData, 
  getFeaturePerformanceData, 
  getWorkflowProgressionData, 
  getProductErrors, 
  getSystemTelemetry,
  getStoredEvents,
  getEngagementDetails,
  getRetentionAnalysis,
  syncOwnerAnalyticsFromServer
} from '../../lib/analyticsService';
import { getStoredUser, isAuthorizedOwner, verifySessionWithServer } from '../../lib/auth';
import { OwnerLayout } from './OwnerLayout';
import { OwnerOverviewTab } from './OwnerOverviewTab';
import { OwnerUsersTab } from './OwnerUsersTab';
import { OwnerEngagementTab } from './OwnerEngagementTab';
import { OwnerFunnelTab } from './OwnerFunnelTab';
import { OwnerFeaturesTab } from './OwnerFeaturesTab';
import { OwnerRetentionTab } from './OwnerRetentionTab';
import { OwnerErrorsTab } from './OwnerErrorsTab';
import { OwnerSystemTab } from './OwnerSystemTab';
import { ShieldAlert, ArrowLeft, Lock, LogIn } from 'lucide-react';

interface OwnerDashboardShellProps {
  onExitOwner: () => void;
  onOpenAuth?: () => void;
  initialTab?: OwnerTab;
}

export const OwnerDashboardShell: React.FC<OwnerDashboardShellProps> = ({
  onExitOwner,
  onOpenAuth,
  initialTab = 'overview',
}) => {
  const [currentTab, setCurrentTab] = useState<OwnerTab>(initialTab);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('30d');
  const [, setRefreshKey] = useState(0);

  const currentUser = getStoredUser();
  const isAuthorized = isAuthorizedOwner(currentUser);

  // Verify session server-side and pull real owner analytics on mount / dateRange change
  useEffect(() => {
    let active = true;
    (async () => {
      await verifySessionWithServer();
      const synced = await syncOwnerAnalyticsFromServer(dateRange);
      if (active && synced) {
        setRefreshKey((k) => k + 1);
      }
    })();
    return () => {
      active = false;
    };
  }, [dateRange]);

  // Live reload on event dispatch
  useEffect(() => {
    const handleEventLogged = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('creatorflow_event_logged', handleEventLogged);
    window.addEventListener('creatorflow_auth_changed', handleEventLogged);
    return () => {
      window.removeEventListener('creatorflow_event_logged', handleEventLogged);
      window.removeEventListener('creatorflow_auth_changed', handleEventLogged);
    };
  }, []);

  // Compute metrics with dateRange
  const metrics = getOwnerOverviewMetrics(dateRange);
  const users = getOwnerUserList();
  const engagement = getEngagementDetails(dateRange);
  const retention = getRetentionAnalysis(dateRange);
  const funnelStages = getProductFunnelData(dateRange);
  const workflowStages = getWorkflowProgressionData(dateRange);
  const features = getFeaturePerformanceData(dateRange);
  const errors = getProductErrors(dateRange);
  const systemData = getSystemTelemetry();
  const allEvents = getStoredEvents();

  // CASE 1: Logged-Out User
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4 select-none">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 max-w-md w-full text-center shadow-lg space-y-5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700 font-bold">
              Protected Administrative Route
            </span>
            <h2 className="font-serif text-2xl font-bold text-neutral-900">
              Authentication Required
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
              Please sign in with your authorized Owner or Administrator account to access Owner Analytics.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Owner Account</span>
            </button>
            <button
              onClick={onExitOwner}
              className="w-full py-2 px-4 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Return to CreatorFlow Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: Logged-in Normal User (Access Denied)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4 select-none">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 max-w-md w-full text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-neutral-900">
            Access Denied
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            The Owner Analytics &amp; Product Intelligence Console is restricted exclusively to CreatorFlow administrative accounts.
          </p>
          <div className="p-3 bg-neutral-50 rounded-xl text-left text-xs font-mono text-neutral-600 border border-neutral-200/80 space-y-1">
            <div>Current Account: <strong className="text-neutral-900">{currentUser?.email || 'Anonymous'}</strong></div>
            <div>Current Role: <span className="text-rose-600 font-bold uppercase">{currentUser?.role || 'user'}</span></div>
            <div>Required Authority: <span className="text-emerald-700 font-bold uppercase">owner / admin</span></div>
          </div>
          <button
            onClick={onExitOwner}
            className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to CreatorFlow Studio</span>
          </button>
        </div>
      </div>
    );
  }

  // CASE 3: Authorized Owner
  return (
    <OwnerLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      dateRange={dateRange}
      onSelectDateRange={setDateRange}
      onExitOwner={onExitOwner}
      userEmail={currentUser.email}
      userRole={currentUser.role || 'owner'}
      isBackendConnected={true}
    >
      {currentTab === 'overview' && (
        <OwnerOverviewTab metrics={metrics} dateRange={dateRange} />
      )}
      {currentTab === 'users' && (
        <OwnerUsersTab users={users} />
      )}
      {currentTab === 'engagement' && (
        <OwnerEngagementTab engagement={engagement} dateRange={dateRange} />
      )}
      {currentTab === 'funnel' && (
        <OwnerFunnelTab
          funnelStages={funnelStages}
          workflowStages={workflowStages}
          dateRange={dateRange}
        />
      )}
      {currentTab === 'features' && (
        <OwnerFeaturesTab features={features} />
      )}
      {currentTab === 'retention' && (
        <OwnerRetentionTab retention={retention} dateRange={dateRange} />
      )}
      {currentTab === 'errors' && (
        <OwnerErrorsTab errors={errors} />
      )}
      {currentTab === 'system' && (
        <OwnerSystemTab 
          systemData={systemData} 
          totalEvents={allEvents.length} 
          userEmail={currentUser.email} 
        />
      )}
    </OwnerLayout>
  );
};
