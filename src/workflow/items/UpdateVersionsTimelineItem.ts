import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { VersionInfoDisplay } from '../../components/workflow/VersionInfoDisplay';

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
      // Emit initial progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'active', 
          message: 'Updating version information...' 
        });
      }
      
      const result = await api.updateVersionInfo();
      
      // Create UI content to display version information
      const uiContent = result.success && result.versionInfo 
        ? React.createElement(VersionInfoDisplay, {
            versionInfo: result.versionInfo,
            size: 'md',
            showLastUpdated: true
          })
        : null;
      
      // Emit completion progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'complete', 
          message: 'Version information updated successfully'
        });
      }
      
      // Create custom result with UI content
      this.status = 'complete';
      this.endTime = new Date();
      
      return {
        status: 'success',
        data: result,
        uiContent: uiContent
      };
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to update version information');
    }
  }
}