import { integer, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { vehicles } from './vehicles.js';
import { trips } from './trips.js';

export const gpsEvents = pgTable('gps_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  speedKph: numeric('speed_kph', { precision: 6, scale: 2 }).notNull(),
  headingDeg: integer('heading_deg'),
  altitudeM: numeric('altitude_m', { precision: 8, scale: 2 }),
  serverTs: timestamp('server_ts', { withTimezone: true }).notNull()
});

export type GpsEvent = typeof gpsEvents.$inferSelect;
