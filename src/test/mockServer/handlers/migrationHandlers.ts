import { Request, Response } from 'express';
import { MockState, MigrationData, MigrationOperation } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const migrationHandlers = {
  getMigration: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (!state.currentMigration) {
      return res.status(204).send();
    }

    // Add network latency if configured
    const latency = state.scenarios?.networkLatency || 0;
    if (latency > 0) {
      setTimeout(() => {
        if (!res.headersSent) {
          res.json(state.currentMigration);
        }
      }, latency);
    } else {
      res.json(state.currentMigration);
    }
  },

  putMigration: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { hash, type, withDeletes } = req.body;

    if (state.currentMigration && state.currentMigration.status === 'active') {
      return res.status(400).json({
        title: 'Migration already running',
        detail: 'Another migration task is already in progress'
      });
    }

    // If no hash is provided, this is a dry-run check
    if (!hash) {
      const hasPendingMigrations = state.pendingMigrations.length > 0;
      
      if (!hasPendingMigrations) {
        // No migrations needed - return empty migration data
        state.currentMigration = {
          type: type || 'schema',
          status: 'pending',
          operations: []
        };
      } else {
        // Create migration check task with pending operations
        const migrationHash = generateMigrationHash();
        const operations = generateMigrationOperations(state.pendingMigrations, withDeletes);
        
        state.currentMigration = {
          type: type || 'schema', 
          status: 'pending',
          hash: migrationHash,
          operations
        };
      }

      return res.status(201).json(state.currentMigration);
    }

    // Execute migration with provided hash
    const operations = generateMigrationOperations(state.pendingMigrations, withDeletes);
    state.currentMigration = {
      type: type || 'schema',
      status: 'active',
      hash,
      operations: operations.map(op => ({...op, status: 'active'}))
    };

    // Start migration simulation using setTimeout directly
    const duration = 1500;
    setTimeout(() => {
      if (state.currentMigration && state.currentMigration.hash === hash) {
        // Check if migration should fail
        if (state.scenarios?.migrationFailures) {
          state.currentMigration.status = 'error';
          state.currentMigration.operations = state.currentMigration.operations?.map(op => ({
            ...op,
            status: 'error',
            message: 'Migration failed'
          }));
        } else {
          state.currentMigration.status = 'complete';
          state.currentMigration.operations = state.currentMigration.operations?.map(op => ({
            ...op,
            status: 'complete',
            message: 'Migration completed'
          }));
        }
      }
    }, duration);

    res.status(201).json(state.currentMigration);
  },

  deleteMigration: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (!state.currentMigration) {
      return res.status(400).json({
        title: 'No migration to delete',
        detail: 'No migration task exists'
      });
    }

    if (state.currentMigration.status === 'active') {
      return res.status(400).json({
        title: 'Cannot delete active migration',
        detail: 'Migration is still running'
      });
    }

    // Move to history and clear current
    if (state.currentMigration) {
      state.migrationHistory.push({...state.currentMigration});
      state.currentMigration = null;
    }

    res.status(200).json({ deleted: true });
  }
};

function generateMigrationHash(): string {
  return uuidv4().substring(0, 8);
}

function generateMigrationOperations(pendingMigrations: MigrationOperation[], withDeletes: boolean = false): MigrationOperation[] {
  // If there are predefined pending migrations, use those
  if (pendingMigrations.length > 0) {
    return pendingMigrations.map(migration => ({
      ...migration,
      status: 'pending'
    }));
  }

  // Generate sample migration operations
  const operations: MigrationOperation[] = [
    {
      name: 'CREATE TABLE tl_test_table',
      status: 'pending',
      message: 'Creating new table for test functionality'
    },
    {
      name: 'ALTER TABLE tl_content ADD COLUMN test_field',
      status: 'pending', 
      message: 'Adding test field to content table'
    },
    {
      name: 'INSERT INTO tl_version',
      status: 'pending',
      message: 'Recording schema version'
    }
  ];

  if (withDeletes) {
    operations.push({
      name: 'DROP TABLE tl_old_table',
      status: 'pending',
      message: 'Removing deprecated table'
    });
  }

  return operations;
}