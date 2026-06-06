import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { fetchSummary, fetchVehicles, fetchAlerts } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { FleetMap, type MapMarker } from "@/components/map/FleetMap";
import { useEffect, useState } from "react";
import { drivers as allDrivers } from "@/lib/mockData";
import type { Vehicle } from "@/lib/mockData";
import { ChevronUp, Activity, AlertTriangle, WifiOff, Truck as TruckIcon, List } from "lucide-react";
import { TopBar } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const statusColor = (s: Vehicle["status"]) => s === "active" ? "#10B981" : s === "alerting" ? "#EF4444" : "#64748B";

function Dashboard() {
  const navigate = useNavigate();
  const sumFn = useServerFn(fetchSummary);
  const vehFn = useServerFn(fetchVehicles);
  const alFn = useServerFn(fetchAlerts);
  const { data: sum } = useQuery({ queryKey: qk.summary, queryFn: () => sumFn(), refetchInterval: 10000 });
  const { data: veh } = useQuery({ queryKey: qk.vehicles, queryFn: () => vehFn(), refetchInterval: 10000 });
  const { data: alerts } = useQuery({ queryKey: qk.alerts, queryFn: () => alFn(), refetchInterval: 15000 });

  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [listOpen, setListOpen] = useState(false);

  // Request notification permission once + fire on new criticals
  const [seenIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
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
    id: v.id,
    position: v.position,
    color: statusColor(v.status),
    onClick: () => setSelected(v),
  }));

  return (
    <div className="flex flex-col h-[100dvh] lg:h-screen">
      <TopBar title="Dashboard" />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Desktop side panel */}
        <aside className="hidden lg:flex flex-col w-[28rem] border-r border-border overflow-hidden">
          <SummaryStrip sum={sum} />
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(veh ?? []).slice().sort((a, b) => b.alertCount - a.alertCount).map((v) => (
              <VehicleRow key={v.id} v={v} onClick={() => { setSelected(v); navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: v.id } }); }} />
            ))}
          </div>
        </aside>
        <div className="relative flex-1 min-h-0">
          {/* Mobile summary floating */}
          <div className="lg:hidden absolute top-3 inset-x-3 z-10">
            <SummaryStrip sum={sum} compact />
          </div>
          <FleetMap markers={markers} />
          {/* FAB list */}
          <button onClick={() => setListOpen(true)} className="lg:hidden absolute bottom-4 right-4 z-20 h-12 px-4 rounded-full bg-primary text-primary-foreground font-display font-semibold shadow-lg flex items-center gap-2">
            <List className="size-4" /> Fleet
          </button>

          {/* Bottom sheet: selected vehicle */}
          {selected && (
            <div className="absolute inset-x-0 bottom-0 z-30 bg-surface-2 border-t border-border rounded-t-2xl p-4 safe-bottom">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-semibold">{selected.plate}</div>
                  <div className="text-xs text-muted-foreground">{selected.model} · {allDrivers.find((d) => d.id === selected.driverId)?.name}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground"><ChevronUp className="size-5 rotate-180" /></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Speed" value={`${selected.speedKph}`} unit="km/h" />
                <Stat label="Fuel" value={`${selected.fuelLevel}`} unit="%" />
                <Stat label="Alerts" value={`${selected.alertCount}`} unit="open" />
              </div>
              <button onClick={() => navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: selected.id } })} className="mt-4 w-full h-11 rounded-md bg-primary text-primary-foreground font-display font-semibold">View vehicle</button>
            </div>
          )}

          {/* Mobile list bottom sheet */}
          {listOpen && (
            <div className="lg:hidden absolute inset-0 z-40 bg-black/40" onClick={() => setListOpen(false)}>
              <div className="absolute inset-x-0 bottom-0 max-h-[80%] bg-surface-2 rounded-t-2xl flex flex-col safe-bottom" onClick={(e) => e.stopPropagation()}>
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="font-display font-semibold">Fleet ({veh?.length ?? 0})</div>
                  <button onClick={() => setListOpen(false)} className="text-xs text-muted-foreground">Close</button>
                </div>
                <div className="overflow-y-auto p-3 space-y-2">
                  {(veh ?? []).slice().sort((a, b) => b.alertCount - a.alertCount).map((v) => (
                    <VehicleRow key={v.id} v={v} onClick={() => { setListOpen(false); navigate({ to: "/vehicles/$vehicleId", params: { vehicleId: v.id } }); }} />
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

function SummaryStrip({ sum, compact }: { sum?: { total: number; active: number; alerting: number; offline: number }; compact?: boolean }) {
  const items = [
    { label: "Total", value: sum?.total ?? "—", icon: TruckIcon, color: "text-foreground" },
    { label: "Active", value: sum?.active ?? "—", icon: Activity, color: "text-success" },
    { label: "Alerting", value: sum?.alerting ?? "—", icon: AlertTriangle, color: "text-destructive" },
    { label: "Offline", value: sum?.offline ?? "—", icon: WifiOff, color: "text-muted-foreground" },
  ];
  return (
    <div className={`grid grid-cols-4 gap-2 ${compact ? "p-2 rounded-xl bg-surface-2/90 backdrop-blur border border-border" : "p-3 border-b border-border"}`}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="flex flex-col items-center justify-center py-1">
            <Icon className={`size-4 ${it.color} mb-1`} />
            <div className="font-mono font-semibold">{it.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-background rounded-lg p-2 text-center">
      <div className="font-mono text-lg font-semibold">{value}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span></div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function VehicleRow({ v, onClick }: { v: Vehicle; onClick: () => void }) {
  const driver = allDrivers.find((d) => d.id === v.driverId);
  return (
    <button onClick={onClick} className="w-full min-h-14 flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-2/70 border border-border text-left">
      <span className="size-2.5 rounded-full shrink-0" style={{ background: statusColor(v.status) }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm font-semibold">{v.plate}</div>
          {v.alertCount > 0 && (<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">{v.alertCount}</span>)}
        </div>
        <div className="text-xs text-muted-foreground truncate">{driver?.name} · {v.model}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm">{v.speedKph}<span className="text-[10px] text-muted-foreground ml-0.5">km/h</span></div>
        <div className="font-mono text-[10px] text-muted-foreground">fuel {v.fuelLevel}%</div>
      </div>
    </button>
  );
}
