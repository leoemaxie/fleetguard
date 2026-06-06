import { and, between, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { fuelEvents, gpsEvents, trips } from '../../db/schema/index.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { buildPaginatedResponse, parsePagination } from '../../lib/pagination.js';

export async function listTrips(app: FastifyInstance, tenantId: string, query: {
  cursor?: string;
  limit?: number;
  vehicleId?: string;
  driverId?: string;
  status?: 'active' | 'completed' | 'incomplete';
  from?: string;
  to?: string;
}) {
  try {
    const page = parsePagination(query);
    const filters = [eq(trips.tenantId, tenantId)];
    if (query.vehicleId) {
      filters.push(eq(trips.vehicleId, query.vehicleId));
    }
    if (query.driverId) {
      filters.push(eq(trips.driverId, query.driverId));
    }
    if (query.status) {
      filters.push(eq(trips.status, query.status));
    }
    if (query.from && query.to) {
      filters.push(between(trips.startTime, new Date(query.from), new Date(query.to)));
    }

    const rows = await app.db.select().from(trips).where(and(...filters)).limit(page.limit + 1);
    return buildPaginatedResponse(rows, page.limit);
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to list trips', 500, error);
  }
}

export async function getTrip(app: FastifyInstance, tenantId: string, tripId: string) {
  try {
    const [trip] = await app.db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.tenantId, tenantId))).limit(1);
    if (!trip) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
    }
    return trip;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch trip', 500, error);
  }
}

export async function getTripReplay(app: FastifyInstance, tenantId: string, tripId: string) {
  try {
    const gps = await app.db.select().from(gpsEvents).where(and(eq(gpsEvents.tripId, tripId), eq(gpsEvents.tenantId, tenantId))).limit(1000);
    const fuel = await app.db.select().from(fuelEvents).where(and(eq(fuelEvents.tripId, tripId), eq(fuelEvents.tenantId, tenantId))).limit(1000);
    return { gps, fuel };
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch replay', 500, error);
  }
}

export async function closeTrip(app: FastifyInstance, tenantId: string, tripId: string) {
  try {
    const [trip] = await app.db
      .update(trips)
      .set({ endTime: new Date(), status: 'completed' })
      .where(and(eq(trips.id, tripId), eq(trips.tenantId, tenantId), eq(trips.status, 'active')))
      .returning();

    if (!trip) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Active trip not found', 404);
    }
    return trip;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to close trip', 500, error);
  }
}
