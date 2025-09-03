import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, UserAction, WorkflowContext } from '../engine/types';
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
      
      // Add version comparison metadata that the UI can use
      const versionData = {
        ...selfUpdate,
        versionComparison: {
          currentVersion: selfUpdate.current_version,
          latestVersion: selfUpdate.latest_version,
          needsUpdate,
          type: 'manager'
        }
      };

      if (needsUpdate) {
        // Emit progress update about needed update
        if (this.context?.engine) {
          this.context.engine.emitProgress(this, { 
            status: 'active', 
            message: 'Manager update available, waiting for user confirmation',
            selfUpdate
          });
        }
        // Manager needs update - require user confirmation
        return this.handleManagerUpdateConfirmation(versionData);
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
        return this.setComplete(versionData);
      }
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to check manager updates');
    }
  }
  
  private handleManagerUpdateConfirmation(versionData: any): TimelineResult {
    const actions: UserAction[] = [
      {
        id: 'continue',
        label: 'Update Manager',
        description: 'Proceed with the Contao Manager update',
        variant: 'primary',
        execute: async () => ({ 
          action: 'continue',
          additionalItems: [new UpdateManagerTimelineItem()]
        })
      },
      {
        id: 'skip',
        label: 'Skip Manager Update',
        description: 'Skip manager update and continue with workflow',
        variant: 'secondary',
        execute: async () => ({ action: 'continue' })
      },
      {
        id: 'cancel',
        label: 'Cancel Workflow',
        description: 'Cancel the entire workflow',
        variant: 'danger',
        execute: async () => ({ action: 'cancel' })
      }
    ];
    
    const uiContent = this.renderManagerUpdateInfo(versionData);
    return this.requireUserAction(actions, uiContent, versionData);
  }
  
  private renderManagerUpdateInfo(versionData: any): React.ReactNode {
    const { versionComparison } = versionData;
    
    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Manager Update Available
        </div>
        <div>
          Contao Manager can be updated from version {versionComparison.currentVersion} to {versionComparison.latestVersion}. 
          You can choose to update now or skip this step.
        </div>
      </div>
    );
  }
}