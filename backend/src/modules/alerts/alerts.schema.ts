import { z } from 'zod';

export const CreateAlertSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  type: z.enum(['fuel_anomaly', 'geofence_breach', 'tamper_detected', 'idle_excess', 'private_use', 'unauthorized_stop', 'speeding']),
  severity: z.enum(['critical', 'warning', 'info']),
  ts: z.string().datetime(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  description: z.string()
});

export const UpdateAlertSchema = z.object({ resolvedAt: z.string().datetime().optional() }).partial();

export const AlertResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().nullable(),
  driverId: z.string().uuid().nullable(),
  type: z.enum(['fuel_anomaly', 'geofence_breach', 'tamper_detected', 'idle_excess', 'private_use', 'unauthorized_stop', 'speeding']),
  severity: z.enum(['critical', 'warning', 'info']),
  ts: z.string().datetime(),
  lat: z.string().nullable(),
  lon: z.string().nullable(),
  description: z.string(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ListAlertsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  type: z.enum(['fuel_anomaly', 'geofence_breach', 'tamper_detected', 'idle_excess', 'private_use', 'unauthorized_stop', 'speeding']).optional(),
  vehicleId: z.string().uuid().optional(),
  resolved: z.coerce.boolean().optional()
});

export const AlertParams = z.object({ alertId: z.string().uuid() });
