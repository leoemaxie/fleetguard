import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/AppShell";
import { useState } from "react";
import { Bell, Trash2, LogOut } from "lucide-react";
import { clearAuth, getAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getAuth() : null;
  const [push, setPush] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const [corridor, setCorridor] = useState(400);
  const [idle, setIdle] = useState(15);

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
      <div className="p-4 max-w-2xl space-y-6">
        <Section title="Profile">
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
        </Section>

        <Section title="Notifications">
          <ToggleRow label="Push alerts" desc="Critical alerts as browser notifications" icon={Bell} value={push} onChange={togglePush} />
        </Section>

        <Section title="Alert thresholds">
          <SliderRow label="Default corridor width" value={corridor} unit="m" min={100} max={2000} step={50} onChange={setCorridor} />
          <SliderRow label="Idle threshold" value={idle} unit="min" min={1} max={60} step={1} onChange={setIdle} />
        </Section>

        <Section title="Data">
          <button onClick={clearCache} className="w-full h-12 rounded-md bg-surface-2 border border-border flex items-center justify-center gap-2 text-sm font-display">
            <Trash2 className="size-4" /> Clear cached data
          </button>
        </Section>

        <button onClick={() => { clearAuth(); navigate({ to: "/login" }); }} className="w-full h-12 rounded-md bg-destructive text-destructive-foreground flex items-center justify-center gap-2 font-display font-semibold">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase font-display tracking-wider text-muted-foreground mb-2">{title}</h2>
      <div className="rounded-xl bg-surface-2 border border-border divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between min-h-14">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}
function ToggleRow({ label, desc, icon: Icon, value, onChange }: { label: string; desc: string; icon: React.ComponentType<{ className?: string }>; value: boolean; onChange: () => void }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 min-h-14">
      <Icon className="size-5 text-primary" />
      <div className="flex-1">
        <div className="font-display text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 ${value ? "left-5" : "left-0.5"} size-5 rounded-full bg-background transition-all`} />
      </button>
    </div>
  );
}
function SliderRow({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm">{label}</span>
        <span className="font-mono text-sm">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-2 accent-primary" />
    </div>
  );
}
