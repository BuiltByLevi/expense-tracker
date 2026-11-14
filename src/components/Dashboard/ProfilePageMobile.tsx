import React from 'react';
import ProfileView from './ProfileView';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
  onOpenEarnings?: () => void;
}

const ProfilePageMobile: React.FC<Props> = ({ onOpenEarnings }) => (
  <div className="m-content">
    <ProfileView onOpenEarnings={onOpenEarnings} />
  </div>
);

export default ProfilePageMobile;
