import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Config
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes
const WARNING_DURATION_MS = 60 * 1000;     // 60 seconds warning

export const useSessionTimeout = () => {
  const { user, logout } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!user) return; // only run when logged in

    const clearTimers = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningShownRef.current = false;
    };

    const scheduleLogout = () => {
      clearTimers();
      // Warning at (timeout - warning duration)
      warningTimerRef.current = setTimeout(() => {
        warningShownRef.current = true;
        toast.error('You will be logged out in 60 seconds due to inactivity.', {
          duration: WARNING_DURATION_MS,
        });
      }, IDLE_TIMEOUT_MS - WARNING_DURATION_MS);

      idleTimerRef.current = setTimeout(async () => {
        toast.error('Session expired. Logging out...');
        await logout();
      }, IDLE_TIMEOUT_MS);
    };

    const resetTimer = () => {
      // Don't reset if warning is already showing (user is idle)
      if (warningShownRef.current) return;
      scheduleLogout();
    };

    // Events that count as "activity"
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, true));

    // Start timer on mount
    scheduleLogout();

    return () => {
      clearTimers();
      events.forEach((ev) => window.removeEventListener(ev, resetTimer, true));
    };
  }, [user, logout]);
};