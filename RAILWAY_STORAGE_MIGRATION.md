# Railway Storage Migration Plan

## Problem Statement

On Railway (production), history and log files stored in the `data/` directory are randomly disappearing. This occurs because Railway uses **ephemeral storage** - any files written to the local filesystem are lost when:

- Containers restart or redeploy
- Scaling events occur
- Platform maintenance happens

## Current Architecture (Hybrid Storage)

The application currently has a hybrid storage architecture:

- ✅ **Site Configurations**: Can use PostgreSQL via `DatabaseStorage` (Phase 1 - Complete)
- ❌ **History Files**: Stored in `data/history/` via `JsonFileStorage` (ephemeral)
- ❌ **Log Files**: Stored in `data/logs/` via `JsonFileStorage` (ephemeral)
- ❌ **Snapshot Files**: Stored in `data/snapshots/` via `JsonFileStorage` (ephemeral)

## Solution: Migrate Logs and History to PostgreSQL

Extend the Phase 1 database implementation to include persistent storage for logs, history, and snapshots.

---

## Migration Plan - Phase 2: Persistent Logs & History

### Step 1: Update Database Schema

**File**: `prisma/schema.prisma`

Add three new models to support logs, history, and snapshots:

```prisma
// Workflow execution history
model WorkflowHistory {
  id           String   @id @default(cuid())
  userId       String
  siteId       String
  workflowType String
  status       String   // started, completed, failed, paused
  startTime    DateTime
  endTime      DateTime?
  steps        Json     // Array of workflow steps with detailed execution info
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relationships
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  site         Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)

  // Indexes for efficient queries
  @@index([userId, siteId])
  @@index([status])
  @@index([createdAt])
  @@index([workflowType])
  @@map("workflow_history")
}

// API call logs (detailed request/response logging)
model ApiLog {
  id           String   @id @default(cuid())
  userId       String
  siteId       String?
  method       String   // GET, POST, PUT, DELETE
  endpoint     String   // API endpoint path
  statusCode   Int      // HTTP status code
  requestData  Json?    // Request payload
  responseData Json?    // Response payload (may be excluded for large responses)
  error        String?  // Error message if request failed
  duration     Int?     // Request duration in milliseconds
  timestamp    DateTime @default(now())

  // Relationships
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  site         Site?    @relation(fields: [siteId], references: [id], onDelete: SetNull)

  // Indexes for efficient queries
  @@index([userId, siteId])
  @@index([timestamp])
  @@index([statusCode])
  @@index([method, endpoint])
  @@map("api_logs")
}

// System snapshots (composer.json/lock backups)
model Snapshot {
  id           String   @id @default(cuid())
  userId       String
  siteId       String
  workflowId   String?  // Associated workflow execution
  stepId       String?  // Associated workflow step
  composerJson String   @db.Text  // Full composer.json content
  composerLock String   @db.Text  // Full composer.lock content
  metadata     Json?    // Additional metadata (file sizes, checksums, etc.)
  createdAt    DateTime @default(now())

  // Relationships
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  site         Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)

  // Indexes for efficient queries
  @@index([userId, siteId])
  @@index([workflowId])
  @@index([createdAt])
  @@map("snapshots")
}
```

**Update Site and User models** to add relationships:

```prisma
model User {
  // ... existing fields ...
  workflowHistory WorkflowHistory[]
  apiLogs         ApiLog[]
  snapshots       Snapshot[]
}

model Site {
  // ... existing fields ...
  workflowHistory WorkflowHistory[]
  apiLogs         ApiLog[]
  snapshots       Snapshot[]
}
```

---

### Step 2: Generate Migration

Run Prisma migration commands:

```bash
# Generate Prisma client with new models
npm run db:generate

# Create and apply migration
npm run db:migrate -- --name add_logs_history_snapshots

# Verify schema in Prisma Studio
npm run db:studio
```

---

### Step 3: Update Storage Interfaces

**File**: `src/storage/interfaces.ts`

