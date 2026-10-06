import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number | undefined;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [latest, historyRes, logRes] = await Promise.all([
          api.getTelemetryLatest(),
          api.getTelemetryHistory(),
          api.getLogs(),
        ]);

        setTelemetry(latest.data ?? null);
        setHistory(historyRes.history ?? []);
        setLogs(logRes.logs ?? []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data telemetry');
      } finally {
        setLoading(false);
      }
    };

    const connectStream = () => {
      eventSource = new EventSource('/api/telemetry/stream');

      eventSource.onopen = () => setIsStreaming(true);
      eventSource.onerror = () => {
        setIsStreaming(false);
        eventSource?.close();
        reconnectTimeout = window.setTimeout(connectStream, 3000);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'initial_state') {
            if (payload.payload) setTelemetry(payload.payload);
            if (payload.history) setHistory(payload.history);
            if (payload.logs) setLogs(payload.logs);
          }

          if (payload.type === 'telemetry_update') {
            setTelemetry(payload.payload);
            setHistory((prev) => [...prev, payload.payload].slice(-150));
          }

          if (payload.type === 'new_log') {
            setLogs((prev) => [payload.payload, ...prev.slice(0, 99)]);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };
    };

    loadInitialData();
    connectStream();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return { telemetry, history, logs, isStreaming, loading, error };
}
