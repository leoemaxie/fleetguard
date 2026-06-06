import type { FastifyReply, FastifyRequest } from 'fastify'
import { fleetLive, fleetSummary } from './fleet.service.js'

export async function fleetLiveController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const data = await fleetLive(request.server, request.tenantId)
  void reply.send(data)
}

export async function fleetSummaryController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const summary = await fleetSummary(request.server, request.tenantId)
  void reply.send(summary)
}
