import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import sevraLogo from "@/assets/sevra-logo.png";
import AgentStripes from "@/components/marketing/AgentStripes";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sm:h-16 md:h-20 flex items-center border-b border-border px-3 sm:px-4 bg-card">
            <SidebarTrigger />
            <div className="ml-2 sm:ml-3 flex items-center min-w-0">
              <img
                src={sevraLogo}
                alt="Sevra"
                className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto max-w-[160px] sm:max-w-[220px] md:max-w-none object-contain"
              />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
