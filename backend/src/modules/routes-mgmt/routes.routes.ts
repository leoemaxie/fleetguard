import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../hooks/authenticate.js'
import { tenantScope } from '../../hooks/tenant-scope.js'
import {
  addStopController,
  createRouteController,
  deleteRouteController,
  deleteStopController,
  getRouteController,
  listRoutesController,
  updateRouteController,
} from './routes.controller.js'
import {
  CreateRouteSchema,
  CreateStopSchema,
  ListRoutesQuerySchema,
  RouteParams,
  RouteResponseSchema,
  StopParams,
  UpdateRouteSchema,
} from './routes.schema.js'

const routesRoutes: FastifyPluginAsync = async app => {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', tenantScope)

  app.get(
    '/',
    {
      schema: {
        querystring: ListRoutesQuerySchema,
        response: {
          200: z.object({
            data: z.array(RouteResponseSchema),
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
    listRoutesController,
  )

  app.post(
    '/',
    {
      schema: {
        body: CreateRouteSchema,
        response: { 201: RouteResponseSchema },
      },
    },
    createRouteController,
  )
  app.get(
    '/:routeId',
    { schema: { params: RouteParams, response: { 200: RouteResponseSchema } } },
    getRouteController,
  )
  app.patch(
    '/:routeId',
    {
      schema: {
        params: RouteParams,
        body: UpdateRouteSchema,
        response: { 200: RouteResponseSchema },
      },
    },
    updateRouteController,
  )
  app.delete(
    '/:routeId',
    { schema: { params: RouteParams } },
    deleteRouteController,
  )

  app.post(
    '/:routeId/stops',
    { schema: { params: RouteParams, body: CreateStopSchema } },
    addStopController,
  )
  app.delete(
    '/:routeId/stops/:stopId',
    { schema: { params: StopParams } },
    deleteStopController,
  )
}

export default routesRoutes
