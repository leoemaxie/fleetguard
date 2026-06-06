import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../hooks/authenticate.js';
import { requireRole } from '../../hooks/require-role.js';
import { tenantScope } from '../../hooks/tenant-scope.js';
import {
  getTenantController,
  listTenantsController,
  updateTenantController
} from './tenants.controller.js';
import { ListTenantsQuerySchema, TenantParams, TenantResponseSchema, UpdateTenantSchema } from './tenants.schema.js';

const tenantsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get<{
    Querystring: z.infer<typeof ListTenantsQuerySchema>;
  }>(
    '/',
    {
      preHandler: [requireRole(['super_admin'])],
      schema: {
        querystring: ListTenantsQuerySchema,
        response: {
          200: z.object({ data: z.array(TenantResponseSchema), nextCursor: z.string().nullable(), hasMore: z.boolean() })
        }
      }
    },
    listTenantsController
  );

  app.get('/:tenantId', { schema: { params: TenantParams, response: { 200: TenantResponseSchema } } }, getTenantController);

  app.patch<{ Params: z.infer<typeof TenantParams>; Body: z.infer<typeof UpdateTenantSchema> }>(
    '/:tenantId',
    {
      preHandler: [requireRole(['super_admin', 'fleet_manager'])],
      schema: { params: TenantParams, body: UpdateTenantSchema, response: { 200: TenantResponseSchema } }
    },
    updateTenantController
  );
};

export default tenantsRoutes;
