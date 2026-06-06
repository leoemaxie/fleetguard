import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import {
  closeTrip,
  getTrip,
  getTripReplay,
  listTrips,
} from './trips.service.js'
import type { ListTripsQuerySchema, TripParams } from './trips.schema.js'

type ListQuery = z.infer<typeof ListTripsQuerySchema>
type Params = z.infer<typeof TripParams>

const mapTrip = (trip: {
  id: string
  tenantId: string
  vehicleId: string
  driverId: string
  routeId: string | null
  startTime: Date
  endTime: Date | null
  status: 'active' | 'completed' | 'incomplete'
  createdAt: Date
  updatedAt: Date
}) => ({
  ...trip,
  startTime: trip.startTime.toISOString(),
  endTime: trip.endTime ? trip.endTime.toISOString() : null,
  createdAt: trip.createdAt.toISOString(),
  updatedAt: trip.updatedAt.toISOString(),
})

export async function listTripsController(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await listTrips(
    request.server,
    request.tenantId,
    request.query,
  )
  void reply.send({ ...result, data: result.data.map(mapTrip) })
}

export async function getTripController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const trip = await getTrip(
    request.server,
    request.tenantId,
    request.params.tripId,
  )
  void reply.send(mapTrip(trip))
}

export async function replayTripController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const replay = await getTripReplay(
    request.server,
    request.tenantId,
    request.params.tripId,
  )
  void reply.send(replay)
}

export async function closeTripController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const trip = await closeTrip(
    request.server,
    request.tenantId,
    request.params.tripId,
  )
  void reply.send(mapTrip(trip))
}
