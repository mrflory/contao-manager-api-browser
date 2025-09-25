import axios, { AxiosInstance } from 'axios';

/**
 * Simple HTTP client for authentication API calls
 */
export class HttpClient {
  public axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: '/',
      timeout: 10000,
      withCredentials: true,
    });
  }

  /**
   * Make an API call with standardized error handling
   */
  async makeApiCall(url: string, options: RequestInit = {}, csrfToken?: string) {
    try {
      const headers = {
        ...options.headers,
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      };

      const config: any = {
        url,
        method: options.method || 'GET',
        headers,
        ...(options.body && { data: JSON.parse(options.body as string) }),
      };

      const response = await this.axios(config);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Request failed';

      return {
        success: false,
        error: errorMessage,
        statusCode: error.response?.status || 0,
      };
    }
  }
}