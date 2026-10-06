import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  handleControl,
  handleHistory,
  handleIrrigationSettings,
  handleIrrigationStop,
  handleIrrigationTrigger,
  handleLatestTelemetry,
  handleLogs,
  handleTelemetryIngest,
  handleTelemetryStream,
} from './src/server/telemetryApi';
import { handleSimulateAction } from './src/server/simulationApi';
import { startSimulationLoop } from './src/server/simulationLoop';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

// Telemetry ingestion & read endpoints
app.post('/api/telemetry', handleTelemetryIngest);
app.get('/api/telemetry/latest', handleLatestTelemetry);
app.get('/api/telemetry/history', handleHistory);
app.get('/api/telemetry/stream', handleTelemetryStream);

// Activity logs
app.get('/api/logs', handleLogs);

// Irrigation control (manual trigger / stop / schedule settings)
app.post('/api/irrigation/trigger', handleIrrigationTrigger);
app.post('/api/irrigation/stop', handleIrrigationStop);
app.post('/api/irrigation/settings', handleIrrigationSettings);

// Relay / pump control switches
app.post('/api/control', handleControl);

// Interactive simulation actions (button press, weather, soil node, battery)
app.post('/api/simulate/action', handleSimulateAction);

// Background gateway sensor simulation loop
startSimulationLoop();

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    // Dev mode: serve the app through Vite's middleware (HMR).
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve the pre-built static bundle.
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ESP32 Smart Telemetry & Irrigation Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
