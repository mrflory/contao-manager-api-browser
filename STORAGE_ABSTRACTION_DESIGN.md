# Comprehensive Storage Abstraction Design

## Overview

This document describes the comprehensive storage abstraction interfaces designed to handle logs, history, snapshots, and site configuration data across different storage backend types (Browser, JSON File, Database).

## Key Design Principles

1. **Type-Based Capabilities**: Each storage type supports different data types based on practical limitations
2. **Backward Compatibility**: Existing `SiteConfigStorage` interface remains unchanged
3. **Extensibility**: New data types can be easily added through additional interfaces
4. **Clear Separation**: Each data type has its own interface with dedicated operations
5. **Storage-Agnostic**: Frontend can query storage capabilities and hide unsupported features

## Storage Type Capabilities

### Browser Storage
- **Supports**: Site configuration only
- **Limitations**: No logs, history, or snapshots (too much data for browser storage)
- **Use Case**: Privacy-focused users, offline-first scenarios
- **UI Behavior**: Logs, History, and Snapshots tabs are hidden

### JSON File Storage (Default)
- **Supports**: All data types (config, logs, history, snapshots)
- **Implementation**: File-based storage in server `data/` directory
- **Use Case**: Standard server deployment, single-server instances
- **UI Behavior**: All features available

### Database Storage
- **Supports**: All data types with advanced features
- **Features**: Transactions, indexing, concurrency, compression, encryption
- **Use Case**: Production environments, multi-server setups, high-scale deployments
- **UI Behavior**: All features available with enhanced performance

## Interface Architecture

### Core Interfaces

#### `StorageCapabilities`
Enhanced capability definition indicating what each storage type supports:
```typescript
interface StorageCapabilities {
  // Basic capabilities
  canExport: boolean;
  canImport: boolean;
  canMigrate: boolean;
  supportsBackup: boolean;
  isClientSide: boolean;
  maxStorageSize?: number;
  
  // Data type support capabilities
  supportsSiteConfig: boolean;
  supportsLogs: boolean;
  supportsHistory: boolean;
  supportsSnapshots: boolean;
  
  // Advanced capabilities  
  supportsTransactions: boolean;
  supportsIndexing: boolean;
  supportsConcurrency: boolean;
  supportsCompression: boolean;
  supportsEncryption: boolean;
  
  // Performance and limitations
  maxFileSize?: number;
  maxEntriesPerType?: number;
  queryCapabilities: {
    canFilter: boolean;
    canSort: boolean;
    canPaginate: boolean;
    canAggregate: boolean;
  };
}
```

#### `LogsStorage`
Interface for API request/response logging:
```typescript
interface LogsStorage {
  addLogEntry(params: LogParams): Promise<StorageResult<boolean>>;
  getLogs(siteUrl: string, query?: QueryParams): Promise<StorageResult<LogEntry[]>>;
  getLogStats(siteUrl: string): Promise<StorageResult<{total: number; errorCount: number}>>;
  cleanupLogs(params: CleanupParams): Promise<StorageResult<{deletedCount: number}>>;
  clearLogs(siteUrl: string): Promise<StorageResult<boolean>>;
}
```

#### `HistoryStorage`
Interface for workflow execution history:
```typescript
interface HistoryStorage {
  createHistoryEntry(params: HistoryParams): Promise<StorageResult<HistoryEntry>>;
  updateHistoryEntry(id: string, params: HistoryParams): Promise<StorageResult<HistoryEntry>>;
  getHistoryEntry(siteUrl: string, id: string): Promise<StorageResult<HistoryEntry | null>>;
  getHistory(siteUrl: string, query?: QueryParams): Promise<StorageResult<HistoryEntry[]>>;
  getHistoryStats(siteUrl: string): Promise<StorageResult<{total: number; completed: number}>>;
  deleteHistoryEntry(siteUrl: string, id: string): Promise<StorageResult<boolean>>;
  clearHistory(siteUrl: string): Promise<StorageResult<boolean>>;
}
```

#### `SnapshotsStorage`
Interface for file state snapshots:
```typescript
interface SnapshotsStorage {
  createSnapshot(params: SnapshotParams): Promise<StorageResult<SnapshotMetadata>>;
  getSnapshotMetadata(id: string): Promise<StorageResult<SnapshotMetadata | null>>;
  getSnapshotFile(id: string, filename: string): Promise<StorageResult<{content: string; size: number}>>;
  getSnapshots(siteUrl: string, query?: QueryParams): Promise<StorageResult<SnapshotMetadata[]>>;
  deleteSnapshot(id: string): Promise<StorageResult<boolean>>;
  cleanupSnapshots(params: CleanupParams): Promise<StorageResult<{deletedCount: number}>>;
  getSnapshotStats(siteUrl: string): Promise<StorageResult<{total: number; totalSize: number}>>;
}
```

