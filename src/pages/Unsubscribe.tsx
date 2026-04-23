import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";

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

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Missing unsubscribe token in the URL." });
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
          setState({ status: "invalid", message: data?.error || "This unsubscribe link is no longer valid." });
        }
      } catch {
        setState({ status: "invalid", message: "Could not validate this link. Please try again later." });
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
        setState({ status: "error", message: data?.error || "Something went wrong. Please try again." });
      }
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
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
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>
            {state.status === "validating" && "Validating your unsubscribe link…"}
            {state.status === "ready" && "Confirm you no longer want to receive emails from Sevra at this address."}
            {state.status === "submitting" && "Processing your request…"}
            {state.status === "success" && "You've been unsubscribed. We won't send you further emails."}
            {state.status === "already" && "This email address is already unsubscribed."}
            {state.status === "invalid" && state.message}
            {state.status === "error" && state.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {state.status === "validating" || state.status === "submitting" ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : state.status === "ready" || state.status === "error" ? (
            <Button onClick={handleConfirm}>
              Confirm unsubscribe
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export default Unsubscribe;
