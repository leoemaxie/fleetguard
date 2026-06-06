// Mock data: Nigerian fleet operations
export type VehicleStatus = "active" | "alerting" | "offline";
export type AlertSeverity = "critical" | "warning" | "info";

export interface Driver {
  id: string;
  name: string;
  initials: string;
  score: number;
  routeCompliance: number;
  fuelEfficiency: number;
  alertFree: number;
  stopDiscipline: number;
  trips: number;
  distanceKm: number;
  worstAlert: string;
  trend: { week: string; score: number }[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  driverId: string;
  status: VehicleStatus;
  speedKph: number;
  fuelLevel: number; // %
  fuelScore: number; // 0-100
  position: [number, number]; // [lng, lat]
  lastPingMins: number;
  alertCount: number;
  fuelSpark: number[];
}

export interface Alert {
  id: string;
  vehicleId: string;
  severity: AlertSeverity;
  type: string;
  description: string;
  minutesAgo: number;
  position: [number, number];
  fuelDelta?: number;
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  date: string;
  distanceKm: number;
  fuelL: number;
  complianceScore: number;
  fromName: string;
  toName: string;
  polyline: [number, number][];
  fuelSeries: { t: number; level: number }[];
  events: { t: number; label: string; severity: AlertSeverity }[];
  corridor: [number, number][];
}

export interface SavedRoute {
  id: string;
  name: string;
  waypoints: [number, number][];
  corridorWidthM: number;
}

// Nigerian-context drivers
export const drivers: Driver[] = [
  ["Tunde Okafor", 94, 96, 91, 98, 91, 42, 3120, "Idle Over Limit"],
  ["Ngozi Adeleke", 91, 93, 89, 95, 88, 38, 2845, "Corridor Deviation"],
  ["Babatunde Adewale", 88, 87, 90, 92, 83, 45, 3380, "Fuel Drop"],
  ["Ifeanyi Obi", 85, 81, 88, 90, 80, 36, 2660, "After-Hours Driving"],
  ["Aisha Bello", 83, 86, 79, 88, 79, 33, 2410, "Harsh Braking"],
  ["Chinedu Okoro", 78, 75, 82, 80, 76, 41, 2980, "Corridor Deviation"],
  ["Folake Adeyemi", 76, 80, 71, 84, 71, 29, 2110, "Fuel Drop"],
  ["Emeka Nwosu", 72, 70, 74, 78, 68, 37, 2710, "Idle Over Limit"],
].map(([name, score, rc, fe, af, sd, t, d, w], i) => {
  const parts = String(name).split(" ");
  return {
    id: `drv-${i + 1}`,
    name: String(name),
    initials: (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase(),
    score: Number(score),
    routeCompliance: Number(rc),
    fuelEfficiency: Number(fe),
    alertFree: Number(af),
    stopDiscipline: Number(sd),
    trips: Number(t),
    distanceKm: Number(d),
    worstAlert: String(w),
    trend: Array.from({ length: 8 }, (_, k) => ({
      week: `W${k + 1}`,
      score: Math.max(50, Math.min(100, Number(score) + Math.round(Math.sin(k + i) * 6))),
    })),
  };
});

// Lagos area positions
const lagosBase: [number, number] = [3.3792, 6.5244];
const ibadanBase: [number, number] = [3.8964, 7.3775];

function jitter(p: [number, number], a = 0.05): [number, number] {
  return [p[0] + (Math.random() - 0.5) * a, p[1] + (Math.random() - 0.5) * a];
}

// Seeded but deterministic-ish: build once at module load
const plateLetters = ["LSD", "LND", "EPE", "IKJ", "AGL", "OGN", "AAA", "BDG"];
const models = ["Toyota Hilux", "Hino 700", "Mercedes Actros", "Toyota Hiace", "Hino 500"];

export const vehicles: Vehicle[] = Array.from({ length: 14 }, (_, i) => {
  const statusRoll = Math.random();
  const status: VehicleStatus = statusRoll > 0.75 ? "alerting" : statusRoll > 0.9 ? "offline" : "active";
  const driver = drivers[i % drivers.length];
  return {
    id: `veh-${i + 1}`,
    plate: `${plateLetters[i % plateLetters.length]}-${100 + i * 7}${"AB"[i % 2]}${"CDE"[i % 3]}`,
    model: models[i % models.length],
    driverId: driver.id,
    status,
    speedKph: status === "offline" ? 0 : Math.round(Math.random() * 95),
    fuelLevel: Math.round(20 + Math.random() * 75),
    fuelScore: Math.round(60 + Math.random() * 40),
    position: jitter(i % 3 === 0 ? ibadanBase : lagosBase, 0.4),
    lastPingMins: status === "offline" ? 120 + Math.round(Math.random() * 300) : Math.round(Math.random() * 5),
    alertCount: status === "alerting" ? 1 + Math.round(Math.random() * 3) : Math.random() > 0.6 ? 1 : 0,
    fuelSpark: Array.from({ length: 12 }, () => 60 + Math.round(Math.random() * 35)),
  };
});

const alertTypes = [
  ["Corridor Deviation", "critical", "Vehicle left approved corridor by 340m near Berger"],
  ["Fuel Drop", "critical", "Unexpected 18L fuel level drop in 4 minutes"],
  ["After-Hours Driving", "warning", "Engine on outside operating hours (22:14)"],
  ["Idle Over Limit", "warning", "Idle 23 minutes at Apapa port gate"],
  ["Harsh Braking", "info", "Harsh braking event on Lagos-Ibadan expressway"],
  ["Speed Limit", "warning", "Exceeded 100km/h on restricted segment"],
] as const;

export const alerts: Alert[] = Array.from({ length: 22 }, (_, i) => {
  const a = alertTypes[i % alertTypes.length];
  const v = vehicles[i % vehicles.length];
  return {
    id: `alt-${i + 1}`,
    vehicleId: v.id,
    severity: a[1] as AlertSeverity,
    type: a[0],
    description: a[2],
    minutesAgo: Math.round(Math.random() * 600),
    position: jitter(v.position, 0.02),
    fuelDelta: a[0] === "Fuel Drop" ? -18 : undefined,
  };
}).sort((x, y) => x.minutesAgo - y.minutesAgo);

function buildPolyline(from: [number, number], to: [number, number], n = 40): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [
      from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * 0.01,
      from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * 0.01,
    ];
  });
}

