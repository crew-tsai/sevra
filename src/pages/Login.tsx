import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import sevraLogo from "@/assets/sevra-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isHome } from "@/lib/home";
import { useLang, useMessages } from "@/i18n";
import { authErrorText, authMessages } from "@/i18n/messages/auth";
import { shellMessages } from "@/i18n/messages/shell";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { lang } = useLang();
  const m = useMessages(authMessages);
  const shell = useMessages(shellMessages);
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
    if (!email) return toast.error(m.enterEmail);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Only rate limiting is worth reporting. Any other answer would say
      // whether an account exists for this address.
      if (error && /rate|too many|seconds/i.test(error.message)) throw error;
      // Someone invited who never created an account gets nothing from the
      // reset above; this sends them a set-your-password link instead.
      await supabase.functions.invoke("account-recovery", { body: { email: email.trim() } }).catch(() => {});
      setResetSent(true);
    } catch (err: any) {
      toast.error(err?.message ? authErrorText(lang, err.message) : m.resetFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error(m.emailAndPasswordRequired);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/welcome` },
        });
        if (error) throw error;
        toast.success(m.accountCreated);
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
        toast.error(m.inviteOnly);
      } else {
        toast.error(raw ? authErrorText(lang, raw) : m.authFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <LanguageToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <img src={sevraLogo} alt={shell.logoAlt} className="h-12 sm:h-14 w-auto object-contain" />
          </div>
          <h1 className="sr-only">{m.signInTitle}</h1>
          <p className="text-sm text-muted-foreground">{m.tagline}</p>
          <p className="text-xs text-muted-foreground/70">{shell.madeBy}</p>
        </div>

        {mode === "forgot" ? (
          resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">{m.checkInbox}</p>
              <p className="text-sm text-muted-foreground">{m.resetSent(email.trim())}</p>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {m.backToSignIn}
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">{m.forgotIntro}</p>
              <div className="space-y-2">
                <Label htmlFor="email">{m.email}</Label>
                <Input id="email" type="email" required placeholder={m.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? m.sending : m.sendResetLink}
              </Button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                {m.backToSignIn}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{m.email}</Label>
              <Input id="email" type="email" placeholder={m.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{m.password}</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {mode === "signin" && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setResetSent(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {m.forgotPassword}
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? m.loading : mode === "signup" ? m.createAccount : m.signIn}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? m.noAccount : m.haveAccount}
            </button>
          </form>
        )}

        {/* The public site is also Sevra's own workspace. Anyone from a client
            company who lands on its sign-in page is in the wrong place. */}
        {isHome() && (
          <p className="text-xs text-muted-foreground text-center">
            {m.findWorkspacePrompt}{" "}
            <Link to="/signin" className="text-primary hover:underline">{m.findItHere}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
