import { Request, Response } from 'express';
import { MockState, TaskData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { realResponseData } from '../realResponseData';

export const taskHandlers = {
  getTask: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (!state.currentTask) {
      return res.status(204).send();
    }

    // Add some network latency if configured
    const latency = state.scenarios?.networkLatency || 0;
    if (latency > 0) {
      setTimeout(() => {
        if (!res.headersSent) {
          res.json(state.currentTask);
        }
      }, latency);
    } else {
      res.json(state.currentTask);
    }
  },

  putTask: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { name, config } = req.body;

    if (state.currentTask && state.currentTask.status === 'active') {
      return res.status(400).json({
        title: 'Task already running',
        detail: 'Another task is already in progress'
      });
    }

    // Create new task
    const taskId = uuidv4();
    const task: TaskData = {
      id: taskId,
      title: getTaskTitle(name),
      status: 'active',
      console: `Starting ${name}...`,
      cancellable: true,
      autoclose: false,
      audit: false,
      operations: getTaskOperations(name, config)
    };

    state.currentTask = task;

    // Start task simulation using setTimeout directly
    const duration = config?.dry_run ? 1000 : 3000; // Dry runs are faster
    
    setTimeout(() => {
      if (state.currentTask && state.currentTask.id === taskId) {
        // Check if task should fail based on scenario
        if (state.scenarios?.taskFailures?.[name]) {
          state.currentTask.status = 'error';
          state.currentTask.console = state.scenarios.taskFailures[name];
          if (state.currentTask.operations) {
            // Mark first operation as error
            state.currentTask.operations[0].status = 'error';
          }
        } else {
          state.currentTask.status = 'complete';
          // Use realistic console completion output
          if (name === 'composer/update') {
            state.currentTask.console = realResponseData.taskOperations.composerUpdate.console;
          } else if (name === 'composer/install') {
            state.currentTask.console = realResponseData.taskOperations.composerInstall.console;
          } else if (name === 'contao/migrate') {
            state.currentTask.console = realResponseData.taskOperations.contaoMigrate.console;
          } else {
            state.currentTask.console += `\n${name} completed successfully`;
          }
          
          // Mark all operations as complete
          if (state.currentTask.operations) {
            state.currentTask.operations.forEach(op => {
              op.status = 'complete';
            });
          }
        }
      }
    }, duration);

    res.status(200).json(task);
  },

  patchTask: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { status } = req.body;

    if (!state.currentTask) {
      return res.status(400).json({
        title: 'No active task',
        detail: 'No task is currently running'
      });
    }

    if (status === 'aborting') {
      state.currentTask.status = 'aborting';
      setTimeout(() => {
        if (state.currentTask) {
          state.currentTask.status = 'stopped';
          state.currentTask.console += '\\nTask aborted by user';
        }
      }, 500);
    }

    res.json(state.currentTask);
  },

  deleteTask: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (!state.currentTask) {
      return res.status(400).json({
        title: 'No task to delete',
        detail: 'No task data exists'
      });
    }

    if (state.currentTask.status === 'active') {
      return res.status(400).json({
        title: 'Cannot delete active task',
        detail: 'Task is still running'
      });
    }

    // Move current task to history
    if (state.currentTask) {
      state.taskHistory.push({...state.currentTask});
      state.currentTask = null;
    }

    res.status(200).json({ deleted: true });
  }
};

function getTaskTitle(taskName: string): string {
  const taskTitles: Record<string, string> = {
    'composer/update': 'Composer Update',
    'composer/install': 'Composer Install',
    'composer/clear-cache': 'Clear Composer Cache',
    'composer/dump-autoload': 'Dump Autoload',
    'manager/self-update': 'Manager Self Update',
    'contao/rebuild-cache': 'Rebuild Cache',
    'contao/backup-create': 'Create Backup',
    'contao/backup-restore': 'Restore Backup'
  };
  return taskTitles[taskName] || taskName;
}

function getTaskOperations(taskName: string, config: any) {
  const operations = [];
  
  if (taskName === 'composer/update') {
    operations.push({
      summary: realResponseData.taskOperations.composerUpdate.summary,
      details: realResponseData.taskOperations.composerUpdate.details,
      console: realResponseData.taskOperations.composerUpdate.console,
      status: config?.dry_run ? 'complete' : 'pending'
    });
  } else if (taskName === 'composer/install') {
    operations.push({
      summary: realResponseData.taskOperations.composerInstall.summary,
      details: realResponseData.taskOperations.composerInstall.details,
      console: realResponseData.taskOperations.composerInstall.console,
      status: 'pending'
    });
  } else if (taskName === 'contao/migrate') {
    operations.push({
      summary: realResponseData.taskOperations.contaoMigrate.summary,
      details: realResponseData.taskOperations.contaoMigrate.details,
      console: realResponseData.taskOperations.contaoMigrate.console,
      status: 'pending'
    });
  } else if (taskName === 'manager/self-update') {
    operations.push({
      summary: 'Downloading manager update',
      details: 'Fetching latest manager version from GitHub',
      console: 'Downloading contao-manager.phar.php from GitHub releases...\nValidating checksum...\nInstalling new version...',
      status: 'pending'
    });
  } else if (taskName === 'contao/backup-create') {
    operations.push({
      summary: 'Creating database backup',
      details: 'Dumping database to backup file',
      console: 'mysqldump --single-transaction --routines --triggers contao_db > backup_2024-06-18_17-30-45.sql\nBackup created successfully (15.7 MB)',
      status: 'pending'
    });
  } else if (taskName === 'contao/rebuild-cache') {
    operations.push({
      summary: 'Clearing Symfony cache',
      details: 'Removing cache files and warming up',
      console: 'bin/console cache:clear --env=prod\nCache cleared successfully\nbin/console cache:warmup --env=prod\nCache warmed up successfully',
      status: 'pending'
    });
  }

  return operations;
}

// Add uuid dependency - we'll need to install this
export function generateTaskId(): string {
  return Math.random().toString(36).substr(2, 9);
}