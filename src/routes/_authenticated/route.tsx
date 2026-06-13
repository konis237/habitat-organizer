import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background p-0 md:p-3 lg:p-4 gap-0 md:gap-3">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 app-shell overflow-hidden">
          <header className="h-14 flex items-center justify-between border-b bg-card px-3 sm:px-5 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="rounded-md" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Gestion locative</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[200px]">{user.email}</span>
              <Button variant="outline" size="sm" onClick={signOut} className="rounded-full">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Déconnexion</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
