import { useCallback } from 'react';
import { useWorkflowEngine } from './useWorkflowEngine';
import { createRestoreWorkflow, getDefaultRestoreConfig, RestoreWorkflowConfig } from '../definitions/RestoreWorkflowDefinition';

/**
 * React hook for managing the restore workflow specifically
 */
export function useRestoreWorkflow(config?: RestoreWorkflowConfig) {
  const workflowConfig = config || getDefaultRestoreConfig();
  const initialItems = createRestoreWorkflow(workflowConfig);

  const workflowEngine = useWorkflowEngine(initialItems);

  const initialize = useCallback((newConfig?: RestoreWorkflowConfig) => {
    const finalConfig = newConfig || workflowConfig;
    const items = createRestoreWorkflow(finalConfig);

    workflowEngine.reset();
    workflowEngine.addItems(items);
  }, [workflowEngine, workflowConfig]);

  return {
    ...workflowEngine,
    initialize,
    config: workflowConfig
  };
}
