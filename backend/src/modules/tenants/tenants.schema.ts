import { z } from 'zod'

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(255),
  subscriptionTier: z
    .enum(['starter', 'growth', 'enterprise'])
    .default('starter'),
  maxVehicles: z.number().int().positive().default(10),
  operatingHoursStart: z.string().default('06:00:00'),
  operatingHoursEnd: z.string().default('22:00:00'),
  timezone: z.string().default('Africa/Lagos'),
})

export const UpdateTenantSchema = CreateTenantSchema.partial()

export const TenantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subscriptionTier: z.enum(['starter', 'growth', 'enterprise']),
  maxVehicles: z.number(),
  operatingHoursStart: z.string(),
  operatingHoursEnd: z.string(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const ListTenantsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const TenantParams = z.object({ tenantId: z.string().uuid() })
