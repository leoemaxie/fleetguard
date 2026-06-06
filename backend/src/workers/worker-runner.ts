import { startAlertWorker } from './alert-processing.worker.js';
import { startTelemetryWorker } from './telemetry-ingest.worker.js';

const controller = new AbortController();

async function run(): Promise<void> {
  await Promise.all([startTelemetryWorker(controller.signal), startAlertWorker(controller.signal)]);
}

process.on('SIGTERM', () => {
  controller.abort();
});

process.on('SIGINT', () => {
  controller.abort();
});

void run();
