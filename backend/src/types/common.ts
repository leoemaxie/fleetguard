export const subscriptionTiers = ['starter', 'growth', 'enterprise'] as const
export type SubscriptionTier = (typeof subscriptionTiers)[number]

export const roles = [
  'super_admin',
  'fleet_manager',
  'driver',
  'auditor',
] as const
export type Role = (typeof roles)[number]

export const vehicleStatuses = ['active', 'inactive', 'maintenance'] as const
export type VehicleStatus = (typeof vehicleStatuses)[number]

export const tripStatuses = ['active', 'completed', 'incomplete'] as const
export type TripStatus = (typeof tripStatuses)[number]

export const alertTypes = [
  'fuel_anomaly',
  'geofence_breach',
  'tamper_detected',
  'idle_excess',
  'private_use',
  'unauthorized_stop',
  'speeding',
] as const
export type AlertType = (typeof alertTypes)[number]

export const alertSeverities = ['critical', 'warning', 'info'] as const
export type AlertSeverity = (typeof alertSeverities)[number]

export type JwtPayload = {
  sub: string
  tenantId: string
  role: Role
  iat: number
  exp: number
}

export type CursorPayload = {
  id: string
  createdAt: string
}
