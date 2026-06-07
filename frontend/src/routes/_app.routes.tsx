import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchSavedRoutes, saveRoute } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { useState } from "react";
import { Plus, X, Save, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/routes")({ component: RoutesPage });

function RoutesPage() {
  const fn   = useServerFn(fetchSavedRoutes);
  const save = useServerFn(saveRoute);
  const qc   = useQueryClient();
  const { data: routes } = useQuery({ queryKey: qk.routes, queryFn: () => fn() });
  const [selectedId,  setSelectedId ] = useState<string | null>(null);
  const [draw,        setDraw       ] = useState(false);
  const [waypoints,   setWaypoints  ] = useState<[number, number][]>([]);
  const [width,       setWidth      ] = useState(400);
  const [name,        setName       ] = useState("");
  const [panelOpen,   setPanelOpen  ] = useState(false);

  const mut = useMutation({
    mutationFn: (input: { name: string; waypoints: [number, number][]; corridorWidthM: number }) =>
      save({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.routes });
      toast.success("Route saved successfully");
      setDraw(false); setWaypoints([]); setName("");
    },
  });

  const selected   = routes?.find((r) => r.id === selectedId);
  const showLines  = draw
    ? (waypoints.length > 1
        ? [
            { id: "draft", coords: waypoints, color: "oklch(0.79 0.17 75)", width: 3 },
            { id: "buf",   coords: waypoints, color: "oklch(0.79 0.17 75 / 0.2)", width: Math.max(6, width / 30) },
          ]
        : [])
    : (selected
        ? [
            { id: selected.id,        coords: selected.waypoints, color: "oklch(0.79 0.17 75)",       width: 3 },
            { id: selected.id + "buf", coords: selected.waypoints, color: "oklch(0.79 0.17 75 / 0.15)", width: Math.max(6, selected.corridorWidthM / 30) },
          ]
        : []);
  const showMarkers = (draw ? waypoints : (selected?.waypoints ?? [])).map((p, i) => ({
    id: String(i), position: p, color: "oklch(0.79 0.17 75)",
  }));

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TopBar
        title="Route Planner"
        action={
          draw ? (
            <button
              onClick={() => { setDraw(false); setWaypoints([]); }}
              className="h-8 px-3 rounded-lg bg-surface-2 border border-border text-xs font-display text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all"
            >
              Cancel
            </button>
          ) : (
            <button
              id="routes-new"
              onClick={() => { setDraw(true); setWaypoints([]); setSelectedId(null); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold hover:opacity-90 transition-all"
            >
              <Plus className="size-3.5" /> New route
            </button>
          )
        }
      />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-80 border-r border-border overflow-y-auto bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Saved routes ({routes?.length ?? 0})</span>
          </div>
          <RouteList routes={routes} selectedId={selectedId} setSelectedId={setSelectedId} />
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <FleetMap
            lines={showLines}
            markers={showMarkers}
            onMapClick={(p) => { if (draw) setWaypoints((w) => [...w, p]); }}
          />

          {/* Mobile: open panel button */}
          <button
            onClick={() => setPanelOpen(true)}
            className="lg:hidden absolute bottom-5 right-4 h-12 px-4 rounded-full bg-surface-2/90 backdrop-blur-xl border border-border font-display font-semibold shadow-xl text-sm"
          >
            {draw ? `${waypoints.length} waypoints` : `${routes?.length ?? 0} routes`}
          </button>

          {/* Draw mode panel */}
          {draw && (
            <div className="absolute inset-x-3 bottom-3 lg:inset-x-auto lg:right-4 lg:left-auto lg:w-80 p-5 rounded-2xl glass shadow-2xl space-y-4 safe-bottom">
              <div className="flex items-center gap-2 mb-1">
                <RouteIcon className="size-4 text-primary" />
                <span className="font-display font-semibold text-sm">New route</span>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Route name (e.g. Lagos — Ibadan)"
                className="w-full h-10 px-3 rounded-xl bg-background/80 border border-border text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
              />
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-display uppercase tracking-widest text-muted-foreground text-[10px]">Corridor width</span>
                  <span className="font-mono text-primary font-semibold">{width}m</span>
                </div>
                <input
                  type="range" min={100} max={2000} step={50} value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "oklch(0.79 0.17 75)" }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {waypoints.length === 0 ? "Tap the map to add waypoints" : `${waypoints.length} waypoint${waypoints.length > 1 ? "s" : ""} added`}
              </div>
              <button
                disabled={!name || waypoints.length < 2 || mut.isPending}
                onClick={() => mut.mutate({ name, waypoints, corridorWidthM: width })}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-all glow-primary"
              >
                {mut.isPending ? (
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                ) : (
                  <><Save className="size-4" /> Save route</>
                )}
              </button>
            </div>
          )}

          {/* Mobile routes panel */}
          {panelOpen && !draw && (
            <div className="lg:hidden absolute inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setPanelOpen(false)}>
              <div
                className="absolute inset-x-0 bottom-0 max-h-[75%] bg-surface-2 rounded-t-3xl flex flex-col safe-bottom border-t border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="font-display font-semibold">Saved Routes</div>
                  <button onClick={() => setPanelOpen(false)} className="size-7 rounded-lg bg-surface-3 flex items-center justify-center text-muted-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  <RouteList
                    routes={routes}
                    selectedId={selectedId}
                    setSelectedId={(id) => { setSelectedId(id); setPanelOpen(false); }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteList({
  routes, selectedId, setSelectedId,
}: {
  routes?: { id: string; name: string; corridorWidthM: number; waypoints: [number, number][] }[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
}) {
  if (!routes?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <RouteIcon className="size-10 text-muted-foreground/30 mb-3" />
        <div className="font-display font-semibold text-sm">No routes yet</div>
        <div className="text-xs text-muted-foreground mt-1">Create a route using the map</div>
      </div>
    );
  }
  return (
    <ul className="p-3 space-y-1.5">
      {routes.map((r) => (
        <li key={r.id}>
          <button
            id={`route-item-${r.id}`}
            onClick={() => setSelectedId(r.id)}
            className={`card-hover w-full text-left p-3.5 rounded-xl border transition-all ${
              selectedId === r.id
                ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                : "bg-surface-3 border-border hover:border-border/60"
            } min-h-14`}
          >
            <div className="font-display font-semibold text-[13px]">{r.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              {r.waypoints.length} waypoints · corridor {r.corridorWidthM}m
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
