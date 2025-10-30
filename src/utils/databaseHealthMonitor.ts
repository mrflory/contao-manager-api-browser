/**
 * Database Health Monitor
 * Tracks database availability state and provides middleware for degraded mode
 */

export class DatabaseHealthMonitor {
    private isHealthy: boolean = true;
    private lastCheckTime: Date = new Date();
    private consecutiveFailures: number = 0;
    private readonly failureThreshold = 3;

    constructor() {
        this.isHealthy = true;
    }

    /**
     * Mark database as healthy
     */
    markHealthy(): void {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        this.lastCheckTime = new Date();
    }

    /**
     * Mark database as unhealthy
     */
    markUnhealthy(): void {
        this.consecutiveFailures++;
        this.lastCheckTime = new Date();

        // Only mark as unhealthy after threshold is reached
        if (this.consecutiveFailures >= this.failureThreshold) {
            this.isHealthy = false;
        }
    }

    /**
     * Check if database is currently healthy
     */
    isDatabaseHealthy(): boolean {
        return this.isHealthy;
    }

    /**
     * Get health status details
     */
    getHealthStatus() {
        return {
            isHealthy: this.isHealthy,
            consecutiveFailures: this.consecutiveFailures,
            lastCheckTime: this.lastCheckTime,
            timeSinceLastCheck: Date.now() - this.lastCheckTime.getTime()
        };
    }

    /**
     * Reset health status
     */
    reset(): void {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        this.lastCheckTime = new Date();
    }
}

// Singleton instance
export const dbHealthMonitor = new DatabaseHealthMonitor();
