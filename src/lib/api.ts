import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";

// The app's only way to call its API routes. Each call carries the Clerk session
// token, which the routes verify before doing any work.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function useApiFetch() {
  const { getToken, signOut } = useAuth();
  // Clerk can hand back new functions on any render. Reading them from a ref keeps
  // apiFetch stable, so effects that depend on it don't refetch after every response.
  const auth = useRef({ getToken, signOut });
  useLayoutEffect(() => {
    auth.current = { getToken, signOut };
  }, [getToken, signOut]);

  return useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await auth.current.getToken();
      const response = await fetch(path, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
      if (response.status === 401) {
        toast.error("Your session ended.", "Sign in again.");
        await auth.current.signOut();
      }
      if (!response.ok || body === null) {
        throw new ApiError(body?.error ?? "Something went wrong. Try again.", response.status);
      }
      return body;
    },
    [],
  );
}

export type ApiState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiError }
  | { status: "ready"; data: T; error?: undefined };

/** GETs `path` when it changes, with loading, error and retry. */
export function useApiQuery<T>(path: string | null) {
  const apiFetch = useApiFetch();
  const [attempt, setAttempt] = useState(0);
  // Each result remembers which request it answers, so a new path or a retry reads as
  // loading until its own answer arrives (no state is set synchronously in the effect).
  const [result, setResult] = useState<{ key: string; state: ApiState<T> } | null>(null);
  const key = path ? `${path}#${attempt}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let current = true;
    apiFetch<T>(path)
      .then((data) => {
        if (current) setResult({ key, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setResult({
          key,
          state: {
            status: "error",
            error: error instanceof ApiError ? error : new ApiError("Check your connection and try again.", 0),
          },
        });
      });
    return () => {
      current = false;
    };
  }, [apiFetch, path, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: ApiState<T> = result && result.key === key ? result.state : { status: "loading" };
  return { ...state, retry };
}
