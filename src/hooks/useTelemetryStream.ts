import { useEffect, useRef, useState } from 'react';
import type { ActivityLog, TelemetryData } from '../types/telemetry';
import { soundEffects } from '../utils/audioAlert';

const MAX_CLIENT_HISTORY = 150;
const MAX_CLIENT_LOGS = 100;
const SSE_RECONNECT_DELAY_MS = 3000;
const STREAM_ENDPOINT = '/api/telemetry/stream';

interface InitialStatePayload {
  type: 'initial_state';
  payload: TelemetryData;
  history?: TelemetryData[];
  logs?: ActivityLog[];
}

interface TelemetryUpdatePayload {
  type: 'telemetry_update';
  payload: TelemetryData;
}

interface NewLogPayload {
  type: 'new_log';
  payload: ActivityLog;
}

type StreamMessage = InitialStatePayload | TelemetryUpdatePayload | NewLogPayload;

export interface TelemetryStreamState {
  telemetry: TelemetryData | null;
  history: TelemetryData[];
  logs: ActivityLog[];
  isStreaming: boolean;
}

/**
 * Subscribes to the server-sent telemetry stream and keeps local state in sync.
 * Handles automatic reconnection and plays audio alerts on notable events
 * (physical button presses, critical soil/battery readings).
 */
export function useTelemetryStream(): TelemetryStreamState {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const prevButtonState = useRef<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const playAlertsForUpdate = (data: TelemetryData) => {
      const currentBtn = data.gateway?.sensors?.buttonState ?? 0;
      if (currentBtn === 1 && prevButtonState.current === 0) {
        soundEffects.playButtonChime();
      }
      prevButtonState.current = currentBtn;

      const soilMoisture = data.soilNode?.sensors?.soilMoisture;
      if (soilMoisture !== undefined && (soilMoisture < 25 || data.soilNode?.battery?.status === 'critical')) {
        soundEffects.playAlertWarning();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as StreamMessage;
        switch (data.type) {
          case 'initial_state':
            if (data.payload) setTelemetry(data.payload);
            if (data.history) setHistory(data.history);
            if (data.logs) setLogs(data.logs);
            break;
          case 'telemetry_update':
            setTelemetry(data.payload);
            setHistory((prev) => [...prev, data.payload].slice(-MAX_CLIENT_HISTORY));
            playAlertsForUpdate(data.payload);
            break;
          case 'new_log':
            setLogs((prev) => [data.payload, ...prev].slice(0, MAX_CLIENT_LOGS));
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE message', err);
      }
    };

    const scheduleReconnect = () => {
      setIsStreaming(false);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connect, SSE_RECONNECT_DELAY_MS);
    };

    const connect = () => {
      try {
        eventSource = new EventSource(STREAM_ENDPOINT);
        eventSource.onopen = () => setIsStreaming(true);
        eventSource.onmessage = handleMessage;
        eventSource.onerror = () => {
          eventSource?.close();
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return { telemetry, history, logs, isStreaming };
}