const tripRoutes = [
  ["Apapa Port", "Tin Can Island", [3.3631, 6.4474], [3.3441, 6.4376]],
  ["Lagos Mainland", "Ibadan Depot", lagosBase, ibadanBase],
  ["Ikeja Hub", "Lekki Distribution", [3.3486, 6.6018], [3.5852, 6.4698]],
  ["Apapa Port", "Sagamu Interchange", [3.3631, 6.4474], [3.6486, 6.8485]],
  ["Ogun Warehouse", "Mile 2", [3.4892, 6.7654], [3.3286, 6.4621]],
] as const;

export const trips: Trip[] = Array.from({ length: 18 }, (_, i) => {
  const r = tripRoutes[i % tripRoutes.length];
  const v = vehicles[i % vehicles.length];
  const polyline = buildPolyline(r[2] as [number, number], r[3] as [number, number]);
  return {
    id: `trip-${i + 1}`,
    vehicleId: v.id,
    driverId: v.driverId,
    date: new Date(Date.now() - i * 86400000 * 0.4).toISOString(),
    distanceKm: Math.round(40 + Math.random() * 180),
    fuelL: Math.round(18 + Math.random() * 70),
    complianceScore: Math.round(65 + Math.random() * 33),
    fromName: r[0],
    toName: r[1],
    polyline,
    fuelSeries: Array.from({ length: 40 }, (_, k) => ({
      t: k,
      level: Math.round(90 - k * 1.4 + (Math.random() - 0.5) * 4),
    })),
    events: [
      { t: 8, label: "Departure", severity: "info" as const },
      { t: 18, label: "Harsh braking", severity: "warning" as const },
      { t: 26, label: "Corridor deviation", severity: "critical" as const },
      { t: 35, label: "Arrival", severity: "info" as const },
    ],
    corridor: polyline,
  };
});

export const savedRoutes: SavedRoute[] = [
  { id: "rt-1", name: "Apapa → Tin Can shuttle", waypoints: [[3.3631, 6.4474], [3.3441, 6.4376]], corridorWidthM: 250 },
  { id: "rt-2", name: "Lagos → Ibadan freight", waypoints: [lagosBase, [3.5, 6.8], [3.7, 7.1], ibadanBase], corridorWidthM: 800 },
  { id: "rt-3", name: "Ikeja → Lekki distribution", waypoints: [[3.3486, 6.6018], [3.45, 6.55], [3.5852, 6.4698]], corridorWidthM: 400 },
];

export function summary() {
  return {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "active").length,
    alerting: vehicles.filter((v) => v.status === "alerting").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
  };
}
