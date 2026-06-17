import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    console.log("🎮 ATLAS Demo Mode: Full bypass enabled for", location.pathname);
    
    // Always return demo user - no Supabase calls
    const demoUser = { 
      id: 'demo-user-' + Date.now(), 
      email: 'demo@atlas.ai',
      user_metadata: { full_name: 'ATLAS Demo User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      role: 'authenticated'
    };
    
    console.log("✅ Demo user created successfully");
    return { user: demoUser };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
