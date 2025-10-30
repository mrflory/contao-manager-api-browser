import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface DatabaseHealthStatus {
    isHealthy: boolean;
    status: 'connected' | 'disconnected';
    lastCheckTime: string;
    consecutiveFailures: number;
}

interface UseDatabaseHealthReturn {
    isHealthy: boolean;
    isChecking: boolean;
    checkHealth: () => Promise<void>;
    healthStatus: DatabaseHealthStatus | null;
}

/**
 * Hook to monitor database health status
 * Polls the /api/database/status endpoint periodically
 */
export const useDatabaseHealth = (pollingInterval = 30000): UseDatabaseHealthReturn => {
    const [isHealthy, setIsHealthy] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [healthStatus, setHealthStatus] = useState<DatabaseHealthStatus | null>(null);

    const checkHealth = useCallback(async () => {
        try {
            setIsChecking(true);
            const response = await axios.get<DatabaseHealthStatus>('/api/database/status');
            setHealthStatus(response.data);
            setIsHealthy(response.data.isHealthy);
        } catch (error) {
            console.error('Failed to check database health:', error);
            // If the API itself is down, assume unhealthy
            setIsHealthy(false);
            setHealthStatus({
                isHealthy: false,
                status: 'disconnected',
                lastCheckTime: new Date().toISOString(),
                consecutiveFailures: 999
            });
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        // Check immediately on mount
        checkHealth();

        // Set up polling
        const intervalId = setInterval(checkHealth, pollingInterval);

        return () => clearInterval(intervalId);
    }, [checkHealth, pollingInterval]);

    return {
        isHealthy,
        isChecking,
        checkHealth,
        healthStatus
    };
};
