import { useLocation, matchPath } from "react-router-dom";
import { PageMeta } from "@/components/PageMeta";

interface MetaEntry {
  pattern: string;
  title: string;
  description: string;
  type?: "website" | "article";
  noindex?: boolean;
}

const META: MetaEntry[] = [
  // Marketing
  { pattern: "/", title: "Sevra — AI-powered crisis management for modern brands", description: "Sevra helps enterprises detect, decide, and respond to reputation crises in real time with AI-driven social monitoring and playbooks." },
  { pattern: "/product", title: "Product — Sevra Crisis Navigator", description: "Explore Sevra's crisis intelligence modules: social monitoring, strategy, asset generation, approvals, and reporting." },
  { pattern: "/about", title: "About Sevra — The team behind crisis-ready brands", description: "Meet the team building Sevra, the AI crisis navigator trusted by communications and risk leaders." },

  // Auth / utility
  { pattern: "/login", title: "Log in — Sevra", description: "Sign in to your Sevra crisis management workspace.", noindex: true },
  { pattern: "/unsubscribe", title: "Unsubscribe — Sevra", description: "Manage your Sevra email notification preferences.", noindex: true },

  // App (protected)
  { pattern: "/welcome", title: "Hub — Sevra", description: "Your crisis command hub: top critical issues, live signals, and quick actions.", noindex: true },
  { pattern: "/sevra", title: "Social Intel — Sevra", description: "Real-time social monitoring across X, LinkedIn, Reddit, TikTok, Facebook, and more.", noindex: true },
  { pattern: "/dashboard", title: "Dashboard — Sevra", description: "Crisis dashboard: critical issues, status, social mentions, and sentiment analysis.", noindex: true },
  { pattern: "/incidents/new", title: "New Incident — Sevra", description: "Manually log a new crisis incident for triage and response.", noindex: true },
  { pattern: "/incidents/:id", title: "Incident Detail — Sevra", description: "Full incident timeline, signals, assets, and response actions.", noindex: true },
  
  { pattern: "/assets", title: "Assets — Sevra", description: "AI-generated communications assets ready for review and approval.", noindex: true },
  { pattern: "/approvals", title: "Approvals — Sevra", description: "Review and approve crisis communications before publishing.", noindex: true },
  { pattern: "/reports", title: "Reports — Sevra", description: "Performance and incident reports across your crisis program.", noindex: true },
  { pattern: "/admin", title: "Admin — Sevra", description: "Manage your Sevra workspace, members, and configuration.", noindex: true },
  { pattern: "/audit-log", title: "Audit Log — Sevra", description: "Complete audit trail of actions across your Sevra workspace.", noindex: true },
];

const DEFAULT: Omit<MetaEntry, "pattern"> = {
  title: "Sevra — AI crisis management",
  description: "Sevra helps brands detect and respond to reputation crises in real time.",
};

export function RouteMeta() {
  const { pathname } = useLocation();
  const match = META.find((m) => matchPath({ path: m.pattern, end: true }, pathname));
  const entry = match ?? { ...DEFAULT, pattern: pathname, noindex: true };
  return (
    <PageMeta
      title={entry.title}
      description={entry.description}
      path={pathname}
      type={entry.type}
      noindex={entry.noindex}
    />
  );
}
