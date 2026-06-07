import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchDrivers } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { X, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { Driver } from "@/lib/mockData";

export const Route = createFileRoute("/_app/drivers")({ component: DriversPage });

function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-destructive";
}

function scoreBgClass(score: number) {
  if (score >= 85) return "bg-success/10 border-success/25 text-success";
  if (score >= 70) return "bg-warning/10 border-warning/25 text-warning";
  return "bg-destructive/10 border-destructive/25 text-destructive";
}

function scoreRingColor(score: number) {
  if (score >= 85) return "oklch(0.70 0.17 160)";
  if (score >= 70) return "oklch(0.74 0.18 60)";
  return "oklch(0.62 0.22 25)";
}

const METRICS = [
  { key: "routeCompliance", label: "Route" },
  { key: "fuelEfficiency",  label: "Fuel"  },
  { key: "alertFree",       label: "Alerts"},
  { key: "stopDiscipline",  label: "Stops" },
] as const;

function DriversPage() {
  const fn = useServerFn(fetchDrivers);
  const { data, isLoading } = useQuery({ queryKey: qk.drivers, queryFn: () => fn() });
  const [open, setOpen] = useState<Driver | null>(null);
  const sorted = (data ?? []).slice().sort((a, b) => b.score - a.score);

  const avgScore = sorted.length > 0
    ? Math.round(sorted.reduce((s, d) => s + d.score, 0) / sorted.length)
    : 0;

  return (
    <div className="min-h-[100dvh]">
      <TopBar
        title="Drivers"
        action={
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Fleet avg.</div>
              <div className={`font-mono text-base font-bold ${scoreColor(avgScore)}`}>{avgScore}<span className="text-xs text-muted-foreground">/100</span></div>
            </div>
            <div className={`h-8 px-3 rounded-lg border text-xs font-display font-semibold ${scoreBgClass(avgScore)}`}>
              {sorted.length} drivers
            </div>
          </div>
        }
      />

      {/* Summary bar */}
      <div className="border-b border-border bg-surface px-5 py-3 hidden lg:flex items-center gap-6">
        {[
          { label: "Top Performer", value: sorted[0]?.name ?? "—", sub: `Score: ${sorted[0]?.score}` },
          { label: "Needs Attention", value: sorted[sorted.length - 1]?.name ?? "—", sub: `Score: ${sorted[sorted.length - 1]?.score}` },
          { label: "Fleet Average", value: `${avgScore}/100`, sub: avgScore >= 80 ? "Excellent" : avgScore >= 70 ? "Good" : "Needs improvement" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="flex items-center gap-3 pr-6 border-r border-border last:border-0 last:pr-0">
            <div>
              <div className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="font-display font-semibold text-sm text-foreground mt-0.5">{value}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Driver list */}
      <div className="p-4 lg:p-5 space-y-2 max-w-3xl">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl skeleton-shimmer" />
            ))
          : sorted.map((d, i) => {
              const trend = (d.trend ?? []);
              const last2 = trend.slice(-2);
              const trending = last2.length === 2 ? (last2[1].score > last2[0].score ? "up" : "down") : null;
              return (
                <button
                  key={d.id}
                  id={`driver-row-${d.id}`}
                  onClick={() => setOpen(d)}
                  className="card-hover w-full min-h-[76px] text-left p-4 rounded-2xl bg-surface-2 border border-border flex items-center gap-4 hover:border-border/60"
                >
                  {/* Rank */}
                  <div className={`size-8 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                    i === 0 ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" :
                    i === 1 ? "bg-slate-300/10 text-slate-300 border border-slate-300/20" :
                    i === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/25" :
                    "bg-surface-3 text-muted-foreground"
                  }`}>
                    {i === 0 ? <Trophy className="size-3.5" /> : i + 1}
                  </div>

                  {/* Avatar */}
                  <div className="size-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-display font-bold text-sm text-primary shrink-0">
                    {d.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display font-semibold text-[14px] truncate">{d.name}</div>
                      {trending === "up" && <TrendingUp className="size-3.5 text-success shrink-0" />}
                      {trending === "down" && <TrendingDown className="size-3.5 text-destructive shrink-0" />}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {METRICS.map(({ key, label }) => (
                        <span key={key} className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-surface-3 border border-border text-muted-foreground">
                          {label}: <span className="text-foreground">{(d as any)[key]}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score circle */}
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-2xl font-bold ${scoreColor(d.score)}`}>{d.score}</div>
                    <div className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">/ 100</div>
                  </div>
                </button>
              );
            })}
      </div>

      {/* Driver detail modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full lg:max-w-lg bg-surface-2 rounded-t-3xl lg:rounded-3xl border border-border p-6 max-h-[90vh] overflow-y-auto safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center font-display font-bold text-xl text-primary">
                  {open.initials}
                </div>
                <div>
                  <div className="font-display text-xl font-bold tracking-tight">{open.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {open.trips} trips · {open.distanceKm.toLocaleString()} km total
                  </div>
                  <div className="mt-1.5">
                    <span className={`${scoreBgClass(open.score)} text-[9px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full border`}>
                      {open.score >= 85 ? "Excellent" : open.score >= 70 ? "Good" : "Needs Improvement"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-right`}>
                  <div className={`font-mono text-3xl font-bold ${scoreColor(open.score)}`}>{open.score}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Overall</div>
                </div>
                <button onClick={() => setOpen(null)} className="size-8 rounded-lg bg-surface-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Metric grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {METRICS.map(({ key, label }) => {
                const val = (open as any)[key] as number;
                return (
                  <div key={key} className="p-3 rounded-xl bg-surface-3 border border-border text-center">
                    <div className={`font-mono font-bold text-lg ${scoreColor(val)}`}>{val}</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
                    <div className="progress-bar mt-2">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${val}%`, background: scoreRingColor(val) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend chart */}
            <div className="rounded-2xl bg-surface-3 border border-border p-4">
              <div className="text-[10px] uppercase font-display tracking-widest text-muted-foreground mb-3">8-week performance trend</div>
              <div className="h-40">
                <ResponsiveContainer>
                  <LineChart data={open.trend}>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#64748B", fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748B", fontFamily: "JetBrains Mono" }} domain={[50, 100]} width={24} />
                    <Tooltip
                      contentStyle={{ background: "#1a2035", border: "1px solid #2d3a55", borderRadius: "10px", fontFamily: "JetBrains Mono", fontSize: "11px" }}
                      labelStyle={{ color: "#8899aa" }}
                    />
                    <Line type="monotone" dataKey="score" stroke="oklch(0.79 0.17 75)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.79 0.17 75)" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Worst alert */}
            {open.worstAlert && (
              <div className="mt-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="text-[9px] font-display uppercase tracking-widest text-destructive mb-1">Most frequent alert</div>
                <div className="text-sm font-mono text-foreground">{open.worstAlert}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
