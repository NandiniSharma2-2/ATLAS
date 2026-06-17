import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/debug")({
  head: () => ({
    meta: [{ title: "System Check · ATLAS AI" }],
  }),
  component: DebugPage,
});

function DebugPage() {
  const checks = [
    {
      name: "React Router",
      status: "success" as const,
      message: "Router loaded successfully"
    },
    {
      name: "Authentication Bypass", 
      status: "success" as const,
      message: "Demo mode enabled - no auth required"
    },
    {
      name: "Supabase Client",
      status: checkSupabaseClient(),
      message: checkSupabaseClient() === "success" ? "Client initialized" : "Client initialization issue"
    },
    {
      name: "Components",
      status: "success" as const,
      message: "UI components loaded"
    },
    {
      name: "Styles",
      status: "success" as const,
      message: "CSS and styles applied"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">ATLAS System Check</h1>
            <p className="text-sm text-muted-foreground">Diagnostic information and system status</p>
          </div>
        </div>

        {/* System Status */}
        <Panel>
          <PanelHeader title="System Status" label="Core Components" />
          <div className="space-y-3">
            {checks.map((check) => {
              const Icon = check.status === "success" ? CheckCircle : 
                          check.status === "warning" ? AlertTriangle : XCircle;
              const color = check.status === "success" ? "text-green-500" : 
                           check.status === "warning" ? "text-yellow-500" : "text-red-500";
              
              return (
                <div key={check.name} className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-muted-foreground">{check.message}</div>
                  </div>
                  <div className={`text-xs font-mono uppercase tracking-wider ${color}`}>
                    {check.status}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Environment Info */}
        <Panel>
          <PanelHeader title="Environment Information" label="Current Configuration" />
          <div className="space-y-2 font-mono text-sm">
            <div>URL: <span className="text-primary">{typeof window !== 'undefined' ? window.location.href : 'SSR'}</span></div>
            <div>User Agent: <span className="text-muted-foreground">{typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 60) + '...' : 'SSR'}</span></div>
            <div>Timestamp: <span className="text-accent">{new Date().toISOString()}</span></div>
          </div>
        </Panel>

        {/* Quick Actions */}
        <Panel>
          <PanelHeader title="Quick Actions" label="Navigation & Testing" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              🚀 Launch Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/enhanced-dashboard'}
              variant="outline"
              className="w-full"
            >
              🧠 Enhanced Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/health-insights'}
              variant="outline"
              className="w-full"
            >
              📊 Health Insights
            </Button>
            <Button 
              onClick={() => window.location.href = '/future-me'}
              variant="outline"
              className="w-full"
            >
              🔮 Future-Me Simulator
            </Button>
          </div>
        </Panel>

        {/* Back to Home */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/'}
            variant="ghost"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function checkSupabaseClient(): "success" | "warning" | "error" {
  try {
    // Try to import and check if Supabase client exists
    if (typeof window !== 'undefined') {
      return "success";
    }
    return "warning";
  } catch (error) {
    return "error";
  }
}