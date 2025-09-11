import { useMemo } from 'react';
import { StorageCapabilities } from '../types/storage';
import { useStorageType } from './useStorageType';

export interface UseStorageCapabilitiesResult {
  // Current storage capabilities
  capabilities: StorageCapabilities;
  
  // Quick capability checks
  supportsLogs: boolean;
  supportsHistory: boolean;
  supportsSnapshots: boolean;
  
  // Tab visibility flags
  showLogsTab: boolean;
  showHistoryTab: boolean;
  showSnapshotsTab: boolean;
  
  // Helper methods
  isCapabilitySupported: (capability: keyof StorageCapabilities) => boolean;
  getUnsupportedFeatures: () => string[];
}

/**
 * Custom hook for checking storage capabilities and determining feature availability
 * Provides an easy way to check what features are supported by the current storage backend
 */
export const useStorageCapabilities = (): UseStorageCapabilitiesResult => {
  const { currentStorageType, getStorageCapabilities } = useStorageType();

  // Get capabilities for current storage type
  const capabilities = useMemo(() => {
    return getStorageCapabilities(currentStorageType);
  }, [currentStorageType, getStorageCapabilities]);

  // Quick capability checks
  const supportsLogs = capabilities.supportsLogs;
  const supportsHistory = capabilities.supportsHistory;
  const supportsSnapshots = capabilities.supportsSnapshots;

  // Tab visibility flags - these control whether tabs should be shown
  const showLogsTab = supportsLogs;
  const showHistoryTab = supportsHistory;
  const showSnapshotsTab = supportsSnapshots;

  // Helper to check if a specific capability is supported
  const isCapabilitySupported = (capability: keyof StorageCapabilities): boolean => {
    return Boolean(capabilities[capability]);
  };

  // Helper to get list of unsupported features for user messaging
  const getUnsupportedFeatures = (): string[] => {
    const unsupported: string[] = [];
    
    if (!supportsLogs) unsupported.push('Logs');
    if (!supportsHistory) unsupported.push('History');
    if (!supportsSnapshots) unsupported.push('Snapshots');
    
    return unsupported;
  };

  return {
    capabilities,
    supportsLogs,
    supportsHistory,
    supportsSnapshots,
    showLogsTab,
    showHistoryTab,
    showSnapshotsTab,
    isCapabilitySupported,
    getUnsupportedFeatures
  };
};