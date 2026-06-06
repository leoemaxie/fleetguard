import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { approvedStops, routes } from '../../db/schema/index.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { geomFromGeoJson } from '../../lib/geo.js';
import { buildPaginatedResponse, parsePagination } from '../../lib/pagination.js';

export async function listRoutes(app: FastifyInstance, tenantId: string, query: { cursor?: string; limit?: number }) {
  try {
    const page = parsePagination(query);
    const rows = await app.db.select().from(routes).where(eq(routes.tenantId, tenantId)).limit(page.limit + 1);
    return buildPaginatedResponse(rows, page.limit);
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to list routes', 500, error);
  }
}

export async function createRoute(
  app: FastifyInstance,
  tenantId: string,
  payload: {
    name: string;
    corridorGeomGeoJson: Record<string, unknown>;
    corridorWidthMetres: number;
    originName: string;
    destinationName: string;
    distanceKm?: number;
  }
) {
  try {
    const [route] = await app.db
      .insert(routes)
      .values({
        tenantId,
        name: payload.name,
        corridorGeom: geomFromGeoJson(JSON.stringify(payload.corridorGeomGeoJson)) as unknown as string,
        corridorWidthMetres: payload.corridorWidthMetres,
        originName: payload.originName,
        destinationName: payload.destinationName,
        distanceKm: payload.distanceKm ? String(payload.distanceKm) : null
      })
      .returning();

    if (!route) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create route', 500);
    }
    return route;
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create route', 500, error);
  }
}

export async function getRoute(app: FastifyInstance, tenantId: string, routeId: string) {
  try {
    const [route] = await app.db.select().from(routes).where(and(eq(routes.id, routeId), eq(routes.tenantId, tenantId))).limit(1);
    if (!route) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Route not found', 404);
    }
    return route;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch route', 500, error);
  }
}

export async function updateRoute(app: FastifyInstance, tenantId: string, routeId: string, payload: Record<string, unknown>) {
  try {
    const [route] = await app.db
      .update(routes)
      .set(payload)
      .where(and(eq(routes.id, routeId), eq(routes.tenantId, tenantId)))
      .returning();
    if (!route) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Route not found', 404);
    }
    return route;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update route', 500, error);
  }
}

export async function softDeleteRoute(app: FastifyInstance, tenantId: string, routeId: string) {
  return updateRoute(app, tenantId, routeId, { isActive: false });
}

export async function addRouteStop(
  app: FastifyInstance,
  tenantId: string,
  routeId: string,
  payload: { name: string; lat: number; lon: number; maxDwellMinutes: number }
) {
  try {
    const [stop] = await app.db
      .insert(approvedStops)
      .values({
        tenantId,
        routeId,
        name: payload.name,
        location: `POINT(${payload.lon} ${payload.lat})`,
        maxDwellMinutes: payload.maxDwellMinutes
      })
      .returning();
    if (!stop) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create stop', 500);
    }
    return stop;
  } catch (error: unknown) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to add stop', 500, error);
  }
}

export async function deleteRouteStop(app: FastifyInstance, tenantId: string, routeId: string, stopId: string) {
  try {
    const [deleted] = await app.db
      .delete(approvedStops)
      .where(and(eq(approvedStops.id, stopId), eq(approvedStops.routeId, routeId), eq(approvedStops.tenantId, tenantId)))
      .returning();
    if (!deleted) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Stop not found', 404);
    }
    return deleted;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete stop', 500, error);
  }
}
