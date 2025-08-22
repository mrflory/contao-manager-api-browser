import { useCallback } from 'react';
import { useWorkflowEngine } from './useWorkflowEngine';
import { createUpdateWorkflow, getDefaultWorkflowConfig } from '../definitions/UpdateWorkflowDefinition';
import { WorkflowConfig } from '../engine/types';

/**
 * React hook for managing the update workflow specifically
 */
export function useUpdateWorkflow(config?: WorkflowConfig) {
  const workflowConfig = config || getDefaultWorkflowConfig();
  const initialItems = createUpdateWorkflow(workflowConfig);
  
  const workflowEngine = useWorkflowEngine(initialItems);
  
  const initialize = useCallback((newConfig?: WorkflowConfig) => {
    const finalConfig = newConfig || workflowConfig;
    const items = createUpdateWorkflow(finalConfig);
    
    workflowEngine.reset();
    workflowEngine.addItems(items);
  }, [workflowEngine, workflowConfig]);
  
  return {
    ...workflowEngine,
    initialize,
    config: workflowConfig
  };
}