import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/simple-dashboard")({
  component: SimpleDashboard,
});

function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Simple Header */}
      <header className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent glow-cyan grid place-items-center">
            <span className="text-xl">🧠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">ATLAS AI</h1>
            <p className="text-sm text-muted-foreground">Health Operating System</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Welcome */}
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome, Demo User</h2>
            <p className="text-muted-foreground">Your ATLAS health dashboard is ready.</p>
          </div>

          {/* Health Score */}
          <div className="glass-panel p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-4">Health Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">85</div>
                <div className="text-sm text-muted-foreground">Health Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">7.5h</div>
                <div className="text-sm text-muted-foreground">Sleep</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">2.1L</div>
                <div className="text-sm text-muted-foreground">Hydration</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning">8.2k</div>
                <div className="text-sm text-muted-foreground">Steps</div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="glass-panel p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-4">🤖 AI Insights</h3>
            <div className="space-y-3">
              <div className="bg-background/40 p-4 rounded-lg border border-border">
                <h4 className="font-medium text-primary">Sleep Optimization</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your sleep quality has improved 15% this week. Consider maintaining your 10:30 PM bedtime.
                </p>
              </div>
              <div className="bg-background/40 p-4 rounded-lg border border-border">
                <h4 className="font-medium text-accent">Hydration Trend</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You're consistently hitting your hydration goals. Great work!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="glass-panel p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-left">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium">Health Insights</h4>
              <p className="text-sm text-muted-foreground">View detailed analytics</p>
            </button>
            
            <button className="glass-panel p-4 rounded-lg border border-border hover:border-accent/50 transition-colors text-left">
              <div className="text-2xl mb-2">🔮</div>
              <h4 className="font-medium">Future-Me Simulator</h4>
              <p className="text-sm text-muted-foreground">Predict health outcomes</p>
            </button>
            
            <button className="glass-panel p-4 rounded-lg border border-border hover:border-success/50 transition-colors text-left">
              <div className="text-2xl mb-2">🎯</div>
              <h4 className="font-medium">Decision Hub</h4>
              <p className="text-sm text-muted-foreground">AI-powered decisions</p>
            </button>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/80 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}