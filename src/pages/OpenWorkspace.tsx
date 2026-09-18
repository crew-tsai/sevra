import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import sevraLogo from "@/assets/sevra-logo.png";
import { CONTROL_PLANE_URL, rememberWorkspace, workspaceSignInUrl } from "@/lib/home";

/**
 * Where the link in a "your workspace" email lands. Resolves it, remembers the
 * workspace on this browser so the next sign-in skips the email step, and
 * moves on to that workspace's own sign-in page.
 */
export default function OpenWorkspace() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get("t");
    if (!t) {
      setError("This link is incomplete. Request a new one.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${CONTROL_PLANE_URL}/functions/v1/workspace-open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || typeof body?.app_url !== "string") {
          throw new Error(body?.error ?? "This link could not be opened. Request a new one.");
        }
        const w = { company: body.company_name ?? "Your workspace", appUrl: body.app_url, email: body.email };
        rememberWorkspace(w);
        window.location.replace(workspaceSignInUrl(w));
      } catch (err: any) {
        setError(err?.message ?? "This link could not be opened. Request a new one.");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={sevraLogo} alt="Sevra" className="h-12 w-auto object-contain mx-auto" />
        {error ? (
          <>
            <p className="text-sm text-foreground">{error}</p>
            <Link to="/signin" className="text-sm text-primary hover:underline">
              Get a new sign-in link
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening your workspace…
          </p>
        )}
      </div>
    </div>
  );
}
