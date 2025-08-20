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
    
    // For multiple migration cycles scenario, simulate having more migrations
    if (state.scenarios?.multipleMigrationCycles) {
      // Reduce pending migrations to simulate progress
      if (state.pendingMigrations.length > 0) {
        state.pendingMigrations.splice(0, 1); // Remove first migration as "completed"
      }
    }

    res.status(200).json({ deleted: true });
  },

  // Reset migration cycle counter (used by scenario loading)
  resetMigrationCycles: () => {
    globalCycleCounter = 1;
  }
};

function generateMigrationHash(): string {
  return uuidv4().substring(0, 8);
}

// Global counter to simulate proper migration cycles
let globalCycleCounter = 1;

function generateMigrationOperations(pendingMigrations: MigrationOperation[], withDeletes: boolean = false): MigrationOperation[] {
  // If there are predefined pending migrations, use those
  if (pendingMigrations.length > 0) {
    return pendingMigrations.map(migration => ({
      ...migration,
      status: 'pending'
    }));
  }

  // Generate different operations based on cycle (simulate progressive migrations)
  const cycleNumber = globalCycleCounter;
  globalCycleCounter++; // Increment for next call
  
  let operations: MigrationOperation[] = [];
  
  if (cycleNumber === 1) {
    operations = [
      {
        name: 'CREATE TABLE tl_cycle1_table',
        status: 'pending',
        message: 'Cycle 1: Creating initial table'
      },
      {
        name: 'ALTER TABLE tl_content ADD COLUMN cycle1_field INT',
        status: 'pending', 
        message: 'Cycle 1: Adding cycle 1 field'
      }
    ];
  } else if (cycleNumber === 2) {
    operations = [
      {
        name: 'CREATE INDEX idx_cycle2 ON tl_cycle1_table (id)',
        status: 'pending',
        message: 'Cycle 2: Creating index for cycle 1 table'
      },
      {
        name: 'ALTER TABLE tl_content ADD COLUMN cycle2_field VARCHAR(255)',
        status: 'pending', 
        message: 'Cycle 2: Adding cycle 2 field'
      },
      {
        name: 'INSERT INTO tl_version VALUES (2)',
        status: 'pending',
        message: 'Cycle 2: Recording version 2'
      }
    ];
  } else if (cycleNumber === 3) {
    operations = [
      {
        name: 'CREATE TABLE tl_cycle3_settings',
        status: 'pending',
        message: 'Cycle 3: Creating settings table'
      },
      {
        name: 'UPDATE tl_content SET cycle1_field = 1 WHERE cycle1_field IS NULL',
        status: 'pending',
        message: 'Cycle 3: Populating cycle 1 field defaults'
      }
    ];
  } else {
    // After cycle 3, no more migrations
    return [];
  }

  if (withDeletes) {
    operations.push({
      name: `DROP TABLE tl_temp_cycle${cycleNumber}`,
      status: 'pending',
      message: `Cycle ${cycleNumber}: Removing temporary table`
    });
  }

  return operations;
}