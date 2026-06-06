import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { alerts } from '../../db/schema/index.js'
import { env } from '../../config/env.js'
import { AppError, ErrorCode } from '../../lib/errors.js'
import {
  buildPaginatedResponse,
  parsePagination,
} from '../../lib/pagination.js'
import { getPresignedGetUrl } from '../../lib/s3.js'

export async function listAlerts(
  app: FastifyInstance,
  tenantId: string,
  query: {
    cursor?: string
    limit?: number
    severity?: 'critical' | 'warning' | 'info'
    type?:
      | 'fuel_anomaly'
      | 'geofence_breach'
      | 'tamper_detected'
      | 'idle_excess'
      | 'private_use'
      | 'unauthorized_stop'
      | 'speeding'
    vehicleId?: string
    resolved?: boolean
  },
) {
  try {
    const page = parsePagination(query)
    const filters = [eq(alerts.tenantId, tenantId)]
    if (query.severity) {
      filters.push(eq(alerts.severity, query.severity))
    }
    if (query.type) {
      filters.push(eq(alerts.type, query.type))
    }
    if (query.vehicleId) {
      filters.push(eq(alerts.vehicleId, query.vehicleId))
    }
    if (query.resolved !== undefined) {
      filters.push(
        query.resolved
          ? isNotNull(alerts.resolvedAt)
          : isNull(alerts.resolvedAt),
      )
    }

    const rows = await app.db
      .select()
      .from(alerts)
      .where(and(...filters))
      .limit(page.limit + 1)
    return buildPaginatedResponse(rows, page.limit)
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list alerts',
      500,
      error,
    )
  }
}

export async function getAlert(
  app: FastifyInstance,
  tenantId: string,
  alertId: string,
) {
  try {
    const [alert] = await app.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.tenantId, tenantId)))
      .limit(1)
    if (!alert) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Alert not found', 404)
    }
    return alert
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch alert',
      500,
      error,
    )
  }
}

export async function resolveAlert(
  app: FastifyInstance,
  tenantId: string,
  alertId: string,
  resolvedBy: string,
) {
  try {
    const [updated] = await app.db
      .update(alerts)
      .set({ resolvedAt: new Date(), resolvedBy })
      .where(and(eq(alerts.id, alertId), eq(alerts.tenantId, tenantId)))
      .returning()
    if (!updated) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Alert not found', 404)
    }
    return updated
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to resolve alert',
      500,
      error,
    )
  }
}

export async function bulkResolve(
  app: FastifyInstance,
  tenantId: string,
  alertIds: string[],
  resolvedBy: string,
) {
  try {
    return app.db
      .update(alerts)
      .set({ resolvedAt: new Date(), resolvedBy })
      .where(and(eq(alerts.tenantId, tenantId), inArray(alerts.id, alertIds)))
      .returning()
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to bulk resolve alerts',
      500,
      error,
    )
  }
}

export async function getAlertEvidenceUrl(alertId: string): Promise<string> {
  return getPresignedGetUrl(env.REPORTS_BUCKET, `alerts/${alertId}.pdf`, 900)
}
