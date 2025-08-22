import { TimelineItem, WorkflowConfig } from '../engine/types';
import {
  CheckTasksTimelineItem,
  CheckManagerTimelineItem,
  ComposerDryRunTimelineItem,
  ComposerUpdateTimelineItem,
  CheckMigrationsTimelineItem,
  UpdateVersionsTimelineItem
} from '../items';

/**
 * Factory function to create the update workflow timeline
 */
export function createUpdateWorkflow(config: WorkflowConfig): TimelineItem[] {
  const items: TimelineItem[] = [];
  
  // Step 1: Check for pending tasks
  items.push(new CheckTasksTimelineItem());
  
  // Step 2: Check if manager needs updating (will inject UpdateManagerTimelineItem if needed)
  items.push(new CheckManagerTimelineItem());
  
  // Step 3: Composer dry-run (conditional)
  if (config.performDryRun) {
    items.push(new ComposerDryRunTimelineItem());
  }
  
  // Step 4: Composer update
  items.push(new ComposerUpdateTimelineItem());
  
  // Step 5: Check for database migrations (will inject ExecuteMigrationsTimelineItem and additional cycles if needed)
  items.push(new CheckMigrationsTimelineItem());
  
  // Step 6: Update version information (final step)
  items.push(new UpdateVersionsTimelineItem());
  
  return items;
}

/**
 * Get default workflow configuration
 */
export function getDefaultWorkflowConfig(): WorkflowConfig {
  return {
    performDryRun: true
  };
}