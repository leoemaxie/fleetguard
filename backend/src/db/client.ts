import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

const sql = postgres(env.DATABASE_URL, {
  max: 20,
  prepare: false
});

export const db = drizzle(sql, { schema });

export type DrizzleClient = typeof db;
export { sql };
