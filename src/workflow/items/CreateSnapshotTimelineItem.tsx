import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';
import { SnapshotApiService } from '../../services/apiCallService';

/**
 * Timeline item for creating a snapshot of composer files
 */
export class CreateSnapshotTimelineItem extends BaseTimelineItem {
  constructor() {
    super(
      'create-snapshot',
      'Create Composer Snapshot',
      'Backup composer.json and composer.lock files'
    );
  }

  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();

    try {
      const siteUrl = this.getSiteUrl();
      const workflowId = context?.get('workflowId');
      const stepId = this.id;

      // Create snapshot (backend will fetch composer files automatically)
      const result = await SnapshotApiService.createSnapshot(siteUrl, workflowId, stepId);

      if (!result?.snapshot) {
        return this.setEnhancedError({
          category: 'system',
          summary: 'Failed to create snapshot',
          message: 'Snapshot creation failed - no snapshot data returned',
          operationType: 'backup'
        });
      }

      // Store snapshot data for later use
      this.data = {
        snapshot: result.snapshot
      };

      return this.setComplete({
        snapshot: result.snapshot
      });
    } catch (error) {
      return this.setEnhancedError({
        category: 'system',
        summary: 'Failed to create composer snapshot',
        message: error instanceof Error ? error.message : 'Failed to create composer snapshot',
        operationType: 'backup'
      });
    }
  }

  protected getSiteUrl(): string {
    const activeSite = this.context?.get('activeSite');
    if (!activeSite?.url) {
      throw new Error('No active site configured in workflow context');
    }
    return activeSite.url;
  }

  customContent(): React.ReactElement | null {
    return <ComposerOperations data={this.data || {}} />;
  }
}
