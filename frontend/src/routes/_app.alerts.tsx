import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAlerts, fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { useState } from "react";
import { FileDown, X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { Alert, AlertSeverity } from "@/lib/mockData";

export const Route = createFileRoute("/_app/alerts")({ component: AlertsPage });

const SEVERITIES: { key: "all" | AlertSeverity; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warning",  label: "Warning" },
  { key: "info",     label: "Info" },
];

function severityIcon(s: AlertSeverity) {
  if (s === "critical") return <AlertTriangle className="size-3.5 text-destructive" />;
  if (s === "warning")  return <AlertTriangle className="size-3.5 text-warning" />;
  return <Info className="size-3.5 text-blue-400" />;
}

function severityBadgeClass(s: AlertSeverity) {
  return s === "critical" ? "badge-critical" : s === "warning" ? "badge-warning" : "badge-info";
}

function severityDotClass(s: AlertSeverity) {
  return s === "critical" ? "bg-destructive" : s === "warning" ? "bg-warning" : "bg-blue-400";
}

function AlertsPage() {
  const aFn = useServerFn(fetchAlerts);
  const vFn = useServerFn(fetchVehicles);
  const { data: alerts } = useQuery({ queryKey: qk.alerts, queryFn: () => aFn(), refetchInterval: 15000 });
  const { data: veh }    = useQuery({ queryKey: qk.vehicles, queryFn: () => vFn() });
  const qc = useQueryClient();
  const [filter,    setFilter   ] = useState<"all" | AlertSeverity>("all");
  const [selected,  setSelected ] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const filtered = (alerts ?? []).filter((a) => !dismissed.has(a.id) && (filter === "all" || a.severity === filter));
  const plate    = (id: string) => veh?.find((v) => v.id === id)?.plate ?? id;
  const dismiss  = (id: string) => { setDismissed((s) => new Set([...s, id])); qc.invalidateQueries({ queryKey: qk.alerts }); };

  const critCount = filtered.filter((a) => a.severity === "critical").length;
  const warnCount = filtered.filter((a) => a.severity === "warning").length;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TopBar
        title="Alerts"
        action={
          <div className="hidden lg:flex items-center gap-2">
            {critCount > 0 && (
              <span className="badge-critical text-[10px] font-mono px-2.5 py-1 rounded-full">{critCount} critical</span>
            )}
            {warnCount > 0 && (
              <span className="badge-warning text-[10px] font-mono px-2.5 py-1 rounded-full">{warnCount} warnings</span>
            )}
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="px-4 py-2.5 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border bg-surface">
        {SEVERITIES.map((s) => (
          <button
            key={s.key}
            id={`alerts-filter-${s.key}`}
            onClick={() => setFilter(s.key)}
            className={`px-3.5 h-8 rounded-full text-[11px] font-display uppercase tracking-widest whitespace-nowrap transition-all ${
              filter === s.key
                ? "bg-primary text-primary-foreground shadow-sm glow-primary"
                : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground border border-border"
            }`}
          >
            {s.label}
            {s.key !== "all" && (
              <span className="ml-1.5 font-mono">
                ({(alerts ?? []).filter((a) => !dismissed.has(a.id) && a.severity === s.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Alert list */}
        <div className="flex-1 lg:max-w-md lg:border-r border-border overflow-y-auto bg-surface">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <CheckCircle2 className="size-12 text-success/40 mb-4" />
              <div className="font-display font-semibold text-foreground">All clear</div>
              <div className="text-xs text-muted-foreground mt-1.5">No alerts match the current filter</div>
            </div>
          ) : (
            <ul className="p-3 space-y-2">
              {filtered.map((a) => (
                <SwipeCard key={a.id} onDismiss={() => dismiss(a.id)}>
                  <button
                    id={`alert-item-${a.id}`}
                    onClick={() => setSelected(a)}
                    className={`w-full min-h-14 text-left p-4 rounded-xl bg-surface-2 border transition-all card-hover ${
                      selected?.id === a.id
                        ? "border-primary/40 ring-1 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0 ${
                        a.severity === "critical" ? "bg-destructive/15" : a.severity === "warning" ? "bg-warning/15" : "bg-blue-400/15"
                      }`}>
                        {severityIcon(a.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-display font-semibold text-[13px] truncate">{a.type}</div>
                          <div className="text-[10px] font-mono text-muted-foreground shrink-0">{a.minutesAgo}m ago</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{plate(a.vehicleId)} · {a.description}</div>
                        <div className="mt-2">
                          <span className={`${severityBadgeClass(a.severity)} text-[9px] font-display uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                            {a.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </SwipeCard>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel (desktop) */}
        {selected ? (
          <aside className="hidden lg:flex flex-1 flex-col p-6 gap-5 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`${severityBadgeClass(selected.severity)} text-[10px] font-display uppercase tracking-widest px-2.5 py-1 rounded-full`}>
                    {selected.severity}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{selected.minutesAgo}m ago</span>
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">{selected.type}</h2>
                <div className="text-sm text-muted-foreground font-mono mt-1.5">
                  {plate(selected.vehicleId)}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-display hover:opacity-90 transition-all">
                  <FileDown className="size-3.5" /> Export PDF
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="size-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
            </div>

            {selected.fuelDelta !== undefined && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/25">
                <div className="text-[10px] font-display uppercase tracking-widest text-destructive mb-1.5">Fuel Anomaly Detected</div>
                <div className="font-mono text-2xl font-bold text-destructive">{selected.fuelDelta}L</div>
                <div className="text-xs text-muted-foreground mt-1">deviation from expected consumption</div>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden border border-border h-56 flex-shrink-0">
              <FleetMap
                center={selected.position}
                markers={[{ id: "x", position: selected.position, color: "#EF4444" }]}
              />
            </div>

            <button
              onClick={() => dismiss(selected.id)}
              className="h-11 rounded-xl bg-surface-2 border border-border text-sm font-display text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-all"
            >
              Dismiss alert
            </button>
          </aside>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-center p-10">
            <div className="size-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-2">
              <AlertTriangle className="size-6 text-muted-foreground" />
            </div>
            <div className="font-display font-semibold text-foreground">Select an alert</div>
            <div className="text-xs text-muted-foreground max-w-xs">Click an alert from the list to view its details, location, and export options</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SwipeCard({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const [dx,    setDx   ] = useState(0);
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
