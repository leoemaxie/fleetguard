import type { FastifyReply, FastifyRequest } from 'fastify';
import { login, logout, me, refresh, register } from './auth.service.js';
import type { LoginInput, RefreshInput, RegisterInput } from './auth.schema.js';

export async function registerController(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply
): Promise<void> {
  const tokens = await register(request.server, request.body);
  void reply.code(201).send(tokens);
}

export async function loginController(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply): Promise<void> {
  const tokens = await login(request.server, request.body);
  void reply.send(tokens);
}

export async function refreshController(
  request: FastifyRequest<{ Body: RefreshInput }>,
  reply: FastifyReply
): Promise<void> {
  const token = await refresh(request.server, request.body);
  void reply.send(token);
}

export async function logoutController(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
): Promise<void> {
  await logout(request.server, request.body.refreshToken);
  void reply.code(204).send();
}

export async function meController(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = await me(request.server, request.user.id, request.tenantId);
  void reply.send({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() });
}
