import { useState, useCallback, useRef } from 'react';
import { WorkflowState, WorkflowStep, WorkflowConfig, DatabaseMigrationStatus, MigrationExecutionHistory } from '../types';
import { api } from '../utils/api';
import { usePolling } from './usePolling';

const createInitialSteps = (config: WorkflowConfig): WorkflowStep[] => {
  const steps: WorkflowStep[] = [
    {
      id: 'check-tasks',
      title: 'Check Pending Tasks',
      description: 'Verify no other tasks are running',
      status: 'pending'
    },
    {
      id: 'check-manager',
      title: 'Check Manager Updates',
      description: 'Check if Contao Manager needs updating',
      status: 'pending'
    },
    {
      id: 'update-manager',
      title: 'Update Manager',
      description: 'Update Contao Manager to latest version',
      status: 'pending',
      conditional: true
    }
  ];

  if (config.performDryRun) {
    steps.push({
      id: 'composer-dry-run',
      title: 'Composer Dry Run',
      description: 'Test composer update without making changes',
      status: 'pending'
    });
  }

  steps.push({
    id: 'composer-update',
    title: 'Composer Update',
    description: 'Update all Composer packages',
    status: 'pending'
  });

  steps.push(
    {
      id: 'check-migrations-loop',
      title: 'Check Database Migrations',
      description: 'Check if database migrations are pending',
      status: 'pending'
    },
    {
      id: 'execute-migrations',
      title: 'Execute Database Migrations',
      description: 'Execute pending database migrations',
      status: 'pending',
      conditional: true
    },
    {
      id: 'update-versions',
      title: 'Update Version Info',
      description: 'Refresh version information',
      status: 'pending'
    }
  );

  return steps;
};

// Helper function to get current migration cycle number
const getCurrentMigrationCycle = (step: WorkflowStep): number => {
  return step.migrationHistory ? step.migrationHistory.length + 1 : 1;
};

// Helper function to add migration execution to history
const addMigrationToHistory = (
  step: WorkflowStep, 
  stepType: 'check' | 'execute', 
  data: DatabaseMigrationStatus, 
  status: 'pending' | 'active' | 'complete' | 'error',
  error?: string
): MigrationExecutionHistory => {
  const cycle = getCurrentMigrationCycle(step);
  const now = new Date();
  
  return {
    cycle,
    stepType,
    timestamp: now,
    data,
    startTime: step.startTime || now,
    endTime: status === 'complete' || status === 'error' ? now : undefined,
    status,
    error
  };
};

