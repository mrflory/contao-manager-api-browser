import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { UpdateManagerTimelineItem } from './UpdateManagerTimelineItem';

/**
 * Timeline item for checking if Contao Manager needs updating
 */
export class CheckManagerTimelineItem extends BaseTimelineItem {
  constructor() {
    super(
      'check-manager',
      'Check Manager Updates',
      'Check if Contao Manager needs updating'
    );
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Emit initial progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'active', 
          message: 'Checking Contao Manager version status...' 
        });
      }
      
      const updateStatus = await api.getUpdateStatus();
      const selfUpdate = updateStatus.selfUpdate;
      
      if (!selfUpdate) {
        return this.setError('Could not check manager update status');
      }
      
      // Emit progress update about version comparison
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'active', 
          message: `Comparing versions: current ${selfUpdate.current_version}, latest ${selfUpdate.latest_version}`,
          updateStatus
        });
      }
      
      const needsUpdate = selfUpdate.current_version !== selfUpdate.latest_version;
      
      if (needsUpdate) {
        // Emit progress update about needed update
        if (this.context?.engine) {
          this.context.engine.emitProgress(this, { 
            status: 'active', 
            message: 'Manager update required, adding update task to workflow',
            selfUpdate
          });
        }
        // Manager needs update - inject UpdateManagerTimelineItem
        const updateManagerItem = new UpdateManagerTimelineItem();
        return this.injectNextItems([updateManagerItem], selfUpdate);
      } else {
        // Emit completion progress update
        if (this.context?.engine) {
          this.context.engine.emitProgress(this, { 
            status: 'complete', 
            message: 'Manager is already up to date',
            selfUpdate
          });
        }
        // No update needed
        return this.setComplete(selfUpdate);
      }
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to check manager updates');
    }
  }
}