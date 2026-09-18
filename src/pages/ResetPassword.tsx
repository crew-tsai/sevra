import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import sevraLogo from "@/assets/sevra-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang, useMessages } from "@/i18n";
import { authErrorText, authMessages } from "@/i18n/messages/auth";

/**
 * Where a password-reset email lands. The link signs the person in for the
 * purpose of recovery; this page lets them choose a new password and then
 * carries on into the app.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const m = useMessages(authMessages);
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  // The sign-in the link produced, kept here as well as in browser storage.
  // Some browsers refuse or clear site storage (private windows, strict
  // cookie blocking), and then the page would know it was signed in but
  // saving would fail with "Auth session missing".
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    // The client reads the recovery token from the URL on load, which can land
    // just before or just after this runs, so check both ways.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) setLinkToken(session.access_token);
      if (event === "PASSWORD_RECOVERY" || session) setReady("ok");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) setLinkToken(data.session.access_token);
      if (data.session) setReady("ok");
    });
    // An expired or already-used link arrives with an error instead of a token.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const failed = hash.get("error_description") ?? new URLSearchParams(window.location.search).get("error_description");
    const timer = setTimeout(() => setReady((r) => (r === "checking" ? "invalid" : r)), failed ? 0 : 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error(m.passwordTooShort);
    if (password !== confirm) return toast.error(m.passwordsDontMatch);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      setSaving(false);
      toast.success(m.passwordUpdated);
      navigate("/welcome", { replace: true });
      return;
    }

    // The browser lost the stored sign-in. Save with the token from the link
    // directly, then send them to sign in -- the app itself cannot stay signed
    // in without that storage anyway.
    if (/session missing/i.test(error.message) && linkToken) {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${linkToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      setSaving(false);
      if (res.ok) {
        toast.success(m.passwordUpdatedSignIn);
        const email = ((await res.json().catch(() => ({}))) as { email?: string }).email ?? "";
        navigate(`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`, { replace: true });
        return;
      }
      const body = await res.json().catch(() => ({}));
      const detail = (body as { msg?: string; message?: string }).msg ?? (body as { message?: string }).message;
      return toast.error(detail ? authErrorText(lang, detail) : m.passwordSaveFailed);
    }
    setSaving(false);
    toast.error(authErrorText(lang, error.message));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <LanguageToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <img src={sevraLogo} alt="Sevra" className="h-12 sm:h-14 w-auto object-contain mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">{m.setNewPassword}</h1>
        </div>

        {ready === "checking" && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {m.checkingLink}
          </p>
        )}

        {ready === "invalid" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">{m.linkInvalid}</p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              {m.requestNewOne}
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{m.newPassword}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{m.confirmPassword}</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? m.saving : m.savePassword}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
