import { LayoutDashboard, Plus, FileText, CheckCircle, LogOut, Radio, BarChart3, Settings, History, Home, Workflow } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMessages } from "@/i18n";
import { shellMessages } from "@/i18n/messages/shell";

type Msgs = typeof shellMessages.en;

const mainItems = [
  { key: "hub", url: "/welcome", icon: Home },
  { key: "socialIntel", url: "/sevra", icon: Radio },
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard },
  { key: "manualIncident", url: "/incidents/new", icon: Plus },
] as const satisfies ReadonlyArray<{ key: keyof Msgs; url: string; icon: unknown }>;

const workflowItems = [
  { key: "assets", url: "/assets", icon: FileText },
  { key: "approvals", url: "/approvals", icon: CheckCircle },
  { key: "workflows", url: "/workflows", icon: Workflow },
  { key: "reports", url: "/reports", icon: BarChart3 },
  { key: "auditLog", url: "/audit-log", icon: History },
  { key: "admin", url: "/admin", icon: Settings },
] as const satisfies ReadonlyArray<{ key: keyof Msgs; url: string; icon: unknown }>;

export function AppSidebar() {
  const m = useMessages(shellMessages);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {!collapsed && m.crisisCenter}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/sevra"} activeClassName="bg-sidebar-accent text-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{m[item.key]}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {!collapsed && m.workflow}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} activeClassName="bg-sidebar-accent text-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{m[item.key]}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>{m.signOut}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
