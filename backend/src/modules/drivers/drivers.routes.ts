import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../hooks/authenticate.js'
import { requireRole } from '../../hooks/require-role.js'
import { tenantScope } from '../../hooks/tenant-scope.js'
import {
  computeDriverScoreController,
  createDriverController,
  driverScoreController,
  driverScoreHistoryController,
  getDriverController,
  listDriversController,
  updateDriverController,
} from './drivers.controller.js'
import {
  CreateDriverSchema,
  DriverParams,
  DriverResponseSchema,
  ListDriversQuerySchema,
  UpdateDriverSchema,
} from './drivers.schema.js'

const driversRoutes: FastifyPluginAsync = async app => {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', tenantScope)

  app.get(
    '/',
    {
      schema: {
        // cast zod schemas to any to satisfy Fastify's RouteHandlerMethod typing
        querystring: ListDriversQuerySchema as any,
        response: {
          200: z.object({
            data: z.array(DriverResponseSchema),
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }) as any,
        },
      },
    },
    listDriversController,
  )

  app.post(
    '/',
    {
      schema: {
        body: CreateDriverSchema as any,
        response: { 201: DriverResponseSchema as any },
      },
    },
    createDriverController,
  )
  app.get(
    '/:driverId',
    {
      schema: {
        params: DriverParams as any,
        response: { 200: DriverResponseSchema as any },
      },
    },
    getDriverController,
  )
  app.patch(
    '/:driverId',
    {
      schema: {
        params: DriverParams as any,
        body: UpdateDriverSchema as any,
        response: { 200: DriverResponseSchema as any },
      },
    },
    updateDriverController,
  )

  app.get(
    '/:driverId/score',
    { schema: { params: DriverParams as any } },
    driverScoreController,
  )
  app.get(
    '/:driverId/score/history',
    { schema: { params: DriverParams as any } },
    driverScoreHistoryController,
  )
  app.post(
    '/:driverId/score/compute',
    {
      preHandler: [requireRole(['fleet_manager', 'super_admin'])],
      schema: { params: DriverParams as any },
    },
    computeDriverScoreController as any,
  )
}

export default driversRoutes
