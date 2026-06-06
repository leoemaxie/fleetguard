import {
  integer,
  pgEnum,
  pgTable,
  time,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'growth',
  'enterprise',
])

export const tenants = pgTable('tenants', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionTier: subscriptionTierEnum('subscription_tier')
    .notNull()
    .default('starter'),
  maxVehicles: integer('max_vehicles').notNull().default(10),
  operatingHoursStart: time('operating_hours_start')
    .notNull()
    .default('06:00:00'),
  operatingHoursEnd: time('operating_hours_end').notNull().default('22:00:00'),
  timezone: varchar('timezone', { length: 50 })
    .notNull()
    .default('Africa/Lagos'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
