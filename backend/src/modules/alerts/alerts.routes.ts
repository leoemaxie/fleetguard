import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../hooks/authenticate.js'
import { tenantScope } from '../../hooks/tenant-scope.js'
import {
  alertEvidenceController,
  bulkResolveController,
  getAlertController,
  listAlertsController,
  resolveAlertController,
} from './alerts.controller.js'
import {
  AlertParams,
  AlertResponseSchema,
  ListAlertsQuerySchema,
} from './alerts.schema.js'

const alertsRoutes: FastifyPluginAsync = async app => {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', tenantScope)

  app.get(
    '/',
    {
      schema: {
        querystring: ListAlertsQuerySchema,
        response: {
          200: z.object({
            data: z.array(AlertResponseSchema),
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
    listAlertsController,
  )

  app.get(
    '/:alertId',
    { schema: { params: AlertParams, response: { 200: AlertResponseSchema } } },
    getAlertController,
  )
  app.patch(
    '/:alertId/resolve',
    { schema: { params: AlertParams, response: { 200: AlertResponseSchema } } },
    resolveAlertController,
  )
  app.post(
    '/bulk-resolve',
    { schema: { body: z.object({ ids: z.array(z.string().uuid()).min(1) }) } },
    bulkResolveController,
  )
  app.get(
    '/:alertId/evidence',
    { schema: { params: AlertParams } },
    alertEvidenceController,
  )
}

export default alertsRoutes
