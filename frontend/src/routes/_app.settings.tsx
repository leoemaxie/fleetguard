import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/AppShell";
import { useState } from "react";
import { Bell, Trash2, LogOut, User, Shield, Sliders } from "lucide-react";
import { clearAuth, getAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const user     = typeof window !== "undefined" ? getAuth() : null;
  const [push,     setPush    ] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const [corridor, setCorridor] = useState(400);
  const [idle,     setIdle    ] = useState(15);

  const togglePush = async () => {
    if (typeof Notification === "undefined") return;
    if (!push) {
      const p = await Notification.requestPermission();
      setPush(p === "granted");
    } else { setPush(false); toast.info("Disable notifications via browser settings"); }
  };

  const clearCache = async () => {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    toast.success("Cached data cleared");
  };

  return (
    <div className="min-h-[100dvh]">
      <TopBar title="Settings" />
      <div className="p-4 lg:p-6 max-w-2xl space-y-6">

        {/* Profile */}
        <Section title="Profile" icon={User}>
          <div className="p-4 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center font-display font-bold text-lg text-primary shrink-0">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div>
              <div className="font-display font-semibold text-base">{user?.name ?? "—"}</div>
              <div className="text-sm text-muted-foreground font-mono">{user?.email ?? "—"}</div>
              <div className="mt-1.5">
                <span className="badge-info text-[9px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full">Fleet Operator</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <ToggleRow
            label="Push alerts"
            desc="Critical alerts delivered as browser notifications"
            icon={Bell}
            value={push}
            onChange={togglePush}
          />
        </Section>

        {/* Alert thresholds */}
        <Section title="Alert thresholds" icon={Sliders}>
          <SliderRow
            label="Default corridor width"
            value={corridor} unit="m"
            min={100} max={2000} step={50}
            onChange={setCorridor}
          />
          <SliderRow
            label="Idle detection threshold"
            value={idle} unit=" min"
            min={1} max={60} step={1}
            onChange={setIdle}
          />
        </Section>

        {/* Data */}
        <Section title="Data & Cache" icon={Shield}>
          <div className="p-4">
            <button
              id="settings-clear-cache"
              onClick={clearCache}
              className="w-full h-11 rounded-xl bg-surface-3 border border-border flex items-center justify-center gap-2 text-sm font-display hover:bg-surface-2 transition-colors"
            >
              <Trash2 className="size-4 text-muted-foreground" /> Clear cached data
            </button>
          </div>
        </Section>

        {/* Sign out */}
        <button
          id="settings-signout"
          onClick={() => { clearAuth(); navigate({ to: "/login" }); }}
          className="w-full h-12 rounded-2xl bg-destructive/15 border border-destructive/25 text-destructive flex items-center justify-center gap-2 font-display font-semibold hover:bg-destructive/25 transition-colors"
        >
          <LogOut className="size-4" /> Sign out
        </button>

        <p className="text-center text-[10px] text-muted-foreground font-mono">
          FleetGuard v1.0.0 · © {new Date().getFullYear()} · Built for Nigerian Logistics
        </p>
      </div>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-[10px] uppercase font-display tracking-widest text-muted-foreground">{title}</h2>
      </div>
      <div className="rounded-2xl bg-surface-2 border border-border divide-y divide-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  label, desc, icon: Icon, value, onChange,
}: {
  label: string; desc: string; icon: React.ComponentType<{ className?: string }>;
  value: boolean; onChange: () => void;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-4 min-h-[64px]">
      <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex-1">
        <div className="font-display font-medium text-[14px]">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <button
        id={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 ${value ? "bg-primary glow-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SliderRow({
  label, value, unit, min, max, step, onChange,
}: {
  label: string; value: number; unit: string;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-[14px] font-medium">{label}</span>
        <span className="font-mono text-sm text-primary font-semibold">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
        style={{ accentColor: "oklch(0.79 0.17 75)" }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-muted-foreground">{min}{unit}</span>
        <span className="text-[9px] font-mono text-muted-foreground">{max}{unit}</span>
      </div>
    </div>
  );
}
