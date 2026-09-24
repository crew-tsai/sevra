import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteMeta } from "@/components/RouteMeta";
import Login from "@/pages/Login";
import SignIn from "@/pages/SignIn";
import ResetPassword from "@/pages/ResetPassword";
import OpenWorkspace from "@/pages/OpenWorkspace";
import { isHome } from "@/lib/home";




// Split per route, so a crisis lead on hotel wifi at 3am downloads the
// incident page and not the marketing site, the charting library and the
// whole admin panel first. Login and the app shell stay eager: they are what
// someone is waiting for.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Welcome = lazy(() => import("@/pages/Welcome"));
const NewIncident = lazy(() => import("@/pages/NewIncident"));
const IncidentDetail = lazy(() => import("@/pages/IncidentDetail"));
const Assets = lazy(() => import("@/pages/Assets"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const WorkflowsApp = lazy(() => import("@/pages/Workflows"));
const Sevra = lazy(() => import("@/pages/Sevra"));
const Reports = lazy(() => import("@/pages/Reports"));
const Admin = lazy(() => import("@/pages/Admin"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const Help = lazy(() => import("./pages/Help"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("@/pages/marketing/Home"));
const Product = lazy(() => import("@/pages/marketing/Product"));
const About = lazy(() => import("@/pages/marketing/About"));
const LegalPage = lazy(() => import("@/pages/legal/LegalPage"));
const MarketingLayout = lazy(() => import("@/components/marketing/MarketingLayout"));

/** Shown while a route's code arrives. Deliberately quiet: a spinner that
 *  appears for 80ms reads as a glitch, so this is a plain hold. */
const RouteFallback = () => <div className="min-h-screen bg-background" />;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteMeta />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* The public site finds your workspace; a client workspace has no
              marketing pages of its own and opens on its sign-in. */}
          <Route path="/signin" element={isHome() ? <SignIn /> : <Navigate to="/login" replace />} />
          <Route path="/open" element={<OpenWorkspace />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route element={isHome() ? <MarketingLayout /> : <Navigate to="/login" replace />}>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
            <Route path="/terms" element={<LegalPage doc="terms" />} />
            <Route path="/data-deletion" element={<LegalPage doc="deletion" />} />
          </Route>
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/sevra" element={<Sevra />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incidents/new" element={<NewIncident />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            
            <Route path="/assets" element={<Assets />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/workflows" element={<WorkflowsApp />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/help" element={<Help />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
