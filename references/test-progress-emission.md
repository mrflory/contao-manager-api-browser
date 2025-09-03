# Testing Progress Emission in Timeline Items

## Test Setup
1. Mock server running on `http://localhost:3001`
2. Frontend development server running on `http://localhost:5173` (likely)
3. Add site: `http://localhost:3001/contao-manager.phar.php` with admin scope

## Timeline Items With New Progress Emission

### ✅ CheckTasksTimelineItem
- Progress updates during task checking
- Progress updates during task/migration clearing operations  
- Shows progress for aborting tasks with polling feedback

### ✅ CheckMigrationsTimelineItem  
- Progress updates during migration check startup
- Progress updates during polling with current status
- Different messages for no migrations vs migrations found

### ✅ UpdateManagerTimelineItem
- Progress updates during manager update startup
- Progress updates during polling with task status
- Completion progress when update finishes

### ✅ CheckManagerTimelineItem
- Progress updates during version status checking
- Progress updates for version comparison
- Different messages for update needed vs up to date

### ✅ UpdateVersionsTimelineItem
- Progress updates during version info update
- Completion progress when update finishes

## Already Working (Unchanged)
- ComposerDryRunTimelineItem - ✅ Has progress emission
- ComposerUpdateTimelineItem - ✅ Has progress emission  
- ExecuteMigrationsTimelineItem - ✅ Has progress emission

## Manual Testing
1. Add the mock server as a site
2. Trigger an update workflow
3. Observe timeline items show intermediate progress instead of being blank during execution
4. Check different scenarios using the mock server web interface

## Expected Behavior
- Users should now see progress messages during ALL workflow steps
- No more blank/inactive steps during execution  
- Progress shows current status, messages, and task data where available
- Each timeline item provides meaningful feedback about what's happening