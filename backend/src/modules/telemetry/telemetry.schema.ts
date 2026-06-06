import { z } from 'zod';

export const CreateTelemetrySchema = z.object({
  vehicleId: z.string().uuid(),
  lat: z.number(),
  lon: z.number(),
  speedKph: z.number().nonnegative()
});

export const UpdateTelemetrySchema = CreateTelemetrySchema.partial();

export const TelemetryResponseSchema = z.object({
  vehicleId: z.string().uuid(),
  ts: z.string().datetime(),
  lat: z.string(),
  lon: z.string(),
  speedKph: z.string()
});

export const ListTelemetryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});

export const TelemetryParams = z.object({ vehicleId: z.string().uuid() });
