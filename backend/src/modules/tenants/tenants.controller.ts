import type { FastifyReply, FastifyRequest } from 'fastify'
import { getTenant, listTenants, updateTenant } from './tenants.service.js'
import type { z } from 'zod'
import type {
  ListTenantsQuerySchema,
  TenantParams,
  UpdateTenantSchema,
} from './tenants.schema.js'

type ListQuery = z.infer<typeof ListTenantsQuerySchema>
type Params = z.infer<typeof TenantParams>
type UpdateInput = z.infer<typeof UpdateTenantSchema>

const mapTenant = (tenant: {
  id: string
  name: string
  subscriptionTier: 'starter' | 'growth' | 'enterprise'
  maxVehicles: number
  operatingHoursStart: string
  operatingHoursEnd: string
  timezone: string
  createdAt: Date
  updatedAt: Date
}) => ({
  ...tenant,
  createdAt: tenant.createdAt.toISOString(),
  updatedAt: tenant.updatedAt.toISOString(),
})

export async function listTenantsController(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await listTenants(
    request.server,
    request.query.cursor,
    request.query.limit,
  )
  void reply.send({
    ...result,
    data: result.data.map(mapTenant),
  })
}

export async function getTenantController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const tenant = await getTenant(
    request.server,
    request.tenantId,
    request.params.tenantId,
    request.user.role === 'super_admin',
  )
  void reply.send(mapTenant(tenant))
}

export async function updateTenantController(
  request: FastifyRequest<{ Params: Params; Body: UpdateInput }>,
  reply: FastifyReply,
): Promise<void> {
  const tenant = await updateTenant(
    request.server,
    request.tenantId,
    request.params.tenantId,
    request.body,
    request.user.role === 'super_admin',
  )
  void reply.send(mapTenant(tenant))
}
