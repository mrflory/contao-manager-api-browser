import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult, ValidationChain } from 'express-validator';
import crypto from 'crypto';

// Extend Express Request type to include CSRF token
declare global {
    namespace Express {
        interface Request {
            csrfToken?: string;
        }
    }
}

/**
 * Security headers middleware using helmet
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Disable for development
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

/**
 * CORS configuration for multi-user environment
 */
export const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin) {
            return callback(null, true);
        }

        // Development - allow all localhost and local IPs
        if (process.env.NODE_ENV === 'development') {
            if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/)) {
                return callback(null, true);
            }
            // Also allow any origin in development for easier testing
            return callback(null, true);
        }

        // Production - check against allowed origins
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

        // If no allowed origins configured, allow same-origin requests
        if (allowedOrigins.length === 0 || (allowedOrigins.length === 1 && allowedOrigins[0] === '')) {
            console.warn('[CORS] No ALLOWED_ORIGINS configured, allowing all origins. Set ALLOWED_ORIGINS in production!');
            return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Log the rejected origin for debugging
        console.error(`[CORS] Origin not allowed: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token']
};

/**
 * Rate limiting configurations
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window per IP
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Trust proxy is configured in server.ts, so this will use X-Forwarded-For correctly
    skip: (_req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development';
    }
});

export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window per IP
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development';
    }
});

export const strictRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute per IP
    message: {
        success: false,
        error: 'Rate limit exceeded. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development';
    }
});

/**
 * Task polling rate limit - More permissive for workflow operations
 * Designed to support long-running workflows with frequent polling
 *
 * Note: This rate limit is applied BEFORE authentication middleware, so it uses
 * IP-based rate limiting. This is intentional to prevent abuse while still
 * allowing legitimate workflow polling operations.
 */
export const taskPollingRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // 2000 requests per window per IP (supports extended workflows with aggressive polling)
    message: {
        success: false,
        error: 'Too many task requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development';
    }
});

/**
 * CSRF Protection Middleware
 */
export class CSRFProtection {
    private tokens = new Map<string, { token: string; expires: number }>();
    private readonly TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

    /**
     * Generate a CSRF token for a session
     */
    public generateToken(sessionId: string): string {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + this.TOKEN_LIFETIME;

        this.tokens.set(sessionId, { token, expires });

        // Clean up expired tokens periodically
        this.cleanupExpiredTokens();

        return token;
    }

    /**
     * Validate a CSRF token
     */
    public validateToken(sessionId: string, providedToken: string): boolean {
        const stored = this.tokens.get(sessionId);

        if (!stored || stored.expires < Date.now()) {
            return false;
        }

        return stored.token === providedToken;
    }

    /**
     * Middleware to generate CSRF token
     */
    public generateCSRF = (req: Request, res: Response, next: NextFunction): void => {
        // Create a session ID based on IP and User-Agent for stateless CSRF
        const sessionId = crypto
            .createHash('sha256')
            .update(req.ip + (req.get('User-Agent') || ''))
            .digest('hex');

        const token = this.generateToken(sessionId);
        req.csrfToken = token;

        // Add token to response header
        res.setHeader('X-CSRF-Token', token);

        next();
    };

    /**
     * Middleware to validate CSRF token
     */
    public validateCSRF = (req: Request, res: Response, next: NextFunction): void => {
        // Skip CSRF validation for GET, HEAD, OPTIONS
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next();
        }

        // Skip CSRF validation in development mode for easier testing
        if (process.env.NODE_ENV === 'development') {
            return next();
        }

        // Create session ID
        const sessionId = crypto
            .createHash('sha256')
            .update(req.ip + (req.get('User-Agent') || ''))
            .digest('hex');

        // Get token from header or body
        const token = req.get('X-CSRF-Token') || req.body._csrf;

        if (!token || !this.validateToken(sessionId, token)) {
            res.status(403).json({
                success: false,
                error: 'Invalid CSRF token'
            });
            return;
        }

        next();
    };

    /**
     * Clean up expired tokens
     */
    private cleanupExpiredTokens(): void {
        const now = Date.now();
        for (const [sessionId, data] of this.tokens.entries()) {
            if (data.expires < now) {
                this.tokens.delete(sessionId);
            }
        }
    }
}

/**
 * Input validation middleware
 */
export const validateRegistration: ValidationChain[] = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

export const validateLogin: ValidationChain[] = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('RememberMe must be a boolean')
];

export const validatePasswordReset: ValidationChain[] = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
];

export const validateNewPassword: ValidationChain[] = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
];

/**
 * Validation error handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? (err as any).path : 'unknown',
                message: err.msg
            }))
        });
        return;
    }

    next();
};

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
    // Sanitize common XSS patterns in request body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return obj
            .replace(/[<>]/g, '') // Remove basic HTML tags
            .trim();
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Error handler specifically for authentication errors
 */
export const authErrorHandler = (error: any, _req: Request, res: Response, next: NextFunction): void => {
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
        return;
    }

    if (error.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Token expired'
        });
        return;
    }

    if (error.name === 'NotBeforeError') {
        res.status(401).json({
            success: false,
            error: 'Token not active'
        });
        return;
    }

    next(error);
};

/**
 * Create CSRF protection instance
 */
export const csrfProtection = new CSRFProtection();