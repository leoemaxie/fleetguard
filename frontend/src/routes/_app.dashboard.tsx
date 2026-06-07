import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { fetchSummary, fetchVehicles, fetchAlerts } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { FleetMap, type MapMarker } from "@/components/map/FleetMap";
import { useEffect, useState } from "react";
import { drivers as allDrivers } from "@/lib/mockData";
import type { Vehicle } from "@/lib/mockData";
import {
  ChevronUp, Activity, AlertTriangle, WifiOff,
  Truck as TruckIcon, List, X, ExternalLink,
} from "lucide-react";
import { TopBar } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const statusColor = (s: Vehicle["status"]) =>
  s === "active" ? "#10B981" : s === "alerting" ? "#EF4444" : "#475569";

function Dashboard() {
  const navigate = useNavigate();
  const sumFn = useServerFn(fetchSummary);
  const vehFn = useServerFn(fetchVehicles);
  const alFn  = useServerFn(fetchAlerts);
  const { data: sum }    = useQuery({ queryKey: qk.summary,  queryFn: () => sumFn(), refetchInterval: 10000 });
  const { data: veh }    = useQuery({ queryKey: qk.vehicles, queryFn: () => vehFn(), refetchInterval: 10000 });
  const { data: alerts } = useQuery({ queryKey: qk.alerts,   queryFn: () => alFn(),  refetchInterval: 15000 });

  const [selected,  setSelected ] = useState<Vehicle | null>(null);
  const [listOpen,  setListOpen  ] = useState(false);

  const [seenIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default")
      Notification.requestPermission();
  }, []);
  useEffect(() => {
    if (!alerts || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const a of alerts) {
      if (a.severity === "critical" && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        const v = veh?.find((x) => x.id === a.vehicleId);
        try { new Notification("FleetGuard · Critical", { body: `${v?.plate ?? a.vehicleId} — ${a.type}` }); } catch { /* */ }
      }
    }
  }, [alerts, veh, seenIds]);

  const markers: MapMarker[] = (veh ?? []).map((v) => ({
    id: v.id, position: v.position, color: statusColor(v.status),
    onClick: () => setSelected(v),
  }));

  return (
    <div className="flex flex-col h-[100dvh] lg:h-screen">
      <TopBar
        title="Dashboard"
        action={
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        }
      />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Desktop side panel */}
        <aside className="hidden lg:flex flex-col w-[26rem] border-r border-border overflow-hidden bg-surface">
          <SummaryStrip sum={sum} />
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-display uppercase tracking-widest text-muted-foreground">Fleet ({veh?.length ?? 0})</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {(veh ?? []).slice().sort((a, b) => b.alertCount - a.alertCount).map((v) => (
              <VehicleRow
                key={v.id} v={v}
                selected={selected?.id === v.id}
                onClick={() => { setSelected(v); navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: v.id } }); }}
              />
            ))}
          </div>
        </aside>

        {/* Map area */}
        <div className="relative flex-1 min-h-0">
          {/* Mobile summary floating */}
          <div className="lg:hidden absolute top-3 inset-x-3 z-10">
            <SummaryStrip sum={sum} compact />
          </div>
          <FleetMap markers={markers} />

          {/* FAB: fleet list (mobile) */}
          <button
            onClick={() => setListOpen(true)}
            className="lg:hidden absolute bottom-5 right-4 z-20 h-12 px-4 rounded-full bg-primary text-primary-foreground font-display font-semibold shadow-xl glow-primary flex items-center gap-2 text-sm"
          >
            <List className="size-4" /> Fleet
          </button>

          {/* Selected vehicle bottom sheet */}
          {selected && (
            <div className="absolute inset-x-0 bottom-0 z-30 bg-surface-2/95 backdrop-blur-xl border-t border-border rounded-t-2xl p-5 safe-bottom">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0 relative pulse-ring"
                      style={{ background: statusColor(selected.status) }}
                    />
                    <div className="font-display text-lg font-bold tracking-tight">{selected.plate}</div>
                    {selected.alertCount > 0 && (
                      <span className="badge-alerting text-[10px] font-mono px-2 py-0.5 rounded-full">
                        {selected.alertCount} alert{selected.alertCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selected.model} · {allDrivers.find((d) => d.id === selected.driverId)?.name}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-3 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard label="Speed" value={`${selected.speedKph}`} unit="km/h" />
                <StatCard label="Fuel" value={`${selected.fuelLevel}`} unit="%" />
                <StatCard label="Alerts" value={`${selected.alertCount}`} unit="open" />
              </div>
              <button
                onClick={() => navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: selected.id } })}
                className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2 glow-primary hover:opacity-90 transition-all"
              >
                View vehicle <ExternalLink className="size-3.5" />
              </button>
            </div>
          )}

          {/* Mobile fleet list sheet */}
          {listOpen && (
            <div className="lg:hidden absolute inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setListOpen(false)}>
              <div
                className="absolute inset-x-0 bottom-0 max-h-[80%] bg-surface-2 rounded-t-2xl flex flex-col safe-bottom"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="font-display font-semibold">Fleet overview ({veh?.length ?? 0})</div>
                  <button onClick={() => setListOpen(false)} className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-3">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-2.5 space-y-1.5">
                  {(veh ?? []).slice().sort((a, b) => b.alertCount - a.alertCount).map((v) => (
                    <VehicleRow
                      key={v.id} v={v}
                      selected={selected?.id === v.id}
                      onClick={() => { setListOpen(false); navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: v.id } }); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Summary strip ── */
function SummaryStrip({
  sum, compact,
}: { sum?: { total: number; active: number; alerting: number; offline: number }; compact?: boolean }) {
  const items = [
    { label: "Total",    value: sum?.total    ?? "—", icon: TruckIcon,     color: "text-foreground",       bg: "bg-surface-3" },
    { label: "Active",   value: sum?.active   ?? "—", icon: Activity,      color: "text-success",          bg: "bg-success/10" },
    { label: "Alerting", value: sum?.alerting ?? "—", icon: AlertTriangle, color: "text-destructive",      bg: "bg-destructive/10" },
    { label: "Offline",  value: sum?.offline  ?? "—", icon: WifiOff,       color: "text-muted-foreground", bg: "bg-surface-3" },
  ];
  return (
    <div className={`grid grid-cols-4 gap-2 ${compact ? "p-2 rounded-2xl glass shadow-xl" : "p-3 border-b border-border"}`}>
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`flex flex-col items-center justify-center py-2 rounded-xl ${compact ? "" : bg}`}>
          <div className={`size-7 rounded-lg ${bg} flex items-center justify-center mb-1.5 ${compact ? "hidden" : ""}`}>
            <Icon className={`size-3.5 ${color}`} />
          </div>
          {compact && <Icon className={`size-3.5 ${color} mb-1`} />}
          <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Stat card (vehicle bottom sheet) ── */
function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-surface-3 rounded-xl p-3 text-center">
      <div className="font-mono text-xl font-bold">
        {value}<span className="text-[10px] text-muted-foreground ml-1 font-sans">{unit}</span>
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ── Vehicle list row ── */
function VehicleRow({ v, onClick, selected }: { v: Vehicle; onClick: () => void; selected?: boolean }) {
  const driver = allDrivers.find((d) => d.id === v.driverId);
  const dotClass = v.status === "active" ? "dot-active" : v.status === "alerting" ? "dot-alerting" : "dot-offline";
  return (
    <button
      onClick={onClick}
      className={`card-hover w-full min-h-14 flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
        selected
          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
          : "bg-surface-2 hover:bg-surface-3 border-border"
      }`}
    >
      <span className={`relative size-2.5 rounded-full shrink-0 ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm font-semibold tracking-wide">{v.plate}</div>
          {v.alertCount > 0 && (
            <span className="badge-alerting text-[9px] font-mono px-1.5 py-0.5 rounded-full">
              {v.alertCount}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{driver?.name} · {v.model}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-semibold">{v.speedKph}<span className="text-[10px] text-muted-foreground ml-0.5">km/h</span></div>
        <div className="font-mono text-[10px] text-muted-foreground">⛽ {v.fuelLevel}%</div>
      </div>
    </button>
  );
}
