import { boolean, customType, integer, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';

const polygonGeom = customType<{ data: string }>({
  dataType() {
    return 'geometry(Polygon,4326)';
  }
});

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  corridorGeom: polygonGeom('corridor_geom'),
  corridorWidthMetres: integer('corridor_width_metres').notNull().default(500),
  originName: varchar('origin_name', { length: 255 }).notNull(),
  destinationName: varchar('destination_name', { length: 255 }).notNull(),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date())
});

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
