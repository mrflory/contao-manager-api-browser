import { useState, useCallback } from 'react';
import { ApiCallService } from '../services/apiCallService';
import { useToastNotifications } from './useToastNotifications';
import { ApiCallState, ApiCallOptions, ApiFunction } from '../types/apiTypes';

export interface UseApiCallResult<T = unknown> {
  state: ApiCallState<T>;
  execute: (params?: unknown) => Promise<T | undefined>;
  reset: () => void;
}

export const useApiCall = <T = unknown, P = unknown>(
  apiFunction: ApiFunction<T, P>,
  options: ApiCallOptions = {}
): UseApiCallResult<T> => {
  const [state, setState] = useState<ApiCallState<T>>({
    loading: false,
    data: undefined,
    error: undefined,
  });

  const toast = useToastNotifications();

  const reset = useCallback(() => {
    setState({
      loading: false,
      data: undefined,
      error: undefined,
    });
  }, []);

  const execute = useCallback(async (params?: P): Promise<T | undefined> => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const result = await ApiCallService.executeApiCall(apiFunction, params);
      
      if (result.success) {
        setState({
          loading: false,
          data: result.data,
          error: undefined,
        });

        // Show success toast if requested
        if (options.showSuccessToast) {
          toast.showApiSuccess(
            options.successMessage || 'Operation completed successfully'
          );
        }

        // Call success callback
        options.onSuccess?.(result.data);

        return result.data;
      } else {
        const errorMessage = result.error || 'An unknown error occurred';
        
        setState({
          loading: false,
          data: undefined,
          error: errorMessage,
        });

        // Show error toast if requested (default: true)
        if (options.showErrorToast !== false) {
          toast.showApiError(
            errorMessage,
            options.errorMessage
          );
        }

        // Call error callback
        options.onError?.(errorMessage);

        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      setState({
        loading: false,
        data: undefined,
        error: errorMessage,
      });

      // Show error toast if requested (default: true)
      if (options.showErrorToast !== false) {
        toast.showApiError(
          errorMessage,
          options.errorMessage
        );
      }

      // Call error callback
      options.onError?.(errorMessage);

      return undefined;
    }
  }, [apiFunction, options, toast]);

  return {
    state,
    execute,
    reset,
  };
};

/**
 * Hook for managing multiple loading states (e.g., different buttons)
 */
export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    setLoading,
    isLoading,
    clearLoading,
    loadingStates,
  };
};