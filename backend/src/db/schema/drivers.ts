import { boolean, date, integer, numeric, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    licenseNumber: varchar('license_number', { length: 50 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date())
  },
  (table) => ({
    tenantLicenseUk: unique('drivers_tenant_license_uk').on(table.tenantId, table.licenseNumber)
  })
);

export const driverWeeklyScores = pgTable('driver_weekly_scores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').notNull().references(() => drivers.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  totalScore: integer('total_score').notNull(),
  routeComplianceScore: integer('route_compliance_score').notNull(),
  fuelScore: integer('fuel_score').notNull(),
  alertScore: integer('alert_score').notNull(),
  stopScore: integer('stop_score').notNull(),
  tripsCount: integer('trips_count').notNull().default(0),
  expectedFuelLitres: numeric('expected_fuel_litres', { precision: 10, scale: 2 }),
  actualFuelLitres: numeric('actual_fuel_litres', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date())
});

export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
