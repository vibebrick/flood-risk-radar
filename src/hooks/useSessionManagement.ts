import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionState {
  isSessionActive: boolean;
  lastActivity: Date;
  sessionExpiry: Date | null;
  timeUntilExpiry: number;
}

interface SessionOptions {
  heartbeatInterval?: number; // milliseconds
  sessionTimeout?: number; // milliseconds
  warningThreshold?: number; // milliseconds before expiry to show warning
  enableHeartbeat?: boolean;
  enableActivityTracking?: boolean;
}

export const useSessionManagement = (options: SessionOptions = {}) => {
  const {
    heartbeatInterval = 300000, // 5 minutes (reduced frequency)
    sessionTimeout = 1800000, // 30 minutes
    warningThreshold = 300000, // 5 minutes
    enableHeartbeat = true,
    enableActivityTracking = true
  } = options;

  const [sessionState, setSessionState] = useState<SessionState>({
    isSessionActive: true,
    lastActivity: new Date(),
    sessionExpiry: null,
    timeUntilExpiry: 0
  });

  const heartbeatRef = useRef<NodeJS.Timeout>();
  const activityTimerRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef(new Date());
  const sessionExpiryRef = useRef<Date | null>(null);
  const { toast } = useToast();

  // Update last activity time (optimized with refs)
  const updateActivity = useCallback(() => {
    const now = new Date();
    const expiry = new Date(now.getTime() + sessionTimeout);
    
    lastActivityRef.current = now;
    sessionExpiryRef.current = expiry;
    
    // Only update state if session was inactive
    setSessionState(prev => {
      if (!prev.isSessionActive) {
        return {
          ...prev,
          lastActivity: now,
          sessionExpiry: expiry,
          timeUntilExpiry: sessionTimeout,
          isSessionActive: true
        };
      }
      return prev;
    });

    warningShownRef.current = false;
  }, [sessionTimeout]);

  // Check session health with Supabase
  const checkSessionHealth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session health check failed:', error);
        return false;
      }

      if (!session) {
        setSessionState(prev => ({ ...prev, isSessionActive: false }));
        return false;
      }

      // Check if session is close to expiry
      const now = Date.now() / 1000;
      const expiresAt = session.expires_at || 0;
      const timeLeft = (expiresAt - now) * 1000;

      if (timeLeft <= 0) {
        setSessionState(prev => ({ ...prev, isSessionActive: false }));
        toast({
          title: "登入已過期",
          description: "您的登入已過期，請重新登入",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session health check error:', error);
      return false;
    }
  }, [toast]);

  // Send heartbeat to maintain session
  const sendHeartbeat = useCallback(async () => {
    try {
      // Simple ping to keep session alive
      const { error } = await supabase.functions.invoke('search-flood-news', {
        body: { heartbeat: true }
      });

      if (error && error.message !== 'Function not found') {
        console.warn('Heartbeat failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Heartbeat error:', error);
      return false;
    }
  }, []);

  // Handle session expiry warning
  const handleExpiryWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      toast({
        title: "登入即將過期",
        description: "您的登入將在 5 分鐘後過期，請保存您的工作",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Activity tracking
  useEffect(() => {
    if (!enableActivityTracking) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enableActivityTracking, updateActivity]);

  // Heartbeat mechanism
  useEffect(() => {
    if (!enableHeartbeat) return;

    const startHeartbeat = () => {
      heartbeatRef.current = setInterval(async () => {
        const isHealthy = await checkSessionHealth();
        if (isHealthy) {
          await sendHeartbeat();
        }
      }, heartbeatInterval);
    };

    startHeartbeat();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [enableHeartbeat, heartbeatInterval, checkSessionHealth, sendHeartbeat]);

  // Session expiry countdown (reduced frequency)
  useEffect(() => {
    const updateCountdown = () => {
      if (!sessionExpiryRef.current) return;

      const now = new Date().getTime();
      const expiry = sessionExpiryRef.current.getTime();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        setSessionState(prev => ({ ...prev, isSessionActive: false, timeUntilExpiry: 0 }));
        toast({
          title: "連線已逾時",
          description: "閒置時間過長，請重新載入頁面",
          variant: "destructive",
        });
        return;
      }

      // Show warning if close to expiry
      if (timeLeft <= warningThreshold && !warningShownRef.current) {
        handleExpiryWarning();
      }

      // Update state less frequently
      setSessionState(prev => ({ ...prev, timeUntilExpiry: timeLeft }));
    };

    const countdownInterval = setInterval(updateCountdown, 5000); // Update every 5 seconds instead of 1
    updateCountdown(); // Initial update

    return () => clearInterval(countdownInterval);
  }, [warningThreshold, handleExpiryWarning, toast]); // Remove sessionExpiry dependency

  // Initialize session
  useEffect(() => {
    updateActivity();
  }, [updateActivity]);

  const extendSession = useCallback(() => {
    updateActivity();
    toast({
      title: "登入已延長",
      description: "您的登入時間已延長",
    });
  }, [updateActivity, toast]);

  const endSession = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      isSessionActive: false,
      sessionExpiry: null,
      timeUntilExpiry: 0
    }));

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current);
    }
  }, []);

  return {
    ...sessionState,
    extendSession,
    endSession,
    updateActivity,
    checkHealth: checkSessionHealth
  };
};
