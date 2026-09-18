import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import sevraLogo from "@/assets/sevra-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isHome } from "@/lib/home";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Filled in when arriving from the public site's "your workspace" link.
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/welcome", { replace: true });
    });
  }, [navigate]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Only rate limiting is worth reporting. Any other answer would say
      // whether an account exists for this address.
      if (error && /rate|too many|seconds/i.test(error.message)) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send the reset email. Try again in a minute.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Email and password required");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/welcome` },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/welcome", { replace: true });
    } catch (err: any) {
      // The invite-only signup trigger raises a database exception, which
      // GoTrue surfaces as a generic "database error saving new user" rather
      // than the message itself. Translate it into something actionable.
      const raw = err?.message ?? "";
      if (mode === "signup" && /database error|saving new user/i.test(raw)) {
        toast.error("This workspace is invite-only. Ask your administrator to invite you.");
      } else {
        toast.error(raw || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <img src={sevraLogo} alt="Sevra logo" className="h-12 sm:h-14 w-auto object-contain" />
          </div>
          <h1 className="sr-only">Sign in to Sevra</h1>
          <p className="text-sm text-muted-foreground">Enterprise crisis management platform</p>
          <p className="text-xs text-muted-foreground/70">a product by The Stellar Crew</p>
        </div>

        {mode === "forgot" ? (
          resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">Check your inbox.</p>
              <p className="text-sm text-muted-foreground">
                If <span className="text-foreground">{email.trim()}</span> has an account here, we've sent a link to
                set a new password. It can take a minute to arrive.
              </p>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a link to set a new password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {mode === "signin" && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setResetSent(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
            </button>
          </form>
        )}

        {/* The public site is also Sevra's own workspace. Anyone from a client
            company who lands on its sign-in page is in the wrong place. */}
        {isHome() && (
          <p className="text-xs text-muted-foreground text-center">
            Signing in to your company's workspace?{" "}
            <Link to="/signin" className="text-primary hover:underline">Find it here</Link>
          </p>
        )}
      </div>
    </div>
  );
}
