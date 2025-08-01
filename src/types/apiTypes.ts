export interface ApiCallState<T = any> {
  data?: T;
  loading: boolean;
  error?: string;
}

export interface ApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface LoadingStates {
  [key: string]: boolean;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  requiresAuth?: boolean;
}

export type ApiFunction<T = any, P = any> = (params?: P) => Promise<T>;