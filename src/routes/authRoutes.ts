import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserAuthService } from '../services/userAuthService';
import { UserAuthMiddleware } from '../middleware/userAuthMiddleware';
import {
    authRateLimit,
    validateRegistration,
    validateLogin,
    validatePasswordReset,
    validateNewPassword,
    handleValidationErrors,
    csrfProtection
} from '../middleware/securityMiddleware';

const router = express.Router();

export function createAuthRoutes(prisma: PrismaClient) {
    const userAuthService = new UserAuthService(prisma);
    const userAuthMiddleware = new UserAuthMiddleware(prisma);

    /**
     * POST /auth/register
     * Register a new user
     */
    router.post('/register',
        authRateLimit,
        csrfProtection.validateCSRF,
        validateRegistration,
        handleValidationErrors,
        async (req: Request, res: Response): Promise<void> => {
            try {
                const { email, password, firstName, lastName } = req.body;

                const result = await userAuthService.register({
                    email,
                    password,
                    firstName,
                    lastName
                });

                res.status(201).json({
                    success: true,
                    message: result.requiresVerification
                        ? 'Registration successful. Please check your email to verify your account.'
                        : 'Registration successful. You can now log in.',
                    data: {
                        user: {
                            id: result.user.id,
                            email: result.user.email,
                            firstName: result.user.firstName,
                            lastName: result.user.lastName,
                            emailVerified: result.user.emailVerified
                        },
                        requiresVerification: result.requiresVerification
                    }
                });
            } catch (error: any) {
                console.error('Registration error:', error);

                if (error.message === 'User with this email already exists') {
                    res.status(409).json({
                        success: false,
                        error: 'A user with this email address already exists'
                    });
                    return;
                }

                res.status(400).json({
                    success: false,
                    error: error.message || 'Registration failed'
                });
            }
        }
    );

    /**
     * POST /auth/login
     * User login
     */
    router.post('/login',
        authRateLimit,
        csrfProtection.validateCSRF,
        validateLogin,
        handleValidationErrors,
        async (req: Request, res: Response): Promise<void> => {
            try {
                const { email, password, rememberMe } = req.body;

                const result = await userAuthService.login({
                    email,
                    password,
                    rememberMe
                });

                // Set secure HTTP-only cookie for refresh token
                res.cookie('refreshToken', result.tokens.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 30 days or 7 days
                });

                res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: {
                            id: result.user.id,
                            email: result.user.email,
                            firstName: result.user.firstName,
                            lastName: result.user.lastName,
                            emailVerified: result.user.emailVerified
                        },
                        accessToken: result.tokens.accessToken
                    }
                });
            } catch (error: any) {
                console.error('Login error:', error);

                if (error.message === 'Invalid credentials') {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid email or password'
                    });
                    return;
                }

                if (error.message.includes('Email address not verified')) {
                    res.status(403).json({
                        success: false,
                        error: 'Please verify your email address before logging in'
                    });
                    return;
                }

                res.status(400).json({
                    success: false,
                    error: error.message || 'Login failed'
                });
            }
        }
    );

    /**
     * POST /auth/refresh
     * Refresh access token
     */
    router.post('/refresh', async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                res.status(401).json({
                    success: false,
                    error: 'Refresh token not provided'
                });
                return;
            }

            const tokens = await userAuthService.refreshToken(refreshToken);

            // Update refresh token cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                data: {
                    accessToken: tokens.accessToken
                }
            });
        } catch (error: any) {
            console.error('Token refresh error:', error);

            // Clear invalid refresh token
            res.clearCookie('refreshToken');

            res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }
    });

    /**
     * POST /auth/logout
     * User logout
     */
    router.post('/logout',
        userAuthMiddleware.optionalAuth,
        async (req: Request, res: Response): Promise<void> => {
            try {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const accessToken = authHeader.substring(7);
                    await userAuthService.logout(accessToken);
                }

                // Clear refresh token cookie
                res.clearCookie('refreshToken');

                res.json({
                    success: true,
                    message: 'Logout successful'
                });
            } catch (error: any) {
                console.error('Logout error:', error);

                // Still clear cookie even if logout fails
                res.clearCookie('refreshToken');

                res.json({
                    success: true,
                    message: 'Logout completed'
                });
            }
        }
    );

    /**
     * GET /auth/me
     * Get current user profile
     */
    router.get('/me',
        userAuthMiddleware.requireAuth,
        async (req: Request, res: Response): Promise<void> => {
            res.json({
                success: true,
                data: {
                    user: {
                        id: req.user!.id,
                        email: req.user!.email,
                        firstName: req.user!.firstName,
                        lastName: req.user!.lastName,
                        emailVerified: req.user!.emailVerified,
                        createdAt: req.user!.createdAt
                    }
                }
            });
        }
    );

    /**
     * POST /auth/forgot-password
     * Request password reset
     */
    router.post('/forgot-password',
        authRateLimit,
        csrfProtection.validateCSRF,
        validatePasswordReset,
        handleValidationErrors,
        async (req: Request, res: Response): Promise<void> => {
            try {
                const { email } = req.body;

                await userAuthService.requestPasswordReset(email);

                // Always return success to prevent email enumeration
                res.json({
                    success: true,
                    message: 'If an account with this email exists, a password reset link has been sent.'
                });
            } catch (error: any) {
                console.error('Password reset request error:', error);

                // Don't reveal if email service is not configured
                res.json({
                    success: true,
                    message: 'If an account with this email exists, a password reset link has been sent.'
                });
            }
        }
    );

    /**
     * POST /auth/reset-password
     * Reset password with token
     */
    router.post('/reset-password',
        authRateLimit,
        csrfProtection.validateCSRF,
        validateNewPassword,
        handleValidationErrors,
        async (req: Request, res: Response): Promise<void> => {
            try {
                const { email, token, newPassword } = req.body;

                await userAuthService.resetPassword({
                    email,
                    token,
                    newPassword
                });

                res.json({
                    success: true,
                    message: 'Password has been reset successfully'
                });
            } catch (error: any) {
                console.error('Password reset error:', error);

                res.status(400).json({
                    success: false,
                    error: error.message || 'Password reset failed'
                });
            }
        }
    );

    /**
     * GET /auth/verify-email
     * Verify email address
     */
    router.get('/verify-email', async (req: Request, res: Response) => {
        try {
            const { token } = req.query;

            if (!token || typeof token !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Verification token is required'
                });
                return;
            }

            await userAuthService.verifyEmail(token);

            res.json({
                success: true,
                message: 'Email verified successfully'
            });
        } catch (error: any) {
            console.error('Email verification error:', error);

            res.status(400).json({
                success: false,
                error: error.message || 'Email verification failed'
            });
        }
    });

    /**
     * GET /auth/csrf-token
     * Get CSRF token for frontend
     */
    router.get('/csrf-token',
        csrfProtection.generateCSRF,
        (req: Request, res: Response) => {
            res.json({
                success: true,
                data: {
                    csrfToken: req.csrfToken
                }
            });
        }
    );

    return router;
}