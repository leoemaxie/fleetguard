import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "";

export interface MapMarker {
  id: string;
  position: [number, number];
  color?: string;
  label?: string;
  onClick?: () => void;
}

export interface MapLine {
  id: string;
  coords: [number, number][];
  color?: string;
  width?: number;
  dashed?: boolean;
}

interface FleetMapProps {
  markers?: MapMarker[];
  lines?: MapLine[];
  center?: [number, number];
  zoom?: number;
  highlightId?: string;
  onMapClick?: (lngLat: [number, number]) => void;
  className?: string;
}

// Fallback canvas-based pseudo-map when no Mapbox token is configured
function CanvasMap({ markers = [], lines = [], center = [3.4, 6.55], onMapClick, className }: FleetMapProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 600, h: 400 });

  // Geo->canvas projection
  const project = (lng: number, lat: number, w: number, h: number) => {
    const span = 1.2;
    const x = ((lng - (center[0] - span / 2)) / span) * w;
    const y = h - ((lat - (center[1] - span / 2)) / span) * h;
    return [x, y] as const;
  };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const parent = canvas.parentElement!;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      sizeRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Bg
      ctx.fillStyle = "#0b1426";
      ctx.fillRect(0, 0, w, h);
      // Grid
      ctx.strokeStyle = "rgba(245,158,11,0.06)";
      ctx.lineWidth = 1;
      const grid = 48;
      for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      // Stylized "roads"
      ctx.strokeStyle = "rgba(148,163,184,0.18)";
      ctx.lineWidth = 6;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i + 1) * h / 7 + Math.sin(i) * 12);
        ctx.bezierCurveTo(w * 0.3, (i + 1) * h / 7 - 30, w * 0.6, (i + 1) * h / 7 + 30, w, (i + 1) * h / 7);
        ctx.stroke();
      }
      // Lines (routes / polylines)
      for (const ln of lines) {
        ctx.strokeStyle = ln.color ?? "#F59E0B";
        ctx.lineWidth = ln.width ?? 3;
        if (ln.dashed) ctx.setLineDash([8, 6]); else ctx.setLineDash([]);
        ctx.beginPath();
        ln.coords.forEach((c, i) => {
          const [x, y] = project(c[0], c[1], w, h);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // Markers
      for (const m of markers) {
        const [x, y] = project(m.position[0], m.position[1], w, h);
        const color = m.color ?? "#10B981";
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = color + "33"; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#0F172A"; ctx.lineWidth = 2; ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [markers, lines, center]);

  return (
    <div className={"relative w-full h-full overflow-hidden " + (className ?? "")}>
      <canvas
        ref={ref}
        onClick={(e) => {
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const { w, h } = sizeRef.current;
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          const span = 1.2;
          const lng = (px / w) * span + center[0] - span / 2;
          const lat = ((h - py) / h) * span + center[1] - span / 2;
          // marker hit-test
          for (const m of markers) {
            const [mx, my] = [
              ((m.position[0] - (center[0] - span / 2)) / span) * w,
              h - ((m.position[1] - (center[1] - span / 2)) / span) * h,
            ];
            if (Math.hypot(mx - px, my - py) < 14 && m.onClick) { m.onClick(); return; }
          }
          onMapClick?.([lng, lat]);
        }}
        className="absolute inset-0 cursor-crosshair"
      />
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground bg-background/60 px-2 py-1 rounded">
        FleetGuard Map · set VITE_MAPBOX_TOKEN for live tiles
      </div>
    </div>
  );
}

function MapboxMap({ markers = [], lines = [], center = [3.4, 6.55], zoom = 9, onMapClick, className }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("click", (e) => onMapClick?.([e.lngLat.lng, e.lngLat.lat]));
    map.on("load", () => updateLayers());
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    // Markers
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = markers.map((m) => {
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${m.color ?? "#10B981"};border:2px solid #0F172A;box-shadow:0 0 0 6px ${m.color ?? "#10B981"}22;cursor:pointer`;
      el.onclick = () => m.onClick?.();
      return new mapboxgl.Marker({ element: el }).setLngLat(m.position).addTo(map);
    });
    // Lines
    const existing = (map.getStyle().layers ?? []).filter((l) => l.id.startsWith("fg-line-"));
    existing.forEach((l) => { if (map.getLayer(l.id)) map.removeLayer(l.id); if (map.getSource(l.id)) map.removeSource(l.id); });
    lines.forEach((ln) => {
      const id = `fg-line-${ln.id}`;
      map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ln.coords } } });
      map.addLayer({ id, type: "line", source: id, paint: { "line-color": ln.color ?? "#F59E0B", "line-width": ln.width ?? 3, ...(ln.dashed ? { "line-dasharray": [2, 2] } : {}) } });
    });
  };

  useEffect(() => { updateLayers(); }, [markers, lines]);

  return <div ref={containerRef} className={"w-full h-full " + (className ?? "")} />;
}

export function FleetMap(props: FleetMapProps) {
  if (TOKEN) return <MapboxMap {...props} />;
  return <CanvasMap {...props} />;
}
