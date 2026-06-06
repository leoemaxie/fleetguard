import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../hooks/authenticate.js';
import { requireRole } from '../../hooks/require-role.js';
import { tenantScope } from '../../hooks/tenant-scope.js';
import {
  createVehicleController,
  deleteVehicleController,
  getVehicleController,
  listVehiclesController,
  liveVehicleController,
  updateVehicleController
} from './vehicles.controller.js';
import {
  CreateVehicleSchema,
  ListVehiclesQuerySchema,
  UpdateVehicleSchema,
  VehicleParams,
  VehicleResponseSchema
} from './vehicles.schema.js';

const vehiclesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get(
    '/',
    {
      schema: {
        querystring: ListVehiclesQuerySchema,
        response: {
          200: z.object({ data: z.array(VehicleResponseSchema), nextCursor: z.string().nullable(), hasMore: z.boolean() })
        }
      }
    },
    listVehiclesController
  );

  app.post(
    '/',
    {
      preHandler: [requireRole(['fleet_manager', 'super_admin'])],
      schema: { body: CreateVehicleSchema, response: { 201: VehicleResponseSchema } }
    },
    createVehicleController
  );

  app.get('/:vehicleId', { schema: { params: VehicleParams, response: { 200: VehicleResponseSchema } } }, getVehicleController);

  app.patch(
    '/:vehicleId',
    {
      preHandler: [requireRole(['fleet_manager', 'super_admin'])],
      schema: { params: VehicleParams, body: UpdateVehicleSchema, response: { 200: VehicleResponseSchema } }
    },
    updateVehicleController
  );

  app.delete('/:vehicleId', { preHandler: [requireRole(['fleet_manager', 'super_admin'])], schema: { params: VehicleParams } }, deleteVehicleController);
  app.get('/:vehicleId/live', { schema: { params: VehicleParams } }, liveVehicleController);
};

export default vehiclesRoutes;
