import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '../config/env.js'
import { LIVE_CACHE_PREFIX } from '../config/constants.js'
import { db } from '../db/client.js'
import {
  deviceRegistry,
  fuelEvents,
  gpsEvents,
  trips,
  vehicles,
} from '../db/schema/index.js'
import { deleteMessage, receiveMessages } from '../lib/sqs.js'
import { redis } from '../redis/client.js'
import { SQSClient } from '@aws-sdk/client-sqs'

const gpsPayloadSchema = z.object({
  kind: z.literal('gps'),
  ts: z.string().datetime(),
  lat: z.number(),
  lon: z.number(),
  speedKph: z.number().nonnegative(),
  headingDeg: z.number().int().optional(),
  altitudeM: z.number().optional(),
  serverTs: z.string().datetime(),
  tenantId: z.string().uuid(),
  vehicleId: z.string().uuid(),
})

const fuelPayloadSchema = z.object({
  kind: z.literal('fuel'),
  ts: z.string().datetime(),
  litresPerMin: z.number().nonnegative(),
  cumulativeLitres: z.number().nonnegative(),
  tankLevelPct: z.number().min(0).max(100),
  serverTs: z.string().datetime(),
  tenantId: z.string().uuid(),
  vehicleId: z.string().uuid(),
})

const payloadSchema = z.discriminatedUnion('kind', [
  gpsPayloadSchema,
  fuelPayloadSchema,
])

export async function startTelemetryWorker(signal: AbortSignal): Promise<void> {
  const sqs = new SQSClient({ region: env.AWS_REGION })
  if (redis.status !== 'ready' && redis.status !== 'connecting') {
    await redis.connect()
  }

  while (!signal.aborted) {
    const messages = await receiveMessages(sqs, env.TELEMETRY_QUEUE_URL, 10)

    await Promise.all(
      messages.map(async message => {
        if (!message.Body || !message.ReceiptHandle) {
          return
        }

        const parsed = payloadSchema.safeParse(JSON.parse(message.Body))
        if (!parsed.success) {
          return
        }

        const event = parsed.data

        const [device] = await db
          .select()
          .from(deviceRegistry)
          .where(
            and(
              eq(deviceRegistry.tenantId, event.tenantId),
              eq(deviceRegistry.vehicleId, event.vehicleId),
              eq(deviceRegistry.isProvisioned, true),
            ),
          )
          .limit(1)

        if (!device) {
          return
        }

        if (event.kind === 'gps') {
          const [activeTrip] = await db
            .select()
            .from(trips)
            .where(
              and(
                eq(trips.tenantId, event.tenantId),
                eq(trips.vehicleId, event.vehicleId),
                eq(trips.status, 'active'),
              ),
            )
            .limit(1)

          const tripId = activeTrip?.id

          await db.insert(gpsEvents).values({
            tenantId: event.tenantId,
            vehicleId: event.vehicleId,
            tripId,
            ts: new Date(event.ts),
            lat: String(event.lat),
            lon: String(event.lon),
            speedKph: String(event.speedKph),
            headingDeg: event.headingDeg,
            altitudeM: event.altitudeM ? String(event.altitudeM) : null,
            serverTs: new Date(event.serverTs),
          })

          if (!activeTrip) {
            const [vehicle] = await db
              .select({ assignedDriverId: vehicles.assignedDriverId })
              .from(vehicles)
              .where(
                and(
                  eq(vehicles.id, event.vehicleId),
                  eq(vehicles.tenantId, event.tenantId),
                ),
              )
              .limit(1)
            if (vehicle?.assignedDriverId) {
              await db.insert(trips).values({
                tenantId: event.tenantId,
                vehicleId: event.vehicleId,
                driverId: vehicle.assignedDriverId,
                startTime: new Date(event.ts),
                status: 'active',
              })
            }
          }

          await redis.set(
            `${LIVE_CACHE_PREFIX}:${event.tenantId}:${event.vehicleId}`,
            JSON.stringify({
              ts: event.ts,
              lat: event.lat,
              lon: event.lon,
              speedKph: event.speedKph,
            }),
            'EX',
            60,
          )
        }

        if (event.kind === 'fuel') {
          const [activeTrip] = await db
            .select()
            .from(trips)
            .where(
              and(
                eq(trips.tenantId, event.tenantId),
                eq(trips.vehicleId, event.vehicleId),
                eq(trips.status, 'active'),
              ),
            )
            .limit(1)

          await db.insert(fuelEvents).values({
            tenantId: event.tenantId,
            vehicleId: event.vehicleId,
            tripId: activeTrip?.id,
            ts: new Date(event.ts),
            litresPerMin: String(event.litresPerMin),
            cumulativeLitres: String(event.cumulativeLitres),
            tankLevelPct: String(event.tankLevelPct),
            serverTs: new Date(event.serverTs),
          })

          await redis.set(
            `${LIVE_CACHE_PREFIX}:${event.tenantId}:${event.vehicleId}`,
            JSON.stringify({
              ts: event.ts,
              fuel: event.tankLevelPct,
              litresPerMin: event.litresPerMin,
            }),
            'EX',
            60,
          )
        }

        await deleteMessage(sqs, env.TELEMETRY_QUEUE_URL, message.ReceiptHandle)
      }),
    )
  }
}
