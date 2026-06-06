import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { bulkResolve, getAlert, getAlertEvidenceUrl, listAlerts, resolveAlert } from './alerts.service.js';
import type { AlertParams, ListAlertsQuerySchema } from './alerts.schema.js';

type Params = z.infer<typeof AlertParams>;
type Query = z.infer<typeof ListAlertsQuerySchema>;

const mapAlert = (alert: {
  id: string;
  tenantId: string;
  vehicleId: string;
  tripId: string | null;
  driverId: string | null;
  type: 'fuel_anomaly' | 'geofence_breach' | 'tamper_detected' | 'idle_excess' | 'private_use' | 'unauthorized_stop' | 'speeding';
  severity: 'critical' | 'warning' | 'info';
  ts: Date;
  lat: string | null;
  lon: string | null;
  description: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...alert,
  ts: alert.ts.toISOString(),
  resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
  createdAt: alert.createdAt.toISOString(),
  updatedAt: alert.updatedAt.toISOString()
});

export async function listAlertsController(request: FastifyRequest<{ Querystring: Query }>, reply: FastifyReply): Promise<void> {
  const result = await listAlerts(request.server, request.tenantId, request.query);
  const typedData = result.data as Array<{
    id: string;
    tenantId: string;
    vehicleId: string;
    tripId: string | null;
    driverId: string | null;
    type: 'fuel_anomaly' | 'geofence_breach' | 'tamper_detected' | 'idle_excess' | 'private_use' | 'unauthorized_stop' | 'speeding';
    severity: 'critical' | 'warning' | 'info';
    ts: Date;
    lat: string | null;
    lon: string | null;
    description: string;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  void reply.send({ ...result, data: typedData.map(mapAlert) });
}

export async function getAlertController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const alert = await getAlert(request.server, request.tenantId, request.params.alertId);
  void reply.send(mapAlert(alert));
}

export async function resolveAlertController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const alert = await resolveAlert(request.server, request.tenantId, request.params.alertId, request.user.id);
  void reply.send(mapAlert(alert));
}

export async function bulkResolveController(
  request: FastifyRequest<{ Body: { ids: string[] } }>,
  reply: FastifyReply
): Promise<void> {
  const rows = await bulkResolve(request.server, request.tenantId, request.body.ids, request.user.id);
  void reply.send(rows.map(mapAlert));
}

export async function alertEvidenceController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const url = await getAlertEvidenceUrl(request.params.alertId);
  void reply.send({ url });
}
