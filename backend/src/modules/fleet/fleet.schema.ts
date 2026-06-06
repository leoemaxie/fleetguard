import { z } from 'zod';

export const CreateFleetSchema = z.object({});
export const UpdateFleetSchema = z.object({}).partial();

export const FleetResponseSchema = z.object({
  vehicleId: z.string().uuid(),
  plateNumber: z.string(),
  status: z.enum(['active', 'inactive', 'maintenance']),
  latestTs: z.string().datetime().nullable(),
  speedKph: z.string().nullable(),
  fuelLevelPct: z.string().nullable(),
  openAlertCount: z.number().int(),
  statusColor: z.enum(['green', 'yellow', 'red', 'gray'])
});

export const ListFleetQuerySchema = z.object({});
export const FleetParams = z.object({});
