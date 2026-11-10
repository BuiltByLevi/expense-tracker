import React from 'react';
import AuthWeb from './AuthWeb';
import AuthMobile from './AuthMobile';
import { useIsMobile } from '../../hooks/useIsMobile';

const Auth: React.FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <AuthMobile /> : <AuthWeb />;
};

export default Auth;
