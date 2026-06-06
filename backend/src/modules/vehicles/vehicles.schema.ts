import { z } from 'zod';

export const CreateVehicleSchema = z.object({
  plateNumber: z.string().min(3).max(20),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1980).max(2100),
  fuelTankCapacityLitres: z.number().positive(),
  assignedDriverId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active')
});

export const UpdateVehicleSchema = CreateVehicleSchema.partial();

export const VehicleResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  plateNumber: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  fuelTankCapacityLitres: z.string(),
  assignedDriverId: z.string().uuid().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ListVehiclesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  driverId: z.string().uuid().optional()
});

export const VehicleParams = z.object({ vehicleId: z.string().uuid() });
