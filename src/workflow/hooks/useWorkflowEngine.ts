import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { TimelineItem } from '../engine/types';

/**
 * React hook for managing workflow engine state
 */
export function useWorkflowEngine(initialItems?: TimelineItem[]) {
  const engineRef = useRef<WorkflowEngine | null>(null);
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  
  // Initialize engine
  useEffect(() => {
    const workflowEngine = new WorkflowEngine();
    engineRef.current = workflowEngine;
    setEngine(workflowEngine);
    
    if (initialItems) {
      workflowEngine.addItems(initialItems);
    }
    
    // Set up event listeners
    const handleStarted = () => {
      setIsRunning(true);
      setIsPaused(false);
      setIsComplete(false);
      setError(undefined);
    };
    
    const handlePaused = () => {
      setIsRunning(false);
      setIsPaused(true);
    };
    
    const handleResumed = () => {
      setIsRunning(true);
      setIsPaused(false);
    };
    
    const handleStopped = () => {
      setIsRunning(false);
      setIsPaused(false);
    };

    const handleCancelled = () => {
      setIsRunning(false);
      setIsPaused(false);
    };
    
    const handleCompleted = () => {
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(true);
    };
    
    const handleItemError = (_item: any, error: string) => {
      setError(error);
    };
    
    const updateProgress = () => {
      if (workflowEngine) {
        const newIndex = workflowEngine.getCurrentIndex();
        const newProgress = workflowEngine.getProgress();
        const newHistory = [...workflowEngine.getExecutionHistory()];
        
        setCurrentIndex(newIndex);
        setProgress(newProgress);
        setExecutionHistory(newHistory);
      }
    };
    
    // Register event handlers
    workflowEngine.on('started', handleStarted);
    workflowEngine.on('paused', handlePaused);
    workflowEngine.on('resumed', handleResumed);
    workflowEngine.on('stopped', handleStopped);
    workflowEngine.on('cancelled', handleCancelled);
    workflowEngine.on('completed', handleCompleted);
    workflowEngine.on('item_error', handleItemError);
    workflowEngine.on('item_started', updateProgress);
    workflowEngine.on('item_completed', updateProgress);
    workflowEngine.on('item_progress', updateProgress);
    workflowEngine.on('user_action_required', updateProgress);
    
    // Cleanup
    return () => {
      workflowEngine.off('started', handleStarted);
      workflowEngine.off('paused', handlePaused);
      workflowEngine.off('resumed', handleResumed);
      workflowEngine.off('stopped', handleStopped);
      workflowEngine.off('cancelled', handleCancelled);
      workflowEngine.off('completed', handleCompleted);
      workflowEngine.off('item_error', handleItemError);
      workflowEngine.off('item_started', updateProgress);
      workflowEngine.off('item_completed', updateProgress);
      workflowEngine.off('item_progress', updateProgress);
      workflowEngine.off('user_action_required', updateProgress);
    };
  }, []);
  
  // Methods
  const start = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.start();
    }
  }, []);
  
  const startFromStep = useCallback(async (stepIndex: number) => {
    if (engineRef.current) {
      await engineRef.current.startFromStep(stepIndex);
    }
  }, []);
  
  const pause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);
  
  const resume = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.resume();
    }
  }, []);
  
  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
  }, []);

  const cancel = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.cancel();
    }
  }, []);
  
  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setEngine(engineRef.current); // Force re-render
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(false);
      setError(undefined);
      setCurrentIndex(0);
      setProgress(0);
      setExecutionHistory([]);
    }
  }, []);
  
  const addItems = useCallback((items: TimelineItem[]) => {
    if (engineRef.current) {
      engineRef.current.addItems(items);
      setEngine(engineRef.current); // Force re-render by setting reference again
    }
  }, []);
  
  const getEngine = useCallback(() => {
    return engineRef.current;
  }, []);
  
  return {
    engine,
    isRunning,
    isPaused,
    isComplete,
    error,
    currentIndex,
    progress,
    executionHistory,
    start,
    startFromStep,
    pause,
    resume,
    stop,
    cancel,
    reset,
    addItems,
    getEngine
  };
}