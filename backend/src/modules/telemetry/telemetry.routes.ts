import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../hooks/authenticate.js'
import { requireRole } from '../../hooks/require-role.js'
import { tenantScope } from '../../hooks/tenant-scope.js'
import {
  liveTelemetryController,
  vehicleFuelController,
  vehicleGpsController,
} from './telemetry.controller.js'
import {
  ListTelemetryQuerySchema,
  TelemetryParams,
} from './telemetry.schema.js'

const telemetryRoutes: FastifyPluginAsync = async app => {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', tenantScope)
  app.addHook('preHandler', requireRole(['fleet_manager', 'super_admin']))

  app.get('/live', liveTelemetryController)
  app.get(
    '/:vehicleId/gps',
    {
      schema: {
        params: TelemetryParams,
        querystring: ListTelemetryQuerySchema,
      },
    },
    vehicleGpsController,
  )
  app.get(
    '/:vehicleId/fuel',
    {
      schema: {
        params: TelemetryParams,
        querystring: ListTelemetryQuerySchema,
      },
    },
    vehicleFuelController,
  )
}

export default telemetryRoutes
