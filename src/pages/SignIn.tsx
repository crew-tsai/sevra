import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import sevraLogo from "@/assets/sevra-logo.png";
import {
  CONTROL_PLANE_URL,
  forgetWorkspace,
  rememberedWorkspaces,
  workspaceSignInUrl,
  type RememberedWorkspace,
} from "@/lib/home";

/**
 * Sign-in on the public site. Each company's accounts live in its own
 * workspace, so this page never takes a password: it finds the workspace and
 * sends the person there. The answer goes by email rather than on screen, so
 * nobody can type an address here and learn which company uses Sevra.
 */
export default function SignIn() {
  const [remembered, setRemembered] = useState<RememberedWorkspace[]>(() => rememberedWorkspaces());
  const [useOther, setUseOther] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch(`${CONTROL_PLANE_URL}/functions/v1/workspace-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Something went wrong. Try again in a moment.");
      }
      setState("sent");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Try again in a moment.");
      setState("idle");
    }
  };

  const showList = remembered.length > 0 && !useOther && state !== "sent";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center justify-center">
            <img src={sevraLogo} alt="Sevra" className="h-12 sm:h-14 w-auto object-contain" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {showList ? "Continue to your workspace" : "Sign in to Sevra"}
          </h1>
        </div>

        {showList ? (
          <div className="space-y-3">
            {remembered.map((w) => (
              <div key={`${w.appUrl}|${w.email}`} className="flex items-stretch gap-2">
                <a
                  href={workspaceSignInUrl(w)}
                  className="flex-1 flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-muted/40 transition"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{w.company}</span>
                    <span className="block text-xs text-muted-foreground truncate">{w.email}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
                <button
                  type="button"
                  aria-label={`Forget ${w.company} on this browser`}
                  title="Forget on this browser"
                  onClick={() => {
                    forgetWorkspace(w);
                    setRemembered(rememberedWorkspaces());
                  }}
                  className="px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setUseOther(true)}
              className="w-full text-xs text-muted-foreground hover:text-foreground pt-2"
            >
              Use a different email
            </button>
          </div>
        ) : state === "sent" ? (
          <div className="space-y-4 text-center">
            <Mail className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-foreground">Check your inbox.</p>
            <p className="text-sm text-muted-foreground">
              If <span className="text-foreground">{email.trim()}</span> has access to a Sevra workspace, we've sent a
              link to it. It can take a minute to arrive.
            </p>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We'll send you a link to your company's workspace. You'll enter your password there.
            </p>
            {remembered.length > 0 && (
              <button
                type="button"
                onClick={() => setUseOther(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Back to your saved workspaces
              </button>
            )}
          </form>
        )}

        <p className="text-xs text-muted-foreground/70 text-center">a product by The Stellar Crew</p>
      </div>
    </div>
  );
}
