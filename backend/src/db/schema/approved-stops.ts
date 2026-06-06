import {
  customType,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants.js'
import { routes } from './routes.js'

const pointGeom = customType<{ data: string }>({
  dataType() {
    return 'geometry(Point,4326)'
  },
})

export const approvedStops = pgTable('approved_stops', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id')
    .notNull()
    .references(() => routes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  location: pointGeom('location').notNull(),
  maxDwellMinutes: integer('max_dwell_minutes').notNull().default(30),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
})

export type ApprovedStop = typeof approvedStops.$inferSelect
