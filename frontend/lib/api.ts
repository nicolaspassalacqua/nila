const API_URL = "/api";

type RequestOptions = {
  method?: string;
  token?: string;
  tenantId?: string;
  body?: unknown;
};

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

async function fetchWithFallback(urlPath: string, init: RequestInit): Promise<Response> {
  const normalized = normalizePath(urlPath);
  const candidates = [`${API_URL}${normalized}`, `${API_URL}${normalized}/`];

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const response = await fetch(candidates[i], init);
      if (response.status !== 404 || i === candidates.length - 1) {
        return response;
      }
    } catch {
      if (i === candidates.length - 1) {
        throw new Error("Network error while contacting API");
      }
    }
  }
  throw new Error("Unexpected API routing state");
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.tenantId) {
    headers["X-Tenant-ID"] = options.tenantId;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetchWithFallback(path, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText} :: ${text}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export function getApiUrl(): string {
  return API_URL;
}
