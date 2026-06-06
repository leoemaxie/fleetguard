import { and, desc, eq, gte } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import {
  alerts,
  driverWeeklyScores,
  drivers,
  trips,
} from '../../db/schema/index.js'
import { AppError, ErrorCode } from '../../lib/errors.js'
import {
  buildPaginatedResponse,
  parsePagination,
} from '../../lib/pagination.js'
import { computeDriverWeeklyScore } from '../../services/scoring/driver-scorer.js'
import type { z } from 'zod'
import type {
  CreateDriverSchema,
  UpdateDriverSchema,
} from './drivers.schema.js'

type CreateInput = z.infer<typeof CreateDriverSchema>
type UpdateInput = z.infer<typeof UpdateDriverSchema>

export async function listDrivers(
  app: FastifyInstance,
  tenantId: string,
  query: { cursor?: string; limit?: number; isActive?: boolean },
) {
  try {
    const page = parsePagination(query)
    const filters = [eq(drivers.tenantId, tenantId)]
    if (query.isActive !== undefined) {
      filters.push(eq(drivers.isActive, query.isActive))
    }
    const rows = await app.db
      .select()
      .from(drivers)
      .where(and(...filters))
      .limit(page.limit + 1)
    return buildPaginatedResponse(rows, page.limit)
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list drivers',
      500,
      error,
    )
  }
}

export async function createDriver(
  app: FastifyInstance,
  tenantId: string,
  payload: CreateInput,
) {
  try {
    const [driver] = await app.db
      .insert(drivers)
      .values({ ...payload, tenantId })
      .returning()
    if (!driver) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create driver',
        500,
      )
    }
    return driver
  } catch (error: unknown) {
    throw new AppError(ErrorCode.CONFLICT, 'Driver already exists', 409, error)
  }
}

export async function getDriver(
  app: FastifyInstance,
  tenantId: string,
  driverId: string,
) {
  try {
    const [driver] = await app.db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.tenantId, tenantId)))
      .limit(1)
    if (!driver) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Driver not found', 404)
    }
    return driver
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch driver',
      500,
      error,
    )
  }
}

export async function updateDriver(
  app: FastifyInstance,
  tenantId: string,
  driverId: string,
  payload: UpdateInput,
) {
  try {
    const [driver] = await app.db
      .update(drivers)
      .set(payload)
      .where(and(eq(drivers.id, driverId), eq(drivers.tenantId, tenantId)))
      .returning()
    if (!driver) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Driver not found', 404)
    }
    return driver
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update driver',
      500,
      error,
    )
  }
}

export async function getDriverScore(
  app: FastifyInstance,
  tenantId: string,
  driverId: string,
) {
  try {
    const [score] = await app.db
      .select()
      .from(driverWeeklyScores)
      .where(
        and(
          eq(driverWeeklyScores.tenantId, tenantId),
          eq(driverWeeklyScores.driverId, driverId),
        ),
      )
      .orderBy(desc(driverWeeklyScores.weekStart))
      .limit(1)
    if (!score) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Score not found', 404)
    }
    return score
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch score',
      500,
      error,
    )
  }
}

export async function getDriverScoreHistory(
  app: FastifyInstance,
  tenantId: string,
  driverId: string,
) {
  try {
    return app.db
      .select()
      .from(driverWeeklyScores)
      .where(
        and(
          eq(driverWeeklyScores.tenantId, tenantId),
          eq(driverWeeklyScores.driverId, driverId),
        ),
      )
      .orderBy(desc(driverWeeklyScores.weekStart))
      .limit(8)
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch score history',
      500,
      error,
    )
  }
}

export async function computeDriverScore(
  app: FastifyInstance,
  tenantId: string,
  driverId: string,
) {
  try {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
    weekStart.setUTCHours(0, 0, 0, 0)

    const weekTrips = await app.db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.tenantId, tenantId),
          eq(trips.driverId, driverId),
          gte(trips.startTime, weekStart),
        ),
      )

    const weekAlerts = await app.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.tenantId, tenantId),
          eq(alerts.driverId, driverId),
          gte(alerts.ts, weekStart),
        ),
      )

    const score = computeDriverWeeklyScore(weekTrips, weekAlerts)

    const [saved] = await app.db
      .insert(driverWeeklyScores)
      .values({
        tenantId,
        driverId,
        weekStart: weekStart.toISOString().slice(0, 10),
        totalScore: score.totalScore,
        routeComplianceScore: score.routeComplianceScore,
        fuelScore: score.fuelScore,
        alertScore: score.alertScore,
        stopScore: score.stopScore,
        tripsCount: weekTrips.length,
      })
      .returning()

    if (!saved) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to store score', 500)
    }
    return saved
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to compute score',
      500,
      error,
    )
  }
}