#### `UnifiedStorage`
Comprehensive interface combining all data types:
```typescript
interface UnifiedStorage extends SiteConfigStorage {
  getCapabilities(): StorageCapabilities;
  
  // Optional implementations based on storage capabilities
  logs?: LogsStorage;
  history?: HistoryStorage;
  snapshots?: SnapshotsStorage;
  
  // Batch operations for efficiency
  batch?: {
    transaction<T>(operations: (() => Promise<T>)[]): Promise<StorageResult<T[]>>;
    bulkDelete(operations: Array<{type: string; siteUrl: string; id?: string}>): Promise<StorageResult<{deletedCount: number}>>;
    bulkExport(siteUrl: string, types: string[]): Promise<StorageResult<{data: Record<string, any>}>>;
    bulkImport(data: {data: Record<string, any>}): Promise<StorageResult<{importedCount: number}>>;
  };
}
```

## Implementation Strategy

### 1. Storage Type Detection
```typescript
// Helper functions for capability checking
export function getStorageCapabilities(type: StorageType): StorageCapabilities;
export function supportsDataType(storageType: StorageType, dataType: string): boolean;
export function getSupportedDataTypes(storageType: StorageType): string[];
```

### 2. Frontend UI Adaptation
The frontend should use these capabilities to show/hide features:
```typescript
const capabilities = getStorageCapabilities(currentStorageType);

// Hide tabs for unsupported data types
const showLogsTab = capabilities.supportsLogs;
const showHistoryTab = capabilities.supportsHistory;
const showSnapshotsTab = capabilities.supportsSnapshots;
```

### 3. Service Layer Migration
Existing services (`LoggingService`, `HistoryService`, `SnapshotService`) should be refactored to:
1. Accept a storage backend in their constructor
2. Use the appropriate storage interface methods
3. Fallback gracefully when storage type doesn't support the data type

### 4. Backward Compatibility
- Existing `SiteConfigStorage` interface remains unchanged
- All existing storage implementations continue to work
- New interfaces are optional extensions

## Storage Type Behavior Matrix

| Feature | Browser Storage | JSON File Storage | Database Storage |
|---------|----------------|------------------|------------------|
| Site Config | ✅ Full Support | ✅ Full Support | ✅ Full Support |
| API Logs | ❌ Hidden | ✅ Full Support | ✅ Full Support |
| Workflow History | ❌ Hidden | ✅ Full Support | ✅ Full Support |
| File Snapshots | ❌ Hidden | ✅ Full Support | ✅ Full Support |
| Transactions | ❌ | ❌ | ✅ |
| Query/Filter | Memory-based | Memory-based | Native SQL |
| Backup/Export | ✅ | ✅ | ✅ |
| Migration | ✅ | ✅ | ✅ |

## Migration Path

### Phase 1: Interface Implementation
1. ✅ Define comprehensive interfaces
2. Update existing storage implementations to implement new interfaces
3. Add capability detection to frontend

### Phase 2: Service Refactoring
1. Refactor `LoggingService` to use `LogsStorage` interface
2. Refactor `HistoryService` to use `HistoryStorage` interface
3. Refactor `SnapshotService` to use `SnapshotsStorage` interface

### Phase 3: Frontend Integration
1. Add capability-based UI rendering
2. Hide unsupported features for Browser storage
3. Add storage type switcher with capability information

### Phase 4: Database Implementation
1. Implement full `UnifiedStorage` for database backend
2. Add transaction support
3. Add advanced query capabilities

## Benefits

1. **Clear Architecture**: Separation of concerns between data types
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Flexibility**: Storage backends can implement only what they support
4. **User Experience**: UI adapts based on storage capabilities
5. **Performance**: Database storage can leverage native capabilities
6. **Privacy**: Browser storage keeps everything client-side
7. **Migration**: Seamless switching between storage types

## Usage Examples

### Frontend Feature Detection
```typescript
// Check if current storage supports logs
if (supportsDataType(currentStorageType, 'logs')) {
  // Show logs tab
} else {
  // Hide logs tab
}
```

### Service Initialization
```typescript
const storage = StorageFactory.createStorage(storageConfig);
const capabilities = storage.getCapabilities();

// Only initialize logging service if supported
if (capabilities.supportsLogs && storage.logs) {
  const loggingService = new LoggingService(storage.logs);
}
```

This design provides a comprehensive, type-safe, and flexible storage abstraction that supports all application data types while respecting the limitations and capabilities of each storage backend type.