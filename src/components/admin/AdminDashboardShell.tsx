import React, { useState } from 'react';
import { AdminTab } from '../../types/adminAnalytics';
import { AdminLayout } from './AdminLayout';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminUsersView } from './AdminUsersView';
import { AdminSubscriptionsView } from './AdminSubscriptionsView';
import { AdminRevenueView } from './AdminRevenueView';
import { AdminProductUsageView } from './AdminProductUsageView';
import { AdminConversionView } from './AdminConversionView';
import { AdminFeaturePerformanceView } from './AdminFeaturePerformanceView';
import { AdminSystemView } from './AdminSystemView';
import { AdminSettingsView } from './AdminSettingsView';

interface AdminDashboardShellProps {
  onExitAdmin: () => void;
  initialTab?: AdminTab;
}

export const AdminDashboardShell: React.FC<AdminDashboardShellProps> = ({
  onExitAdmin,
  initialTab = 'overview',
}) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>(initialTab);

  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onExitAdmin={onExitAdmin}
    >
      {currentTab === 'overview' && <AdminOverviewView />}
      {currentTab === 'users' && <AdminUsersView />}
      {currentTab === 'subscriptions' && <AdminSubscriptionsView />}
      {currentTab === 'revenue' && <AdminRevenueView />}
      {currentTab === 'product_usage' && <AdminProductUsageView />}
      {currentTab === 'conversion' && <AdminConversionView />}
      {currentTab === 'feature_performance' && <AdminFeaturePerformanceView />}
      {currentTab === 'system' && <AdminSystemView />}
      {currentTab === 'settings' && <AdminSettingsView />}
    </AdminLayout>
  );
};
