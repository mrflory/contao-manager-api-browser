import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { HttpClient } from '../services/httpClient';

// Types
export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    createdAt: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    error: string | null;
    csrfToken: string | null;
}

export interface AuthContextType extends AuthState {
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    clearError: () => void;
    getCsrfToken: () => Promise<void>;
}

// Action types
type AuthAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string } }
    | { type: 'LOGOUT' }
    | { type: 'SET_USER'; payload: User }
    | { type: 'SET_CSRF_TOKEN'; payload: string }
    | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    isLoading: true,
    error: null,
    csrfToken: null,
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
        const httpClient = new HttpClient();

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

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        await refreshToken();
                        const token = getStoredToken();
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return httpClient.axios(originalRequest);
                        }
                    } catch (refreshError) {
                        logout();
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            httpClient.axios.interceptors.request.eject(requestInterceptor);
            httpClient.axios.interceptors.response.eject(responseInterceptor);
        };
    }, [state.accessToken, state.csrfToken]);

    // Initialize auth state on app start
    useEffect(() => {
        const initializeAuth = async () => {
            const token = getStoredToken();

            if (token) {
                try {
                    // Verify token by fetching current user
                    const httpClient = new HttpClient();
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
                        removeStoredToken();
                        dispatch({ type: 'SET_LOADING', payload: false });
                    }
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    removeStoredToken();
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }

            // Always fetch CSRF token
            await getCsrfToken();
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            const httpClient = new HttpClient();
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
        password: string,
        firstName?: string,
        lastName?: string
    ): Promise<void> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            const httpClient = new HttpClient();
            const response = await httpClient.makeApiCall('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, firstName, lastName }),
            }, state.csrfToken || undefined);

            if (response.success) {
                dispatch({ type: 'SET_LOADING', payload: false });
                // Don't automatically log in - let user handle email verification
            } else {
                throw new Error(response.error || 'Registration failed');
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
            const httpClient = new HttpClient();
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
            const httpClient = new HttpClient();
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
            const httpClient = new HttpClient();
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

    const contextValue: AuthContextType = {
        ...state,
        login,
        register,
        logout,
        refreshToken,
        clearError,
        getCsrfToken,
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