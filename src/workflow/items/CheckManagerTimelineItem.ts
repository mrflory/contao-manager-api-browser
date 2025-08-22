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
      const updateStatus = await api.getUpdateStatus();
      const selfUpdate = updateStatus.selfUpdate;
      
      if (!selfUpdate) {
        return this.setError('Could not check manager update status');
      }
      
      const needsUpdate = selfUpdate.current_version !== selfUpdate.latest_version;
      
      if (needsUpdate) {
        // Manager needs update - inject UpdateManagerTimelineItem
        const updateManagerItem = new UpdateManagerTimelineItem();
        return this.injectNextItems([updateManagerItem], selfUpdate);
      } else {
        // No update needed
        return this.setComplete(selfUpdate);
      }
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to check manager updates');
    }
  }
}