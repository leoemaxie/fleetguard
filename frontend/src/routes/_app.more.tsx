import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/AppShell";
import { MapPin, Route as RouteIcon, Settings, LogOut } from "lucide-react";
import { clearAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/more")({ component: MorePage });

function MorePage() {
  const nav = useNavigate();
  const items = [
    { to: "/trips", label: "Trips", icon: MapPin, desc: "Trip history & replays" },
    { to: "/routes", label: "Routes", icon: RouteIcon, desc: "Plan corridors & waypoints" },
    { to: "/settings", label: "Settings", icon: Settings, desc: "Account & alert preferences" },
  ] as const;
  return (
    <div className="min-h-[100dvh] lg:hidden">
      <TopBar title="More" />
      <div className="p-3 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className="flex items-center gap-3 p-4 rounded-lg bg-surface-2 border border-border min-h-14">
              <Icon className="size-5 text-primary" />
              <div className="flex-1">
                <div className="font-display font-medium">{it.label}</div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
            </Link>
          );
        })}
        <button onClick={() => { clearAuth(); nav({ to: "/login" }); }} className="w-full mt-4 flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive min-h-14">
          <LogOut className="size-5" />
          <span className="font-display font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
