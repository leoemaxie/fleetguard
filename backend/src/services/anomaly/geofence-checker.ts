import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../../db/client.js';

export async function isWithinCorridor(
  db: DrizzleClient,
  lat: number,
  lon: number,
  routeId: string
): Promise<boolean> {
  const result = await db.execute<{ within: boolean }>(sql`
    SELECT ST_Within(
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
      r.corridor_geom
    ) AS within
    FROM routes r
    WHERE r.id = ${routeId}
    LIMIT 1
  `);

  const row = Array.isArray(result) ? result[0] : (result as any)[0];
  return row ? (row.within as boolean) : true;
}
