import { supabase } from "@/infrastructure/supabase/client";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:4000"
).replace(/\/+$/, "");

export interface ApiRequestOptions {
  businessId?: string;
  query?: URLSearchParams;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  options: ApiRequestOptions = {},
  body?: unknown,
): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  let accessToken = session?.access_token;
  if (!accessToken) {
    const { data: { session: refreshedSession }, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(`No se pudo renovar la sesión de Supabase: ${refreshError.message}`);
    }
    accessToken = refreshedSession?.access_token;
  }
  if (!accessToken) {
    if (sessionError) {
      throw new Error(`No se pudo obtener la sesión de Supabase: ${sessionError.message}`);
    }
    throw new Error("Inicia sesión para continuar.");
  }

  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  });
  if (options.businessId) headers.set("X-Business-Id", options.businessId);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const url = new URL(`${apiBaseUrl}${path}`);
  options.query?.forEach((value, key) => url.searchParams.append(key, value));

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal: options.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`No se pudo conectar con la API en ${apiBaseUrl}.`);
  }

  const responseText = await response.text();
  let responseBody: unknown;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText) as unknown;
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const message = isRecord(responseBody) && typeof responseBody.error === "string"
      ? responseBody.error
      : typeof responseBody === "string" && responseBody.trim()
        ? responseBody
        : response.statusText || "Error de la API";
    throw new Error(`${message} (HTTP ${response.status})`);
  }

  if (responseBody === undefined) return undefined as T;
  if (typeof responseBody === "string") {
    throw new Error("La API devolvió una respuesta JSON no válida.");
  }
  return responseBody as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("POST", path, options, body);
  },
  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("PATCH", path, options, body);
  },
  delete<T = void>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("DELETE", path, options);
  },
};
