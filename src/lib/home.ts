// Sevra has one public site, and each client has its own workspace built from
// this same code. The public site is where people start signing in; it works
// out which workspace they belong to and sends them there. A client workspace
// is just its own sign-in and app.

// Public, not a secret: the control plane's functions called here are the
// unauthenticated workspace lookups, which carry their own protections.
export const CONTROL_PLANE_URL = (
  import.meta.env.VITE_CONTROL_PLANE_URL || "https://ocuicsgffeucdxqyzsai.supabase.co"
).replace(/\/+$/, "");

// The public site's addresses. VITE_SEVRA_HOME marks a build as the public
// site explicitly (for a custom domain); the hostname covers the current one
// with no build configuration at all.
const HOME_HOSTS = ["sevra-xi.vercel.app"];

export function isHome(): boolean {
  if (import.meta.env.VITE_SEVRA_HOME === "true") return true;
  if (import.meta.env.DEV) return true;
  return typeof window !== "undefined" && HOME_HOSTS.includes(window.location.hostname);
}

export type RememberedWorkspace = { company: string; appUrl: string; email: string };

const KEY = "sevra.workspaces";

// Browser storage can throw (private windows, blocked site data). Forgetting is
// always safe here: the person just goes through the email step again.
export function rememberedWorkspaces(): RememberedWorkspace[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((w) => w && typeof w.appUrl === "string" && /^https:\/\//.test(w.appUrl))
      : [];
  } catch {
    return [];
  }
}

export function rememberWorkspace(w: RememberedWorkspace) {
  try {
    const rest = rememberedWorkspaces().filter((x) => !(x.appUrl === w.appUrl && x.email === w.email));
    localStorage.setItem(KEY, JSON.stringify([w, ...rest].slice(0, 10)));
  } catch {
    /* see rememberedWorkspaces */
  }
}

export function forgetWorkspace(w: RememberedWorkspace) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(rememberedWorkspaces().filter((x) => !(x.appUrl === w.appUrl && x.email === w.email))),
    );
  } catch {
    /* see rememberedWorkspaces */
  }
}

/** A workspace's own sign-in page, with the email already filled in. */
export function workspaceSignInUrl(w: { appUrl: string; email: string }): string {
  return `${w.appUrl.replace(/\/+$/, "")}/login?email=${encodeURIComponent(w.email)}`;
}

/** Where "Log in" goes from this build. */
export function signInPath(): string {
  return isHome() ? "/signin" : "/login";
}
