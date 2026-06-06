import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../hooks/authenticate.js';
import { requireRole } from '../../hooks/require-role.js';
import { tenantScope } from '../../hooks/tenant-scope.js';
import {
  computeDriverScoreController,
  createDriverController,
  driverScoreController,
  driverScoreHistoryController,
  getDriverController,
  listDriversController,
  updateDriverController
} from './drivers.controller.js';
import {
  CreateDriverSchema,
  DriverParams,
  DriverResponseSchema,
  ListDriversQuerySchema,
  UpdateDriverSchema
} from './drivers.schema.js';

const driversRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get(
    '/',
    {
      schema: {
        querystring: ListDriversQuerySchema,
        response: {
          200: z.object({ data: z.array(DriverResponseSchema), nextCursor: z.string().nullable(), hasMore: z.boolean() })
        }
      }
    },
    listDriversController
  );

  app.post('/', { schema: { body: CreateDriverSchema, response: { 201: DriverResponseSchema } } }, createDriverController);
  app.get('/:driverId', { schema: { params: DriverParams, response: { 200: DriverResponseSchema } } }, getDriverController);
  app.patch('/:driverId', { schema: { params: DriverParams, body: UpdateDriverSchema, response: { 200: DriverResponseSchema } } }, updateDriverController);

  app.get('/:driverId/score', { schema: { params: DriverParams } }, driverScoreController);
  app.get('/:driverId/score/history', { schema: { params: DriverParams } }, driverScoreHistoryController);
  app.post(
    '/:driverId/score/compute',
    { preHandler: [requireRole(['fleet_manager', 'super_admin'])], schema: { params: DriverParams } },
    computeDriverScoreController
  );
};

export default driversRoutes;
