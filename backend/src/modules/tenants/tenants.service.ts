import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { tenants } from '../../db/schema/index.js'
import { AppError, ErrorCode } from '../../lib/errors.js'
import {
  buildPaginatedResponse,
  parsePagination,
} from '../../lib/pagination.js'
import type { UpdateTenantSchema } from './tenants.schema.js'
import type { z } from 'zod'

type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>

export async function listTenants(
  app: FastifyInstance,
  cursor?: string,
  limit?: number,
) {
  try {
    const page = parsePagination({ cursor, limit })
    const rows = await app.db
      .select()
      .from(tenants)
      .limit(page.limit + 1)
    return buildPaginatedResponse(rows, page.limit)
  } catch (error: unknown) {
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list tenants',
      500,
      error,
    )
  }
}

export async function getTenant(
  app: FastifyInstance,
  requesterTenantId: string,
  tenantId: string,
  isSuperAdmin: boolean,
) {
  try {
    if (!isSuperAdmin && requesterTenantId !== tenantId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Cannot access another tenant',
        403,
      )
    }

    const [tenant] = await app.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
    if (!tenant) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Tenant not found', 404)
    }
    return tenant
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch tenant',
      500,
      error,
    )
  }
}

export async function updateTenant(
  app: FastifyInstance,
  requesterTenantId: string,
  tenantId: string,
  data: UpdateTenantInput,
  isSuperAdmin: boolean,
) {
  try {
    if (!isSuperAdmin && requesterTenantId !== tenantId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Cannot update another tenant',
        403,
      )
    }

    const [updated] = await app.db
      .update(tenants)
      .set(data)
      .where(
        and(
          eq(tenants.id, tenantId),
          eq(tenants.id, isSuperAdmin ? tenantId : requesterTenantId),
        ),
      )
      .returning()

    if (!updated) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Tenant not found', 404)
    }
    return updated
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update tenant',
      500,
      error,
    )
  }
}
