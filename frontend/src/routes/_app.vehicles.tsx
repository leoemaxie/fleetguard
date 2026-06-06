import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { drivers as allDrivers } from "@/lib/mockData";
import { TopBar } from "@/components/layout/AppShell";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/vehicles")({ component: VehiclesPage });

function VehiclesPage() {
  const fn = useServerFn(fetchVehicles);
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: qk.vehicles, queryFn: () => fn() });
  const [pulling, setPulling] = useState(false);
  const pull = async () => { setPulling(true); await refetch(); setTimeout(() => setPulling(false), 400); };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <TopBar title="Vehicles" action={
        <button onClick={pull} className="text-muted-foreground"><RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /></button>
      } />
      {pulling && <div className="h-1 bg-primary animate-pulse" />}

      {/* Mobile cards */}
      <div className="lg:hidden p-3 space-y-2">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-surface-2 animate-pulse" />
        )) : (data ?? []).map((v) => {
          const driver = allDrivers.find((d) => d.id === v.driverId);
          const sColor = v.status === "active" ? "bg-success" : v.status === "alerting" ? "bg-destructive" : "bg-muted-foreground";
          return (
            <Link key={v.id} to="/vehicles/$vehicleId" params={{ vehicleId: v.id }} className="block p-3 min-h-14 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono font-semibold">{v.plate}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${sColor}`} />
                  <span className="text-[10px] uppercase font-display tracking-wider text-muted-foreground">{v.status}</span>
                  {v.alertCount > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">{v.alertCount}</span>}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{driver?.name} · {v.model}</div>
              <div className="mt-2 flex items-center gap-4 text-xs font-mono">
                <span>{v.speedKph} km/h</span>
                <span>fuel {v.fuelLevel}%</span>
                <span className="text-muted-foreground">ping {v.lastPingMins}m</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block p-6">
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-xs uppercase font-display tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Speed</th>
                <th className="px-4 py-3">Fuel</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Last Ping</th>
                <th className="px-4 py-3">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((v) => {
                const d = allDrivers.find((x) => x.id === v.driverId);
                const sColor = v.status === "active" ? "text-success" : v.status === "alerting" ? "text-destructive" : "text-muted-foreground";
                return (
                  <tr key={v.id} className="border-t border-border hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-mono"><Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }} className="hover:text-primary">{v.plate}</Link></td>
                    <td className="px-4 py-3 text-muted-foreground">{v.model}</td>
                    <td className="px-4 py-3">{d?.name}</td>
                    <td className={`px-4 py-3 font-display uppercase text-xs ${sColor}`}>{v.status}</td>
                    <td className="px-4 py-3 font-mono">{v.speedKph}</td>
                    <td className="px-4 py-3 font-mono">{v.fuelLevel}%</td>
                    <td className="px-4 py-3 font-mono">{v.fuelScore}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{v.lastPingMins}m</td>
                    <td className="px-4 py-3"><span className={`font-mono ${v.alertCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{v.alertCount}</span></td>
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
