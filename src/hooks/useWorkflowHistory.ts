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
      await engine.startHistoryTracking(siteUrl, workflowType);
    },
    
    updateHistoryEntry: async (engine: any, status?: 'started' | 'finished' | 'cancelled' | 'error', endTime?: Date) => {
      await engine.updateHistoryEntry(status, endTime);
    }
  };
}