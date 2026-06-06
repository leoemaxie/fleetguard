import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAlerts, fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { useState } from "react";
import { FileDown } from "lucide-react";
import type { Alert, AlertSeverity } from "@/lib/mockData";

export const Route = createFileRoute("/_app/alerts")({ component: AlertsPage });

const SEVERITIES: { key: "all" | AlertSeverity; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warning" },
  { key: "info", label: "Info" },
];

function severityColor(s: AlertSeverity) {
  return s === "critical" ? "bg-destructive" : s === "warning" ? "bg-warning" : "bg-muted-foreground";
}

function AlertsPage() {
  const aFn = useServerFn(fetchAlerts);
  const vFn = useServerFn(fetchVehicles);
  const { data: alerts } = useQuery({ queryKey: qk.alerts, queryFn: () => aFn(), refetchInterval: 15000 });
  const { data: veh } = useQuery({ queryKey: qk.vehicles, queryFn: () => vFn() });
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");
  const [selected, setSelected] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const filtered = (alerts ?? []).filter((a) => !dismissed.has(a.id) && (filter === "all" || a.severity === filter));
  const plate = (id: string) => veh?.find((v) => v.id === id)?.plate ?? id;
  const dismiss = (id: string) => { setDismissed((s) => new Set([...s, id])); qc.invalidateQueries({ queryKey: qk.alerts }); };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TopBar title="Alerts" />
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border">
        {SEVERITIES.map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)} className={`px-3 h-8 rounded-full text-xs font-display whitespace-nowrap ${filter === s.key ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}>{s.label}</button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 lg:max-w-md lg:border-r border-border overflow-y-auto">
          <ul className="p-3 space-y-2">
            {filtered.map((a) => (
              <SwipeCard key={a.id} onDismiss={() => dismiss(a.id)}>
                <button onClick={() => setSelected(a)} className={`w-full min-h-14 text-left p-3 rounded-lg bg-surface-2 border border-border ${selected?.id === a.id ? "ring-1 ring-primary" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 size-2 rounded-full shrink-0 ${severityColor(a.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display font-medium text-sm truncate">{a.type}</div>
                        <div className="text-[10px] font-mono text-muted-foreground shrink-0">{a.minutesAgo}m</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{plate(a.vehicleId)} · {a.description}</div>
                    </div>
                  </div>
                </button>
              </SwipeCard>
            ))}
            {filtered.length === 0 && <li className="text-center py-12 text-muted-foreground">No alerts</li>}
          </ul>
        </div>

        {selected && (
          <aside className="hidden lg:flex flex-1 flex-col p-6 gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className={`inline-block text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded ${selected.severity === "critical" ? "bg-destructive/20 text-destructive" : selected.severity === "warning" ? "bg-warning/20 text-warning" : "bg-muted/20"}`}>{selected.severity}</div>
                <h2 className="mt-2 font-display text-2xl font-semibold">{selected.type}</h2>
                <div className="text-sm text-muted-foreground font-mono mt-1">{plate(selected.vehicleId)} · {selected.minutesAgo}m ago</div>
              </div>
              <button className="flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-display"><FileDown className="size-3.5" /> Export PDF</button>
            </div>
            <p className="text-sm">{selected.description}</p>
            {selected.fuelDelta !== undefined && (
              <div className="p-3 rounded-lg bg-surface-2 border border-border font-mono text-sm">
                Fuel delta: <span className="text-destructive">{selected.fuelDelta}L</span>
              </div>
            )}
            <div className="h-64 rounded-xl overflow-hidden border border-border">
              <FleetMap center={selected.position} markers={[{ id: "x", position: selected.position, color: "#EF4444" }]} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function SwipeCard({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const [dx, setDx] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  return (
    <li
      className="relative touch-pan-y"
      onTouchStart={(e) => setStart(e.touches[0].clientX)}
      onTouchMove={(e) => { if (start !== null) setDx(e.touches[0].clientX - start); }}
      onTouchEnd={() => { if (Math.abs(dx) > 100) onDismiss(); setDx(0); setStart(null); }}
      style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? "transform 0.2s" : undefined }}
    >
      {children}
    </li>
  );
}
