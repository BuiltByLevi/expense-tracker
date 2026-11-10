import React from 'react';
import DashboardWeb from './DashboardWeb';
import DashboardMobile from './DashboardMobile';
import { useIsMobile } from '../../hooks/useIsMobile';

const Dashboard: React.FC = () => {
  const isMobile = useIsMobile();

  // This router only switches the main dashboards.
  // The sub-pages are handled internally by DashboardWeb and DashboardMobile.
  return isMobile ? <DashboardMobile /> : <DashboardWeb />;
};

export default Dashboard;
