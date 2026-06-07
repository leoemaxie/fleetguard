import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setAuth, getAuth } from "@/lib/auth";
import { Shield, ArrowRight, Eye, EyeOff, Zap, MapPin, Bell } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getAuth()) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

const FEATURES = [
  { icon: MapPin, title: "Real-time Tracking", desc: "Live GPS visibility across your entire fleet, 24/7" },
  { icon: Zap,    title: "Instant Alerts",      desc: "Critical notifications for fuel anomalies and route deviations" },
  { icon: Bell,   title: "Compliance Reports",  desc: "Automated driver scorecards and trip audit trails" },
];

function LoginPage() {
  const navigate    = useNavigate();
  const [email, setEmail] = useState("ops@fleetguard.ng");
  const [pwd,   setPwd  ] = useState("demo");
  const [show,  setShow ] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setAuth({ email, name: "Fleet Operator" });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex bg-background login-mesh">
      {/* ── Left panel: Branding ── */}
      <div className="hidden lg:flex flex-col w-[52%] xl:w-[55%] relative overflow-hidden bg-sidebar border-r border-sidebar-border p-10 xl:p-14">
        {/* Decorative gradient orb */}
        <div
          aria-hidden
          className="absolute -top-32 -left-32 size-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.79 0.17 75) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -right-40 size-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.15 250) 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg text-foreground tracking-tight">FleetGuard</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Fleet Intelligence</div>
          </div>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center relative z-10 mt-10">
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight text-foreground">
            Command your<br />
            <span className="gradient-text">fleet operations</span><br />
            with precision.
          </h1>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed max-w-md">
            Enterprise-grade fleet intelligence platform built for Nigerian logistics operations. Track, analyse, and optimise in real time.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="font-display font-semibold text-[14px] text-foreground">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} FleetGuard · Built for Nigerian Logistics
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl bg-primary flex items-center justify-center glow-primary mb-3">
            <Shield className="size-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground">FleetGuard</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Fleet Intelligence Platform</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Sign in to your operations dashboard</p>
          </div>

          <form onSubmit={submit} id="login-form" className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-border text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
                placeholder="ops@company.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={show ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-surface-2 border border-border text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold tracking-wide flex items-center justify-center gap-2 glow-primary hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
              ) : (
                <>Sign in <ArrowRight className="size-4" /></>
              )}
            </button>
          </form>

          {/* Demo note */}
          <div className="mt-5 p-3 rounded-xl bg-surface-2 border border-border">
            <p className="text-[11px] text-muted-foreground text-center font-mono">
              🔓 Demo mode · any credentials accepted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
