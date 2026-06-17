import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Menu,
  X,
  Gem,
  Scale,
  TrendingUp,
  Settings,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/enhanced-dashboard", label: "Enhanced Dashboard", icon: Brain },
  { to: "/health-insights", label: "Health Insights", icon: TrendingUp },
  { to: "/future-me", label: "Future-Me Simulator", icon: Gem },
  { to: "/decision-hub", label: "Decision Hub", icon: Scale },
  { to: "/memory", label: "Health Memory", icon: Brain },
  { to: "/copilot", label: "AI Copilot", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    // Demo mode - just navigate to auth without calling Supabase
    console.log("🚀 Demo mode: Navigating to auth page");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex w-full text-foreground">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl">
        <BrandHeader />
        <NavList pathname={pathname} onNavigate={() => {}} />
        <SignOutFooter onSignOut={handleSignOut} />
      </aside>

      {/* MOBILE TOPBAR */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar/90 backdrop-blur-xl">
        <BrandMark />
        <button
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-md hover:bg-sidebar-accent"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm pt-14"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-72 h-full bg-sidebar border-r border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <SignOutFooter onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="h-16 px-5 flex items-center border-b border-border">
      <BrandMark />
    </div>
  );
}

function BrandMark() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group">
      <div className="relative h-8 w-8 rounded-lg grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan">
        <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-display font-bold text-base tracking-wide text-gradient">
          ATLAS AI
        </span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          health OS
        </span>
      </div>
    </Link>
  );
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              active
                ? "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_18px_oklch(0.86_0.18_200/15%)]"
                : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary")} />
            <span>{item.label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="p-3 border-t border-border">
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
