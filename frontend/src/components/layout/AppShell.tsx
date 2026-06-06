import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Truck, Bell, Users, MoreHorizontal, Route as RouteIcon, MapPin, Settings, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAlerts } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { clearAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

const main = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vehicles", label: "Vehicles", icon: Truck },
  { to: "/alerts", label: "Alerts", icon: Bell, badgeKey: "alerts" as const },
  { to: "/drivers", label: "Drivers", icon: Users },
];

const more = [
  { to: "/trips", label: "Trips", icon: MapPin },
  { to: "/routes", label: "Routes", icon: RouteIcon },
  { to: "/settings", label: "Settings", icon: Settings },
];

function useAlertCount() {
  const fn = useServerFn(fetchAlerts);
  const { data } = useQuery({ queryKey: qk.alerts, queryFn: () => fn(), refetchInterval: 15000 });
  return data?.filter((a) => a.severity === "critical").length ?? 0;
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const alertCount = useAlertCount();
  const items = [...main, { to: "/more", label: "More", icon: MoreHorizontal }];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-sidebar border-t border-sidebar-border safe-bottom">
      <ul className="flex">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          const badge = "badgeKey" in it && it.badgeKey === "alerts" && alertCount > 0;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to as any}
                className={`flex flex-col items-center justify-center gap-1 h-14 text-[11px] font-display tracking-wide relative ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <div className="relative">
                  <Icon className="size-5" />
                  {badge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono flex items-center justify-center">
                      {alertCount}
                    </span>
                  )}
                </div>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const alertCount = useAlertCount();
  const navigate = useNavigate();
  const items = [...main.filter((i) => i.label !== "More"), ...more];
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">FG</div>
          <div>
            <div className="font-display font-semibold tracking-tight">FleetGuard</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase">fleet intelligence</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            const badge = it.label === "Alerts" && alertCount > 0;
            return (
              <li key={it.to}>
                <Link
                  to={it.to as any}
                  className={`flex items-center gap-3 px-3 h-11 rounded-md text-sm font-display tracking-wide ${active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/60"}`}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{it.label}</span>
                  {badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">{alertCount}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <button
        onClick={() => { clearAuth(); navigate({ to: "/login" }); }}
        className="m-3 flex items-center gap-2 px-3 h-10 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </aside>
  );
}

export function TopBar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border safe-top">
      <div className="h-14 flex items-center justify-between px-4">
        <h1 className="font-display font-semibold text-lg tracking-tight">{title}</h1>
        {action}
      </div>
    </header>
  );
}
