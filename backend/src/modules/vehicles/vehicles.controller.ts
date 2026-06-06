import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import {
  createVehicle,
  getVehicle,
  getVehicleLiveSnapshot,
  listVehicles,
  softDeleteVehicle,
  updateVehicle
} from './vehicles.service.js';
import type {
  CreateVehicleSchema,
  ListVehiclesQuerySchema,
  UpdateVehicleSchema,
  VehicleParams
} from './vehicles.schema.js';

type ListQuery = z.infer<typeof ListVehiclesQuerySchema>;
type Params = z.infer<typeof VehicleParams>;
type CreateInput = z.infer<typeof CreateVehicleSchema>;
type UpdateInput = z.infer<typeof UpdateVehicleSchema>;

const mapVehicle = (vehicle: {
  id: string;
  tenantId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  fuelTankCapacityLitres: string;
  assignedDriverId: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}) => ({ ...vehicle, createdAt: vehicle.createdAt.toISOString(), updatedAt: vehicle.updatedAt.toISOString() });

export async function listVehiclesController(request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply): Promise<void> {
  const result = await listVehicles(request.server, request.tenantId, request.query);
  void reply.send({ ...result, data: result.data.map(mapVehicle) });
}

export async function createVehicleController(
  request: FastifyRequest<{ Body: CreateInput }>,
  reply: FastifyReply
): Promise<void> {
  const vehicle = await createVehicle(request.server, request.tenantId, request.body);
  void reply.code(201).send(mapVehicle(vehicle));
}

export async function getVehicleController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const vehicle = await getVehicle(request.server, request.tenantId, request.params.vehicleId);
  void reply.send(mapVehicle(vehicle));
}

export async function updateVehicleController(
  request: FastifyRequest<{ Params: Params; Body: UpdateInput }>,
  reply: FastifyReply
): Promise<void> {
  const vehicle = await updateVehicle(request.server, request.tenantId, request.params.vehicleId, request.body);
  void reply.send(mapVehicle(vehicle));
}

export async function deleteVehicleController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const vehicle = await softDeleteVehicle(request.server, request.tenantId, request.params.vehicleId);
  void reply.send(mapVehicle(vehicle));
}

export async function liveVehicleController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const snapshot = await getVehicleLiveSnapshot(request.server, request.tenantId, request.params.vehicleId);
  void reply.send(snapshot);
}
