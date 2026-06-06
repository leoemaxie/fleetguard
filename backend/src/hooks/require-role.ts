import type {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify'
import type { Role } from '../types/common.js'

export function requireRole(roles: Role[]): preHandlerHookHandler {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!roles.includes(request.user.role)) {
      void reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requestId: request.id,
        },
      })
    }
  }
}
