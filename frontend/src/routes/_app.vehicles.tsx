import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { drivers as allDrivers } from "@/lib/mockData";
import { TopBar } from "@/components/layout/AppShell";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { Vehicle } from "@/lib/mockData";

export const Route = createFileRoute("/_app/vehicles")({ component: VehiclesPage });

const statusLabel: Record<Vehicle["status"], string> = {
  active: "Active", alerting: "Alerting", offline: "Offline",
};

function statusBadgeClass(s: Vehicle["status"]) {
  return s === "active" ? "badge-active" : s === "alerting" ? "badge-alerting" : "badge-offline";
}

function FuelBar({ pct }: { pct: number }) {
  const color = pct > 50 ? "bg-success" : pct > 20 ? "bg-warning" : "bg-destructive";
  return (
    <div className="progress-bar w-16">
      <div className={`progress-bar-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function VehiclesPage() {
  const fn = useServerFn(fetchVehicles);
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: qk.vehicles, queryFn: () => fn() });
  const [pulling, setPulling] = useState(false);
  const pull = async () => { setPulling(true); await refetch(); setTimeout(() => setPulling(false), 400); };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <TopBar
        title="Vehicles"
        action={
          <button
            id="vehicles-refresh"
            onClick={pull}
            className="h-8 px-3 rounded-lg bg-surface-2 border border-border flex items-center gap-1.5 text-xs font-display text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {pulling && <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-pulse" />}

      {/* Mobile cards */}
      <div className="lg:hidden p-3 space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl skeleton-shimmer" />
            ))
          : (data ?? []).map((v) => {
              const driver = allDrivers.find((d) => d.id === v.driverId);
              return (
                <Link
                  key={v.id} to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}
                  className="card-hover block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm tracking-wide`}>{v.plate}</span>
                      <span className={`${statusBadgeClass(v.status)} text-[9px] font-display uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                        {statusLabel[v.status]}
                      </span>
                      {v.alertCount > 0 && (
                        <span className="badge-alerting text-[9px] font-mono px-1.5 py-0.5 rounded-full">{v.alertCount}⚠</span>
                      )}
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{driver?.name} · {v.model}</div>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="font-mono text-xs">{v.speedKph} <span className="text-muted-foreground">km/h</span></span>
                    <div className="flex items-center gap-2">
                      <FuelBar pct={v.fuelLevel} />
                      <span className="font-mono text-xs">{v.fuelLevel}%</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">ping {v.lastPingMins}m</span>
                  </div>
                </Link>
              );
            })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-lg tracking-tight">Fleet Registry</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.length ?? "—"} vehicles in fleet</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden bg-surface-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-3">
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Plate</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Model</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Driver</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Speed</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Fuel</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Score</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Last ping</th>
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-display text-muted-foreground">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 rounded skeleton-shimmer" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data ?? []).map((v) => {
                    const d = allDrivers.find((x) => x.id === v.driverId);
                    return (
                      <tr key={v.id} className="table-row border-t border-border transition-colors">
                        <td className="px-5 py-3.5">
                          <Link
                            to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}
                            className="font-mono font-semibold text-sm hover:text-primary transition-colors flex items-center gap-1.5 group"
                          >
                            {v.plate}
                            <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{v.model}</td>
                        <td className="px-5 py-3.5 text-sm">{d?.name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`${statusBadgeClass(v.status)} text-[10px] font-display uppercase tracking-wider px-2.5 py-1 rounded-full`}>
                            {statusLabel[v.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-sm">{v.speedKph} <span className="text-muted-foreground text-xs">km/h</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <FuelBar pct={v.fuelLevel} />
                            <span className="font-mono text-xs">{v.fuelLevel}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-mono text-sm font-semibold ${v.fuelScore >= 80 ? "text-success" : v.fuelScore >= 60 ? "text-warning" : "text-destructive"}`}>
                            {v.fuelScore}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{v.lastPingMins}m ago</td>
                        <td className="px-5 py-3.5">
                          {v.alertCount > 0 ? (
                            <span className="badge-alerting text-[10px] font-mono px-2 py-0.5 rounded-full">{v.alertCount}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
