export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  url: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const isServer = typeof window === 'undefined';
  let fullUrl = url;
  if (isServer) {
    fullUrl = `${process.env.PLATFORM_API_URL}${url}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(
      `API Error: ${response.statusText}`,
      response.status,
      response
    );
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}
