import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_ACCESS_LOGGED_KEY = "sevra.support_access_logged.v1";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const location = useLocation();
  const accessLogged = useRef(false);

  // Records Sevra support staff entering the workspace so the client can audit
  // it. The RPC no-ops when the caller doesn't hold the 'soporte' role, so it
  // is called without checking the role first.
  //
  // Two guards: the ref covers StrictMode's double mount in development, and
  // sessionStorage stops it repeating on every TOKEN_REFRESHED or tab reload.
  // (The RPC also ignores repeat access within the same hour.)
  const logSupportAccess = () => {
    if (accessLogged.current) return;
    accessLogged.current = true;
    try {
      if (sessionStorage.getItem(SUPPORT_ACCESS_LOGGED_KEY)) return;
      sessionStorage.setItem(SUPPORT_ACCESS_LOGGED_KEY, "1");
    } catch {
      // sessionStorage can throw in private mode; the ref already prevents a
      // duplicate within this page load.
    }
    void supabase.rpc("log_support_access");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      if (data.session) logSupportAccess();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (session) logSupportAccess();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!authed) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
