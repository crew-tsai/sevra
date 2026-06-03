import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteMeta } from "@/components/RouteMeta";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Welcome from "@/pages/Welcome";
import NewIncident from "@/pages/NewIncident";
import IncidentDetail from "@/pages/IncidentDetail";

import Assets from "@/pages/Assets";
import Approvals from "@/pages/Approvals";
import Sevra from "@/pages/Sevra";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";
import AuditLog from "@/pages/AuditLog";
import Unsubscribe from "@/pages/Unsubscribe";
import NotFound from "@/pages/NotFound";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import Home from "@/pages/marketing/Home";
import Product from "@/pages/marketing/Product";
import About from "@/pages/marketing/About";
import Workflows from "@/pages/marketing/Workflows";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteMeta />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/about" element={<About />} />
          </Route>
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/sevra" element={<Sevra />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incidents/new" element={<NewIncident />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            
            <Route path="/assets" element={<Assets />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/audit-log" element={<AuditLog />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
