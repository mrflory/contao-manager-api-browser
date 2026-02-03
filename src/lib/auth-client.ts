import { createAuthClient } from 'better-auth/react';
import { passkeyClient } from '@better-auth/passkey/client';
import { twoFactorClient } from 'better-auth/client/plugins';

/**
 * Better Auth React Client
 *
 * Provides authentication hooks and methods for the React frontend.
 * Includes passkey (WebAuthn) and two-factor authentication support.
 */
export const authClient = createAuthClient({
  // Base URL is relative - Better Auth will use the current origin
  baseURL: window.location.origin,

  plugins: [
    // Passkey/WebAuthn authentication
    passkeyClient(),

    // Two-factor authentication (TOTP)
    twoFactorClient({
      // Redirect to 2FA verification page when required
      onTwoFactorRedirect() {
        window.location.href = '/2fa-verify';
      },
    }),
  ],
});

// Export commonly used hooks and methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // Passkey methods
  passkey,
  // Two-factor methods
  twoFactor,
} = authClient;

// Type exports for use in components
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
