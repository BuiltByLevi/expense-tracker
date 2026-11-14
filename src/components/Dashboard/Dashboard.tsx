import React, { Suspense, lazy } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import ListSkeleton from '../common/ListSkeleton';

// Each layout is its own download, so a phone never fetches the desktop
// dashboard's code and vice versa.
const DashboardWeb = lazy(() => import('./DashboardWeb'));
const DashboardMobile = lazy(() => import('./DashboardMobile'));

const Dashboard: React.FC = () => {
  const isMobile = useIsMobile();

  // This router only switches the main dashboards.
  // The sub-pages are handled internally by DashboardWeb and DashboardMobile.
  return (
    <Suspense fallback={<div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}><ListSkeleton rows={6} /></div>}>
      {isMobile ? <DashboardMobile /> : <DashboardWeb />}
    </Suspense>
  );
};

export default Dashboard;
