import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Config
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes
const WARNING_DURATION_MS = 60 * 1000;     // 60 seconds warning
const WARNING_TOAST_ID = 'idle-logout-warning';

export const useSessionTimeout = () => {
  const { user, logout } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);
  // Read logout through a ref so a new function identity doesn't restart the timers.
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

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
        toast.error('You will be logged out in 60 seconds due to inactivity. Tap anywhere to stay signed in.', {
          id: WARNING_TOAST_ID,
          duration: WARNING_DURATION_MS,
        });
      }, IDLE_TIMEOUT_MS - WARNING_DURATION_MS);

      idleTimerRef.current = setTimeout(async () => {
        toast.error('Session expired. Logging out...');
        await logoutRef.current();
      }, IDLE_TIMEOUT_MS);
    };

    // Any activity — including after the warning has appeared — means the
    // person is still here: dismiss the warning and start the clock again.
    // (mousemove fires constantly, so it's throttled to once a second.)
    let lastReset = 0;
    const resetTimer = () => {
      const now = Date.now();
      if (!warningShownRef.current && now - lastReset < 1000) return;
      lastReset = now;
      if (warningShownRef.current) toast.dismiss(WARNING_TOAST_ID);
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
  }, [user]);
};