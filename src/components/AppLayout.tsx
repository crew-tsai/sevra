import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import sevraLogo from "@/assets/sevra-logo.png";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-20 flex items-center border-b border-border px-4 bg-card">
            <SidebarTrigger />
            <div className="ml-3 flex items-center">
              <img src={sevraLogo} alt="Sevra" className="h-14 w-auto object-contain" />
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
