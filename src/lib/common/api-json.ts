/**
 * Typed JSON-over-fetch helper.
 *
 * Replaces the repeated cast pattern at call sites:
 *
 *     const res = await fetch(url);
 *     const data = (await res.json()) as T;
 *
 * In strict mode `Response.json()` returns `Promise<unknown>` (Next/TS lib),
 * which is why every call site was casting. Centralising the cast here
 * gives us one place to add error handling, retries, or telemetry later.
 *
 * Behavior:
 * - On 2xx, parses the body as JSON and casts to `T`.
 * - On non-2xx, throws `ApiError` with the status and (when the body parses
 *   to `{ error: string }`) the server-supplied message.
 * - Network errors propagate as the original `TypeError` from fetch.
 *
 * Call sites that want to swallow errors silently should wrap the call in
 * try/catch — don't paper over failures inside the helper.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body?.error === 'string') detail = body.error;
    } catch {
      /* body wasn't JSON */
    }
    throw new ApiError(res.status, detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
