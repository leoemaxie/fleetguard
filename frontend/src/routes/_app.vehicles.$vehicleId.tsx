import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchVehicle, fetchVehicleAlerts, fetchVehicleTrips } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { drivers as allDrivers } from "@/lib/mockData";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Info } from "lucide-react";

export const Route = createFileRoute("/_app/vehicles/$vehicleId")({ component: VehicleDetail });

const TABS = ["overview", "trips", "alerts"] as const;
type Tab = typeof TABS[number];

function FuelBar({ pct }: { pct: number }) {
  const color = pct > 50 ? "bg-success" : pct > 20 ? "bg-warning" : "bg-destructive";
  return (
    <div className="progress-bar flex-1">
      <div className={`progress-bar-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const vFn = useServerFn(fetchVehicle);
  const tFn = useServerFn(fetchVehicleTrips);
  const aFn = useServerFn(fetchVehicleAlerts);
  const { data: v      } = useQuery({ queryKey: qk.vehicle(vehicleId),       queryFn: () => vFn({ data: { id: vehicleId } }) });
  const { data: trips  } = useQuery({ queryKey: qk.vehicleTrips(vehicleId),  queryFn: () => tFn({ data: { id: vehicleId } }) });
  const { data: alerts } = useQuery({ queryKey: qk.vehicleAlerts(vehicleId), queryFn: () => aFn({ data: { id: vehicleId } }) });
  const [tab, setTab] = useState<Tab>("overview");
  const driver = v && allDrivers.find((d) => d.id === v.driverId);
  const spark  = (v?.fuelSpark ?? []).map((y, i) => ({ x: i, y }));

  const statusClass = v?.status === "active" ? "badge-active" : v?.status === "alerting" ? "badge-alerting" : "badge-offline";

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <TopBar
        title={v?.plate ?? "Vehicle"}
        action={
          <Link
            to="/vehicles"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-2 border border-border text-xs font-display text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        }
      />

      {/* Vehicle status header (desktop) */}
      {v && (
        <div className="hidden lg:flex items-center gap-5 px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <span className={`${statusClass} text-[10px] font-display uppercase tracking-widest px-2.5 py-1 rounded-full`}>
              {v.status}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground">{v.model}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm">{driver?.name ?? "Unassigned"}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">Speed</div>
              <div className="font-mono font-semibold text-sm">{v.speedKph} km/h</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">Fuel</div>
              <div className="font-mono font-semibold text-sm">{v.fuelLevel}%</div>
            </div>
            {v.alertCount > 0 && (
              <span className="badge-alerting text-[10px] font-mono px-2.5 py-1 rounded-full">{v.alertCount} alerts</span>
            )}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="sticky top-14 z-20 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex px-1">
          {TABS.map((t) => (
            <button
              key={t}
              id={`vehicle-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 lg:flex-none lg:px-6 h-11 text-[11px] font-display uppercase tracking-widest transition-all relative ${
                tab === t
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === "overview" && v && (
        <div className="p-4 lg:p-6 space-y-4 max-w-3xl">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <FieldCard label="Plate"  value={v.plate}              mono />
            <FieldCard label="Model"  value={v.model}               />
            <FieldCard label="Driver" value={driver?.name ?? "—"}   />
            <FieldCard
              label="Status"
              value={v.status.toUpperCase()}
              customValue={
                <span className={`${statusClass} text-[10px] font-display uppercase tracking-wider px-2.5 py-1 rounded-full inline-block mt-1`}>
                  {v.status}
                </span>
              }
            />
            <FieldCard label="Speed" value={`${v.speedKph} km/h`} mono />
            <FieldCard
              label="Fuel level"
              value={`${v.fuelLevel}%`}
              mono
              customValue={
                <div className="flex items-center gap-2 mt-1.5">
                  <FuelBar pct={v.fuelLevel} />
                  <span className="font-mono text-sm font-semibold">{v.fuelLevel}%</span>
                </div>
              }
            />
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-border h-56 lg:h-72">
            <FleetMap markers={[{ id: v.id, position: v.position, color: "#F59E0B" }]} center={v.position} />
          </div>

          {/* Fuel chart */}
          <div className="rounded-2xl border border-border p-5 bg-surface-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase font-display tracking-widest text-muted-foreground">Fuel efficiency · last 12h</div>
              <div className="font-mono text-xs text-muted-foreground">
                Score: <span className={`font-semibold ${v.fuelScore >= 80 ? "text-success" : v.fuelScore >= 60 ? "text-warning" : "text-destructive"}`}>{v.fuelScore}</span>
              </div>
            </div>
            <div className="h-36">
              <ResponsiveContainer>
                <LineChart data={spark}>
                  <XAxis dataKey="x" hide />
                  <YAxis hide domain={[40, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#1a2035", border: "1px solid #2d3a55", borderRadius: "10px", fontFamily: "JetBrains Mono", fontSize: "11px" }}
                  />
                  <Line type="monotone" dataKey="y" stroke="oklch(0.79 0.17 75)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Trips */}
      {tab === "trips" && (
        <div className="p-4 lg:p-6 space-y-2 max-w-3xl">
          <div className="mb-3 text-xs text-muted-foreground font-mono">{trips?.length ?? 0} trips recorded</div>
          {(trips ?? []).map((t) => (
            <Link
              key={t.id}
              to="/trips/$tripId/replay"
              params={{ tripId: t.id }}
              className="card-hover block p-4 rounded-2xl bg-surface-2 border border-border"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-display font-semibold text-[14px] truncate">{t.fromName} → {t.toName}</div>
                <span className={`shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                  t.complianceScore >= 85 ? "badge-success" : t.complianceScore >= 70 ? "badge-warning" : "badge-critical"
                }`}>
                  {t.complianceScore}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
                <span>{new Date(t.date).toLocaleDateString()}</span>
                <span>{t.distanceKm} km</span>
                <span>{t.fuelL} L</span>
              </div>
            </Link>
          ))}
          {trips?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-display">No trips recorded yet</div>
          )}
        </div>
      )}

      {/* Alerts */}
      {tab === "alerts" && (
        <div className="p-4 lg:p-6 space-y-2 max-w-3xl">
          <div className="mb-3 text-xs text-muted-foreground font-mono">{alerts?.length ?? 0} alerts for this vehicle</div>
          {(alerts ?? []).map((a) => {
            const isCrit = a.severity === "critical";
            const isWarn = a.severity === "warning";
            return (
              <div key={a.id} className="flex gap-4 p-4 rounded-2xl bg-surface-2 border border-border">
                <div className={`mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isCrit ? "bg-destructive/15" : isWarn ? "bg-warning/15" : "bg-blue-400/15"
                }`}>
                  {isCrit || isWarn
                    ? <AlertTriangle className={`size-3.5 ${isCrit ? "text-destructive" : "text-warning"}`} />
                    : <Info className="size-3.5 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display font-semibold text-[13px]">{a.type}</div>
                    <div className="text-[10px] font-mono text-muted-foreground shrink-0">{a.minutesAgo}m ago</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              </div>
            );
          })}
          {alerts?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-display">No alerts for this vehicle</div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldCard({
  label, value, mono, customValue,
}: {
  label: string; value: string; mono?: boolean; customValue?: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface-2 border border-border">
      <div className="text-[9px] uppercase font-display tracking-widest text-muted-foreground">{label}</div>
      {customValue ?? (
        <div className={`mt-1.5 text-sm font-semibold ${mono ? "font-mono tracking-wide" : "font-display"}`}>{value}</div>
      )}
    </div>
  );
}
