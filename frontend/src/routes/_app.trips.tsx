import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchTrips, fetchVehicles } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { TopBar } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app/trips")({ component: TripsPage });

function TripsPage() {
  const tFn = useServerFn(fetchTrips);
  const vFn = useServerFn(fetchVehicles);
  const { data: trips } = useQuery({ queryKey: qk.trips, queryFn: () => tFn() });
  const { data: veh } = useQuery({ queryKey: qk.vehicles, queryFn: () => vFn() });
  const plate = (id: string) => veh?.find((v) => v.id === id)?.plate ?? id;

  return (
    <div className="min-h-[100dvh]">
      <TopBar title="Trips" />
      <div className="p-4 space-y-2">
        {(trips ?? []).map((t) => (
          <Link key={t.id} to="/trips/$tripId/replay" params={{ tripId: t.id }} className="block p-3 rounded-lg bg-surface-2 border border-border min-h-14">
            <div className="flex items-center justify-between">
              <div className="font-display font-medium">{t.fromName} → {t.toName}</div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${t.complianceScore >= 85 ? "bg-success/20 text-success" : t.complianceScore >= 70 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>{t.complianceScore}</span>
            </div>
            <div className="mt-1 text-xs font-mono text-muted-foreground flex flex-wrap gap-x-3">
              <span>{plate(t.vehicleId)}</span>
              <span>{new Date(t.date).toLocaleDateString()}</span>
              <span>{t.distanceKm}km</span>
              <span>{t.fuelL}L · ₦{(t.fuelL * 1100).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
