import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { vehicles, alerts, trips, drivers, savedRoutes, summary, type SavedRoute } from "./mockData";

// Simulated network latency
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const fetchSummary = createServerFn({ method: "GET" }).handler(async () => {
  await delay(80);
  return summary();
});

export const fetchVehicles = createServerFn({ method: "GET" }).handler(async () => {
  await delay();
  return vehicles;
});

export const fetchVehicle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await delay();
    const v = vehicles.find((x) => x.id === data.id);
    if (!v) throw new Error("Vehicle not found");
    return v;
  });

export const fetchAlerts = createServerFn({ method: "GET" }).handler(async () => {
  await delay();
  return alerts;
});

export const fetchVehicleAlerts = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await delay();
    return alerts.filter((a) => a.vehicleId === data.id);
  });

export const fetchTrips = createServerFn({ method: "GET" }).handler(async () => {
  await delay();
  return trips;
});

export const fetchVehicleTrips = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await delay();
    return trips.filter((t) => t.vehicleId === data.id);
  });

export const fetchTrip = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await delay();
    const t = trips.find((x) => x.id === data.id);
    if (!t) throw new Error("Trip not found");
    return t;
  });

export const fetchDrivers = createServerFn({ method: "GET" }).handler(async () => {
  await delay();
  return drivers;
});

export const fetchDriver = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await delay();
    const d = drivers.find((x) => x.id === data.id);
    if (!d) throw new Error("Driver not found");
    return d;
  });

export const fetchSavedRoutes = createServerFn({ method: "GET" }).handler(async () => {
  await delay();
  return savedRoutes;
});

// In-memory mock mutation (won't persist across server restarts; fine for demo)
let _local: SavedRoute[] = [];
export const saveRoute = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      waypoints: z.array(z.tuple([z.number(), z.number()])).min(2),
      corridorWidthM: z.number().min(100).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    await delay();
    const r: SavedRoute = { id: `rt-local-${Date.now()}`, ...data };
    _local.push(r);
    return r;
  });
