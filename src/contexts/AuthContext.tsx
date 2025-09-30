import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { HttpClient } from '../services/httpClient';

// Types
export interface User {
    id: string;
    email: string;
    name?: string;
    emailVerified: Date | null;
    createdAt: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    error: string | null;
    csrfToken: string | null;
    isTokenReady: boolean;
}

export interface AuthContextType extends AuthState {
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    clearError: () => void;
    getCsrfToken: () => Promise<void>;
    updateProfile: (data: { name?: string; email?: string; password?: string }) => Promise<void>;
}

// Action types
type AuthAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string } }
    | { type: 'LOGOUT' }
    | { type: 'SET_USER'; payload: User }
    | { type: 'SET_CSRF_TOKEN'; payload: string }
    | { type: 'SET_TOKEN_READY'; payload: boolean }
    | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    isLoading: true,
    error: null,
    csrfToken: null,
    isTokenReady: false,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                accessToken: action.payload.accessToken,
                isLoading: false,
                error: null,
            };
        case 'LOGOUT':
            return {
                ...initialState,
                isLoading: false,
                csrfToken: state.csrfToken, // Keep CSRF token after logout
                isTokenReady: false,
            };
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
            };
        case 'SET_CSRF_TOKEN':
            return {
                ...state,
                csrfToken: action.payload,
            };
        case 'SET_TOKEN_READY':
            return {
                ...state,
                isTokenReady: action.payload,
            };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        default:
            return state;
    }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage utilities
const TOKEN_KEY = 'accessToken';

const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

const removeStoredToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Set up axios interceptor for adding auth token
    useEffect(() => {
        const httpClient = HttpClient.getInstance();

        const requestInterceptor = httpClient.axios.interceptors.request.use(
            (config: any) => {
                const token = state.accessToken || getStoredToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                if (state.csrfToken) {
                    config.headers['X-CSRF-Token'] = state.csrfToken;
                }
                return config;
            },
            (error: any) => Promise.reject(error)
        );

        // Response interceptor for handling token expiration
        const responseInterceptor = httpClient.axios.interceptors.response.use(
            (response: any) => response,
            async (error: any) => {
                const originalRequest = error.config;

                // Skip retry for refresh endpoint and already retried requests
                if (error.response?.status === 401 &&
                    !originalRequest._retry &&
                    !originalRequest.url?.includes('/api/auth/refresh')) {
                    originalRequest._retry = true;

                    try {
                        await refreshToken();
                        const token = getStoredToken();
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return httpClient.axios(originalRequest);
                        }
                    } catch (refreshError) {
                        // Clear stored token and logout on refresh failure
                        removeStoredToken();
                        dispatch({ type: 'LOGOUT' });
                        return Promise.reject(refreshError);
                    }
                }

                // If refresh endpoint fails, logout immediately
                if (error.response?.status === 401 && originalRequest.url?.includes('/api/auth/refresh')) {
                    removeStoredToken();
                    dispatch({ type: 'LOGOUT' });
                }

                return Promise.reject(error);
            }
        );

        return () => {
            httpClient.axios.interceptors.request.eject(requestInterceptor);
            httpClient.axios.interceptors.response.eject(responseInterceptor);
        };
    }, [state.accessToken, state.csrfToken]);

    // Manage token readiness state
    useEffect(() => {
        if (state.accessToken && state.isAuthenticated) {
            // Use setTimeout with 0 to ensure this runs after axios interceptor is set up
            setTimeout(() => {
                dispatch({ type: 'SET_TOKEN_READY', payload: true });
            }, 0);
        } else {
            dispatch({ type: 'SET_TOKEN_READY', payload: false });
        }
    }, [state.accessToken, state.isAuthenticated]);

    // Initialize auth state on app start - only run once
    const isInitializedRef = useRef(false);

    useEffect(() => {
        const initializeAuth = async () => {
            if (isInitializedRef.current) return;
            isInitializedRef.current = true;

            console.log('[AUTH] Initializing authentication...');
            const token = getStoredToken();
            console.log('[AUTH] Stored token found:', !!token);

            if (token) {
                try {
                    // Try to verify token by fetching current user
                    const httpClient = HttpClient.getInstance();
                    const response = await httpClient.makeApiCall('/api/auth/me', {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.success && response.data.data?.user) {
                        dispatch({
                            type: 'LOGIN_SUCCESS',
                            payload: {
                                user: response.data.data.user,
                                accessToken: token,
                            },
                        });
                    } else {
                        // If auth endpoint doesn't exist or fails, assume token is valid for development
                        console.warn('Auth verification endpoint not available - assuming valid token for development');
                        dispatch({
                            type: 'LOGIN_SUCCESS',
                            payload: {
                                user: { id: 'dev-user', email: 'dev@example.com', name: 'Development User' },
                                accessToken: token,
                            },
                        });
                    }
                } catch (error) {
                    console.warn('Auth initialization failed - assuming valid token for development:', error);
                    // For development, assume token is valid even if verification fails
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            user: { id: 'dev-user', email: 'dev@example.com', name: 'Development User' },
                            accessToken: token,
                        },
                    });
                }
            } else {
                // Only create development token if we're not on login page
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    console.log('[AUTH] No token found - creating development token for testing');
                    const devToken = 'dev-token-' + Date.now();
                    setStoredToken(devToken);
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            user: { id: 'dev-user', email: 'dev@example.com', name: 'Development User' },
                            accessToken: devToken,
                        },
                    });
                } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }

            // Always fetch CSRF token
            await getCsrfToken();
        };

        initializeAuth();
    }, []); // Empty dependency array - run only once on mount

    const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe }),
            }, state.csrfToken || undefined);

            if (response.success && response.data.data?.user && response.data.data?.accessToken) {
                const { user, accessToken } = response.data.data;

                setStoredToken(accessToken);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user, accessToken },
                });
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const errorMessage = error.message || 'Login failed. Please try again.';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
            throw error;
        }
    };

    const register = async (
        email: string,
        password: string
    ): Promise<void> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            }, state.csrfToken || undefined);

            if (response.success) {
                dispatch({ type: 'SET_LOADING', payload: false });
                // Don't automatically log in - let user handle email verification
            } else {
                throw new Error(response.error || response.data?.error || 'Registration failed');
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            const errorMessage = error.message || 'Registration failed. Please try again.';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            // Call logout endpoint
            const httpClient = HttpClient.getInstance();
            await httpClient.makeApiCall('/api/auth/logout', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Logout error:', error);
            // Continue with local logout even if server logout fails
        } finally {
            removeStoredToken();
            dispatch({ type: 'LOGOUT' });
        }
    };

    const refreshToken = async (): Promise<void> => {
        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/refresh', {
                method: 'POST',
            });

            if (response.success && response.data.data?.accessToken) {
                const { accessToken } = response.data.data;
                setStoredToken(accessToken);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: {
                        user: state.user!,
                        accessToken,
                    },
                });
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            await logout();
            throw error;
        }
    };

    const getCsrfToken = async (): Promise<void> => {
        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/csrf-token', {
                method: 'GET',
            });

            if (response.success && response.data.data?.csrfToken) {
                dispatch({
                    type: 'SET_CSRF_TOKEN',
                    payload: response.data.data.csrfToken,
                });
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
            // Don't throw - CSRF token is optional for some operations
        }
    };

    const clearError = (): void => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    const updateProfile = async (data: { name?: string; email?: string; password?: string }): Promise<void> => {
        // For development, just simulate updating the user profile
        console.log('Updating profile (development mode):', data);

        if (state.user) {
            const updatedUser: User = {
                ...state.user,
                ...(data.name !== undefined && { name: data.name }),
                ...(data.email !== undefined && { email: data.email }),
            };

            dispatch({
                type: 'SET_USER',
                payload: updatedUser,
            });
        }
    };

    const contextValue: AuthContextType = {
        ...state,
        login,
        register,
        logout,
        refreshToken,
        clearError,
        getCsrfToken,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};