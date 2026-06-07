import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchTrips, fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";
import { Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/_app/trips")({ component: TripsPage });

function complianceBadge(score: number) {
  if (score >= 85) return "badge-success";
  if (score >= 70) return "badge-warning";
  return "badge-critical";
}

function TripsPage() {
  const tFn = useServerFn(fetchTrips);
  const vFn = useServerFn(fetchVehicles);
  const { data: trips } = useQuery({ queryKey: qk.trips,    queryFn: () => tFn() });
  const { data: veh   } = useQuery({ queryKey: qk.vehicles, queryFn: () => vFn() });
  const plate = (id: string) => veh?.find((v) => v.id === id)?.plate ?? id;

  const avgCompliance = trips && trips.length > 0
    ? Math.round(trips.reduce((s, t) => s + t.complianceScore, 0) / trips.length)
    : 0;
  const totalKm   = trips?.reduce((s, t) => s + t.distanceKm, 0) ?? 0;
  const totalFuel = trips?.reduce((s, t) => s + t.fuelL, 0) ?? 0;

  return (
    <div className="min-h-[100dvh]">
      <TopBar title="Trips" />

      {/* Summary bar */}
      {trips && trips.length > 0 && (
        <div className="border-b border-border bg-surface px-5 py-3 grid grid-cols-3 gap-4 lg:flex lg:gap-8">
          {[
            { label: "Total trips",       value: trips.length.toString() },
            { label: "Total distance",    value: `${totalKm.toLocaleString()} km` },
            { label: "Fuel consumed",     value: `${totalFuel.toLocaleString()} L` },
            { label: "Avg. compliance",   value: `${avgCompliance}/100` },
          ].map(({ label, value }) => (
            <div key={label} className="lg:pr-8 lg:border-r lg:border-border last:border-0">
              <div className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="font-mono font-bold text-base mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 lg:p-6 space-y-2 max-w-3xl">
        {!trips?.length && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RouteIcon className="size-12 text-muted-foreground/30 mb-4" />
            <div className="font-display font-semibold text-foreground">No trips yet</div>
            <div className="text-xs text-muted-foreground mt-1.5">Trip history will appear here once recorded</div>
          </div>
        )}
        {(trips ?? []).map((t) => (
          <Link
            key={t.id}
            to="/trips/$tripId/replay"
            params={{ tripId: t.id }}
            className="card-hover block p-4 rounded-2xl bg-surface-2 border border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-[14px] truncate">{t.fromName} → {t.toName}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                  <span className="text-foreground/80">{plate(t.vehicleId)}</span>
                  <span>·</span>
                  <span>{new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>·</span>
                  <span>{t.distanceKm} km</span>
                  <span>·</span>
                  <span>{t.fuelL} L · ₦{(t.fuelL * 1100).toLocaleString()}</span>
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full border ${complianceBadge(t.complianceScore)}`}>
                {t.complianceScore}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
