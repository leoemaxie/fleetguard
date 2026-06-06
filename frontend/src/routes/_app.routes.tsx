import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchSavedRoutes, saveRoute } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { FleetMap } from "@/components/map/FleetMap";
import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/routes")({ component: RoutesPage });

function RoutesPage() {
  const fn = useServerFn(fetchSavedRoutes);
  const save = useServerFn(saveRoute);
  const qc = useQueryClient();
  const { data: routes } = useQuery({ queryKey: qk.routes, queryFn: () => fn() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [width, setWidth] = useState(400);
  const [name, setName] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (input: { name: string; waypoints: [number, number][]; corridorWidthM: number }) => save({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.routes }); toast.success("Route saved"); setDraw(false); setWaypoints([]); setName(""); },
  });

  const selected = routes?.find((r) => r.id === selectedId);
  const showLines = draw
    ? (waypoints.length > 1 ? [{ id: "draft", coords: waypoints, color: "#F59E0B", width: 3 }, { id: "buf", coords: waypoints, color: "#F59E0B33", width: Math.max(6, width / 30) }] : [])
    : (selected ? [{ id: selected.id, coords: selected.waypoints, color: "#F59E0B", width: 3 }, { id: selected.id + "buf", coords: selected.waypoints, color: "#F59E0B33", width: Math.max(6, selected.corridorWidthM / 30) }] : []);
  const showMarkers = (draw ? waypoints : (selected?.waypoints ?? [])).map((p, i) => ({ id: String(i), position: p, color: "#F59E0B" }));

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TopBar title="Route Planner" action={
        draw
          ? <button onClick={() => { setDraw(false); setWaypoints([]); }} className="text-xs font-display text-muted-foreground">Cancel</button>
          : <button onClick={() => { setDraw(true); setWaypoints([]); setSelectedId(null); }} className="flex items-center gap-1 text-xs font-display text-primary"><Plus className="size-4" /> New</button>
      } />
      <div className="flex-1 flex min-h-0">
        <aside className="hidden lg:flex flex-col w-80 border-r border-border overflow-y-auto">
          <RouteList routes={routes} selectedId={selectedId} setSelectedId={setSelectedId} />
        </aside>
        <div className="flex-1 relative">
          <FleetMap
            lines={showLines}
            markers={showMarkers}
            onMapClick={(p) => { if (draw) setWaypoints((w) => [...w, p]); }}
          />
          <button onClick={() => setPanelOpen(true)} className="lg:hidden absolute bottom-4 right-4 h-12 px-4 rounded-full bg-surface-2 border border-border font-display font-semibold">
            {draw ? `${waypoints.length} pts` : `${routes?.length ?? 0} routes`}
          </button>

          {draw && (
            <div className="absolute inset-x-3 bottom-3 lg:inset-x-auto lg:right-4 lg:left-auto lg:w-80 p-4 rounded-xl bg-surface-2 border border-border space-y-3 safe-bottom">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Route name" className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm" />
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display uppercase tracking-wider text-muted-foreground">Corridor width</span>
                  <span className="font-mono">{width}m</span>
                </div>
                <input type="range" min={100} max={2000} step={50} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="text-xs text-muted-foreground font-mono">{waypoints.length} waypoints · tap map to add</div>
              <button
                disabled={!name || waypoints.length < 2 || mut.isPending}
                onClick={() => mut.mutate({ name, waypoints, corridorWidthM: width })}
                className="w-full h-11 rounded-md bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="size-4" /> Save route
              </button>
            </div>
          )}

          {/* Mobile routes panel */}
          {panelOpen && !draw && (
            <div className="lg:hidden absolute inset-0 bg-black/40 z-40" onClick={() => setPanelOpen(false)}>
              <div className="absolute inset-x-0 bottom-0 max-h-[75%] bg-surface-2 rounded-t-2xl flex flex-col safe-bottom" onClick={(e) => e.stopPropagation()}>
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="font-display font-semibold">Saved Routes</div>
                  <button onClick={() => setPanelOpen(false)}><X className="size-4" /></button>
                </div>
                <div className="overflow-y-auto">
                  <RouteList routes={routes} selectedId={selectedId} setSelectedId={(id) => { setSelectedId(id); setPanelOpen(false); }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteList({ routes, selectedId, setSelectedId }: { routes?: { id: string; name: string; corridorWidthM: number; waypoints: [number, number][] }[]; selectedId: string | null; setSelectedId: (id: string) => void }) {
  return (
    <ul className="p-3 space-y-2">
      {(routes ?? []).map((r) => (
        <li key={r.id}>
          <button onClick={() => setSelectedId(r.id)} className={`w-full text-left p-3 rounded-lg border ${selectedId === r.id ? "bg-primary/10 border-primary" : "bg-surface-2 border-border"} min-h-14`}>
            <div className="font-display font-medium">{r.name}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">{r.waypoints.length} pts · corridor {r.corridorWidthM}m</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
