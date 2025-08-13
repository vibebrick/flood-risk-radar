import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface NetworkState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export const useNetworkRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
    onMaxRetriesReached
  } = options;

  const [state, setState] = useState<NetworkState>({
    isLoading: false,
    error: null,
    retryCount: 0
  });

  const lastToastRef = useRef<number>(0);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number): number => {
    const delay = baseDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  };

  const execute = useCallback(async (...args: T): Promise<R> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFunction(...args);
        setState(prev => ({ ...prev, isLoading: false, error: null, retryCount: 0 }));
        return result;
      } catch (error) {
        const err = error as Error;
        
        setState(prev => ({ ...prev, retryCount: attempt + 1 }));

        if (attempt === maxRetries) {
          setState(prev => ({ ...prev, isLoading: false, error: err }));
          onMaxRetriesReached?.(err);
          
          toast({
            title: "連線失敗",
            description: `操作失敗，已重試 ${maxRetries} 次。請檢查網路連線後再試。`,
            variant: "destructive",
          });
          
          throw err;
        }

        // Calculate delay with jitter to avoid thundering herd
        const baseDelayMs = calculateDelay(attempt);
        const jitter = Math.random() * 0.1 * baseDelayMs;
        const delayMs = baseDelayMs + jitter;

        onRetry?.(attempt + 1, err);

        // Debounce toast notifications
        const now = Date.now();
        if (attempt < maxRetries && now - lastToastRef.current > 3000) {
          lastToastRef.current = now;
          toast({
            title: "重試中...",
            description: `第 ${attempt + 1} 次重試，${Math.round(delayMs / 1000)} 秒後繼續`,
          });
        }

        await sleep(delayMs);
      }
    }

    throw new Error('Unexpected retry loop exit');
  }, [asyncFunction, maxRetries, baseDelay, maxDelay, backoffFactor, onRetry, onMaxRetriesReached, toast]);

  return {
    execute,
    ...state,
    retry: () => setState(prev => ({ ...prev, error: null, retryCount: 0 }))
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const lastStatusToastRef = useRef<number>(0);
  const { toast } = useToast();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      
      // Debounce status toasts
      const now = Date.now();
      if (now - lastStatusToastRef.current > 5000) {
        lastStatusToastRef.current = now;
        toast({
          title: "網路已連線",
          description: "網路連線已恢復",
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      const now = Date.now();
      if (now - lastStatusToastRef.current > 5000) {
        lastStatusToastRef.current = now;
        toast({
          title: "網路連線中斷",
          description: "請檢查您的網路連線",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return {
    isOnline,
    lastOnlineTime,
    isOffline: !isOnline
  };
};