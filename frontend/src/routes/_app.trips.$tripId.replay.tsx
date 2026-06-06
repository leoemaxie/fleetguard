import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchTrip } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/trips/$tripId/replay")({ component: ReplayPage });

function ReplayPage() {
  const { tripId } = Route.useParams();
  const fn = useServerFn(fetchTrip);
  const { data: trip } = useQuery({ queryKey: qk.trip(tripId), queryFn: () => fn({ data: { id: tripId } }) });

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const max = (trip?.polyline.length ?? 1) - 1;
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setT((v) => {
        const nv = v + dt * 3; // 3 steps/sec
        if (nv >= max) { setPlaying(false); return max; }
        return nv;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, max]);

  if (!trip) return <div className="p-8 text-center text-muted-foreground">Loading trip…</div>;

  const idx = Math.floor(t);
  const pos = trip.polyline[Math.min(idx, max)];
  const fuelIdx = Math.min(Math.floor((t / max) * (trip.fuelSeries.length - 1)), trip.fuelSeries.length - 1);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <TopBar title={`${trip.fromName} → ${trip.toName}`} action={<Link to="/trips" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link>} />
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_18rem] min-h-0">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="h-[55vh] lg:h-[60vh]">
            <FleetMap
              center={trip.polyline[Math.floor(trip.polyline.length / 2)]}
              markers={[{ id: "current", position: pos, color: "#F59E0B" }]}
              lines={[
                { id: "corridor", coords: trip.corridor, color: "#F59E0B66", width: 14 },
                { id: "route", coords: trip.polyline.slice(0, Math.max(idx + 1, 1)), color: "#10B981", width: 3 },
                { id: "rest", coords: trip.polyline.slice(idx), color: "#475569", width: 2, dashed: true },
              ]}
            />
          </div>
          <div className="flex-1 flex flex-col p-4 gap-3 bg-surface-2/30 border-t border-border">
            <div className="h-32 lg:h-44 rounded-lg bg-surface-2 border border-border p-2">
              <ResponsiveContainer>
                <AreaChart data={trip.fuelSeries}>
                  <defs>
                    <linearGradient id="fuel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748B", fontFamily: "JetBrains Mono" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B", fontFamily: "JetBrains Mono" }} width={28} />
                  <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", fontFamily: "JetBrains Mono" }} />
                  <Area dataKey="level" stroke="#F59E0B" fill="url(#fuel)" strokeWidth={2} />
                  <ReferenceLine x={trip.fuelSeries[fuelIdx].t} stroke="#F59E0B" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {trip.events.map((e, i) => {
                const c = e.severity === "critical" ? "bg-destructive" : e.severity === "warning" ? "bg-warning" : "bg-muted";
                return <span key={i} className={`text-[10px] font-mono px-2 py-1 rounded ${c} text-foreground whitespace-nowrap`}>{e.t}s · {e.label}</span>;
              })}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setPlaying((p) => !p)} className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <input type="range" min={0} max={max} step={0.1} value={t} onChange={(e) => setT(Number(e.target.value))} className="flex-1 accent-primary" />
              <div className="font-mono text-xs text-muted-foreground w-16 text-right">{Math.round(t)}/{max}</div>
            </div>
          </div>
        </div>
        <aside className="hidden lg:flex flex-col w-72 border-l border-border p-4 gap-2 overflow-y-auto">
          <div className="text-xs uppercase font-display tracking-wider text-muted-foreground">Events</div>
          {trip.events.map((e, i) => {
            const c = e.severity === "critical" ? "border-destructive" : e.severity === "warning" ? "border-warning" : "border-muted";
            return (
              <div key={i} className={`p-3 rounded-lg bg-surface-2 border-l-2 ${c}`}>
                <div className="font-display text-sm">{e.label}</div>
                <div className="text-[10px] font-mono text-muted-foreground">t={e.t}s · {e.severity}</div>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
