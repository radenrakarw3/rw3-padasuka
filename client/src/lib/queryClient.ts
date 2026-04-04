import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function readJsonSafely<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 140).trim();
    throw new Error(snippet ? `Respons server tidak valid: ${snippet}` : "Respons server tidak valid");
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const controller = options?.timeoutMs ? new AbortController() : undefined;
  const timeout = controller
    ? setTimeout(() => controller.abort(), options.timeoutMs)
    : undefined;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller?.signal,
    });
  } catch (error: any) {
    if (timeout) clearTimeout(timeout);
    if (error?.name === "AbortError") {
      throw new Error("Permintaan ke server terlalu lama. Silakan coba lagi.");
    }
    throw error;
  }

  if (timeout) clearTimeout(timeout);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return await readJsonSafely<T>(res);
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
