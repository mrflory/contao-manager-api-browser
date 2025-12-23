// Test the getResumeActionDescription function logic
describe('getResumeActionDescription', () => {
  // Mock timeline items with different IDs
  const createMockTimelineItem = (id: string, title: string) => ({
    id,
    title,
    description: `Description for ${title}`,
    status: 'pending' as const,
    execute: jest.fn(),
    canSkip: jest.fn(() => false),
    canRetry: jest.fn(() => false)
  });

  // Extract and test the getResumeActionDescription function logic
  const getResumeActionDescription = (mockWorkflow: any): string => {
    // If no engine or not paused, return default
    if (!mockWorkflow.engine || !mockWorkflow.isPaused) {
      return 'Resume Workflow';
    }

    // Get the next item that will be executed
    const timeline = mockWorkflow.engine.getTimeline();
    const currentIndex = mockWorkflow.currentIndex;

    // If we're at the end of the timeline, return default
    if (currentIndex >= timeline.length) {
      return 'Resume Workflow';
    }

    const currentItem = timeline[currentIndex];

    // If the current item is complete or waiting for user action, the next item to execute is currentIndex + 1
    // This happens when a step completes and requires user confirmation before continuing
    const nextIndexToExecute = (currentItem.status === 'complete' || currentItem.status === 'user_action_required')
      ? currentIndex + 1
      : currentIndex;

    // If the next index is beyond the timeline, return default
    if (nextIndexToExecute >= timeline.length) {
      return 'Resume Workflow';
    }

    const nextItem = timeline[nextIndexToExecute];
    
    // Map timeline item IDs to user-friendly action descriptions
    const actionMap: Record<string, string> = {
      'check-tasks': 'Continue checking pending tasks',
      'check-manager': 'Continue checking manager updates',
      'update-manager': 'Continue with manager update',
      'composer-dry-run': 'Continue with composer dry-run',
      'composer-update': 'Continue with composer update',
      'check-migrations-loop': 'Continue checking database migrations',
      'execute-migrations': 'Continue with database migrations',
      'update-versions': 'Continue updating version information',
    };

    // Handle migration cycles (e.g., check-migrations-loop-2, check-migrations-loop-3)
    if (nextItem.id.startsWith('check-migrations-loop-')) {
      return 'Continue checking database migrations';
    }
    if (nextItem.id.startsWith('execute-migrations-')) {
      return 'Continue with database migrations';
    }

    // Return specific action description or fall back to the item title
    return actionMap[nextItem.id] || `Continue with ${nextItem.title.toLowerCase()}`;
  };

  it('returns default text when workflow is not paused', () => {
    const mockWorkflow = {
      engine: {
        getTimeline: () => []
      },
      isPaused: false,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Resume Workflow');
  });

  it('returns default text when no engine is available', () => {
    const mockWorkflow = {
      engine: null,
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Resume Workflow');
  });

  it('returns specific description for composer dry-run', () => {
    const timeline = [createMockTimelineItem('composer-dry-run', 'Composer Dry Run')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with composer dry-run');
  });

  it('returns specific description for composer update', () => {
    const timeline = [createMockTimelineItem('composer-update', 'Composer Update')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with composer update');
  });

  it('returns specific description for database migrations', () => {
    const timeline = [createMockTimelineItem('check-migrations-loop', 'Check Database Migrations')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue checking database migrations');
  });

  it('returns specific description for migration cycles', () => {
    const timeline = [createMockTimelineItem('check-migrations-loop-2', 'Check Database Migrations (Cycle 2)')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue checking database migrations');
  });

  it('returns specific description for execute migrations', () => {
    const timeline = [createMockTimelineItem('execute-migrations', 'Execute Database Migrations')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with database migrations');
  });

  it('returns specific description for execute migrations with cycle', () => {
    const timeline = [createMockTimelineItem('execute-migrations-2', 'Execute Database Migrations (Cycle 2)')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with database migrations');
  });

  it('returns specific description for manager update', () => {
    const timeline = [createMockTimelineItem('update-manager', 'Update Manager')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with manager update');
  });

  it('returns specific description for checking tasks', () => {
    const timeline = [createMockTimelineItem('check-tasks', 'Check Pending Tasks')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue checking pending tasks');
  });

  it('returns specific description for checking manager', () => {
    const timeline = [createMockTimelineItem('check-manager', 'Check Manager Updates')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue checking manager updates');
  });

  it('returns specific description for updating versions', () => {
    const timeline = [createMockTimelineItem('update-versions', 'Update Version Information')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue updating version information');
  });

  it('falls back to item title for unknown items', () => {
    const timeline = [createMockTimelineItem('unknown-item', 'Custom Timeline Item')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with custom timeline item');
  });

  it('handles workflow at end of timeline', () => {
    const timeline = [createMockTimelineItem('composer-update', 'Composer Update')];
    
    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 1 // Beyond the timeline length
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Resume Workflow');
  });

  it('handles empty timeline', () => {
    const mockWorkflow = {
      engine: {
        getTimeline: () => []
      },
      isPaused: true,
      currentIndex: 0
    };

    expect(getResumeActionDescription(mockWorkflow)).toBe('Resume Workflow');
  });

  it('shows next step when current step is complete', () => {
    // Simulate the bug scenario: dry-run is complete, should show "Continue with composer update"
    const timeline = [
      { ...createMockTimelineItem('composer-dry-run', 'Composer Dry Run'), status: 'complete' as const },
      createMockTimelineItem('composer-update', 'Composer Update')
    ];

    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0 // Still pointing at dry-run (which is complete)
    };

    // Should show the NEXT step (composer-update), not the current complete step
    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with composer update');
  });

  it('shows next step when current step requires user action', () => {
    // Simulate user action required: dry-run requires action, should show "Continue with composer update"
    const timeline = [
      { ...createMockTimelineItem('composer-dry-run', 'Composer Dry Run'), status: 'user_action_required' as const },
      createMockTimelineItem('composer-update', 'Composer Update')
    ];

    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0 // Still pointing at dry-run (which requires user action)
    };

    // Should show the NEXT step (composer-update), not the current step requiring action
    expect(getResumeActionDescription(mockWorkflow)).toBe('Continue with composer update');
  });

  it('returns default when next step after complete is beyond timeline', () => {
    const timeline = [
      { ...createMockTimelineItem('composer-update', 'Composer Update'), status: 'complete' as const }
    ];

    const mockWorkflow = {
      engine: {
        getTimeline: () => timeline
      },
      isPaused: true,
      currentIndex: 0 // At last item which is complete
    };

    // Next step would be index 1, which is beyond the timeline
    expect(getResumeActionDescription(mockWorkflow)).toBe('Resume Workflow');
  });
});