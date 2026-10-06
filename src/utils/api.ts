// Shared helpers for talking to the telemetry REST API from the browser.

/**
 * POSTs JSON to the given API path and returns the parsed JSON response.
 * Throws on network errors or non-2xx HTTP status codes.
 */
export async function postJson<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

/** GETs and parses a JSON response from the given API path. */
export async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Fire-and-forget helper: performs an API call and logs failures to the console. */
export async function apiCall(path: string, body?: unknown): Promise<void> {
  try {
    await postJson(path, body);
  } catch (err) {
    console.error(`API call to ${path} failed:`, err);
  }
}
