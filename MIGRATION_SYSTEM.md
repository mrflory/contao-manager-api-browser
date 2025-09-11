# Data Migration System

This document describes the comprehensive data migration system implemented for transitioning between different storage backends while maintaining data integrity and providing reliable recovery mechanisms.

## Overview

The migration system supports seamless transitions between different storage types:
- **JSON File Storage** (default) - File-based storage in `data/config.json`
- **Browser Storage** - Client-side localStorage for privacy-focused deployments
- **Database Storage** - PostgreSQL backend for multi-tenant SaaS deployment

## Architecture

### Core Components

1. **MigrationService** - Main orchestrator for migration operations
2. **MigrationValidator** - Pre and post-migration data integrity validation
3. **MigrationRollbackService** - Safe restoration of data in case of failures
4. **MigrationErrorHandler** - Comprehensive error handling with recovery strategies
5. **MigrationProgressReporter** - Real-time progress tracking and metrics

### Storage Strategies

- **JSON → JSON**: Structure updates and format migrations
- **JSON → Database**: Full data import with relational mapping  
- **JSON → Browser**: Config-only migration (security/privacy)
- **Database → JSON**: Export with metadata preservation
- **Browser → JSON**: Configuration restoration

## Migration Types

### 1. Full Migration
Complete transition of all data categories:
- Site configurations with encrypted tokens
- Request/response logs
- Workflow execution history  
- System snapshots (composer.json/lock files)

### 2. Config Only Migration
Transfers only site configurations:
- Ideal for Browser storage (privacy)
- Removes sensitive server-side data
- Maintains site authentication settings

### 3. Selective Migration
User-defined data categories:
- Filter by specific sites
- Choose data types to migrate
- Batch processing support

## Data Categories

### Configuration (`config`)
- Site URLs and authentication tokens
- OAuth scopes and permissions
- Site metadata and version information
- **Critical**: Required for application functionality

### Logs (`logs`)
- API request/response history
- Error tracking and debugging info
- Performance metrics
- **Format**: JSONL (one JSON object per line)

### History (`history`)
- Workflow execution records
- Timeline-based operation tracking
- Step-by-step execution details
- **Format**: JSON arrays of history entries

### Snapshots (`snapshots`)
- Point-in-time system state captures
- Composer dependency information
- Rollback reference points
- **Structure**: Directories with metadata.json

## API Endpoints

### Migration Management

```bash
# Detect existing data for migration assessment
GET /api/migrate/detect
Response: { hasData: boolean, detectedData: DetectedData }

# Check migration status
GET /api/migrate/status  
Response: { activeMigrations: number, migrations: MigrationProgress[] }

# Start migration process
POST /api/migrate/start
Body: {
  fromStorageType: "json_file",
  toStorageType: "database", 
  dataCategories: ["config", "logs", "history", "snapshots"],
  createBackup: true,
  validateMigration: true,
  siteFilter?: string[]
}
Response: { success: boolean, migrationId: string }

# Monitor migration progress
GET /api/migrate/progress/:migrationId
Response: MigrationProgress

# Get final migration results
GET /api/migrate/result/:migrationId  
Response: MigrationResult

# Rollback failed migration
POST /api/migrate/rollback
Body: { migrationId: string, restoreFromBackup: boolean }
Response: { success: boolean, result: RollbackResult }

# Cleanup completed migrations
DELETE /api/migrate/cleanup
Response: { success: boolean }
```

## Usage Examples

### Basic Migration (JSON to Database)

