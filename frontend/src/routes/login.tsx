import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setAuth, getAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getAuth()) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ops@fleetguard.ng");
  const [pwd, setPwd] = useState("demo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuth({ email, name: "Fleet Operator" });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl mb-3">FG</div>
          <h1 className="font-display text-2xl font-bold">FleetGuard</h1>
          <p className="text-sm text-muted-foreground mt-1">Fleet Intelligence Platform</p>
        </div>
        <form onSubmit={submit} className="bg-surface-2 border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-md bg-background border border-border text-sm font-mono focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">Password</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-md bg-background border border-border text-sm font-mono focus:outline-none focus:border-primary" />
          </div>
          <button type="submit" className="w-full h-12 rounded-md bg-primary text-primary-foreground font-display font-semibold tracking-wide">Sign in</button>
          <p className="text-xs text-muted-foreground text-center">Demo mode — any credentials work</p>
        </form>
      </div>
    </div>
  );
}
