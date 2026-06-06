import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchDrivers } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { X } from "lucide-react";
import type { Driver } from "@/lib/mockData";

export const Route = createFileRoute("/_app/drivers")({ component: DriversPage });

function DriversPage() {
  const fn = useServerFn(fetchDrivers);
  const { data } = useQuery({ queryKey: qk.drivers, queryFn: () => fn() });
  const [open, setOpen] = useState<Driver | null>(null);
  const sorted = (data ?? []).slice().sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-[100dvh]">
      <TopBar title="Drivers" />
      <div className="p-3 space-y-2">
        {sorted.map((d, i) => (
          <button key={d.id} onClick={() => setOpen(d)} className="w-full min-h-14 text-left p-3 rounded-lg bg-surface-2 border border-border flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm">{i + 1}</div>
            <div className="size-9 rounded-full bg-secondary text-foreground flex items-center justify-center font-display font-semibold text-xs">{d.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-medium truncate">{d.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {[
                  ["Route", d.routeCompliance],
                  ["Fuel", d.fuelEfficiency],
                  ["Alert-free", d.alertFree],
                  ["Stops", d.stopDiscipline],
                ].map(([l, v]) => (
                  <span key={l as string} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border">{l}: {v}</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-bold">{d.score}</div>
              <div className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">/100</div>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={() => setOpen(null)}>
          <div className="w-full lg:max-w-lg bg-surface-2 rounded-t-2xl lg:rounded-2xl p-5 max-h-[85vh] overflow-y-auto safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-secondary flex items-center justify-center font-display font-semibold">{open.initials}</div>
                <div>
                  <div className="font-display text-xl font-semibold">{open.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{open.trips} trips · {open.distanceKm.toLocaleString()} km</div>
                </div>
              </div>
              <button onClick={() => setOpen(null)} className="text-muted-foreground"><X className="size-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[["Route", open.routeCompliance], ["Fuel", open.fuelEfficiency], ["Alert-free", open.alertFree], ["Stops", open.stopDiscipline]].map(([l, v]) => (
                <div key={l as string} className="p-2 rounded-lg bg-background text-center">
                  <div className="font-mono font-semibold">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-background">
              <div className="text-xs uppercase font-display tracking-wider text-muted-foreground mb-2">8-week trend</div>
              <div className="h-40">
                <ResponsiveContainer>
                  <LineChart data={open.trend}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748B", fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B", fontFamily: "JetBrains Mono" }} domain={[50, 100]} width={28} />
                    <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", fontFamily: "JetBrains Mono" }} />
                    <Line dataKey="score" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Worst alert: <span className="text-foreground font-mono">{open.worstAlert}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