export const useWorkflow = () => {
  const [state, setState] = useState<WorkflowState>({
    currentStep: 0,
    steps: [],
    isRunning: false,
    isPaused: false,
    config: { performDryRun: false }
  });

  const currentStepRef = useRef<WorkflowStep | null>(null);

  // Core state management functions - defined first
  const updateState = useCallback((updater: Partial<WorkflowState> | ((prev: WorkflowState) => WorkflowState)) => {
    setState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      
      // Update current step reference
      if (newState.steps[newState.currentStep]) {
        currentStepRef.current = newState.steps[newState.currentStep];
      }
      
      return newState;
    });
  }, []);

  const updateCurrentStep = useCallback((stepUpdate: Partial<WorkflowStep>) => {
    updateState(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === prev.currentStep ? { 
          ...step, 
          ...stepUpdate,
          // Deep clone data to prevent reference sharing between steps
          data: stepUpdate.data ? JSON.parse(JSON.stringify(stepUpdate.data)) : stepUpdate.data
        } : step
      )
    }));
  }, [updateState]);

  const markCurrentStepError = useCallback((error: string) => {
    updateCurrentStep({ 
      status: 'error', 
      error, 
      endTime: new Date() 
    });
    updateState(prev => ({ 
      ...prev, 
      isRunning: false, 
      error,
      endTime: new Date()
    }));
  }, [updateCurrentStep, updateState]);

  const markCurrentStepComplete = useCallback((data?: any) => {
    updateCurrentStep({ 
      status: 'complete', 
      endTime: new Date(),
      data 
    });
  }, [updateCurrentStep]);

  const moveToNextStep = useCallback(() => {
    updateState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1
    }));
  }, [updateState]);

  // Forward declaration for recursive calls
  const executeCurrentStepRef = useRef<() => Promise<void>>(async () => {});

  // Define callback handlers with proper dependencies
  const handleTaskResult = useCallback((result: any) => {
    if (currentStepRef.current) {
      updateCurrentStep({ data: result });
      
      // Check if task is complete
      if (result.status === 'complete') {
        markCurrentStepComplete(result);
        api.deleteTaskData().then(() => {
          // Check if this was the dry-run step
          if (currentStepRef.current?.id === 'composer-dry-run') {
            // Pause workflow for user confirmation after dry-run
            moveToNextStep();
            updateState(prev => ({
              ...prev,
              isRunning: false,
              isPaused: true
            }));
          } else {
            // Continue workflow normally for other steps
            moveToNextStep();
            setTimeout(() => executeCurrentStepRef.current?.(), 100);
          }
        }).catch(error => {
          markCurrentStepError(`Failed to clean up task: ${error.message}`);
        });
      } else if (result.status === 'error') {
        markCurrentStepError(result.console || 'Task failed');
      }
    }
  }, [updateCurrentStep, markCurrentStepComplete, moveToNextStep, markCurrentStepError, updateState]);

  const handleMigrationResult = useCallback((result: DatabaseMigrationStatus) => {
    if (currentStepRef.current) {
      updateCurrentStep({ data: result });
      
      // Handle migration completion based on current step
      const currentStepId = currentStepRef.current?.id;
      
      if (result.status === 'pending') {
        if (currentStepId.startsWith('check-migrations-loop')) {
          // Checking migrations step
          if (!result.hash || result.hash === '' || result.hash === null) {
            // No migrations needed - skip all remaining migration steps and continue to next workflow step
            console.log('No migrations found, skipping execute-migrations step');
            markCurrentStepComplete(result);
            api.deleteDatabaseMigrationTask().then(() => {
              updateState(prev => {
                const currentCycle = currentStepId.includes('-') ? 
                  currentStepId.split('-').pop() : '1';
                const executeStepId = currentCycle === '1' ? 'execute-migrations' : `execute-migrations-${currentCycle}`;
                const executeStepIndex = prev.steps.findIndex(step => step.id === executeStepId);
                
                console.log(`Looking for execute step: ${executeStepId}, found at index: ${executeStepIndex}`);
                
                if (executeStepIndex !== -1) {
                  const newSteps = [...prev.steps];
                  
                  // Skip the corresponding execute step
                  newSteps[executeStepIndex] = { ...newSteps[executeStepIndex], status: 'skipped' };
                  
                  // Find next step after all migration-related steps
                  let nextStepIndex = executeStepIndex + 1;
                  
                  // Skip any additional migration cycle steps that were created
                  while (nextStepIndex < newSteps.length && 
                         (newSteps[nextStepIndex].id.startsWith('check-migrations-loop-') || 
                          newSteps[nextStepIndex].id.startsWith('execute-migrations-'))) {
                    newSteps[nextStepIndex] = { ...newSteps[nextStepIndex], status: 'skipped' };
                    nextStepIndex++;
                  }
                  
                  console.log(`Moving from step ${prev.currentStep} to step ${nextStepIndex}`);
                  
                  return {
                    ...prev,
                    currentStep: nextStepIndex,
                    steps: newSteps
                  };
                }
                
                console.log(`Execute step not found, moving to next step: ${prev.currentStep + 1}`);
                return {
                  ...prev,
                  currentStep: prev.currentStep + 1
                };
              });
              setTimeout(() => executeCurrentStepRef.current?.(), 100);
            }).catch(error => {
              markCurrentStepError(`Failed to clean up migration task: ${error.message}`);
            });
          } else {
            // Migrations needed - complete check step and wait for user confirmation
            markCurrentStepComplete(result);
            
            // Add check execution to history
            updateState(prev => {
              const checkMigrationIndex = prev.currentStep;
              if (checkMigrationIndex !== -1) {
                const newSteps = [...prev.steps];
                const checkStep = newSteps[checkMigrationIndex];
                
                const checkHistory = addMigrationToHistory(
                  checkStep,
                  'check',
                  result,
                  'complete'
                );
                
                newSteps[checkMigrationIndex] = {
                  ...checkStep,
                  migrationHistory: [...(checkStep.migrationHistory || []), checkHistory]
                };
                
                return {
                  ...prev,
                  steps: newSteps
                };
              }
              return prev;
            });
            
            api.deleteDatabaseMigrationTask().then(() => {
              // Stop here - user needs to confirm before proceeding
              updateState(prev => ({
                ...prev,
                isRunning: false,
                isPaused: true
              }));
            }).catch(error => {
              markCurrentStepError(`Failed to clean up migration task: ${error.message}`);
            });
          }
        } else if (currentStepId === 'execute-migrations') {
          // This shouldn't happen during execute-migrations, but handle gracefully
          markCurrentStepError('Unexpected pending status during migration execution');
        }
      } else if (result.status === 'complete') {
        markCurrentStepComplete(result);
        api.deleteDatabaseMigrationTask().then(() => {
          if (currentStepId.startsWith('execute-migrations')) {
            // After executing migrations, create new workflow steps for next iteration
            updateState(prev => {
              const executeStepIndex = prev.currentStep;
              const checkMigrationIndex = prev.steps.findIndex(step => step.id.startsWith('check-migrations-loop'));
              
              if (checkMigrationIndex !== -1 && executeStepIndex !== -1) {
                const newSteps = [...prev.steps];
                const executeStep = newSteps[executeStepIndex];
                
                // Add the completed execution to history
                const executionHistory = addMigrationToHistory(
                  executeStep,
                  'execute',
                  result,
                  'complete'
                );
                
                // Update execute step with history
                newSteps[executeStepIndex] = {
                  ...executeStep,
                  migrationHistory: [...(executeStep.migrationHistory || []), executionHistory]
                };
                
                // Get current cycle number for creating new steps
                const allMigrationHistory = [
                  ...(executeStep.migrationHistory || []),
                  executionHistory
                ];
                const maxCycle = Math.max(...allMigrationHistory.map(h => h.cycle), 0);
                const nextCycle = maxCycle + 1;
                
                console.log('🔄 Migration cycle creation:', {
                  executeStepId: executeStep.id,
                  allMigrationHistory,
                  maxCycle,
                  nextCycle,
                  existingSteps: newSteps.map(s => s.id)
                });
                
                // Create new check step for next iteration with clean state
                const newCheckStep: WorkflowStep = {
                  id: `check-migrations-loop-${nextCycle}`,
                  title: `Check Database Migrations (Cycle ${nextCycle})`,
                  description: `Checking for pending database migrations in cycle ${nextCycle}`,
                  status: 'pending',
                  migrationHistory: [] // Start with empty history for new cycle
                };
                
                // Create new execute step for next iteration with clean state
                const newExecuteStep: WorkflowStep = {
                  id: `execute-migrations-${nextCycle}`,
                  title: `Execute Database Migrations (Cycle ${nextCycle})`,
                  description: `Executing database migrations in cycle ${nextCycle}`,
                  status: 'pending',
                  migrationHistory: [] // Start with empty history for new cycle
                };
                
                // Always create new migration steps for each cycle
                console.log('✅ Creating new migration steps:', newCheckStep.id, newExecuteStep.id);
                newSteps.splice(executeStepIndex + 1, 0, newCheckStep, newExecuteStep);
                const nextStepIndex = executeStepIndex + 1; // Move to new check step
                
                return {
                  ...prev,
                  currentStep: nextStepIndex,
                  steps: newSteps
                };
              }
              return prev;
            });
            setTimeout(() => executeCurrentStepRef.current?.(), 100);
          } else {
            // Regular step completion - move to next step
            moveToNextStep();
            setTimeout(() => executeCurrentStepRef.current?.(), 100);
          }
        }).catch(error => {
          markCurrentStepError(`Failed to clean up migration task: ${error.message}`);
        });
      } else if (result.status === 'error') {
        markCurrentStepError('Database migration failed');
      }
    }
  }, [updateCurrentStep, markCurrentStepComplete, moveToNextStep, updateState, markCurrentStepError]);

  const handleTaskError = useCallback((error: Error) => {
    markCurrentStepError(error.message);
  }, [markCurrentStepError]);

  const handleTaskTimeout = useCallback(() => {
    markCurrentStepError('Task timeout after 10 minutes');
  }, [markCurrentStepError]);

  const handleMigrationError = useCallback((error: Error) => {
    markCurrentStepError(error.message);
  }, [markCurrentStepError]);

  const handleMigrationTimeout = useCallback(() => {
    markCurrentStepError('Migration timeout after 10 minutes');
  }, [markCurrentStepError]);

  // Polling hooks for different task types
  const taskPolling = usePolling(
    () => api.getTaskData(),
    (result) => result && result.status === 'active',
    handleTaskResult,
    {
      onError: handleTaskError,
      onTimeout: handleTaskTimeout
    }
  );

  const migrationPolling = usePolling(
    () => api.getDatabaseMigrationStatus(),
    (result: DatabaseMigrationStatus) => result.status === 'active',
    handleMigrationResult,
    {
      onError: handleMigrationError,
      onTimeout: handleMigrationTimeout
    }
  );


  const initializeWorkflow = useCallback((config: WorkflowConfig) => {
    const steps = createInitialSteps(config);
    updateState({
      currentStep: 0,
      steps,
      isRunning: false,
      isPaused: false,
      error: undefined,
      startTime: undefined,
      endTime: undefined,
      config
    });
  }, [updateState]);

  const startWorkflow = useCallback(async () => {
    updateState(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date(),
      endTime: undefined,
      error: undefined
    }));

    // Use the ref to avoid dependency issues
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [updateState]);

  const startWorkflowFromStep = useCallback((stepId: string) => {
    updateState(prev => {
      const stepIndex = prev.steps.findIndex(step => step.id === stepId);
      if (stepIndex === -1) {
        console.error(`Step ${stepId} not found`);
        return prev;
      }

      // Mark all previous steps as skipped
      const newSteps = prev.steps.map((step, index) => {
        if (index < stepIndex) {
          return { ...step, status: 'skipped' as const };
        }
        return step;
      });

      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentStep: stepIndex,
        startTime: new Date(),
        endTime: undefined,
        error: undefined,
        steps: newSteps
      };
    });
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [updateState]);

  // Define all step execution functions first
  const executeCheckTasks = useCallback(async () => {
    try {
      // Check for regular tasks first
      const taskData = await api.getTaskData();
      if (taskData && Object.keys(taskData).length > 0) {
        // Tasks are pending - this needs user interaction
        markCurrentStepError('Pending tasks found. Please resolve before continuing.');
        updateCurrentStep({ data: taskData });
        return;
      }
      
      // Also check for database migration tasks
      try {
        const migrationStatus = await api.getDatabaseMigrationStatus();
        // Check if we got actual migration data (not empty object)
        if (migrationStatus && Object.keys(migrationStatus).length > 0 && migrationStatus.status) {
          // Check if the migration task is in an active state that blocks the workflow
          if (migrationStatus.status === 'active' || migrationStatus.status === 'pending') {
            // Database migration task is blocking - needs user interaction
            markCurrentStepError('Pending database migration task found. Please resolve before continuing.');
            updateCurrentStep({ 
              data: { 
                migrationType: 'database-migration',
                migrationStatus 
              } 
            });
            return;
          }
          // If status is 'complete' or 'error', the task can be cleaned up but doesn't block
        }
        // If migrationStatus is empty {} or null, no migration task exists - continue normally
      } catch (migrationError) {
        // Log unexpected migration errors but don't fail the workflow
        console.warn('Migration status check failed:', migrationError);
      }
      
      // No pending tasks found
      markCurrentStepComplete();
      moveToNextStep();
      setTimeout(() => executeCurrentStepRef.current?.(), 100);
    } catch (error) {
      // 204 No Content means no tasks - this is what we want
      if (error instanceof Error && error.message.includes('204')) {
        markCurrentStepComplete();
        moveToNextStep();
        setTimeout(() => executeCurrentStepRef.current?.(), 100);
      } else {
        throw error;
      }
    }
  }, [markCurrentStepComplete, markCurrentStepError, moveToNextStep, updateCurrentStep]);

  const executeCheckManager = useCallback(async () => {
    const updateStatus = await api.getUpdateStatus();
    const selfUpdate = updateStatus.selfUpdate;
    
    if (!selfUpdate) {
      markCurrentStepError('Could not check manager update status');
      return;
    }

    const needsUpdate = selfUpdate.current_version !== selfUpdate.latest_version;
    markCurrentStepComplete(selfUpdate);
    
    if (!needsUpdate) {
      // Skip the manager update step
      moveToNextStep();
      updateState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'update-manager' ? { ...step, status: 'skipped' } : step
        )
      }));
    }
    
    moveToNextStep();
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [markCurrentStepComplete, markCurrentStepError, moveToNextStep, updateState]);

  const executeUpdateManager = useCallback(async () => {
    await api.setTaskData({ name: 'manager/self-update' });
    taskPolling.startPolling();
  }, [taskPolling]);

  const executeComposerDryRun = useCallback(async () => {
    await api.setTaskData({ 
      name: 'composer/update', 
      config: { dry_run: true } 
    });
    taskPolling.startPolling();
  }, [taskPolling]);

  const executeComposerUpdate = useCallback(async () => {
    await api.setTaskData({ 
      name: 'composer/update', 
      config: { dry_run: false } 
    });
    taskPolling.startPolling();
  }, [taskPolling]);

  const executeCheckMigrationsLoop = useCallback(async () => {
    // Start with dry-run to check for pending migrations
    await api.startDatabaseMigration({});
    migrationPolling.startPolling();
  }, [migrationPolling]);

  const executeExecuteMigrations = useCallback(async () => {
    // Get the stored migration hash from the corresponding check step
    const currentExecuteStep = state.steps[state.currentStep];
    
    // Extract cycle number from execute step ID
    let currentCycle = '1';
    if (currentExecuteStep?.id.startsWith('execute-migrations-')) {
      const cyclePart = currentExecuteStep.id.replace('execute-migrations-', '');
      if (cyclePart && !isNaN(Number(cyclePart))) {
        currentCycle = cyclePart;
      }
    }
    
    // Find the corresponding check step for this cycle
    const checkStepId = currentCycle === '1' ? 'check-migrations-loop' : `check-migrations-loop-${currentCycle}`;
    const checkMigrationsStep = state.steps.find(step => step.id === checkStepId);
    const migrationHash = checkMigrationsStep?.data?.hash;
    
    if (!migrationHash || migrationHash === null) {
      // No migrations to execute - this step should have been skipped but wasn't
      // Handle gracefully by marking this step as skipped and moving to next step
      console.log('No migration hash found, skipping execute-migrations step');
      updateCurrentStep({ status: 'skipped' });
      moveToNextStep();
      setTimeout(() => executeCurrentStepRef.current?.(), 100);
      return;
    }
    
    // Get withDeletes setting from the check-migrations step data
    const checkStep = state.steps.find(step => step.id.startsWith('check-migrations-loop'));
    const withDeletes = checkStep?.data?.withDeletes || false;
    
    // Run the actual migration with the hash and withDeletes option
    await api.startDatabaseMigration({ 
      hash: migrationHash,
      withDeletes: withDeletes
    });
    migrationPolling.startPolling();
  }, [migrationPolling, state.steps, state.currentStep, markCurrentStepError]);

  const executeUpdateVersions = useCallback(async () => {
    const result = await api.updateVersionInfo();
    markCurrentStepComplete(result);
    
    // Workflow complete
    updateState(prev => ({
      ...prev,
      isRunning: false,
      endTime: new Date()
    }));
  }, [markCurrentStepComplete, updateState]);

  // Create a stable reference for step execution functions
  const stepExecutorsRef = useRef({
    'check-tasks': executeCheckTasks,
    'check-manager': executeCheckManager,
    'update-manager': executeUpdateManager,
    'composer-dry-run': executeComposerDryRun,
    'composer-update': executeComposerUpdate,
    'check-migrations-loop': executeCheckMigrationsLoop,
    'execute-migrations': executeExecuteMigrations,
    'update-versions': executeUpdateVersions
  });

  // Update refs when functions change
  stepExecutorsRef.current = {
    'check-tasks': executeCheckTasks,
    'check-manager': executeCheckManager,
    'update-manager': executeUpdateManager,
    'composer-dry-run': executeComposerDryRun,
    'composer-update': executeComposerUpdate,
    'check-migrations-loop': executeCheckMigrationsLoop,
    'execute-migrations': executeExecuteMigrations,
    'update-versions': executeUpdateVersions
  };

  const executeCurrentStep = useCallback(async () => {
    const currentStep = state.steps[state.currentStep];
    if (!currentStep || !state.isRunning) return;

    updateCurrentStep({ 
      status: 'active', 
      startTime: new Date() 
    });

    try {
      // Handle dynamic step IDs by finding the base step type
      let executorKey = currentStep.id;
      
      // Map dynamic step IDs to their base executors
      if (currentStep.id.startsWith('check-migrations-loop')) {
        executorKey = 'check-migrations-loop';
      } else if (currentStep.id.startsWith('execute-migrations')) {
        executorKey = 'execute-migrations';
      }
      
      const executor = stepExecutorsRef.current[executorKey as keyof typeof stepExecutorsRef.current];
      if (executor) {
        await executor();
      } else {
        throw new Error(`Unknown step: ${currentStep.id}`);
      }
    } catch (error) {
      markCurrentStepError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [state.steps, state.currentStep, state.isRunning, updateCurrentStep, markCurrentStepError]);

  // Update ref for recursive calls
  executeCurrentStepRef.current = executeCurrentStep;

  const stopWorkflow = useCallback(() => {
    taskPolling.stopPolling();
    migrationPolling.stopPolling();
    updateState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true,
      endTime: new Date()
    }));
  }, [taskPolling, migrationPolling, updateState]);

  const resumeWorkflow = useCallback(() => {
    updateState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [updateState]);

  const clearPendingTasks = useCallback(async () => {
    try {
      // Get current step data to check what type of pending task we have
      const currentStepData = state.steps[state.currentStep]?.data;
      
      // Clear regular tasks
      try {
        await api.deleteTaskData();
      } catch (error) {
        // Ignore 400/404 errors for task deletion - means no tasks to delete
        if (!(error instanceof Error && 
              (error.message.includes('400') || error.message.includes('404')))) {
          throw error;
        }
      }
      
      // Clear database migration tasks if present
      if (currentStepData?.migrationType === 'database-migration') {
        try {
          await api.deleteDatabaseMigrationTask();
        } catch (error) {
          // If deletion fails, log but continue - the task might have completed naturally
          console.warn('Failed to delete migration task:', error);
        }
      }
      
      // Reset the check-tasks step and restart from the beginning
      updateState(prev => {
        const newSteps = [...prev.steps];
        newSteps[0] = {
          ...newSteps[0],
          status: 'pending',
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          data: undefined
        };
        return {
          ...prev,
          currentStep: 0,
          steps: newSteps,
          isRunning: true,
          error: undefined
        };
      });
      
      setTimeout(() => executeCurrentStepRef.current?.(), 100);
    } catch (error) {
      markCurrentStepError(error instanceof Error ? error.message : 'Failed to clear tasks');
    }
  }, [markCurrentStepError, updateState, state.steps, state.currentStep]);

  const confirmMigrations = useCallback((withDeletes: boolean = false) => {
    // Store withDeletes setting in the current step data for use during execution
    updateState(prev => {
      const updatedSteps = [...prev.steps];
      const currentStep = updatedSteps[prev.currentStep];
      if (currentStep) {
        currentStep.data = { ...currentStep.data, withDeletes };
      }
      return { ...prev, steps: updatedSteps };
    });
    
    // Move to the run-migrations step and resume workflow
    moveToNextStep();
    updateState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [moveToNextStep, updateState]);

  const skipMigrations = useCallback(() => {
    // Skip the current execute-migrations step and continue to next workflow step
    updateState(prev => {
      const currentStep = prev.steps[prev.currentStep];
      
      // If current step is a check step, find and skip the corresponding execute step
      if (currentStep?.id.startsWith('check-migrations-loop')) {
        // Handle both 'check-migrations-loop' (cycle 1) and 'check-migrations-loop-2', 'check-migrations-loop-3', etc.
        let executeStepId: string;
        if (currentStep.id === 'check-migrations-loop') {
          // First cycle
          executeStepId = 'execute-migrations';
        } else {
          // Extract cycle number from something like 'check-migrations-loop-2'
          const cycleMatch = currentStep.id.match(/check-migrations-loop-(\d+)$/);
          const cycle = cycleMatch ? cycleMatch[1] : '2';
          executeStepId = `execute-migrations-${cycle}`;
        }
        
        const executeStepIndex = prev.steps.findIndex(step => step.id === executeStepId);
        
        if (executeStepIndex !== -1) {
          const newSteps = [...prev.steps];
          newSteps[executeStepIndex] = { ...newSteps[executeStepIndex], status: 'skipped' };
          
          // Move to the step after the execute step (should be update-versions or next workflow step)
          let nextStepIndex = executeStepIndex + 1;
          
          // Skip any additional migration cycle steps that were created
          while (nextStepIndex < newSteps.length && 
                 (newSteps[nextStepIndex].id.startsWith('check-migrations-loop-') || 
                  newSteps[nextStepIndex].id.startsWith('execute-migrations-'))) {
            newSteps[nextStepIndex] = { ...newSteps[nextStepIndex], status: 'skipped' };
            nextStepIndex++;
          }
          
          return {
            ...prev,
            currentStep: nextStepIndex,
            steps: newSteps,
            isRunning: true,
            isPaused: false
          };
        }
      }
      
      return prev;
    });
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [updateState]);

  const skipComposerUpdate = useCallback(() => {
    // Skip the composer-update step and move to migrations
    updateState(prev => {
      const composerUpdateIndex = prev.steps.findIndex(step => step.id === 'composer-update');
      if (composerUpdateIndex !== -1) {
        const newSteps = [...prev.steps];
        newSteps[composerUpdateIndex] = { ...newSteps[composerUpdateIndex], status: 'skipped' };
        
        // Move to next step after composer-update (should be check-migrations-loop)
        return {
          ...prev,
          currentStep: composerUpdateIndex + 1,
          steps: newSteps,
          isRunning: true,
          isPaused: false
        };
      }
      return prev;
    });
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [updateState]);

  return {
    state,
    initializeWorkflow,
    startWorkflow,
    startWorkflowFromStep,
    stopWorkflow,
    resumeWorkflow,
    clearPendingTasks,
    confirmMigrations,
    skipMigrations,
    skipComposerUpdate,
    isComplete: state.currentStep >= state.steps.length && !state.isRunning,
    hasPendingMigrations: (() => {
      const currentStep = state.steps[state.currentStep];
      const result = currentStep?.id.startsWith('check-migrations-loop') &&
                     currentStep?.status === 'complete' && 
                     currentStep?.data?.hash &&
                     state.isPaused;
      
      console.log('🔍 hasPendingMigrations check:', {
        currentStepIndex: state.currentStep,
        currentStepId: currentStep?.id,
        currentStepStatus: currentStep?.status,
        hasHash: !!currentStep?.data?.hash,
        isPaused: state.isPaused,
        result
      });
      
      return result;
    })()
  };
};