import { z } from 'zod';

export const RegisterSchema = z.object({
  tenantName: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(10)
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin', 'fleet_manager', 'driver', 'auditor']),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
