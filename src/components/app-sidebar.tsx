import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Users, FileText, Wallet,
  Droplets, Receipt, CalendarClock, TrendingUp, Home,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Vue d'ensemble", url: "/", icon: LayoutDashboard },
  { title: "Propriétés", url: "/proprietes", icon: Building2 },
  { title: "Locataires", url: "/locataires", icon: Users },
  { title: "Contrats", url: "/contrats", icon: FileText },
];

const finance = [
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

  const renderItem = (item: { title: string; url: string; icon: typeof Home }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={`rounded-lg h-9 transition-colors ${
            active
              ? "bg-foreground text-background hover:bg-foreground hover:text-background"
              : "hover:bg-muted"
          }`}
        >
          <Link to={item.url} className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-transparent">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-foreground grid place-items-center text-background shrink-0">
            <Home className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-semibold tracking-tight text-sidebar-foreground text-[15px]">LocaDesk</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Property Suite</div>
            </div>
          )}
        </div>

        <SidebarGroup className="px-3">
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-3">
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Finances</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{finance.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
