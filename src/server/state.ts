import type { Response } from 'express';
import type { ActivityLog, TelemetryData } from '../types/telemetry';
import {
  createInitialTelemetry,
  createSeedHistory,
  createSeedLogs,
} from '../data/initialTelemetry';

/** Maximum number of telemetry snapshots kept in the in-memory ring buffer. */
const MAX_HISTORY = 300;
/** Maximum number of activity log entries kept in memory. */
const MAX_LOGS = 100;

export interface ServerCounters {
  totalPackets: number;
  espNowPackets: number;
}

interface TelemetryStoreState {
  telemetry: TelemetryData;
  history: TelemetryData[];
  logs: ActivityLog[];
  simulationActive: boolean;
  counters: ServerCounters;
}

const initialTelemetry = createInitialTelemetry();

const state: TelemetryStoreState = {
  telemetry: initialTelemetry,
  history: createSeedHistory(initialTelemetry),
  logs: createSeedLogs(),
  simulationActive: true,
  counters: { totalPackets: 184, espNowPackets: 176 },
};

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export function getTelemetry(): TelemetryData {
  return state.telemetry;
}

export function setTelemetry(next: TelemetryData): void {
  state.telemetry = next;
}

export function pushHistory(snapshot: TelemetryData): void {
  state.history.push(snapshot);
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

export function getHistory(): TelemetryData[] {
  return state.history;
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

let logCounter = 0;

export function addLog(
  type: ActivityLog['type'],
  node: ActivityLog['node'],
  message: string,
): ActivityLog {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${(logCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    node,
    message,
  };
  state.logs.unshift(log);
  if (state.logs.length > MAX_LOGS) state.logs.pop();
  return log;
}

export function getLogs(): ActivityLog[] {
  return state.logs;
}

// ---------------------------------------------------------------------------
// Simulation flag & packet counters
// ---------------------------------------------------------------------------

export function isSimulationActive(): boolean {
  return state.simulationActive;
}

export function setSimulationActive(active: boolean): void {
  state.simulationActive = active;
}

export function incrementTotalPackets(): void {
  state.counters.totalPackets += 1;
}

export function incrementEspNowPackets(): void {
  state.counters.espNowPackets += 1;
}

export function getCounters(): ServerCounters {
  return state.counters;
}

// ---------------------------------------------------------------------------
// SSE client registry
// ---------------------------------------------------------------------------

const sseClients = new Set<Response>();

export function registerSseClient(res: Response): void {
  sseClients.add(res);
}

export function unregisterSseClient(res: Response): void {
  sseClients.delete(res);
}

/** Sends a typed event to every connected SSE client, dropping dead sockets. */
export function broadcast(eventType: string, payload: unknown): void {
  const message = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

/** Broadcasts the current telemetry snapshot to all connected clients. */
export function broadcastTelemetry(): void {
  broadcast('telemetry_update', state.telemetry);
}

/** Adds a log entry and broadcasts both the log and the current telemetry. */
export function logAndBroadcast(
  type: ActivityLog['type'],
  node: ActivityLog['node'],
  message: string,
): void {
  const log = addLog(type, node, message);
  broadcast('new_log', log);
  broadcastTelemetry();
}
