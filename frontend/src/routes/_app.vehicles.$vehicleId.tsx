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
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/vehicles/$vehicleId")({ component: VehicleDetail });

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const vFn = useServerFn(fetchVehicle);
  const tFn = useServerFn(fetchVehicleTrips);
  const aFn = useServerFn(fetchVehicleAlerts);
  const { data: v } = useQuery({ queryKey: qk.vehicle(vehicleId), queryFn: () => vFn({ data: { id: vehicleId } }) });
  const { data: trips } = useQuery({ queryKey: qk.vehicleTrips(vehicleId), queryFn: () => tFn({ data: { id: vehicleId } }) });
  const { data: alerts } = useQuery({ queryKey: qk.vehicleAlerts(vehicleId), queryFn: () => aFn({ data: { id: vehicleId } }) });
  const [tab, setTab] = useState<"overview" | "trips" | "alerts">("overview");
  const driver = v && allDrivers.find((d) => d.id === v.driverId);
  const spark = (v?.fuelSpark ?? []).map((y, i) => ({ x: i, y }));

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <TopBar
        title={v?.plate ?? "Vehicle"}
        action={<Link to="/vehicles" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link>}
      />
      <div className="sticky top-14 z-20 bg-background border-b border-border">
        <div className="flex">
          {(["overview", "trips", "alerts"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 lg:flex-none lg:px-6 h-11 text-sm font-display uppercase tracking-wider ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && v && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plate" value={v.plate} mono />
            <Field label="Model" value={v.model} />
            <Field label="Driver" value={driver?.name ?? "—"} />
            <Field label="Status" value={v.status.toUpperCase()} />
            <Field label="Speed" value={`${v.speedKph} km/h`} mono />
            <Field label="Fuel" value={`${v.fuelLevel}%`} mono />
          </div>
          <div className="h-56 rounded-xl overflow-hidden border border-border">
            <FleetMap markers={[{ id: v.id, position: v.position, color: "#F59E0B" }]} center={v.position} />
          </div>
          <div className="rounded-xl border border-border p-4 bg-surface-2">
            <div className="text-xs uppercase font-display tracking-wider text-muted-foreground mb-2">Fuel efficiency (last 12h)</div>
            <div className="h-32">
              <ResponsiveContainer>
                <LineChart data={spark}>
                  <XAxis dataKey="x" hide />
                  <YAxis hide domain={[40, 100]} />
                  <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", fontFamily: "JetBrains Mono" }} />
                  <Line type="monotone" dataKey="y" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "trips" && (
        <div className="p-4 space-y-2">
          {(trips ?? []).map((t) => (
            <Link key={t.id} to="/trips/$tripId/replay" params={{ tripId: t.id }} className="block p-3 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center justify-between">
                <div className="font-display font-medium">{t.fromName} → {t.toName}</div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${t.complianceScore >= 85 ? "bg-success/20 text-success" : t.complianceScore >= 70 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>{t.complianceScore}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-mono">{new Date(t.date).toLocaleDateString()} · {t.distanceKm}km · {t.fuelL}L</div>
            </Link>
          ))}
          {trips?.length === 0 && <div className="text-center text-muted-foreground py-8">No trips yet</div>}
        </div>
      )}

      {tab === "alerts" && (
        <div className="p-4 space-y-2">
          {(alerts ?? []).map((a) => {
            const c = a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning" : "bg-muted-foreground";
            return (
              <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                <div className={`mt-1.5 size-2 rounded-full shrink-0 ${c}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-medium text-sm">{a.type}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{a.minutesAgo}m ago</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              </div>
            );
          })}
          {alerts?.length === 0 && <div className="text-center text-muted-foreground py-8">No alerts</div>}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-surface-2 border border-border">
      <div className="text-[10px] uppercase font-display tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono" : "font-display"} text-sm`}>{value}</div>
    </div>
  );
}
