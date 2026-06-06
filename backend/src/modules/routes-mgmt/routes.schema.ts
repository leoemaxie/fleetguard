import { z } from 'zod'

export const CreateRouteSchema = z.object({
  name: z.string().min(1).max(255),
  corridorGeomGeoJson: z.record(z.unknown()),
  corridorWidthMetres: z.number().int().positive().default(500),
  originName: z.string().min(1).max(255),
  destinationName: z.string().min(1).max(255),
  distanceKm: z.number().positive().optional(),
})

export const UpdateRouteSchema = CreateRouteSchema.partial()

export const RouteResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  corridorWidthMetres: z.number(),
  originName: z.string(),
  destinationName: z.string(),
  distanceKm: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const ListRoutesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const RouteParams = z.object({ routeId: z.string().uuid() })
export const StopParams = z.object({
  routeId: z.string().uuid(),
  stopId: z.string().uuid(),
})

export const CreateStopSchema = z.object({
  name: z.string().min(1).max(255),
  lat: z.number(),
  lon: z.number(),
  maxDwellMinutes: z.number().int().positive().default(30),
})
