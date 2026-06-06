import {
  customType,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { vehicles } from './vehicles.js'
import { drivers } from './drivers.js'
import { routes } from './routes.js'

const pointGeom = customType<{ data: string }>({
  dataType() {
    return 'geometry(Point,4326)'
  },
})

export const tripStatusEnum = pgEnum('trip_status', [
  'active',
  'completed',
  'incomplete',
])

export const trips = pgTable('trips', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id')
    .notNull()
    .references(() => drivers.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').references(() => routes.id, {
    onDelete: 'cascade',
  }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  startLocation: pointGeom('start_location'),
  endLocation: pointGeom('end_location'),
  totalDistanceKm: numeric('total_distance_km', { precision: 8, scale: 2 }),
  totalFuelUsedLitres: numeric('total_fuel_used_litres', {
    precision: 8,
    scale: 2,
  }),
  complianceScore: numeric('compliance_score', { precision: 5, scale: 2 }),
  status: tripStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
})

export type Trip = typeof trips.$inferSelect
