import { useCallback } from 'react';
import { useWorkflowEngine } from './useWorkflowEngine';
import { BackupWorkflowConfig, createBackupWorkflow, getDefaultBackupConfig } from '../definitions/BackupWorkflowDefinition';

/**
 * Custom hook for managing backup workflow
 */
export function useBackupWorkflow(config?: BackupWorkflowConfig) {
  const workflowConfig = config || getDefaultBackupConfig();
  const initialItems = createBackupWorkflow(workflowConfig);

  const workflowEngine = useWorkflowEngine(initialItems);

  const initialize = useCallback((newConfig?: BackupWorkflowConfig) => {
    const finalConfig = newConfig || workflowConfig;
    const items = createBackupWorkflow(finalConfig);

    workflowEngine.reset();
    workflowEngine.addItems(items);
  }, [workflowEngine, workflowConfig]);

  return {
    ...workflowEngine,
    initialize,
    config: workflowConfig
  };
}
