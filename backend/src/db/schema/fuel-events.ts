import { numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { vehicles } from './vehicles.js'
import { trips } from './trips.js'

export const fuelEvents = pgTable('fuel_events', {
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
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  litresPerMin: numeric('litres_per_min', { precision: 8, scale: 4 }).notNull(),
  cumulativeLitres: numeric('cumulative_litres', {
    precision: 10,
    scale: 4,
  }).notNull(),
  tankLevelPct: numeric('tank_level_pct', { precision: 5, scale: 2 }).notNull(),
  serverTs: timestamp('server_ts', { withTimezone: true }).notNull(),
})

export type FuelEvent = typeof fuelEvents.$inferSelect
