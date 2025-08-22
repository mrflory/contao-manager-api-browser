import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';

/**
 * Timeline item for updating version information
 */
export class UpdateVersionsTimelineItem extends BaseTimelineItem {
  constructor() {
    super(
      'update-versions',
      'Update Version Info',
      'Refresh version information'
    );
  }
  
  canSkip(): boolean {
    return false; // This is the final step and shouldn't be skipped
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      const result = await api.updateVersionInfo();
      return this.setComplete(result);
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to update version information');
    }
  }
}