import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';

/**
 * Timeline item for restoring composer files from a snapshot
 */
export class RestoreComposerFilesTimelineItem extends BaseTimelineItem {
  private snapshotId: string;

  constructor(snapshotId: string) {
    super(
      'restore-composer-files',
      'Restore Composer Files',
      'Restore composer.json and composer.lock from snapshot'
    );
    this.snapshotId = snapshotId;
  }

  canSkip(): boolean {
    return false; // Cannot skip restore if user requested it
  }

  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();

    try {
      const siteUrl = this.getSiteUrl();

      // Emit progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'active',
          message: 'Fetching composer files from snapshot...',
          type: 'restore_files_start'
        });
      }

      // Fetch composer.json from snapshot
      const composerJsonContent = await api.getSnapshotFileContent(
        this.snapshotId,
        'composer.json'
      );

      // Fetch composer.lock from snapshot
      const composerLockContent = await api.getSnapshotFileContent(
        this.snapshotId,
        'composer.lock'
      );

      // Emit progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'active',
          message: 'Restoring composer.json...',
          type: 'restore_composer_json'
        });
      }

      // Restore composer.json
      if (composerJsonContent) {
        await api.putComposerFile(siteUrl, 'composer.json', composerJsonContent);
      } else {
        throw new Error('composer.json not found in snapshot');
      }

      // Emit progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'active',
          message: 'Restoring composer.lock...',
          type: 'restore_composer_lock'
        });
      }

      // Restore composer.lock
      if (composerLockContent) {
        await api.putComposerFile(siteUrl, 'composer.lock', composerLockContent);
      } else {
        throw new Error('composer.lock not found in snapshot');
      }

      // Emit progress complete
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'complete',
          message: 'Composer files restored successfully',
          type: 'restore_files_complete'
        });
      }

      return this.setComplete({
        snapshot: { id: this.snapshotId },
        restoredFiles: ['composer.json', 'composer.lock']
      });

    } catch (error) {
      return this.setEnhancedError({
        category: 'system',
        summary: 'Failed to restore composer files',
        message: error instanceof Error ? error.message : 'Failed to restore composer files',
        details: `Could not restore composer files from snapshot ${this.snapshotId}`,
        operationType: 'restore'
      });
    }
  }

  customContent(): React.ReactElement | null {
    return <ComposerOperations data={this.data || {}} />;
  }
}
