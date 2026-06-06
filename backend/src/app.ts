import crypto from 'node:crypto'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { AppError, ErrorCode } from './lib/errors.js'
import sensiblePlugin from './plugins/sensible.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import dbPlugin from './plugins/db.js'
import redisPlugin from './plugins/redis.js'
import sqsPlugin from './plugins/sqs.js'
import jwtPlugin from './plugins/jwt.js'
import rlsPlugin from './plugins/rls.js'
import authRoutes from './modules/auth/auth.routes.js'
import tenantsRoutes from './modules/tenants/tenants.routes.js'
import vehiclesRoutes from './modules/vehicles/vehicles.routes.js'
import driversRoutes from './modules/drivers/drivers.routes.js'
import tripsRoutes from './modules/trips/trips.routes.js'
import telemetryRoutes from './modules/telemetry/telemetry.routes.js'
import alertsRoutes from './modules/alerts/alerts.routes.js'
import routesRoutes from './modules/routes-mgmt/routes.routes.js'
import fleetRoutes from './modules/fleet/fleet.routes.js'

export async function buildApp(opts?: FastifyServerOptions) {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            requestId: request.id,
          }
        },
      },
    },
    genReqId: () => crypto.randomUUID(),
    ...opts,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(sensiblePlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(dbPlugin)
  await app.register(redisPlugin)
  await app.register(sqsPlugin)
  await app.register(jwtPlugin)
  await app.register(rlsPlugin)

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(tenantsRoutes, { prefix: '/api/v1/tenants' })
  await app.register(vehiclesRoutes, { prefix: '/api/v1/vehicles' })
  await app.register(driversRoutes, { prefix: '/api/v1/drivers' })
  await app.register(tripsRoutes, { prefix: '/api/v1/trips' })
  await app.register(telemetryRoutes, { prefix: '/api/v1/telemetry' })
  await app.register(alertsRoutes, { prefix: '/api/v1/alerts' })
  await app.register(routesRoutes, { prefix: '/api/v1/routes' })
  await app.register(fleetRoutes, { prefix: '/api/v1/fleet' })

  app.get('/health', async () => ({
    status: 'ok',
    ts: new Date().toISOString(),
  }))

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      void reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          details: error.details,
        },
      })
      return
    }

    if (error instanceof ZodError) {
      void reply.code(400).send({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          requestId: request.id,
          details: error.format(),
        },
      })
      return
    }

    void reply.code(500).send({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Unexpected error',
        requestId: request.id,
      },
    })
  })

  return app
}
