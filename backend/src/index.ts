import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

void start();
