import { and, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import {
  alerts,
  fuelEvents,
  gpsEvents,
  vehicles,
} from '../../db/schema/index.js'
import { AppError, ErrorCode } from '../../lib/errors.js'

export async function fleetLive(app: FastifyInstance, tenantId: string) {
  try {
    const fleetVehicles = await app.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.tenantId, tenantId))

    const rows = await Promise.all(
      fleetVehicles.map(async vehicle => {
        const [gps] = await app.db
          .select()
          .from(gpsEvents)
          .where(
            and(
              eq(gpsEvents.tenantId, tenantId),
              eq(gpsEvents.vehicleId, vehicle.id),
            ),
          )
          .limit(1)

        const [fuel] = await app.db
          .select()
          .from(fuelEvents)
          .where(
            and(
              eq(fuelEvents.tenantId, tenantId),
              eq(fuelEvents.vehicleId, vehicle.id),
            ),
          )
          .limit(1)

        const openAlerts = await app.db
          .select({ id: alerts.id })
          .from(alerts)
          .where(
            and(
              eq(alerts.tenantId, tenantId),
              eq(alerts.vehicleId, vehicle.id),
              isNull(alerts.resolvedAt),
            ),
          )

        const statusColor =
          vehicle.status === 'inactive'
            ? 'gray'
            : openAlerts.length > 0
              ? 'red'
              : gps && Number(gps.speedKph) > 0
                ? 'green'
                : 'yellow'

        return {
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          status: vehicle.status,
          latestTs: gps ? gps.ts.toISOString() : null,
          speedKph: gps ? String(gps.speedKph) : null,
          fuelLevelPct: fuel ? String(fuel.tankLevelPct) : null,
          openAlertCount: openAlerts.length,
          statusColor,
        }
      }),
    )

    return rows
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch fleet live',
      500,
      error,
    )
  }
}

export async function fleetSummary(app: FastifyInstance, tenantId: string) {
  try {
    const live = await fleetLive(app, tenantId)
    const total = live.length
    const active = live.filter(row => row.status === 'active').length
    const alerting = live.filter(row => row.openAlertCount > 0).length
    const offline = live.filter(row => row.latestTs === null).length
    return { total, active, alerting, offline }
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch fleet summary',
      500,
      error,
    )
  }
}
