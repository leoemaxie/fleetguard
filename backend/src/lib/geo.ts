import { sql } from 'drizzle-orm'

export function pointFromLatLon(lat: number, lon: number) {
  return sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`
}

export function geomFromGeoJson(geoJson: string) {
  return sql`ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326)`
}

export function withinPolygon(
  pointExpr: ReturnType<typeof pointFromLatLon>,
  polygonColumn: unknown,
) {
  return sql`ST_Within(${pointExpr}, ${polygonColumn})`
}
