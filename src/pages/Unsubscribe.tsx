import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useMessages } from "@/i18n";
import { unsubscribeMessages } from "@/i18n/messages/admin-panels";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State =
  | { status: "validating" }
  | { status: "ready" }
  | { status: "already" }
  | { status: "invalid"; message: string }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ status: "validating" });
  const t = useMessages(unsubscribeMessages);

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: t.missingToken });
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json();
        if (res.ok && data.valid) {
          setState({ status: "ready" });
        } else if (data?.reason === "already_unsubscribed") {
          setState({ status: "already" });
        } else {
          setState({ status: "invalid", message: t.noLongerValid });
        }
      } catch {
        setState({ status: "invalid", message: t.cantValidate });
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState({ status: "success" });
      } else if (data?.reason === "already_unsubscribed") {
        setState({ status: "already" });
      } else {
        setState({ status: "error", message: t.somethingWrong });
      }
    } catch {
      setState({ status: "error", message: t.network });
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <LanguageToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <h1 className="sr-only">{t.heading}</h1>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            {state.status === "success" || state.status === "already" ? (
              <CheckCircle2 className="h-6 w-6 text-[hsl(var(--risk-low))]" />
            ) : state.status === "invalid" || state.status === "error" ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <MailX className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>
            {state.status === "validating" && t.validating}
            {state.status === "ready" && t.ready}
            {state.status === "submitting" && t.submitting}
            {state.status === "success" && t.success}
            {state.status === "already" && t.already}
            {state.status === "invalid" && state.message}
            {state.status === "error" && state.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {state.status === "validating" || state.status === "submitting" ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : state.status === "ready" || state.status === "error" ? (
            <Button onClick={handleConfirm}>
              {t.confirm}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export default Unsubscribe;
