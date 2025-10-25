import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

export interface UserRegistrationData {
    email: string;
    password: string;
}

export interface UserLoginData {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface JWTTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    emailVerified: Date | null;
    isActive: boolean;
    createdAt: Date;
}

export interface JWTPayload {
    userId: string;
    email: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

export interface PasswordResetData {
    email: string;
    token: string;
    newPassword: string;
}

export class UserAuthService {
    private prisma: PrismaClient;
    private jwtSecret: string;
    private jwtRefreshSecret: string;
    private emailTransporter: nodemailer.Transporter | null = null;
    private readonly SALT_ROUNDS = 12;
    private readonly ACCESS_TOKEN_EXPIRES = '1h';  // Extended from 15m to 1h for better UX
    private readonly REFRESH_TOKEN_EXPIRES = '7d';
    private readonly REMEMBER_ME_EXPIRES = '30d';

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;

        // JWT secrets from environment variables
        this.jwtSecret = process.env.JWT_SECRET || this.generateSecret();
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.generateSecret();

        // Warn if using generated secrets in production
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
            console.warn('WARNING: JWT secrets not provided in environment variables. Using generated secrets.');
        }

        // Initialize email transporter if email configuration is provided
        this.initializeEmailTransporter();
    }

    private generateSecret(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    private initializeEmailTransporter(): void {
        const emailConfig = {
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };

        if (emailConfig.host && emailConfig.auth.user) {
            this.emailTransporter = nodemailer.createTransport(emailConfig);
            console.log('Email transporter initialized');
        } else {
            console.warn('Email configuration not provided. Email verification will be disabled.');
        }
    }

    /**
     * Hash a password using bcrypt with salt rounds
     */
    public async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }

    /**
     * Verify a password against its hash
     */
    public async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT tokens (access and refresh)
     */
    public generateTokens(user: AuthenticatedUser, rememberMe: boolean = false): JWTTokens {
        const accessTokenExpires = rememberMe ? this.REMEMBER_ME_EXPIRES : this.ACCESS_TOKEN_EXPIRES;
        const refreshTokenExpires = rememberMe ? this.REMEMBER_ME_EXPIRES : this.REFRESH_TOKEN_EXPIRES;

        const accessPayload: JWTPayload = {
            userId: user.id,
            email: user.email,
            type: 'access'
        };

        const refreshPayload: JWTPayload = {
            userId: user.id,
            email: user.email,
            type: 'refresh'
        };

        const accessToken = jwt.sign(accessPayload, this.jwtSecret, { expiresIn: accessTokenExpires });
        const refreshToken = jwt.sign(refreshPayload, this.jwtRefreshSecret, { expiresIn: refreshTokenExpires });

        return {
            accessToken,
            refreshToken
        };
    }

    /**
     * Verify and decode a JWT token
     */
    public verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload {
        const secret = type === 'access' ? this.jwtSecret : this.jwtRefreshSecret;

        try {
            const decoded = jwt.verify(token, secret) as JWTPayload;

            if (decoded.type !== type) {
                throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
            }

            return decoded;
        } catch (error) {
            throw new Error(`Invalid ${type} token`);
        }
    }

    /**
     * Register a new user
     */
    public async register(userData: UserRegistrationData): Promise<{ user: AuthenticatedUser; requiresVerification: boolean }> {
        const { email, password } = userData;

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Validate password strength (basic validation)
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Hash the password
        const passwordHash = await this.hashPassword(password);

        // Create the user
        const newUser = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                emailVerified: !this.emailTransporter ? new Date() : null, // Auto-verify if email is disabled
                isActive: true
            }
        });

        // Send verification email if email service is available
        let requiresVerification = false;
        if (this.emailTransporter && newUser.emailVerified === null) {
            await this.sendVerificationEmail(newUser.email, newUser.id);
            requiresVerification = true;
        }

        // Create default free subscription
        await this.prisma.subscription.create({
            data: {
                userId: newUser.id,
                planType: 'free',
                status: 'active',
                features: {
                    maxSites: 1,
                    apiAccess: true,
                    emailSupport: false
                }
            }
        });

        return {
            user: this.mapUserToAuthenticatedUser(newUser),
            requiresVerification
        };
    }

    /**
     * Login user with email and password
     */
    public async login(loginData: UserLoginData): Promise<{ user: AuthenticatedUser; tokens: JWTTokens }> {
        const { email, password, rememberMe = false } = loginData;

        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email }
        });

        if (!user || !user.isActive) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Check if email is verified (if verification is enabled)
        if (this.emailTransporter && user.emailVerified === null) {
            throw new Error('Email address not verified. Please check your email for verification link.');
        }

        // Generate tokens
        const authenticatedUser = this.mapUserToAuthenticatedUser(user);
        const tokens = this.generateTokens(authenticatedUser, rememberMe);

        // Create session record
        await this.createSession(user.id, tokens.accessToken);

        return {
            user: authenticatedUser,
            tokens
        };
    }

    /**
     * Refresh access token using refresh token
     */
    public async refreshToken(refreshToken: string): Promise<JWTTokens> {
        // Verify refresh token
        const decoded = this.verifyToken(refreshToken, 'refresh');

        // Get user from database
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !user.isActive) {
            throw new Error('Invalid refresh token');
        }

        // Generate new tokens
        const authenticatedUser = this.mapUserToAuthenticatedUser(user);
        const tokens = this.generateTokens(authenticatedUser);

        // Create new session record
        await this.createSession(user.id, tokens.accessToken);

        return tokens;
    }

    /**
     * Get user by ID from JWT token
     */
    public async getUserFromToken(accessToken: string): Promise<AuthenticatedUser> {
        // Verify token
        const decoded = this.verifyToken(accessToken, 'access');

        // Get user from database
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }

        return this.mapUserToAuthenticatedUser(user);
    }

    /**
     * Logout user by invalidating session
     */
    public async logout(accessToken: string): Promise<void> {
        try {
            const decoded = this.verifyToken(accessToken, 'access');

            // Delete all sessions for this user
            await this.prisma.session.deleteMany({
                where: { userId: decoded.userId }
            });
        } catch (error) {
            // Token might be invalid, but we still want to complete logout
            console.log('Logout attempted with invalid token');
        }
    }

    /**
     * Request password reset
     */
    public async requestPasswordReset(email: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Don't reveal if email exists for security reasons
            return;
        }

        if (!this.emailTransporter) {
            // If email is not configured, we can't send the reset link
            // But we silently fail to prevent email enumeration
            console.warn('Email service not configured - password reset request ignored');
            return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Update user with reset token
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: resetTokenExpires
            }
        });

        // Send password reset email
        await this.sendPasswordResetEmail(email, resetToken);
    }

    /**
     * Reset password using reset token
     */
    public async resetPassword(resetData: PasswordResetData): Promise<void> {
        const { email, token, newPassword } = resetData;

        // Validate password strength
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching email and valid reset token
        const user = await this.prisma.user.findFirst({
            where: {
                email,
                passwordResetToken: hashedToken,
                passwordResetExpires: {
                    gt: new Date() // Token must not be expired
                }
            }
        });

        if (!user) {
            throw new Error('Invalid or expired password reset token');
        }

        // Hash the new password
        const passwordHash = await this.hashPassword(newPassword);

        // Update user's password and clear reset token
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null
            }
        });

        // Invalidate all existing sessions for security
        await this.prisma.session.deleteMany({
            where: { userId: user.id }
        });
    }

    /**
     * Verify email address
     */
    public async verifyEmail(token: string): Promise<void> {
        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching verification token
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationToken: hashedToken,
                emailVerified: null // Only verify if not already verified
            }
        });

        if (!user) {
            throw new Error('Invalid or expired email verification token');
        }

        // Update user's email verification status and clear token
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                emailVerificationToken: null
            }
        });
    }

    /**
     * Create session record in database
     */
    private async createSession(userId: string, accessToken: string): Promise<void> {
        // Extract expiration from token
        const decoded = jwt.decode(accessToken) as any;
        const expiresAt = new Date(decoded.exp * 1000);

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        await this.prisma.session.create({
            data: {
                userId,
                sessionToken,
                expiresAt
            }
        });
    }

    /**
     * Send verification email
     */
    private async sendVerificationEmail(email: string, userId: string): Promise<void> {
        if (!this.emailTransporter) {
            return;
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // Store hashed token in database
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationToken: hashedToken
            }
        });

        const verificationUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@contao-manager.com',
            to: email,
            subject: 'Verify your email address',
            html: `
                <h1>Welcome to Contao Manager API Browser</h1>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>If you didn't create this account, please ignore this email.</p>
            `
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    /**
     * Send password reset email
     */
    private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        if (!this.emailTransporter) {
            return;
        }

        const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@contao-manager.com',
            to: email,
            subject: 'Reset your password',
            html: `
                <h1>Password Reset Request</h1>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    /**
     * Map database user to AuthenticatedUser
     */
    private mapUserToAuthenticatedUser(user: any): AuthenticatedUser {
        return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt
        };
    }
}