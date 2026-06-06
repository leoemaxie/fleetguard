import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { REFRESH_TOKEN_PREFIX } from '../../config/constants.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { tenants, users } from '../../db/schema/index.js';
import type { LoginInput, RefreshInput, RegisterInput } from './auth.schema.js';

export async function register(app: FastifyInstance, payload: RegisterInput): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const [tenant] = await app.db.insert(tenants).values({ name: payload.tenantName }).returning();

    if (!tenant) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Could not create tenant', 500);
    }

    const [user] = await app.db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: 'fleet_manager',
        firstName: payload.firstName,
        lastName: payload.lastName,
        isActive: true
      })
      .returning();

    if (!user) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Could not create user', 500);
    }

    const accessToken = await app.jwt.sign(
      { sub: user.id, tenantId: tenant.id, role: user.role, email: user.email },
      { expiresIn: '15m' }
    );
    const refreshToken = await app.jwt.sign(
      { sub: user.id, tenantId: tenant.id, role: user.role, email: user.email },
      { expiresIn: '7d' }
    );

    await app.redis.set(`${REFRESH_TOKEN_PREFIX}:${refreshToken}`, user.id, 'EX', 60 * 60 * 24 * 7);

    return { accessToken, refreshToken };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.CONFLICT, 'Registration failed', 409, error);
  }
}

export async function login(app: FastifyInstance, payload: LoginInput): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const [user] = await app.db.select().from(users).where(eq(users.email, payload.email.toLowerCase())).limit(1);
    if (!user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid || !user.isActive) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials', 401);
    }

    const accessToken = await app.jwt.sign(
      { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
      { expiresIn: '15m' }
    );
    const refreshToken = await app.jwt.sign(
      { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
      { expiresIn: '7d' }
    );
    await app.redis.set(`${REFRESH_TOKEN_PREFIX}:${refreshToken}`, user.id, 'EX', 60 * 60 * 24 * 7);

    await app.db.update(users).set({ lastLoginAt: new Date() }).where(and(eq(users.id, user.id), eq(users.tenantId, user.tenantId)));

    return { accessToken, refreshToken };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Login failed', 500, error);
  }
}

export async function refresh(app: FastifyInstance, payload: RefreshInput): Promise<{ accessToken: string }> {
  try {
    const stored = await app.redis.get(`${REFRESH_TOKEN_PREFIX}:${payload.refreshToken}`);
    if (!stored) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token invalid', 401);
    }

    const decoded = await app.jwt.verify<{ sub: string; tenantId: string; role: 'super_admin' | 'fleet_manager' | 'driver' | 'auditor'; email?: string }>(
      payload.refreshToken
    );

    const accessToken = await app.jwt.sign(
      { sub: decoded.sub, tenantId: decoded.tenantId, role: decoded.role, email: decoded.email },
      { expiresIn: '15m' }
    );

    return { accessToken };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid refresh token', 401, error);
  }
}

export async function logout(app: FastifyInstance, refreshToken: string): Promise<void> {
  await app.redis.del(`${REFRESH_TOKEN_PREFIX}:${refreshToken}`);
}

export async function me(app: FastifyInstance, userId: string, tenantId: string) {
  try {
    const [user] = await app.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    return user;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user profile', 500, error);
  }
}
