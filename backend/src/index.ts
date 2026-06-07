import { env } from './config/env.js'
import { buildApp } from './app.js'

async function start(): Promise<void> {
  const app = await buildApp()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  if (env.SERVICE === 'telemetry-ingest') {
    app.log.info('Starting telemetry worker in background...')
    const { startTelemetryWorker } = await import('./workers/telemetry-ingest.worker.js')
    const controller = new AbortController()
    process.on('SIGTERM', () => controller.abort())
    process.on('SIGINT', () => controller.abort())
    void startTelemetryWorker(controller.signal)
  } else if (env.SERVICE === 'alert-processing') {
    app.log.info('Starting alert processing worker in background...')
    const { startAlertWorker } = await import('./workers/alert-processing.worker.js')
    const controller = new AbortController()
    process.on('SIGTERM', () => controller.abort())
    process.on('SIGINT', () => controller.abort())
    void startAlertWorker(controller.signal)
  } else if (env.SERVICE === 'route-sync') {
    app.log.info('Starting route sync service placeholder...')
    setInterval(() => {
      app.log.info('Route sync heartbeat')
    }, 60000)
  } else if (env.SERVICE === 'reporting') {
    app.log.info('Starting reporting service placeholder...')
    setInterval(() => {
      app.log.info('Reporting heartbeat')
    }, 60000)
  }
}

void start()
