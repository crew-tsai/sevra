import { LayoutDashboard, Plus, FileText, CheckCircle, LifeBuoy, LogOut, Radio, BarChart3, Settings, History, Home, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
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
import { adminMessages } from "@/i18n/messages/admin";

type Msgs = typeof shellMessages.en;

/** Most senior first: someone with two roles is shown the one that outranks. */
const ROLE_ORDER = ["admin", "coordinador", "manager", "ejecutivo", "soporte"] as const;

type SignedIn = { name: string; email: string; role: string | null };

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
  const admin = useMessages(adminMessages);
  const [me, setMe] = useState<SignedIn | null>(null);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  // Who is signed in. The footer used to offer a way out and no way to tell
  // whose workspace session you were in — which matters here, where a Sevra
  // support account and the client's own team use the same screens.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user?.email) return;

      const [{ data: roles }, { data: member }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        // Readable for your own row; an unlinked invitation simply yields
        // nothing and the address stands in for the name.
        supabase.from("team_members").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);

      const held = new Set((roles ?? []).map((r) => r.role as string));
      const metaName = (user.user_metadata as Record<string, unknown> | null)?.full_name;
      const name =
        (typeof metaName === "string" && metaName.trim()) ||
        member?.full_name?.trim() ||
        user.email.split("@")[0];

      setMe({
        name,
        email: user.email,
        role: ROLE_ORDER.find((r) => held.has(r)) ?? null,
      });
    })();
  }, []);

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
        {me && (
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}
            title={me.email}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold uppercase text-foreground">
              {me.name.slice(0, 1)}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">{me.name}</p>
                <p className="truncate text-[11px] leading-tight text-muted-foreground">
                  {me.role ? admin.roles[me.role] ?? me.role : me.email}
                </p>
              </div>
            )}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/help")}>
              <NavLink
                to="/help"
                state={{ from: location.pathname }}
                activeClassName="bg-sidebar-accent text-foreground font-medium"
              >
                <LifeBuoy className="h-4 w-4" />
                {!collapsed && <span>{m.help}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
