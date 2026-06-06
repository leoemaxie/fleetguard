import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import {
  computeDriverScore,
  createDriver,
  getDriver,
  getDriverScore,
  getDriverScoreHistory,
  listDrivers,
  updateDriver
} from './drivers.service.js';
import type { CreateDriverSchema, DriverParams, ListDriversQuerySchema, UpdateDriverSchema } from './drivers.schema.js';

type ListQuery = z.infer<typeof ListDriversQuerySchema>;
type Params = z.infer<typeof DriverParams>;
type CreateInput = z.infer<typeof CreateDriverSchema>;
type UpdateInput = z.infer<typeof UpdateDriverSchema>;

const mapDriver = (driver: {
  id: string;
  tenantId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({ ...driver, createdAt: driver.createdAt.toISOString(), updatedAt: driver.updatedAt.toISOString() });

export async function listDriversController(request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply): Promise<void> {
  const result = await listDrivers(request.server, request.tenantId, request.query);
  void reply.send({ ...result, data: result.data.map(mapDriver) });
}

export async function createDriverController(request: FastifyRequest<{ Body: CreateInput }>, reply: FastifyReply): Promise<void> {
  const driver = await createDriver(request.server, request.tenantId, request.body);
  void reply.code(201).send(mapDriver(driver));
}

export async function getDriverController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const driver = await getDriver(request.server, request.tenantId, request.params.driverId);
  void reply.send(mapDriver(driver));
}

export async function updateDriverController(
  request: FastifyRequest<{ Params: Params; Body: UpdateInput }>,
  reply: FastifyReply
): Promise<void> {
  const driver = await updateDriver(request.server, request.tenantId, request.params.driverId, request.body);
  void reply.send(mapDriver(driver));
}

export async function driverScoreController(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply): Promise<void> {
  const score = await getDriverScore(request.server, request.tenantId, request.params.driverId);
  void reply.send(score);
}

export async function driverScoreHistoryController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
): Promise<void> {
  const history = await getDriverScoreHistory(request.server, request.tenantId, request.params.driverId);
  void reply.send(history);
}

export async function computeDriverScoreController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
): Promise<void> {
  const score = await computeDriverScore(request.server, request.tenantId, request.params.driverId);
  void reply.send(score);
}
