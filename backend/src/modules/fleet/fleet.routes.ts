import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../hooks/authenticate.js';
import { tenantScope } from '../../hooks/tenant-scope.js';
import { fleetLiveController, fleetSummaryController } from './fleet.controller.js';

const fleetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get('/live', fleetLiveController);
  app.get('/summary', fleetSummaryController);
};

export default fleetRoutes;
