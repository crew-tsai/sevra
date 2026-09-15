import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_ACCESS_LOGGED_KEY = "sevra.support_access_logged.v1";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const location = useLocation();
  const accessLogged = useRef(false);

  // Registra la entrada al workspace del personal de soporte de Sevra, para
  // que el cliente pueda auditarla. El RPC no hace nada si quien llama no
  // tiene rol 'soporte', así que se invoca sin comprobar el rol antes.
  //
  // Doble guarda: la ref cubre el doble montaje de StrictMode en desarrollo y
  // sessionStorage evita repetirlo en cada TOKEN_REFRESHED o recarga de la
  // pestaña. (El RPC además ignora accesos repetidos dentro de la misma hora.)
  const logSupportAccess = () => {
    if (accessLogged.current) return;
    accessLogged.current = true;
    try {
      if (sessionStorage.getItem(SUPPORT_ACCESS_LOGGED_KEY)) return;
      sessionStorage.setItem(SUPPORT_ACCESS_LOGGED_KEY, "1");
    } catch {
      // sessionStorage puede fallar en modo privado; la ref ya evita el duplicado
      // dentro de esta carga de página.
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
