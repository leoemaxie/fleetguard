import { format } from 'node:util'

export function buildTripReport(params: {
  tenantName: string
  plateNumber: string
  driverName: string
  tripId: string
  startedAt: string
  endedAt: string | null
  complianceScore: number | null
}): string {
  return format(
    'FleetGuard Trip Report\nTenant: %s\nVehicle: %s\nDriver: %s\nTrip ID: %s\nStart: %s\nEnd: %s\nCompliance: %s',
    params.tenantName,
    params.plateNumber,
    params.driverName,
    params.tripId,
    params.startedAt,
    params.endedAt ?? 'ongoing',
    params.complianceScore ?? 'n/a',
  )
}
