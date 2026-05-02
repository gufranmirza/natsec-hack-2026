import 'server-only';

export async function serverApiClient<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = `${process.env.PLATFORM_API_URL}${url}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}
