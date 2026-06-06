import { z } from 'zod';

export const CreateTripSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  routeId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime()
});

export const UpdateTripSchema = z.object({
  endTime: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'incomplete']).optional()
}).partial();

export const TripResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  routeId: z.string().uuid().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  status: z.enum(['active', 'completed', 'incomplete']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ListTripsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'incomplete']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const TripParams = z.object({ tripId: z.string().uuid() });
