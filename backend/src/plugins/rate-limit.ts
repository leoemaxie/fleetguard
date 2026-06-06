import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'

const rateLimitPlugin: FastifyPluginAsync = async app => {
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit-plugin' })
