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
  const base = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? '';
  const fullUrl = base ? `${base}${url}` : url;

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
