import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Truck, Bell, Users, MoreHorizontal,
  Route as RouteIcon, MapPin, Settings, LogOut, Shield,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAlerts } from "@/lib/serverFns.functions";
import { qk } from "@/lib/queryKeys";
import { clearAuth, getAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

const main = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vehicles",  label: "Vehicles",  icon: Truck },
  { to: "/alerts",    label: "Alerts",    icon: Bell, badgeKey: "alerts" as const },
  { to: "/drivers",   label: "Drivers",   icon: Users },
];

const more = [
  { to: "/trips",    label: "Trips",         icon: MapPin },
  { to: "/routes",   label: "Route Planner", icon: RouteIcon },
  { to: "/settings", label: "Settings",      icon: Settings },
];

function useAlertCount() {
  const fn = useServerFn(fetchAlerts);
  const { data } = useQuery({ queryKey: qk.alerts, queryFn: () => fn(), refetchInterval: 15000 });
  return data?.filter((a) => a.severity === "critical").length ?? 0;
}

/* ── Bottom navigation (mobile) ── */
export function BottomNav() {
  const pathname  = useRouterState({ select: (s) => s.location.pathname });
  const alertCount = useAlertCount();
  const items = [...main, { to: "/more", label: "More", icon: MoreHorizontal }];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border safe-bottom">
      <ul className="flex">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          const badge = "badgeKey" in it && it.badgeKey === "alerts" && alertCount > 0;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to as any}
                className={`flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-display tracking-widest uppercase relative transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-0 h-0.5 rounded-b-full bg-primary" />
                )}
                <div className="relative">
                  <Icon className={`size-5 transition-transform ${active ? "scale-110" : ""}`} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono flex items-center justify-center leading-none">
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

/* ── Desktop sidebar ── */
export function Sidebar() {
  const pathname   = useRouterState({ select: (s) => s.location.pathname });
  const alertCount = useAlertCount();
  const navigate   = useNavigate();
  const user       = typeof window !== "undefined" ? getAuth() : null;
  const allItems   = [...main, ...more];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative size-9 shrink-0">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
              <Shield className="size-4 text-primary-foreground" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-[15px] tracking-tight text-sidebar-foreground">FleetGuard</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Fleet Intelligence</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {/* Section: Main */}
        <p className="px-3 mb-2 text-[10px] uppercase tracking-widest font-display text-muted-foreground/60">Operations</p>
        {main.map((it) => <NavItem key={it.to} item={it} pathname={pathname} alertCount={alertCount} />)}

        {/* Section: More */}
        <p className="px-3 mt-5 mb-2 text-[10px] uppercase tracking-widest font-display text-muted-foreground/60">Management</p>
        {more.map((it) => <NavItem key={it.to} item={it} pathname={pathname} alertCount={alertCount} />)}
      </nav>

      {/* User + logout */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/50">
          <div className="size-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-display font-bold text-xs text-primary shrink-0">
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-display font-semibold text-sidebar-foreground truncate">{user?.name ?? "Operator"}</div>
            <div className="text-[10px] font-mono text-muted-foreground truncate">{user?.email ?? "—"}</div>
          </div>
        </div>
        <button
          onClick={() => { clearAuth(); navigate({ to: "/login" }); }}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          <LogOut className="size-4" />
          <span className="font-display text-xs tracking-wide">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  item, pathname, alertCount,
}: {
  item: { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
  pathname: string;
  alertCount: number;
}) {
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  const isAlerts = item.label === "Alerts";
  const badge = isAlerts && alertCount > 0;

  return (
    <Link
      to={item.to as any}
      className={`relative flex items-center gap-3 px-3 h-10 rounded-xl text-[13px] font-display tracking-wide transition-all ${
        active
          ? "bg-sidebar-accent text-primary font-semibold"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      }`}
    >
      {active && <span className="nav-active-indicator" />}
      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
      <span className="flex-1">{item.label}</span>
      {badge && (
        <span className="text-[9px] font-mono min-w-[18px] h-4.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center leading-none">
          {alertCount}
        </span>
      )}
      {active && <ChevronRight className="size-3 text-primary opacity-60" />}
    </Link>
  );
}

/* ── Top bar ── */
export function TopBar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border safe-top">
      <div className="h-14 flex items-center justify-between px-5 gap-4">
        <h1 className="font-display font-bold text-base tracking-tight text-foreground">{title}</h1>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}

/* ── Page container (consistent padding/max-width) ── */
export function PageContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-5 max-w-7xl ${className}`}>
      {children}
    </div>
  );
}
