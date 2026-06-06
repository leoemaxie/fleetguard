import { and, between, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { fuelEvents, gpsEvents } from '../../db/schema/index.js';
import { AppError, ErrorCode } from '../../lib/errors.js';

export async function getLive(app: FastifyInstance, tenantId: string): Promise<Record<string, unknown>[]> {
  try {
    const events = await app.db
      .select()
      .from(gpsEvents)
      .where(eq(gpsEvents.tenantId, tenantId))
      .orderBy(desc(gpsEvents.ts))
      .limit(500);

    const map = new Map<string, (typeof events)[number]>();
    for (const event of events) {
      if (!map.has(event.vehicleId)) {
        map.set(event.vehicleId, event);
      }
    }
    return Array.from(map.values());
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch live telemetry', 500, error);
  }
}

export async function getVehicleGps(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
  query: { from?: string; to?: string; limit?: number }
) {
  try {
    const filters = [eq(gpsEvents.tenantId, tenantId), eq(gpsEvents.vehicleId, vehicleId)];
    if (query.from && query.to) {
      filters.push(between(gpsEvents.ts, new Date(query.from), new Date(query.to)));
    }

    return app.db.select().from(gpsEvents).where(and(...filters)).orderBy(desc(gpsEvents.ts)).limit(query.limit ?? 100);
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch GPS telemetry', 500, error);
  }
}

export async function getVehicleFuel(
  app: FastifyInstance,
  tenantId: string,
  vehicleId: string,
  query: { from?: string; to?: string; limit?: number }
) {
  try {
    const filters = [eq(fuelEvents.tenantId, tenantId), eq(fuelEvents.vehicleId, vehicleId)];
    if (query.from && query.to) {
      filters.push(between(fuelEvents.ts, new Date(query.from), new Date(query.to)));
    }

    return app.db.select().from(fuelEvents).where(and(...filters)).orderBy(desc(fuelEvents.ts)).limit(query.limit ?? 100);
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch fuel telemetry', 500, error);
  }
}
