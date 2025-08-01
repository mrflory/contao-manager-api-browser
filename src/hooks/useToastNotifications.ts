import { useCallback } from 'react';
import { toaster } from '../components/ui/toaster';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  closable?: boolean;
}

export interface ToastNotifications {
  showSuccess: (options: ToastOptions) => void;
  showError: (options: ToastOptions) => void;
  showWarning: (options: ToastOptions) => void;
  showInfo: (options: ToastOptions) => void;
  showApiError: (error: Error | string, context?: string) => void;
  showApiSuccess: (message: string, context?: string) => void;
}

const DEFAULT_DURATIONS = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

export const useToastNotifications = (): ToastNotifications => {
  const showToast = useCallback((type: ToastType, options: ToastOptions) => {
    toaster.create({
      title: options.title,
      description: options.description,
      type,
      duration: options.duration ?? DEFAULT_DURATIONS[type],
      closable: options.closable ?? true,
    });
  }, []);

  const showSuccess = useCallback((options: ToastOptions) => {
    showToast('success', options);
  }, [showToast]);

  const showError = useCallback((options: ToastOptions) => {
    showToast('error', options);
  }, [showToast]);

  const showWarning = useCallback((options: ToastOptions) => {
    showToast('warning', options);
  }, [showToast]);

  const showInfo = useCallback((options: ToastOptions) => {
    showToast('info', options);
  }, [showToast]);

  const showApiError = useCallback((error: Error | string, context?: string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const title = context ? `${context} Failed` : 'Error';
    
    showError({
      title,
      description: errorMessage,
      duration: 5000,
    });
  }, [showError]);

  const showApiSuccess = useCallback((message: string, context?: string) => {
    const title = context ? `${context} Successful` : 'Success';
    
    showSuccess({
      title,
      description: message,
      duration: 3000,
    });
  }, [showSuccess]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError,
    showApiSuccess,
  };
};

// Pre-defined common toast messages
export const TOAST_MESSAGES = {
  // Authentication
  TOKEN_RECEIVED: {
    title: 'Token Received',
    description: 'Token received! Please save it to continue.',
  },
  REDIRECTING_AUTH: {
    title: 'Redirecting',
    description: 'Redirecting to Contao Manager for authentication...',
  },
  SITE_ADDED: {
    title: 'Success',
    description: 'Site added successfully!',
  },
  REAUTHENTICATION_SUCCESS: {
    title: 'Success',
    description: 'Site reauthenticated successfully! New token saved.',
  },

  // Workflow
  WORKFLOW_STARTED: {
    title: 'Workflow Started',
    description: 'Contao update workflow has begun',
  },
  WORKFLOW_STOPPED: {
    title: 'Workflow Stopped',
    description: 'Update workflow has been paused',
  },
  WORKFLOW_RESUMED: {
    title: 'Workflow Resumed',
    description: 'Update workflow is continuing',
  },
  WORKFLOW_CANCELLED: {
    title: 'Workflow Cancelled',
    description: 'Update workflow has been cancelled',
  },
  WORKFLOW_COMPLETE: {
    title: 'Update Complete!',
    description: 'Your Contao installation has been successfully updated. All components are now up to date.',
  },

  // Migrations
  MIGRATIONS_CONFIRMED: {
    title: 'Migrations Confirmed',
    description: 'Database migrations will now be executed',
  },
  MIGRATIONS_SKIPPED: {
    title: 'Migrations Skipped',
    description: 'Database migrations were skipped. You can run them manually later.',
  },

  // Version Info
  VERSION_INFO_UPDATED: {
    title: 'Success',
    description: 'Version information updated successfully',
  },

  // Site Management
  SITE_REMOVED: (siteName: string) => ({
    title: 'Success',
    description: `Site "${siteName}" has been removed`,
  }),
  SITE_NAME_UPDATED: {
    title: 'Success',
    description: 'Site name updated successfully',
  },

  // Logs
  LOGS_CLEANED: (count: number) => ({
    title: 'Success',
    description: `Cleaned up ${count} old log entries (older than 1 week)`,
  }),

  // Debug
  DEBUG_MODE: (description: string) => ({
    title: 'Debug Mode',
    description,
  }),
} as const;