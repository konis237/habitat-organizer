import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Users, FileText, Wallet,
  Droplets, Receipt, CalendarClock, TrendingUp,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Propriétés", url: "/proprietes", icon: Building2 },
  { title: "Locataires", url: "/locataires", icon: Users },
  { title: "Contrats", url: "/contrats", icon: FileText },
  { title: "Loyers", url: "/loyers", icon: Wallet },
  { title: "Eau", url: "/eau", icon: Droplets },
  { title: "Paiements", url: "/paiements", icon: Receipt },
  { title: "Échéances", url: "/echeances", icon: CalendarClock },
  { title: "Revenus", url: "/revenus", icon: TrendingUp },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => url === "/" ? path === "/" : path.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded bg-primary grid place-items-center text-primary-foreground font-bold text-sm shrink-0">L</div>
          {!collapsed && <span className="font-semibold tracking-tight text-sidebar-foreground">LocaDesk</span>}
        </div>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
