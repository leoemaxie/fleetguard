import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'
import type { Role } from '../types/common.js'

const jwtPlugin: FastifyPluginAsync = async app => {
  await app.register(fastifyJwt, {
    secret: {
      private: env.JWT_PRIVATE_KEY,
      public: env.JWT_PUBLIC_KEY,
    },
    sign: {
      algorithm: 'RS256',
    },
    verify: {
      algorithms: ['RS256'],
    },
  })

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify()
      } catch {
        void reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token',
            requestId: request.id,
          },
        })
      }
    },
  )

  app.decorate('requireRole', (allowed: Role[]) => {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      if (!allowed.includes(request.user.role)) {
        void reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            requestId: request.id,
          },
        })
      }
    }
  })
}

export default fp(jwtPlugin, { name: 'jwt-plugin' })
