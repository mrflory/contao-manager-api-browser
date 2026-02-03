/**
 * Express Request Type Extensions
 *
 * Unified type declarations for both legacy JWT auth and Better Auth sessions.
 * This file should be the ONLY place that extends Express.Request for auth.
 */

// Import express types to ensure proper augmentation
import 'express';

// Auth user type that's compatible with both legacy and Better Auth
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean | Date | null;
  name?: string | null;
  image?: string | null;
  twoFactorEnabled?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
  // Legacy fields (optional for backward compatibility)
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
}

// Better Auth session type
export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: AuthSession;
      userId?: string;
    }
  }
}

// Required for module augmentation to work
export {};
