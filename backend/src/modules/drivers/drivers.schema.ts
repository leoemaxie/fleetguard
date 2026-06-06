import { z } from 'zod';

export const CreateDriverSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  licenseNumber: z.string().min(3).max(50),
  phoneNumber: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true)
});

export const UpdateDriverSchema = CreateDriverSchema.partial();

export const DriverResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  licenseNumber: z.string(),
  phoneNumber: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ListDriversQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isActive: z.coerce.boolean().optional()
});

export const DriverParams = z.object({ driverId: z.string().uuid() });
