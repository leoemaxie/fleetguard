export const qk = {
  summary: ["summary"] as const,
  vehicles: ["vehicles"] as const,
  vehicle: (id: string) => ["vehicle", id] as const,
  alerts: ["alerts"] as const,
  trips: ["trips"] as const,
  vehicleTrips: (id: string) => ["trips", "vehicle", id] as const,
  vehicleAlerts: (id: string) => ["alerts", "vehicle", id] as const,
  trip: (id: string) => ["trip", id] as const,
  drivers: ["drivers"] as const,
  driver: (id: string) => ["driver", id] as const,
  routes: ["savedRoutes"] as const,
};
