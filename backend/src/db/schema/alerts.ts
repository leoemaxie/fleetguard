import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { vehicles } from './vehicles.js'
import { trips } from './trips.js'
import { drivers } from './drivers.js'
import { users } from './users.js'

export const alertTypeEnum = pgEnum('alert_type', [
  'fuel_anomaly',
  'geofence_breach',
  'tamper_detected',
  'idle_excess',
  'private_use',
  'unauthorized_stop',
  'speeding',
])

export const alertSeverityEnum = pgEnum('alert_severity', [
  'critical',
  'warning',
  'info',
])

export const alerts = pgTable('alerts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').references(() => drivers.id, {
    onDelete: 'cascade',
  }),
  type: alertTypeEnum('type').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lon: numeric('lon', { precision: 10, scale: 7 }),
  description: text('description').notNull(),
  evidenceJson: jsonb('evidence_json'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
})

export type Alert = typeof alerts.$inferSelect
