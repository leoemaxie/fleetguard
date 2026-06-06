import { buildApp } from '../../src/app.js'

export async function buildTestApp() {
  return buildApp({ logger: false })
}
