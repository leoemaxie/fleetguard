import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../hooks/authenticate.js'
import { requireRole } from '../../hooks/require-role.js'
import { tenantScope } from '../../hooks/tenant-scope.js'
import {
  closeTripController,
  getTripController,
  listTripsController,
  replayTripController,
} from './trips.controller.js'
import {
  ListTripsQuerySchema,
  TripParams,
  TripResponseSchema,
} from './trips.schema.js'

const tripsRoutes: FastifyPluginAsync = async app => {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', tenantScope)

  app.get(
    '/',
    {
      schema: {
        querystring: ListTripsQuerySchema,
        response: {
          200: z.object({
            data: z.array(TripResponseSchema),
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
    listTripsController,
  )

  app.get(
    '/:tripId',
    { schema: { params: TripParams, response: { 200: TripResponseSchema } } },
    getTripController,
  )
  app.get(
    '/:tripId/replay',
    { schema: { params: TripParams } },
    replayTripController,
  )
  app.post<{ Params: { tripId: string } }>(
    '/:tripId/close',
    {
      preHandler: requireRole(['fleet_manager', 'super_admin']),
      schema: { params: TripParams },
    },
    closeTripController,
  )
}

export default tripsRoutes
