import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passkey } from "@better-auth/passkey";
import { twoFactor } from "better-auth/plugins";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma";
import { EmailService } from "../services/emailService";

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize email service
const emailService = new EmailService();

// Get app URL for email links and WebAuthn
const appUrl = process.env.APP_URL || "http://localhost:3000";
const rpId = process.env.WEBAUTHN_RP_ID || new URL(appUrl).hostname;
const rpName = process.env.WEBAUTHN_RP_NAME || "Contao Update & Backup Service";

// TOTP issuer name without special characters (& causes URL encoding issues)
const totpIssuer = process.env.TOTP_ISSUER || "Contao Manager";

// Get the frontend origin for WebAuthn (may differ from backend in development)
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Better Auth configuration with passkey and 2FA support
 *
 * This replaces the custom JWT-based authentication with a modern
 * authentication system supporting:
 * - Email/password authentication (bcrypt compatible with existing users)
 * - Passkey/WebAuthn authentication
 * - TOTP two-factor authentication
 * - Session management with cookies
 */
export const auth = betterAuth({
  // Database configuration using Prisma adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Base URL for the application
  baseURL: appUrl,
  basePath: "/api/auth",

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later when ready
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,

    // Use bcrypt with 12 salt rounds for password compatibility
    // Existing users with bcrypt passwords can log in without re-hashing
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 12);
      },
      verify: async ({ hash, password }: { hash: string; password: string }) => {
        return await bcrypt.compare(password, hash);
      },
    },

    // Password reset email handler
    sendResetPassword: async ({ user, url }) => {
      if (!emailService.isConfigured()) {
        console.warn("[Auth] Email service not configured, cannot send password reset");
        return;
      }

      await emailService.sendEmail({
        to: user.email,
        subject: "Reset Your Password - Contao Update & Backup Service",
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>Or copy this link: ${url}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>Contao Update & Backup Service</p>
        `,
      });
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },

  // Email verification configuration
  emailVerification: {
    sendOnSignUp: emailService.isConfigured(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!emailService.isConfigured()) {
        console.warn("[Auth] Email service not configured, cannot send verification email");
        return;
      }

      await emailService.sendEmail({
        to: user.email,
        subject: "Verify Your Email - Contao Update & Backup Service",
        html: `
          <h2>Welcome!</h2>
          <p>Hello,</p>
          <p>Thank you for signing up. Please verify your email address:</p>
          <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
          <p>Or copy this link: ${url}</p>
          <p>Best regards,<br>Contao Update & Backup Service</p>
        `,
      });
    },
  },

  // Session configuration matching previous JWT behavior
  session: {
    expiresIn: 60 * 60, // 1 hour (matches previous ACCESS_TOKEN_EXPIRES)
    updateAge: 60 * 15, // Refresh session every 15 minutes
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  // Trusted origins for CORS
  trustedOrigins: [
    appUrl,
    frontendOrigin,
    "http://localhost:3000",
    "http://localhost:5173", // Vite dev server
  ].filter((v, i, a) => v && a.indexOf(v) === i), // Filter duplicates

  // Plugins for passkey and 2FA
  plugins: [
    // Passkey/WebAuthn authentication
    // In development, frontend runs on different port (5173) than backend (3000)
    passkey({
      rpID: rpId,
      rpName: rpName,
      origin: process.env.NODE_ENV === "production" ? appUrl : frontendOrigin,
    }),

    // Two-factor authentication (TOTP)
    twoFactor({
      issuer: totpIssuer,  // Use simple name without special characters
      totpOptions: {
        digits: 6,
        period: 30,
      },
      // Backup codes generation
      backupCodeOptions: {
        length: 10,
        count: 10,
      },
    }),
  ],

  // Advanced options
  advanced: {
    // Generate cuid-like IDs for compatibility with existing schema
    generateId: () => {
      const chars = "cdefhjkmnprtvwxy2345689";
      let id = "c"; // Start with 'c' like cuid
      for (let i = 0; i < 24; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
      return id;
    },
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === "production",
    // Default cookie attributes
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax" as const,
    },
  },
});

// Export types for use in other files
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// Export Prisma client for use in migration scripts
export { prisma };
