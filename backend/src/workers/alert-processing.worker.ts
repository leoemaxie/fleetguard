import { and, eq } from 'drizzle-orm'
import { SQSClient } from '@aws-sdk/client-sqs'
import { z } from 'zod'
import {
  ALERT_CHANNEL_PREFIX,
  ALERT_DEDUP_PREFIX,
  IDLE_THRESHOLD_MINUTES_DEFAULT,
} from '../config/constants.js'
import { env } from '../config/env.js'
import { db } from '../db/client.js'
import { alerts, routes, tenants, trips, vehicles } from '../db/schema/index.js'
import { deleteMessage, receiveMessages } from '../lib/sqs.js'
import { redis } from '../redis/client.js'
import { detectFuelAnomaly } from '../services/anomaly/fuel-anomaly-detector.js'
import { isWithinCorridor } from '../services/anomaly/geofence-checker.js'
import { detectIdleExcess } from '../services/anomaly/idle-detector.js'
import { detectPrivateUse } from '../services/anomaly/private-use-detector.js'

const alertMessageSchema = z.object({
  tenantId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  ts: z.string().datetime(),
  lat: z.number(),
  lon: z.number(),
  speedKph: z.number().nonnegative(),
  source: z.enum(['device', 'server']),
})

type AlertType =
  | 'fuel_anomaly'
  | 'geofence_breach'
  | 'idle_excess'
  | 'private_use'
type AlertSeverity = 'critical' | 'warning'

type AlertCandidate = {
  type: AlertType
  severity: AlertSeverity
  description: string
}

export async function startAlertWorker(signal: AbortSignal): Promise<void> {
  const sqs = new SQSClient({ region: env.AWS_REGION })
  await redis.connect()

  while (!signal.aborted) {
    const messages = await receiveMessages(sqs, env.ALERT_QUEUE_URL, 10)

    await Promise.all(
      messages.map(async message => {
        if (!message.Body || !message.ReceiptHandle) {
          return
        }

        const parsed = alertMessageSchema.safeParse(JSON.parse(message.Body))
        if (!parsed.success) {
          return
        }

        const payload = parsed.data

        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, payload.tenantId))
          .limit(1)
        const [vehicle] = await db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.id, payload.vehicleId),
              eq(vehicles.tenantId, payload.tenantId),
            ),
          )
          .limit(1)

        if (!tenant || !vehicle) {
          return
        }

        const [activeTrip] = await db
          .select()
          .from(trips)
          .where(
            and(
              eq(trips.tenantId, payload.tenantId),
              eq(trips.vehicleId, payload.vehicleId),
              eq(trips.status, 'active'),
            ),
          )
          .limit(1)

        const [route] = activeTrip?.routeId
          ? await db
              .select()
              .from(routes)
              .where(
                and(
                  eq(routes.id, activeTrip.routeId),
                  eq(routes.tenantId, payload.tenantId),
                ),
              )
              .limit(1)
          : []

        const [idleDetected, fuelDetected] = await Promise.all([
          detectIdleExcess(db, {
            tenantId: payload.tenantId,
            vehicleId: payload.vehicleId,
            idleThresholdMinutes: IDLE_THRESHOLD_MINUTES_DEFAULT,
          }),
          detectFuelAnomaly(db, payload.tenantId, payload.vehicleId),
        ])

        const privateUseDetected = detectPrivateUse({
          timezone: tenant.timezone,
          operatingHoursStart: tenant.operatingHoursStart,
          operatingHoursEnd: tenant.operatingHoursEnd,
          speedKph: payload.speedKph,
          ts: payload.ts,
        })

        const geofenceDetected = route
          ? !(await isWithinCorridor(db, payload.lat, payload.lon, route.id))
          : false

        const candidates: AlertCandidate[] = []
        if (idleDetected) {
          candidates.push({
            type: 'idle_excess',
            severity: 'warning',
            description: 'Sustained idle detected',
          })
        }
        if (fuelDetected) {
          candidates.push({
            type: 'fuel_anomaly',
            severity: 'critical',
            description: 'Abnormal fuel consumption detected',
          })
        }
        if (privateUseDetected) {
          candidates.push({
            type: 'private_use',
            severity: 'warning',
            description: 'Movement outside operating hours',
          })
        }
        if (geofenceDetected) {
          candidates.push({
            type: 'geofence_breach',
            severity: 'critical',
            description: 'Vehicle outside approved corridor',
          })
        }

        for (const candidate of candidates) {
          const dedupKey = `${ALERT_DEDUP_PREFIX}:${payload.tenantId}:${payload.vehicleId}:${candidate.type}`
          const existing = await redis.get(dedupKey)
          if (existing) {
            continue
          }

          const [created] = await db
            .insert(alerts)
            .values({
              tenantId: payload.tenantId,
              vehicleId: payload.vehicleId,
              tripId: activeTrip?.id,
              driverId: activeTrip?.driverId,
              type: candidate.type,
              severity: candidate.severity,
              ts: new Date(payload.ts),
              lat: String(payload.lat),
              lon: String(payload.lon),
              description: candidate.description,
              evidenceJson: payload,
            })
            .returning()

          await redis.set(dedupKey, created!.id, 'EX', 300)

          if (candidate.severity === 'critical') {
            await redis.publish(
              `${ALERT_CHANNEL_PREFIX}:${payload.tenantId}`,
              JSON.stringify(created),
            )
          }
        }

        await deleteMessage(sqs, env.ALERT_QUEUE_URL, message.ReceiptHandle)
      }),
    )
  }
}
