import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client.js';

async function run(): Promise<void> {
  await migrate(db, {
    migrationsFolder: './db/migrations'
  });
  await sql.end();
}

void run();
