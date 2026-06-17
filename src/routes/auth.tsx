import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · ATLAS AI" },
      { name: "description", content: "Access your ATLAS AI Personal Health Operating System." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  // Demo mode bypass function
  const handleDemoMode = () => {
    toast.success("Entering demo mode - exploring ATLAS features!");
    navigate({ to: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Initializing your health OS…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* HERO SIDE */}
      <div className="hidden lg:flex relative overflow-hidden grid-bg p-12 flex-col justify-between border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/15 pointer-events-none" />
        <Link to="/" className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-xl text-gradient">ATLAS AI</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              health operating system
            </div>
          </div>
        </Link>

        <div className="relative space-y-6 max-w-md">
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight">
            Your <span className="text-gradient">adaptive</span> health command center.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            ATLAS continuously learns your patterns, predicts trajectories, and surfaces the single
            decisions that move your health the most.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono uppercase tracking-wider">End-to-end encrypted · RLS secured</span>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 font-mono text-[10px] uppercase tracking-wider">
          {["Pattern Detection", "Decision Engine", "Adaptive Plans"].map((t) => (
            <div
              key={t}
              className="glass-panel p-3 text-center text-muted-foreground"
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* FORM SIDE */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg text-gradient">ATLAS AI</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Initialize your OS"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Authenticate to access your health intelligence."
                : "Create an account — we'll seed 30 days of demo data instantly."}
            </p>
          </div>

          {/* DEMO MODE BUTTON */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="text-center">
              <h3 className="font-semibold text-accent mb-2">🚀 Try Demo Mode</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Skip authentication and explore ATLAS with sample data
              </p>
              <Button 
                onClick={handleDemoMode}
                className="w-full bg-accent hover:bg-accent/80 text-black font-medium"
              >
                Enter Demo Mode
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or authenticate</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
              {loading
                ? "Authenticating…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already registered?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
