import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { getLive, getVehicleFuel, getVehicleGps } from './telemetry.service.js';
import type { ListTelemetryQuerySchema, TelemetryParams } from './telemetry.schema.js';

type Params = z.infer<typeof TelemetryParams>;
type Query = z.infer<typeof ListTelemetryQuerySchema>;

export async function liveTelemetryController(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const rows = await getLive(request.server, request.tenantId);
  void reply.send(rows);
}

export async function vehicleGpsController(
  request: FastifyRequest<{ Params: Params; Querystring: Query }>,
  reply: FastifyReply
): Promise<void> {
  const rows = await getVehicleGps(request.server, request.tenantId, request.params.vehicleId, request.query);
  void reply.send(rows);
}

export async function vehicleFuelController(
  request: FastifyRequest<{ Params: Params; Querystring: Query }>,
  reply: FastifyReply
): Promise<void> {
  const rows = await getVehicleFuel(request.server, request.tenantId, request.params.vehicleId, request.query);
  void reply.send(rows);
}
