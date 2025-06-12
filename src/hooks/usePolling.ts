import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  maxDuration?: number;
  onError?: (error: Error) => void;
  onTimeout?: () => void;
}

export const usePolling = (
  pollFunction: () => Promise<any>,
  shouldContinue: (result: any) => boolean,
  onResult: (result: any) => void,
  options: UsePollingOptions = {}
) => {
  const {
    interval = 2000,
    maxDuration = 600000, // 10 minutes
    onError,
    onTimeout
  } = options;

  const intervalRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const isActiveRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    isActiveRef.current = false;
  }, []);

  const startPolling = useCallback(async () => {
    if (isActiveRef.current) {
      stopPolling();
    }

    isActiveRef.current = true;
    startTimeRef.current = Date.now();

    const poll = async () => {
      if (!isActiveRef.current) return;

      // Check timeout
      if (startTimeRef.current && Date.now() - startTimeRef.current > maxDuration) {
        stopPolling();
        onTimeout?.();
        return;
      }

      try {
        const result = await pollFunction();
        
        if (!isActiveRef.current) return;

        onResult(result);

        if (!shouldContinue(result)) {
          stopPolling();
        }
      } catch (error) {
        if (!isActiveRef.current) return;
        
        console.error('Polling error:', error);
        onError?.(error as Error);
        stopPolling();
      }
    };

    // Initial poll
    await poll();

    // Set up interval polling if still active
    if (isActiveRef.current) {
      intervalRef.current = setInterval(poll, interval);
    }
  }, [pollFunction, shouldContinue, onResult, interval, maxDuration, onError, onTimeout, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    startPolling,
    stopPolling,
    isPolling: isActiveRef.current
  };
};