import { ApiError } from './api-client';

export interface ErrorResult<T> {
  data: T | null;
  error: string | null;
  status?: number;
}

export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  fallbackData: T | null = null
): Promise<ErrorResult<T>> {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (error) {
    console.error('API call failed:', error);

    // Handle different error types
    if (error instanceof ApiError) {
      return {
        data: fallbackData,
        error: `API Error: ${error.message}`,
        status: error.status,
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return {
        data: fallbackData,
        error: 'Network error: Unable to connect to server',
        status: 0,
      };
    }

    // Generic error fallback
    return {
      data: fallbackData,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
