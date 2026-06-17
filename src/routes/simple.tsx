import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/simple")({
  component: SimplePage,
});

function SimplePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent glow-cyan grid place-items-center">
          <span className="text-xl">🧠</span>
        </div>
        <h1 className="text-2xl font-bold text-gradient">ATLAS AI</h1>
        <p className="text-muted-foreground">Simple test page working!</p>
        
        <div className="space-y-2">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
          >
            Try Dashboard
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
          >
            Back to Home
          </button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Time: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}