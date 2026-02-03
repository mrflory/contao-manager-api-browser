import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth';
// Import shared Express type declarations (side-effect import for global augmentation)
import '../types/express';

/**
 * Better Auth Middleware for Express.js
 *
 * Provides authentication middleware using Better Auth session management.
 * Replaces the legacy JWT-based UserAuthMiddleware.
 */
export class BetterAuthMiddleware {
  /**
   * Require authenticated session
   * Returns 401 if no valid session exists
   */
  public requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Attach user and session to request
      req.user = session.user;
      req.session = session.session;
      req.userId = session.user.id;

      next();
    } catch (error) {
      console.error('[BetterAuth] Auth middleware error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid session',
      });
    }
  };

  /**
   * Optional authentication - continues if no session
   * Attaches user to request if authenticated, but doesn't require it
   */
  public optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (session) {
        req.user = session.user;
        req.session = session.session;
        req.userId = session.user.id;
      }

      next();
    } catch (error) {
      // Continue without auth - this is optional
      console.debug('[BetterAuth] Optional auth failed, continuing:', error);
      next();
    }
  };

  /**
   * Require verified email
   * Must be used after requireAuth middleware
   */
  public requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!req.user.emailVerified) {
      res.status(403).json({
        success: false,
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    next();
  };

  /**
   * Require two-factor authentication enabled
   * Must be used after requireAuth middleware
   */
  public requireTwoFactor = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!req.user.twoFactorEnabled) {
      res.status(403).json({
        success: false,
        error: 'Two-factor authentication required',
        code: 'TWO_FACTOR_REQUIRED',
      });
      return;
    }

    next();
  };

  /**
   * Check subscription limits - placeholder for Phase 3
   * Will be implemented when subscription service is integrated
   */
  public checkSubscriptionLimits = (_req: Request, _res: Response, next: NextFunction): void => {
    // Placeholder - just pass through for now
    next();
  };
}

// Export singleton instance for convenience
export const betterAuthMiddleware = new BetterAuthMiddleware();
