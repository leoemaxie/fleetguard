import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getAuth } from "@/lib/auth";
import { Sidebar, BottomNav } from "@/components/layout/AppShell";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return; // SSR: skip; client guard handles
    if (!getAuth()) throw redirect({ to: "/login", search: { redirect: location.href } as any });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-14 lg:pb-0">
        <Outlet />
      </div>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
