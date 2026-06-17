import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, Sparkles, Zap, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATLAS AI — Adaptive Health Operating System" },
      {
        name: "description",
        content:
          "ATLAS AI is your personal health OS: AI-powered pattern detection, future trajectory prediction, and decision intelligence for your lifestyle.",
      },
      { property: "og:title", content: "ATLAS AI — Adaptive Health Operating System" },
      {
        property: "og:description",
        content: "AI that learns your body, predicts your trajectory, and tells you the single highest-impact action.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-0 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        {/* NAV */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-base text-gradient">ATLAS AI</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                health OS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/simple-dashboard">
              <Button variant="ghost" size="sm">Demo Mode</Button>
            </Link>
            <Link to="/simple-dashboard">
              <Button size="sm" className="hidden sm:inline-flex">
                Try ATLAS <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="pt-12 md:pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Demo Mode Available
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-5xl mx-auto">
            Your body has patterns.
            <br />
            <span className="text-gradient">ATLAS learns them.</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A Personal Health Operating System that predicts trajectories, identifies highest-ROI
            actions, and adapts to your real life — exams, deadlines, recovery, all of it.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/simple-dashboard">
              <Button size="lg" className="h-12 px-7 font-medium glow-cyan">
                Launch ATLAS Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5 text-primary" /> No authentication required
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="pb-24 grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Brain,
              title: "Health Memory",
              text: "Continuously learns your sleep, hydration, mood and activity correlations to build a long-term behavioral model.",
            },
            {
              icon: Zap,
              title: "Decision Intelligence",
              text: "Answers the only question that matters: what single action creates the highest positive impact today?",
            },
            {
              icon: Sparkles,
              title: "AI Copilot",
              text: "Context-aware health assistant that knows your trends. No diagnoses — just actionable, explainable insights.",
            },
          ].map((f) => (
            <div key={f.title} className="glass-panel p-6 hover:glow-cyan transition-all duration-300">
              <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/30 mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </section>

        <footer className="py-8 border-t border-border text-center text-xs text-muted-foreground font-mono uppercase tracking-widest">
          ATLAS AI · not a medical device · consult a clinician for medical decisions
        </footer>
      </div>
    </div>
  );
}
