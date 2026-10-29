import React, { useState, useEffect } from 'react';
import DashboardWeb from './DashboardWeb';
import DashboardMobile from './DashboardMobile';

const Dashboard: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // This router only switches the main dashboards. 
  // The sub-pages will be handled internally by DashboardWeb and DashboardMobile.
  return isMobile ? <DashboardMobile /> : <DashboardWeb />;
};

export default Dashboard;