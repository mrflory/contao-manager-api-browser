import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  authClient,
  signIn,
  signUp,
  signOut,
  useSession,
  passkey,
  twoFactor,
} from '../lib/auth-client';

// Types - Maintaining backward compatibility with the old interface
export interface User {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
  image?: string | null;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isTokenReady: boolean;
}

export interface AuthContextType extends AuthState {
  // Basic auth methods
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;

  // Two-factor authentication methods
  enableTwoFactor: (password: string) => Promise<{ totpURI: string; backupCodes: string[] }>;
  verifyTwoFactor: (code: string) => Promise<boolean>;
  disableTwoFactor: (password: string) => Promise<void>;
  getTwoFactorStatus: () => Promise<boolean>;

  // Passkey methods
  registerPasskey: (name?: string) => Promise<void>;
  signInWithPasskey: () => Promise<void>;
  listPasskeys: () => Promise<Array<{ id: string; name: string | null; createdAt: Date | null }>>;
  deletePasskey: (id: string) => Promise<void>;

  // Password management
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, isPending: isLoading, error: sessionError } = useSession();
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = !!session?.user;
  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        image: session.user.image,
        twoFactorEnabled: session.user.twoFactorEnabled,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      }
    : null;

  // Better Auth uses cookies, so we're always "ready" once session is loaded
  const isTokenReady = isAuthenticated && !isLoading;

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<void> => {
      try {
        setAuthError(null);
        const result = await signIn.email({
          email,
          password,
          rememberMe,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Login failed');
        }
      } catch (err: any) {
        const message = err.message || 'Login failed. Please try again.';
        setAuthError(message);
        throw new Error(message);
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<void> => {
      try {
        setAuthError(null);
        const result = await signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
        });

        if (result.error) {
          throw new Error(result.error.message || 'Registration failed');
        }
      } catch (err: any) {
        const message = err.message || 'Registration failed. Please try again.';
        setAuthError(message);
        throw new Error(message);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
      // Continue even if logout fails on server
    }
  }, []);

  const clearError = useCallback((): void => {
    setAuthError(null);
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; email?: string }): Promise<void> => {
      try {
        setAuthError(null);
        // Better Auth provides update user functionality through the API
        const result = await authClient.updateUser({
          name: data.name,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Profile update failed');
        }
      } catch (err: any) {
        const message = err.message || 'Profile update failed';
        setAuthError(message);
        throw new Error(message);
      }
    },
    []
  );

  // Two-Factor Authentication Methods
  const enableTwoFactor = useCallback(async (password: string): Promise<{ totpURI: string; backupCodes: string[] }> => {
    try {
      setAuthError(null);
      console.log('[Auth] Enabling 2FA...');
      const result = await twoFactor.enable({ password });
      console.log('[Auth] 2FA enable response:', result);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to enable 2FA');
      }

      const totpURI = result.data?.totpURI || '';
      const backupCodes = result.data?.backupCodes || [];
      console.log('[Auth] TOTP URI:', totpURI);
      console.log('[Auth] Backup codes count:', backupCodes.length);

      return { totpURI, backupCodes };
    } catch (err: any) {
      console.error('[Auth] enableTwoFactor error:', err);
      const message = err.message || 'Failed to enable two-factor authentication';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const verifyTwoFactor = useCallback(async (code: string): Promise<boolean> => {
    try {
      setAuthError(null);
      const result = await twoFactor.verifyTotp({ code });

      if (result.error) {
        throw new Error(result.error.message || 'Invalid verification code');
      }

      return true;
    } catch (err: any) {
      const message = err.message || 'Failed to verify code';
      setAuthError(message);
      return false;
    }
  }, []);

  const disableTwoFactor = useCallback(async (password: string): Promise<void> => {
    try {
      setAuthError(null);
      const result = await twoFactor.disable({ password });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to disable 2FA');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to disable two-factor authentication';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const getTwoFactorStatus = useCallback(async (): Promise<boolean> => {
    return user?.twoFactorEnabled || false;
  }, [user]);

  // Passkey Methods
  const registerPasskey = useCallback(async (name?: string): Promise<void> => {
    try {
      setAuthError(null);
      console.log('[Auth] Registering passkey with name:', name);
      const result = await passkey.addPasskey({ name });
      console.log('[Auth] addPasskey response:', result);

      if (result?.error) {
        console.error('[Auth] addPasskey error:', result.error);
        throw new Error(result.error.message || 'Failed to register passkey');
      }

      console.log('[Auth] Passkey registered successfully');
    } catch (err: any) {
      console.error('[Auth] registerPasskey exception:', err);
      const message = err.message || 'Failed to register passkey';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const signInWithPasskey = useCallback(async (): Promise<void> => {
    try {
      setAuthError(null);
      const result = await signIn.passkey();

      if (result?.error) {
        throw new Error(result.error.message || 'Passkey authentication failed');
      }
    } catch (err: any) {
      const message = err.message || 'Passkey authentication failed';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const listPasskeys = useCallback(async (): Promise<Array<{ id: string; name: string | null; createdAt: Date | null }>> => {
    try {
      // Better Auth uses listUserPasskeys, not listPasskeys
      const result = await passkey.listUserPasskeys();
      console.log('[Auth] listUserPasskeys response:', result);

      if (result.error) {
        console.error('[Auth] listUserPasskeys error:', result.error);
        return [];
      }

      // Better Auth returns passkeys in result.data
      const passkeys = result.data || [];
      console.log('[Auth] Parsed passkeys:', passkeys);
      return passkeys;
    } catch (err: any) {
      console.error('[Auth] Failed to list passkeys:', err);
      return [];
    }
  }, []);

  const deletePasskey = useCallback(async (id: string): Promise<void> => {
    try {
      setAuthError(null);
      const result = await passkey.deletePasskey({ id });

      if (result?.error) {
        throw new Error(result.error.message || 'Failed to delete passkey');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to delete passkey';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  // Password Reset Methods
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    try {
      setAuthError(null);
      const result = await authClient.forgetPassword({ email });

      if (result?.error) {
        throw new Error(result.error.message || 'Failed to send reset email');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to send password reset email';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    try {
      setAuthError(null);
      const result = await authClient.resetPassword({
        token,
        newPassword,
      });

      if (result?.error) {
        throw new Error(result.error.message || 'Failed to reset password');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to reset password';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const contextValue: AuthContextType = {
    // State
    isAuthenticated,
    user,
    isLoading,
    error: authError || (sessionError?.message || null),
    isTokenReady,

    // Basic auth methods
    login,
    register,
    logout,
    clearError,
    updateProfile,

    // Two-factor authentication
    enableTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    getTwoFactorStatus,

    // Passkeys
    registerPasskey,
    signInWithPasskey,
    listPasskeys,
    deletePasskey,

    // Password management
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
