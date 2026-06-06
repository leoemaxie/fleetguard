import type { FastifyReply, FastifyRequest } from 'fastify';

export async function tenantScope(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  request.tenantId = request.user.tenantId;
  request.user = {
    id: request.user.sub,
    email: request.user.email ?? '',
    role: request.user.role,
    tenantId: request.user.tenantId
  };
}
