import { useState, useCallback, useRef } from 'react';
import { WorkflowState, WorkflowStep, WorkflowConfig, DatabaseMigrationStatus } from '../types';
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

  steps.push(
    {
      id: 'composer-update',
      title: 'Composer Update',
      description: 'Update all Composer packages',
      status: 'pending'
    },
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
        index === prev.currentStep ? { ...step, ...stepUpdate } : step
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
  const executeCurrentStepRef = useRef<() => Promise<void>>();

  // Define callback handlers with proper dependencies
  const handleTaskResult = useCallback((result: any) => {
    if (currentStepRef.current) {
      updateCurrentStep({ data: result });
      
      // Check if task is complete
      if (result.status === 'complete') {
        markCurrentStepComplete(result);
        api.deleteTaskData().then(() => {
          moveToNextStep();
          setTimeout(() => executeCurrentStepRef.current?.(), 100);
        }).catch(error => {
          markCurrentStepError(`Failed to clean up task: ${error.message}`);
        });
      } else if (result.status === 'error') {
        markCurrentStepError(result.console || 'Task failed');
      }
    }
  }, [updateCurrentStep, markCurrentStepComplete, moveToNextStep, markCurrentStepError]);

  const handleMigrationResult = useCallback((result: DatabaseMigrationStatus) => {
    if (currentStepRef.current) {
      updateCurrentStep({ data: result });
      
      // Handle migration completion based on current step
      const currentStepId = currentStepRef.current?.id;
      
      if (result.status === 'pending') {
        if (currentStepId === 'check-migrations-loop') {
          // Checking migrations step
          if (!result.hash || result.hash === '') {
            // No migrations needed - skip the execute-migrations step and continue to next workflow step
            markCurrentStepComplete(result);
            api.deleteDatabaseMigrationTask().then(() => {
              moveToNextStep();
              // Skip the execute-migrations step
              updateState(prev => ({
                ...prev,
                currentStep: prev.currentStep + 1,
                steps: prev.steps.map(step => 
                  step.id === 'execute-migrations' ? { ...step, status: 'skipped' } : step
                )
              }));
              setTimeout(() => executeCurrentStepRef.current?.(), 100);
            }).catch(error => {
              markCurrentStepError(`Failed to clean up migration task: ${error.message}`);
            });
          } else {
            // Migrations needed - complete check step and wait for user confirmation
            markCurrentStepComplete(result);
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
          if (currentStepId === 'execute-migrations') {
            // After executing migrations, loop back to check for more migrations
            // Find the check-migrations-loop step and reset it to pending
            updateState(prev => {
              const checkMigrationIndex = prev.steps.findIndex(step => step.id === 'check-migrations-loop');
              if (checkMigrationIndex !== -1) {
                const newSteps = [...prev.steps];
                newSteps[checkMigrationIndex] = {
                  ...newSteps[checkMigrationIndex],
                  status: 'pending',
                  startTime: undefined,
                  endTime: undefined,
                  error: undefined,
                  data: undefined
                };
                return {
                  ...prev,
                  currentStep: checkMigrationIndex,
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

  // Define all step execution functions first
  const executeCheckTasks = useCallback(async () => {
    try {
      const taskData = await api.getTaskData();
      if (taskData && Object.keys(taskData).length > 0) {
        // Tasks are pending - this needs user interaction
        markCurrentStepError('Pending tasks found. Please resolve before continuing.');
        updateCurrentStep({ data: taskData });
        return;
      }
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
    // Get the stored migration hash from the previous step
    const checkMigrationsStep = state.steps.find(step => step.id === 'check-migrations-loop');
    const migrationHash = checkMigrationsStep?.data?.hash;
    
    if (!migrationHash) {
      markCurrentStepError('No migration hash found from previous step');
      return;
    }
    
    // Get withDeletes setting from workflow config
    const withDeletes = state.config.withDeletes || false;
    
    // Run the actual migration with the hash and withDeletes option
    await api.startDatabaseMigration({ 
      hash: migrationHash,
      withDeletes: withDeletes
    });
    migrationPolling.startPolling();
  }, [migrationPolling, state.steps, state.config.withDeletes, markCurrentStepError]);

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
      const executor = stepExecutorsRef.current[currentStep.id as keyof typeof stepExecutorsRef.current];
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
      await api.deleteTaskData();
      markCurrentStepComplete();
      moveToNextStep();
      setTimeout(() => executeCurrentStepRef.current?.(), 100);
    } catch (error) {
      markCurrentStepError(error instanceof Error ? error.message : 'Failed to clear tasks');
    }
  }, [markCurrentStepComplete, markCurrentStepError, moveToNextStep]);

  const confirmMigrations = useCallback(() => {
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
    // Skip the execute-migrations step and continue to next workflow step
    moveToNextStep();
    updateState(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === 'execute-migrations' ? { ...step, status: 'skipped' } : step
      ),
      isRunning: true,
      isPaused: false
    }));
    setTimeout(() => executeCurrentStepRef.current?.(), 100);
  }, [moveToNextStep, updateState]);

  return {
    state,
    initializeWorkflow,
    startWorkflow,
    stopWorkflow,
    resumeWorkflow,
    clearPendingTasks,
    confirmMigrations,
    skipMigrations,
    isComplete: state.currentStep >= state.steps.length && !state.isRunning,
    hasPendingMigrations: state.steps.find(step => step.id === 'check-migrations-loop')?.status === 'complete' && 
                         state.steps.find(step => step.id === 'check-migrations-loop')?.data?.hash &&
                         state.isPaused
  };
};