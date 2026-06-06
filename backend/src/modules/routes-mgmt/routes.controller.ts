import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import {
  addRouteStop,
  createRoute,
  deleteRouteStop,
  getRoute,
  listRoutes,
  softDeleteRoute,
  updateRoute,
} from './routes.service.js'
import type {
  CreateRouteSchema,
  CreateStopSchema,
  ListRoutesQuerySchema,
  RouteParams,
  StopParams,
  UpdateRouteSchema,
} from './routes.schema.js'

type ListQuery = z.infer<typeof ListRoutesQuerySchema>
type Params = z.infer<typeof RouteParams>
type StopPath = z.infer<typeof StopParams>
type CreateInput = z.infer<typeof CreateRouteSchema>
type UpdateInput = z.infer<typeof UpdateRouteSchema>
type CreateStopInput = z.infer<typeof CreateStopSchema>

const mapRoute = (route: {
  id: string
  tenantId: string
  name: string
  corridorWidthMetres: number
  originName: string
  destinationName: string
  distanceKm: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) => ({
  ...route,
  createdAt: route.createdAt.toISOString(),
  updatedAt: route.updatedAt.toISOString(),
})

export async function listRoutesController(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await listRoutes(
    request.server,
    request.tenantId,
    request.query,
  )
  void reply.send({ ...result, data: result.data.map(mapRoute) })
}

export async function createRouteController(
  request: FastifyRequest<{ Body: CreateInput }>,
  reply: FastifyReply,
): Promise<void> {
  const route = await createRoute(
    request.server,
    request.tenantId,
    request.body,
  )
  void reply.code(201).send(mapRoute(route))
}

export async function getRouteController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const route = await getRoute(
    request.server,
    request.tenantId,
    request.params.routeId,
  )
  void reply.send(mapRoute(route))
}

export async function updateRouteController(
  request: FastifyRequest<{ Params: Params; Body: UpdateInput }>,
  reply: FastifyReply,
): Promise<void> {
  const route = await updateRoute(
    request.server,
    request.tenantId,
    request.params.routeId,
    request.body as Record<string, unknown>,
  )
  void reply.send(mapRoute(route))
}

export async function deleteRouteController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const route = await softDeleteRoute(
    request.server,
    request.tenantId,
    request.params.routeId,
  )
  void reply.send(mapRoute(route))
}

export async function addStopController(
  request: FastifyRequest<{ Params: Params; Body: CreateStopInput }>,
  reply: FastifyReply,
): Promise<void> {
  const stop = await addRouteStop(
    request.server,
    request.tenantId,
    request.params.routeId,
    request.body,
  )
  void reply.code(201).send(stop)
}

export async function deleteStopController(
  request: FastifyRequest<{ Params: StopPath }>,
  reply: FastifyReply,
): Promise<void> {
  const stop = await deleteRouteStop(
    request.server,
    request.tenantId,
    request.params.routeId,
    request.params.stopId,
  )
  void reply.send(stop)
}
