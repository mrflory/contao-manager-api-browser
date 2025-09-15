import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StorageType, 
  StorageState, 
  StorageInfo, 
  StorageBackend, 
  StorageCapabilities,
  StorageMigrationOptions,
  StorageMigrationResult,
  StorageChangeEvent,
  StorageMigrationProgressEvent
} from '../types/storage';
import { browserStorageService } from '../services/browserStorageService';
import { useToastNotifications } from './useToastNotifications';

export interface UseStorageTypeResult {
  // Current state
  currentStorageType: StorageType;
  storageState: StorageState;
  storageInfo: StorageInfo;
  availableBackends: StorageBackend[];
  isLoading: boolean;
  error?: string;

  // Actions
  switchStorageType: (newType: StorageType, migrateData?: boolean) => Promise<boolean>;
  refreshStorageInfo: () => Promise<void>;
  refreshAvailableBackends: () => Promise<void>;
  
  // Storage operations
  exportConfig: () => Promise<string | null>;
  importConfig: (data: string) => Promise<boolean>;
  clearConfig: () => Promise<boolean>;
  
  // Migration
  migrateStorage: (options: StorageMigrationOptions) => Promise<StorageMigrationResult>;
  migrationProgress: number;
  isMigrating: boolean;
  
  // Utils
  getStorageCapabilities: (type: StorageType) => StorageCapabilities;
  isStorageAvailable: (type: StorageType) => Promise<boolean>;
}

/**
 * Custom hook for managing storage type and operations
 * Provides a React interface to the browser storage service
 */
