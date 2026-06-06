import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../../db/client.js';
import { fuelEvents, gpsEvents } from '../../db/schema/index.js';

export type IdleDetectionInput = {
  tenantId: string;
  vehicleId: string;
  idleThresholdMinutes: number;
};

export async function detectIdleExcess(db: DrizzleClient, input: IdleDetectionInput): Promise<boolean> {
  const gps = await db
    .select()
    .from(gpsEvents)
    .where(and(eq(gpsEvents.tenantId, input.tenantId), eq(gpsEvents.vehicleId, input.vehicleId)))
    .orderBy(desc(gpsEvents.ts))
    .limit(input.idleThresholdMinutes);

  if (gps.length < input.idleThresholdMinutes) {
    return false;
  }

  const allZero = gps.every((row) => Number(row.speedKph) === 0);
  if (!allZero) {
    return false;
  }

  const fuel = await db
    .select()
    .from(fuelEvents)
    .where(and(eq(fuelEvents.tenantId, input.tenantId), eq(fuelEvents.vehicleId, input.vehicleId)))
    .orderBy(desc(fuelEvents.ts))
    .limit(input.idleThresholdMinutes);

  return fuel.some((row) => Number(row.litresPerMin) > 0);
}
