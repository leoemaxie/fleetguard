import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { drivers } from './drivers.js'

export const vehicleStatusEnum = pgEnum('vehicle_status', [
  'active',
  'inactive',
  'maintenance',
])

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    plateNumber: varchar('plate_number', { length: 20 }).notNull(),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    year: integer('year').notNull(),
    fuelTankCapacityLitres: numeric('fuel_tank_capacity_litres', {
      precision: 8,
      scale: 2,
    }).notNull(),
    assignedDriverId: uuid('assigned_driver_id').references(() => drivers.id, {
      onDelete: 'cascade',
    }),
    status: vehicleStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  table => ({
    tenantPlateUk: unique('vehicles_tenant_plate_uk').on(
      table.tenantId,
      table.plateNumber,
    ),
  }),
)

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