export const useStorageType = (): UseStorageTypeResult => {
  const [currentStorageType, setCurrentStorageType] = useState<StorageType>(StorageType.JSON_FILE);
  const [storageState, setStorageState] = useState<StorageState>({
    type: StorageType.JSON_FILE,
    isInitialized: false,
    isAvailable: false
  });
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usedSpace: 0,
    availableSpace: 0,
    usagePercentage: 0
  });
  const [availableBackends, setAvailableBackends] = useState<StorageBackend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const toast = useToastNotifications();
  const eventListenersRef = useRef<{ [key: string]: Function }>({});

  /**
   * Refresh storage information
   */
  const refreshStorageInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await browserStorageService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to refresh storage info:', error);
      setStorageInfo({
        usedSpace: 0,
        availableSpace: 0,
        usagePercentage: 0
      });
    }
  }, []);

  /**
   * Refresh available storage backends
   */
  const refreshAvailableBackends = useCallback(async (): Promise<void> => {
    try {
      const backends = await browserStorageService.getAvailableStorageBackends();
      setAvailableBackends(backends);
    } catch (error) {
      console.error('Failed to refresh available backends:', error);
      setAvailableBackends([]);
    }
  }, []);

  /**
   * Initialize storage state and set up event listeners
   */
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) {
      return;
    }

    const initializeStorage = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        // Get initial storage state
        const state = browserStorageService.getStorageState();
        setStorageState(state);
        setCurrentStorageType(state.type);

        // Load storage info and available backends - don't block page rendering
        Promise.all([
          refreshStorageInfo(),
          refreshAvailableBackends()
        ]).catch(error => {
          console.error('Background storage detection failed:', error);
        });

        setIsInitialized(true);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize storage';
        setError(errorMessage);
        console.error('Storage initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up event listeners
    const handleStorageChange = (event: StorageChangeEvent) => {
      setCurrentStorageType(event.newType);
      setStorageState(prev => ({ ...prev, type: event.newType }));
      toast.showSuccess(`Storage switched to ${event.newType}`);
      
      // Refresh info after storage change
      refreshStorageInfo();
      refreshAvailableBackends();
    };

    const handleMigrationProgress = (event: StorageMigrationProgressEvent) => {
      setMigrationProgress(event.progress);
      setIsMigrating(event.progress < 100);
    };

    eventListenersRef.current.storageChange = handleStorageChange;
    eventListenersRef.current.migrationProgress = handleMigrationProgress;

    browserStorageService.addEventListener('storageChange', handleStorageChange);
    browserStorageService.addEventListener('migrationProgress', handleMigrationProgress);

    initializeStorage();

    // Cleanup event listeners
    return () => {
      Object.entries(eventListenersRef.current).forEach(([event, callback]) => {
        browserStorageService.removeEventListener(event as any, callback);
      });
    };
  }, [isInitialized]);

  /**
   * Switch to a different storage type
   */
  const switchStorageType = useCallback(async (newType: StorageType, migrateData: boolean = true): Promise<boolean> => {
    if (newType === currentStorageType) {
      return true;
    }

    setError(undefined);
    
    try {
      // Check if target storage is available
      const isAvailable = await browserStorageService.isStorageAvailable(newType);
      if (!isAvailable) {
        toast.showError(`${newType} storage is not available`);
        return false;
      }

      if (migrateData) {
        setIsMigrating(true);
        toast.showInfo(`Starting migration to ${newType}...`);
      }

      const success = await browserStorageService.switchStorageType(newType, migrateData);
      
      if (success) {
        const message = migrateData 
          ? `Successfully migrated to ${newType}` 
          : `Switched to ${newType}`;
        toast.showSuccess(message);
      } else {
        toast.showError(`Failed to switch to ${newType}`);
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast.showError(`Storage switch failed: ${errorMessage}`);
      return false;
    } finally {
      setIsMigrating(false);
      setMigrationProgress(0);
    }
  }, [currentStorageType, toast]);

  /**
   * Export configuration
   */
  const exportConfig = useCallback(async (): Promise<string | null> => {
    try {
      const exportData = await browserStorageService.exportConfig();
      toast.showSuccess('Configuration exported successfully');
      return exportData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      toast.showError(`Export failed: ${errorMessage}`);
      return null;
    }
  }, [toast]);

  /**
   * Import configuration
   */
  const importConfig = useCallback(async (data: string): Promise<boolean> => {
    try {
      const success = await browserStorageService.importConfig(data);
      if (success) {
        toast.showSuccess('Configuration imported successfully');
        await refreshStorageInfo();
      } else {
        toast.showError('Failed to import configuration');
      }
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast.showError(`Import failed: ${errorMessage}`);
      return false;
    }
  }, [toast, refreshStorageInfo]);

  /**
   * Clear configuration
   */
  const clearConfig = useCallback(async (): Promise<boolean> => {
    try {
      const success = await browserStorageService.clearConfig();
      if (success) {
        toast.showSuccess('Configuration cleared successfully');
        await refreshStorageInfo();
      } else {
        toast.showError('Failed to clear configuration');
      }
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clear failed';
      toast.showError(`Clear failed: ${errorMessage}`);
      return false;
    }
  }, [toast, refreshStorageInfo]);

  /**
   * Migrate storage with full control
   */
  const migrateStorage = useCallback(async (options: StorageMigrationOptions): Promise<StorageMigrationResult> => {
    setIsMigrating(true);
    setMigrationProgress(0);
    setError(undefined);

    try {
      toast.showInfo(`Starting migration from ${options.fromType} to ${options.toType}...`);
      
      const result = await browserStorageService.migrateStorage(options);
      
      if (result.success) {
        toast.showSuccess(
          `Migration completed successfully. ${result.sitesCount} sites migrated.`
        );
      } else {
        toast.showError(`Migration failed: ${result.error}`);
        setError(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      const result: StorageMigrationResult = {
        success: false,
        sitesCount: 0,
        error: errorMessage
      };
      
      toast.showError(`Migration failed: ${errorMessage}`);
      setError(errorMessage);
      return result;
    } finally {
      setIsMigrating(false);
      setMigrationProgress(0);
    }
  }, [toast]);

  /**
   * Get storage capabilities for a specific type
   */
  const getStorageCapabilities = useCallback((type: StorageType): StorageCapabilities => {
    return browserStorageService.getStorageCapabilities(type);
  }, []);

  /**
   * Check if storage type is available
   */
  const isStorageAvailable = useCallback(async (type: StorageType): Promise<boolean> => {
    return await browserStorageService.isStorageAvailable(type);
  }, []);

  return {
    // State
    currentStorageType,
    storageState,
    storageInfo,
    availableBackends,
    isLoading,
    error,

    // Actions
    switchStorageType,
    refreshStorageInfo,
    refreshAvailableBackends,

    // Storage operations
    exportConfig,
    importConfig,
    clearConfig,

    // Migration
    migrateStorage,
    migrationProgress,
    isMigrating,

    // Utils
    getStorageCapabilities,
    isStorageAvailable
  };
};