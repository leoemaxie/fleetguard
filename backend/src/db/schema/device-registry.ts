import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { vehicles } from './vehicles.js'

export const deviceRegistry = pgTable('device_registry', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .unique()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  iotThingName: varchar('iot_thing_name', { length: 255 }).notNull().unique(),
  certArn: text('cert_arn').notNull(),
  firmwareVersion: varchar('firmware_version', { length: 50 }),
  lastPingAt: timestamp('last_ping_at', { withTimezone: true }),
  isProvisioned: boolean('is_provisioned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
})
