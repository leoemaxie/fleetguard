import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { LIVE_CACHE_PREFIX } from '../../config/constants.js'
import { vehicles } from '../../db/schema/index.js'
import { AppError, ErrorCode } from '../../lib/errors.js'
import {
  buildPaginatedResponse,
  parsePagination,
} from '../../lib/pagination.js'
import type { z } from 'zod'
import type {
  CreateVehicleSchema,
  UpdateVehicleSchema,
} from './vehicles.schema.js'

type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>
type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>

export async function listVehicles(
  app: FastifyInstance,
  tenantId: string,
  query: {
    cursor?: string
    limit?: number
    status?: 'active' | 'inactive' | 'maintenance'
    driverId?: string
  },
) {
  try {
    const page = parsePagination(query)
    const filters = [eq(vehicles.tenantId, tenantId)]
    if (query.status) {
      filters.push(eq(vehicles.status, query.status))
    }
    if (query.driverId) {
      filters.push(eq(vehicles.assignedDriverId, query.driverId))
    }

    const rows = await app.db
      .select()
      .from(vehicles)
      .where(and(...filters))
      .limit(page.limit + 1)
    return buildPaginatedResponse(rows, page.limit)
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list vehicles',
      500,
      error,
    )
  }
}

export async function createVehicle(
  app: FastifyInstance,
  tenantId: string,
  payload: CreateVehicleInput,
) {
  try {
    const insertPayload: Record<string, unknown> = { ...payload, tenantId }
    if (typeof payload.fuelTankCapacityLitres === 'number') {
      insertPayload.fuelTankCapacityLitres =
        payload.fuelTankCapacityLitres.toFixed(2)
    }

    const [vehicle] = await app.db
      .insert(vehicles)
      .values(insertPayload as any)
      .returning()
    if (!vehicle) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create vehicle',
        500,
      )
    }
    return vehicle
  } catch (error: unknown) {
    throw new AppError(ErrorCode.CONFLICT, 'Vehicle already exists', 409, error)
  }
}

export async function getVehicle(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
) {
  try {
    const [vehicle] = await app.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)))
      .limit(1)
    if (!vehicle) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Vehicle not found', 404)
    }
    return vehicle
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get vehicle',
      500,
      error,
    )
  }
}

export async function updateVehicle(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
  payload: UpdateVehicleInput,
) {
  try {
    const setPayload: Record<string, unknown> = { ...payload }
    if (typeof payload.fuelTankCapacityLitres === 'number') {
      setPayload.fuelTankCapacityLitres =
        payload.fuelTankCapacityLitres.toFixed(2)
    }

    const [vehicle] = await app.db
      .update(vehicles)
      .set(setPayload as any)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)))
      .returning()
    if (!vehicle) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Vehicle not found', 404)
    }
    return vehicle
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update vehicle',
      500,
      error,
    )
  }
}

export async function softDeleteVehicle(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
) {
  return updateVehicle(app, tenantId, vehicleId, { status: 'inactive' })
}

export async function getVehicleLiveSnapshot(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
) {
  try {
    const value = await app.redis.get(
      `${LIVE_CACHE_PREFIX}:${tenantId}:${vehicleId}`,
    )
    if (!value) {
      throw new AppError(ErrorCode.NOT_FOUND, 'No live snapshot found', 404)
    }
    return JSON.parse(value) as unknown
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to read live snapshot',
      500,
      error,
    )
  }
}
