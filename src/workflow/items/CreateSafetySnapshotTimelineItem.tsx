import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';
import { SnapshotApiService } from '../../services/apiCallService';

/**
 * Timeline item for creating a safety snapshot before restoration
 * Reuses the snapshot creation logic with different title/description
 */
export class CreateSafetySnapshotTimelineItem extends BaseTimelineItem {
  constructor() {
    super(
      'create-safety-snapshot',
      'Create Safety Backup (Composer Files)',
      'Backup current composer files before restoration'
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
          summary: 'Failed to create safety backup',
          message: 'Safety snapshot creation failed - no snapshot data returned',
          operationType: 'backup'
        });
      }

      // Store snapshot data
      this.data = { snapshot: result.snapshot };

      return this.setComplete({ snapshot: result.snapshot });
    } catch (error) {
      return this.setEnhancedError({
        category: 'system',
        summary: 'Failed to create safety backup',
        message: error instanceof Error ? error.message : 'Failed to create safety snapshot',
        operationType: 'backup'
      });
    }
  }

  customContent(): React.ReactElement | null {
    if (this.data?.snapshot) {
      return <ComposerOperations data={this.data.snapshot} stepId={this.id} />;
    }
    return null;
  }
}