```javascript
// 1. Detect existing data
const detection = await fetch('/api/migrate/detect').then(r => r.json());
console.log(`Found ${detection.detectedData.siteUrls.length} sites`);

// 2. Start migration
const migration = await fetch('/api/migrate/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromStorageType: 'json_file',
    toStorageType: 'database',
    dataCategories: ['config', 'logs', 'history'],
    createBackup: true,
    validateMigration: true
  })
}).then(r => r.json());

const migrationId = migration.migrationId;

// 3. Monitor progress
const checkProgress = async () => {
  const progress = await fetch(`/api/migrate/progress/${migrationId}`)
    .then(r => r.json());
  
  console.log(`Progress: ${progress.overallProgress}%`);
  
  if (progress.status === 'completed') {
    console.log('Migration completed successfully!');
    return;
  }
  
  if (progress.status === 'failed') {
    console.error('Migration failed:', progress.currentStep?.error);
    return;
  }
  
  // Continue monitoring
  setTimeout(checkProgress, 2000);
};

checkProgress();
```

### Privacy-Focused Migration (JSON to Browser)

```javascript
// Migrate only configuration to browser storage
await fetch('/api/migrate/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromStorageType: 'json_file',
    toStorageType: 'browser',
    dataCategories: ['config'], // Only config supported
    createBackup: false, // No server-side backup
    validateMigration: true
  })
});
```

### Site-Specific Migration

```javascript
// Migrate only specific sites
await fetch('/api/migrate/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromStorageType: 'json_file',
    toStorageType: 'database',
    dataCategories: ['config', 'history'],
    siteFilter: [
      'https://example.com/contao-manager.phar.php',
      'https://staging.example.com/contao-manager.phar.php'
    ]
  })
});
```

## Error Handling

### Recovery Strategies

1. **Retry** - Automatic retry with exponential backoff
   - Network errors (ECONNREFUSED, ETIMEDOUT)
   - Temporary resource issues
   - Configurable max retries

2. **Skip** - Continue migration, skip problematic items
   - Corrupted data files
   - Missing non-critical files
   - Individual parsing errors

3. **Fallback** - Alternative action when primary fails
   - Create empty config if source missing
   - Use default values for corrupted settings

4. **Abort** - Stop migration for critical errors
   - Permission denied (EACCES)
   - No disk space (ENOSPC)
   - Configuration corruption

### Error Context

Each error includes detailed context:
```typescript
interface ErrorContext {
  migrationId: string;
  stepId?: string;
  category: DataCategory;
  operation: string;
  retryCount: number;
  maxRetries: number;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

## Data Validation

### Pre-Migration Validation
- Source data integrity checks
- Target storage capability verification
- Storage space and permission validation
- Data compatibility assessment

### Post-Migration Validation
- Target data completeness verification
- Data format and structure validation
- Cross-reference source vs target counts
- Checksum verification where applicable

### Validation Errors
- **Data Loss**: Missing data in target
- **Corruption**: Invalid data format/structure
- **Format Error**: Incompatible data types
- **Size Limit**: Exceeds storage capacity
- **Permission Error**: Access denied

## Backup and Rollback

### Automatic Backups
- Created before migration starts
- Include all selected data categories
- Compressed and checksummed
- Retained for configurable period

### Rollback Process
1. **Backup Verification** - Integrity checks
2. **Target Cleanup** - Remove partial migration
3. **Data Restoration** - Copy from backup
4. **Validation** - Verify restored data

### Backup Structure
```
data/migration-backups/backup-{migration-id}-{timestamp}/
├── backup-metadata.json     # Backup information
├── config.json             # Site configurations
├── logs/                   # Log files
│   ├── site1.log
│   └── site2.log
├── history/                # History files  
│   ├── site1.history.json
│   └── site2.history.json
└── snapshots/              # Snapshot directories
    ├── site1-timestamp/
    └── site2-timestamp/