The interfaces already support history and logs through optional interfaces. Verify these are properly defined:

- `HistoryStorageInterface` - History CRUD operations
- `LogStorageInterface` - Log CRUD operations
- `SnapshotStorageInterface` - Snapshot CRUD operations

**Action**: Review and ensure all required methods are defined in the interfaces.

---

### Step 4: Implement Database Storage for Logs

**File**: `src/storage/DatabaseStorage.ts`

Extend the `DatabaseStorage` class to implement `LogStorageInterface`:

```typescript
// Inside DatabaseStorage class

async addLogEntry(params: LogParams): Promise<StorageResult<boolean>> {
    try {
        const { siteUrl, userId, method, endpoint, statusCode, requestData, responseData, error } = params;

        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site by URL and userId
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: false, error: 'Site not found' };
        }

        // Create log entry
        await this.prisma.apiLog.create({
            data: {
                userId,
                siteId: site.id,
                method: method || 'UNKNOWN',
                endpoint: endpoint || '',
                statusCode: statusCode || 0,
                requestData: requestData || null,
                responseData: responseData || null,
                error: error || null,
                timestamp: new Date()
            }
        });

        return { success: true, data: true };
    } catch (error) {
        console.error('Database error adding log entry:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async getLogs(siteUrl: string, userId?: string, query?: QueryParams): Promise<StorageResult<LogEntry[]>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: true, data: [] };
        }

        // Query logs with optional filtering
        const logs = await this.prisma.apiLog.findMany({
            where: {
                siteId: site.id,
                userId,
                ...(query?.startDate && { timestamp: { gte: new Date(query.startDate) } }),
                ...(query?.endDate && { timestamp: { lte: new Date(query.endDate) } })
            },
            orderBy: { timestamp: query?.sortOrder || 'desc' },
            take: query?.limit,
            skip: query?.offset
        });

        // Transform to LogEntry format
        const logEntries: LogEntry[] = logs.map(log => ({
            timestamp: log.timestamp.toISOString(),
            method: log.method,
            endpoint: log.endpoint,
            statusCode: log.statusCode,
            requestData: log.requestData,
            responseData: log.responseData,
            error: log.error || undefined
        }));

        return { success: true, data: logEntries };
    } catch (error) {
        console.error('Database error getting logs:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async cleanupLogs(params: CleanupParams): Promise<StorageResult<{ deletedCount: number; message: string }>> {
    try {
        const { siteUrl, userId, olderThan } = params;

        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: true, data: { deletedCount: 0, message: 'Site not found' } };
        }

        // Delete old logs
        const result = await this.prisma.apiLog.deleteMany({
            where: {
                siteId: site.id,
                userId,
                timestamp: {
                    lt: new Date(olderThan!)
                }
            }
        });

        return {
            success: true,
            data: {
                deletedCount: result.count,
                message: `Deleted ${result.count} log entries`
            }
        };
    } catch (error) {
        console.error('Database error cleaning up logs:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}
```

---

### Step 5: Implement Database Storage for History

**File**: `src/storage/DatabaseStorage.ts`

Extend the `DatabaseStorage` class to implement `HistoryStorageInterface`:

