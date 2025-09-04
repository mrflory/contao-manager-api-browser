import { useContext, createContext } from 'react';

// Context for current site URL
export interface SiteContextType {
  siteUrl: string;
}

export const SiteContext = createContext<SiteContextType | null>(null);

export function useSiteContext(): SiteContextType {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  return context;
}

export function useWorkflowHistory() {
  const { siteUrl } = useSiteContext();
  
  return {
    startHistoryTracking: async (engine: any, workflowType: 'update' | 'migration' | 'composer') => {
      // Populate the workflow engine's context with site information
      const context = engine.getContext();
      context.set('activeSite', { url: siteUrl });
      context.set('workflowId', `${workflowType}-${Date.now()}`);
      
      console.log('[WORKFLOW-HISTORY] Populated engine context with:', {
        activeSiteUrl: siteUrl,
        workflowType,
        workflowId: context.get('workflowId')
      });
      
      await engine.startHistoryTracking(siteUrl, workflowType);
    },
    
    updateHistoryEntry: async (engine: any, status?: 'started' | 'finished' | 'cancelled' | 'error', endTime?: Date) => {
      // Don't await - history updates should not block workflow
      engine.updateHistoryEntry(status, endTime).catch((error: any) => {
        console.warn('History update failed in useWorkflowHistory hook - non-fatal:', error);
      });
    }
  };
}