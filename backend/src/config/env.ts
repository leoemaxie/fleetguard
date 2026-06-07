import { config as loadDotEnv } from 'dotenv'
import { z } from 'zod'

loadDotEnv()

if (process.env.DB_SECRET) {
  try {
    const creds = JSON.parse(process.env.DB_SECRET)
    if (creds.host && creds.username && creds.password) {
      const dbname = creds.dbname || 'fleetguard'
      process.env.DATABASE_URL = `postgresql://${creds.username}:${creds.password}@${creds.host}:${creds.port || 5432}/${dbname}?sslmode=require`
    }
  } catch (err) {
    console.error('Failed to parse DB_SECRET:', err)
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  STAGE: z.string().min(1).default('dev'),
  SERVICE: z.string().optional(),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  AWS_REGION: z.string().min(1).default('af-south-1'),
  TELEMETRY_QUEUE_URL: z.string().url(),
  ALERT_QUEUE_URL: z.string().url(),
  RAW_LOGS_BUCKET: z.string().min(1),
  FIRMWARE_BUCKET: z.string().min(1),
  REPORTS_BUCKET: z.string().min(1),
  IOT_ENDPOINT: z.string().min(1),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`)
}

export const env = {
  ...parsed.data,
  ALLOWED_ORIGINS_LIST: parsed.data.ALLOWED_ORIGINS.split(',').map(origin =>
    origin.trim(),
  ),
}

export type Env = typeof env