```typescript
// Inside DatabaseStorage class

async createHistoryEntry(params: HistoryParams): Promise<StorageResult<HistoryEntry>> {
    try {
        const { siteUrl, userId, workflowType, status, startTime, steps } = params;

        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: false, error: 'Site not found' };
        }

        // Create history entry
        const history = await this.prisma.workflowHistory.create({
            data: {
                userId,
                siteId: site.id,
                workflowType: workflowType || '',
                status: status || 'started',
                startTime: startTime ? new Date(startTime) : new Date(),
                endTime: null,
                steps: steps || []
            }
        });

        // Transform to HistoryEntry format
        const historyEntry: HistoryEntry = {
            id: history.id,
            workflowType: history.workflowType,
            status: history.status as any,
            startTime: history.startTime.toISOString(),
            endTime: history.endTime?.toISOString(),
            steps: history.steps as any
        };

        return { success: true, data: historyEntry };
    } catch (error) {
        console.error('Database error creating history entry:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async updateHistoryEntry(id: string, params: HistoryParams): Promise<StorageResult<HistoryEntry>> {
    try {
        const { siteUrl, userId, status, endTime, steps } = params;

        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: false, error: 'Site not found' };
        }

        // Update history entry
        const history = await this.prisma.workflowHistory.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(endTime && { endTime: new Date(endTime) }),
                ...(steps && { steps })
            }
        });

        // Transform to HistoryEntry format
        const historyEntry: HistoryEntry = {
            id: history.id,
            workflowType: history.workflowType,
            status: history.status as any,
            startTime: history.startTime.toISOString(),
            endTime: history.endTime?.toISOString(),
            steps: history.steps as any
        };

        return { success: true, data: historyEntry };
    } catch (error) {
        console.error('Database error updating history entry:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async getHistory(siteUrl: string, userId?: string, query?: QueryParams): Promise<StorageResult<HistoryEntry[]>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: true, data: [] };
        }

        // Query history
        const historyRecords = await this.prisma.workflowHistory.findMany({
            where: {
                siteId: site.id,
                userId
            },
            orderBy: { createdAt: query?.sortOrder || 'desc' },
            take: query?.limit,
            skip: query?.offset
        });

        // Transform to HistoryEntry format
        const historyEntries: HistoryEntry[] = historyRecords.map(history => ({
            id: history.id,
            workflowType: history.workflowType,
            status: history.status as any,
            startTime: history.startTime.toISOString(),
            endTime: history.endTime?.toISOString(),
            steps: history.steps as any
        }));

        return { success: true, data: historyEntries };
    } catch (error) {
        console.error('Database error getting history:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async getHistoryEntry(siteUrl: string, historyId: string, userId?: string): Promise<StorageResult<HistoryEntry>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find history entry
        const history = await this.prisma.workflowHistory.findFirst({
            where: {
                id: historyId,
                userId
            }
        });

        if (!history) {
            return { success: false, error: 'History entry not found' };
        }

        // Transform to HistoryEntry format
        const historyEntry: HistoryEntry = {
            id: history.id,
            workflowType: history.workflowType,
            status: history.status as any,
            startTime: history.startTime.toISOString(),
            endTime: history.endTime?.toISOString(),
            steps: history.steps as any
        };

        return { success: true, data: historyEntry };
    } catch (error) {
        console.error('Database error getting history entry:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async deleteHistoryEntry(siteUrl: string, historyId: string, userId?: string): Promise<StorageResult<boolean>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Delete history entry
        await this.prisma.workflowHistory.delete({
            where: {
                id: historyId,
                userId
            }
        });

        return { success: true, data: true };
    } catch (error) {
        console.error('Database error deleting history entry:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async clearHistory(siteUrl: string, userId?: string): Promise<StorageResult<boolean>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: true, data: true };
        }

        // Delete all history for site
        await this.prisma.workflowHistory.deleteMany({
            where: {
                siteId: site.id,
                userId
            }
        });

        return { success: true, data: true };
    } catch (error) {
        console.error('Database error clearing history:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async getHistoryStats(siteUrl: string, userId?: string): Promise<StorageResult<any>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return {
                success: true,
                data: { total: 0, completed: 0, failed: 0, running: 0 }
            };
        }

        // Aggregate statistics
        const [total, completed, failed, running, lastEntry] = await Promise.all([
            this.prisma.workflowHistory.count({ where: { siteId: site.id, userId } }),
            this.prisma.workflowHistory.count({ where: { siteId: site.id, userId, status: 'completed' } }),
            this.prisma.workflowHistory.count({ where: { siteId: site.id, userId, status: 'failed' } }),
            this.prisma.workflowHistory.count({ where: { siteId: site.id, userId, status: { in: ['started', 'running', 'paused'] } } }),
            this.prisma.workflowHistory.findFirst({
                where: { siteId: site.id, userId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
        ]);

        return {
            success: true,
            data: {
                total,
                completed,
                failed,
                running,
                lastActivity: lastEntry?.createdAt.toISOString()
            }
        };
    } catch (error) {
        console.error('Database error getting history stats:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}
```