```

## Progress Tracking

### Real-Time Metrics
- Overall migration progress (0-100%)
- Current step execution
- Items processed vs total
- Throughput (items/second)
- Estimated time remaining

### Progress History
- Detailed timeline of all steps
- Performance metrics over time
- Error occurrences and recovery
- Resource utilization

### Progress Events
```typescript
// Migration lifecycle events
'migration_started'    // Migration begins
'step_started'         // Individual step starts
'step_completed'       // Step finishes successfully  
'step_failed'          // Step encounters error
'migration_completed'  // All steps completed
'migration_failed'     // Critical error, migration aborted
'backup_started'       // Backup creation begins
'backup_completed'     // Backup ready
'validation_started'   // Data validation begins
'validation_completed' // Validation finished
'rollback_started'     // Rollback initiated
'rollback_completed'   // Rollback finished
```

## Performance Considerations

### Optimization Strategies
- **Batch Processing**: Process items in configurable batches
- **Streaming**: Handle large files without loading entirely
- **Parallel Operations**: Concurrent processing where safe
- **Progress Throttling**: Limit update frequency
- **Memory Management**: Clear processed data promptly

### Recommended Settings
- **Batch Size**: 100 items (configurable)
- **Progress Interval**: 2 seconds
- **Max Retries**: 3 attempts
- **Backup Retention**: 30 days
- **Memory Limit**: Monitor for large migrations

## Security Considerations

### Token Handling
- **Encryption**: Tokens encrypted with master key
- **Browser Migration**: Strips tokens for security
- **Backup Security**: Encrypted backups
- **Transmission**: Secure internal transfers

### Access Control
- Migration operations require admin privileges
- API endpoints protected by authentication
- File system permissions validated
- Database access controlled

### Data Privacy
- **Browser Storage**: No server-side data persistence
- **Audit Trails**: All operations logged
- **Cleanup**: Automatic removal of old data
- **Compliance**: GDPR-friendly options

## Troubleshooting

### Common Issues

1. **Migration Fails to Start**
   - Check storage permissions
   - Verify target storage configuration
   - Ensure sufficient disk space

2. **Partial Migration**
   - Review error logs for skipped items
   - Check source data integrity
   - Validate target storage capacity

3. **Performance Issues**
   - Reduce batch size
   - Increase progress reporting interval
   - Check system resource usage

4. **Rollback Failures**
   - Verify backup integrity
   - Check file system permissions
   - Ensure target storage is accessible

### Debug Information

```bash
# Check migration status
GET /api/migrate/status

# Get detailed progress
GET /api/migrate/progress/{migrationId}

# Review error history
GET /api/migrate/result/{migrationId}

# Check storage capabilities
GET /api/storage/type
```

### Log Locations
- **Application Logs**: `server.log`
- **Migration Logs**: Embedded in progress tracking
- **Error Details**: Available via API endpoints
- **Backup Logs**: `backup-metadata.json` in backup directories

## Best Practices

### Before Migration
1. **Test with Subset**: Use site filters for testing
2. **Verify Connectivity**: Ensure target storage accessible
3. **Check Resources**: Adequate disk space and memory
4. **Backup Manually**: Additional safety measure

### During Migration
1. **Monitor Progress**: Regular status checks
2. **Avoid Interference**: Don't modify source data
3. **Resource Monitoring**: Watch system performance
4. **Error Review**: Address failures promptly

### After Migration
1. **Validate Results**: Verify all data migrated
2. **Test Functionality**: Ensure application works
3. **Monitor Performance**: Check target storage
4. **Cleanup**: Remove old data when confident

### Recovery Planning
1. **Regular Backups**: Automated backup schedule
2. **Test Rollbacks**: Verify rollback procedures
3. **Documentation**: Keep migration records
4. **Access Control**: Secure migration capabilities

## Future Enhancements

### Planned Features
- **Incremental Migration**: Resume from failures
- **Multi-Source Migration**: Combine multiple sources
- **Custom Strategies**: User-defined migration logic
- **Real-Time Sync**: Live data synchronization
- **Cloud Storage**: S3/GCS backend support

### Integration Opportunities
- **Monitoring Systems**: Prometheus/Grafana metrics
- **Notification Services**: Email/Slack alerts
- **Backup Services**: External backup providers
- **CI/CD Integration**: Automated migration testing

---

For technical support or questions about the migration system, refer to the API documentation or contact the development team.