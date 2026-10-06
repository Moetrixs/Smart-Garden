const API_BASE = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getTelemetryLatest: () => request<{ data: any; meta: any }>('/api/telemetry/latest'),
  getTelemetryHistory: () => request<{ history: any[] }>('/api/telemetry/history'),
  getLogs: () => request<{ logs: any[] }>('/api/logs'),
  triggerIrrigation: () => request('/api/irrigation/trigger', { method: 'POST' }),
  stopIrrigation: () => request('/api/irrigation/stop', { method: 'POST' }),
  simulateAction: (action: string, value?: unknown) =>
    request<{ status?: string; simulationActive?: boolean; message?: string }>(`/api/simulate/action`, {
      method: 'POST',
      body: JSON.stringify({ action, value }),
    }),
  updateIrrigationSettings: (payload: Record<string, unknown>) =>
    request('/api/irrigation/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateControl: (payload: Record<string, unknown>) =>
    request('/api/control', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
