import { and, eq, gte } from 'drizzle-orm';
import type { DrizzleClient } from '../../db/client.js';
import { fuelEvents } from '../../db/schema/index.js';

export async function detectFuelAnomaly(db: DrizzleClient, tenantId: string, vehicleId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(fuelEvents)
    .where(and(eq(fuelEvents.tenantId, tenantId), eq(fuelEvents.vehicleId, vehicleId), gte(fuelEvents.ts, since)))
    .limit(200);

  if (rows.length < 3) {
    return false;
  }

  const latest = Number(rows[0]?.litresPerMin ?? 0);
  const baseline = rows.reduce((sum, row) => sum + Number(row.litresPerMin), 0) / rows.length;
  return baseline > 0 && latest > baseline * 2.5;
}