---

### Step 6: Implement Database Storage for Snapshots

**File**: `src/storage/DatabaseStorage.ts`

Extend the `DatabaseStorage` class to implement `SnapshotStorageInterface`:

```typescript
// Inside DatabaseStorage class

async saveSnapshot(params: SnapshotParams): Promise<StorageResult<SnapshotMetadata>> {
    try {
        const { siteUrl, userId, composerJson, composerLock, workflowId, stepId } = params;

        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        if (!composerJson || !composerLock) {
            return { success: false, error: 'composerJson and composerLock are required' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: false, error: 'Site not found' };
        }

        // Create snapshot
        const snapshot = await this.prisma.snapshot.create({
            data: {
                userId,
                siteId: site.id,
                workflowId: workflowId || null,
                stepId: stepId || null,
                composerJson,
                composerLock,
                metadata: {
                    composerJsonSize: composerJson.length,
                    composerLockSize: composerLock.length
                }
            }
        });

        const metadata: SnapshotMetadata = {
            id: snapshot.id,
            timestamp: snapshot.createdAt.toISOString(),
            workflowId: snapshot.workflowId || undefined,
            stepId: snapshot.stepId || undefined
        };

        return { success: true, data: metadata };
    } catch (error) {
        console.error('Database error saving snapshot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async getSnapshot(siteUrl: string, snapshotId: string, userId?: string): Promise<StorageResult<any>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find snapshot
        const snapshot = await this.prisma.snapshot.findFirst({
            where: {
                id: snapshotId,
                userId
            }
        });

        if (!snapshot) {
            return { success: false, error: 'Snapshot not found' };
        }

        return {
            success: true,
            data: {
                id: snapshot.id,
                composerJson: snapshot.composerJson,
                composerLock: snapshot.composerLock,
                workflowId: snapshot.workflowId,
                stepId: snapshot.stepId,
                timestamp: snapshot.createdAt.toISOString()
            }
        };
    } catch (error) {
        console.error('Database error getting snapshot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async listSnapshots(siteUrl: string, userId?: string): Promise<StorageResult<SnapshotMetadata[]>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Find the site
        const site = await this.prisma.site.findFirst({
            where: { url: siteUrl, userId }
        });

        if (!site) {
            return { success: true, data: [] };
        }

        // Get snapshots
        const snapshots = await this.prisma.snapshot.findMany({
            where: {
                siteId: site.id,
                userId
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                workflowId: true,
                stepId: true
            }
        });

        const metadata: SnapshotMetadata[] = snapshots.map(s => ({
            id: s.id,
            timestamp: s.createdAt.toISOString(),
            workflowId: s.workflowId || undefined,
            stepId: s.stepId || undefined
        }));

        return { success: true, data: metadata };
    } catch (error) {
        console.error('Database error listing snapshots:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}

async deleteSnapshot(siteUrl: string, snapshotId: string, userId?: string): Promise<StorageResult<boolean>> {
    try {
        if (!userId) {
            return { success: false, error: 'userId is required for database storage' };
        }

        // Delete snapshot
        await this.prisma.snapshot.delete({
            where: {
                id: snapshotId,
                userId
            }
        });

        return { success: true, data: true };
    } catch (error) {
        console.error('Database error deleting snapshot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}
```

---

### Step 7: Update Storage Capabilities

**File**: `src/storage/DatabaseStorage.ts`

Update the `getCapabilities()` method to reflect support for logs, history, and snapshots:

```typescript
getCapabilities(): StorageCapabilities {
    return {
        canExport: true,
        canImport: true,
        canMigrate: true,
        supportsBackup: true,
        isClientSide: false,

        // All data types supported via PostgreSQL
        supportsSiteConfig: true,
        supportsLogs: true,          // ✅ Now supported
        supportsHistory: true,       // ✅ Now supported
        supportsSnapshots: true,     // ✅ Now supported

        // Database capabilities
        supportsTransactions: true,
        supportsIndexing: true,
        supportsConcurrency: true,
        supportsCompression: false,
        supportsEncryption: true,

        queryCapabilities: {
            canFilter: true,
            canSort: true,
            canPaginate: true,
            canAggregate: true
        }
    };
}
```

---

### Step 8: Create Migration Script for Existing Data

**File**: `src/scripts/migrateLogsHistoryToDatabase.ts`

Create a script to migrate existing JSON files to the database:

```typescript
import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateLogsHistoryToDatabase() {
    console.log('Starting migration of logs and history to database...');

    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

    try {
        // Migrate history files
        const historyDir = path.join(dataDir, 'history');
        await migrateHistory(historyDir);

        // Migrate log files
        const logsDir = path.join(dataDir, 'logs');
        await migrateLogs(logsDir);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function migrateHistory(historyDir: string) {
    // Implementation details for migrating history files
    console.log('Migrating history files from:', historyDir);
    // Read JSON files, transform, and insert into database
}

async function migrateLogs(logsDir: string) {
    // Implementation details for migrating log files
    console.log('Migrating log files from:', logsDir);
    // Read JSON files, transform, and insert into database
}

migrateLogsHistoryToDatabase();
```

Add to `package.json`:

```json
"scripts": {
  "migrate:logs-history": "tsx src/scripts/migrateLogsHistoryToDatabase.ts"
}
```

---

### Step 9: Update Environment Configuration

**File**: `.env` (production on Railway)

Ensure database storage is enabled:

```env
STORAGE_TYPE=database
DATABASE_URL=postgresql://user:password@host:5432/database
TOKEN_MASTER_KEY=your-encryption-key
```

---

### Step 10: Testing

1. **Local Testing**:
   ```bash
   # Run migration
   npm run db:migrate -- --name add_logs_history_snapshots

   # Verify in Prisma Studio
   npm run db:studio

   # Test the application
   npm run dev:full
   ```

2. **Migration Testing**:
   ```bash
   # Migrate existing data
   npm run migrate:logs-history

   # Verify data integrity
   npm run db:studio
   ```

3. **Production Deployment**:
   - Deploy to Railway with updated schema
   - Run migration script if existing data needs to be preserved
   - Monitor logs for any errors

---

## Benefits After Migration

1. **Persistence**: Logs and history survive container restarts
2. **Scalability**: Database supports horizontal scaling
3. **Query Performance**: Indexed queries for filtering/sorting
4. **Multi-tenancy**: Proper user isolation with relationships
5. **Analytics**: Easy aggregation for usage metrics
6. **Backup**: Database backups protect data
7. **Cost**: No need for expensive Railway persistent volumes

---

## Rollback Plan

If issues occur during migration:

1. Set `STORAGE_TYPE=json_file` in Railway environment variables
2. Redeploy to use file-based storage temporarily
3. Fix database issues
4. Re-run migration when ready

---

## Timeline Estimate

- **Step 1-2**: Schema updates and migration (1 hour)
- **Step 3**: Interface review (30 minutes)
- **Step 4-6**: Implement storage methods (3-4 hours)
- **Step 7**: Update capabilities (15 minutes)
- **Step 8**: Migration script (1-2 hours)
- **Step 9-10**: Testing and deployment (2 hours)

**Total**: ~8-10 hours of development work

---

## Notes

- Consider adding data retention policies (auto-delete old logs/history after X days)
- Monitor database size growth on Railway
- Consider adding database indexes based on actual query patterns
- Implement pagination for large datasets
- Add database connection pooling configuration for production
