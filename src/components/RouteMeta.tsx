import { useLocation, matchPath } from "react-router-dom";
import { PageMeta } from "@/components/PageMeta";
import { useMessages } from "@/i18n";
import { metaMessages } from "@/i18n/messages/meta";


// Only pages that are part of the public site are indexed; everything behind
// sign-in, and the sign-in pages themselves, is not.
const NOINDEX = new Set(["/admin", "/approvals", "/assets", "/audit-log", "/dashboard", "/incidents/:id", "/incidents/new", "/login", "/reports", "/reset-password", "/sevra", "/signin", "/unsubscribe", "/welcome", "/workflows"]);

export function RouteMeta() {
  const { pathname } = useLocation();
  const t = useMessages(metaMessages);
  const pattern = Object.keys(t.routes).find((p) => matchPath({ path: p, end: true }, pathname));
  const entry = pattern ? t.routes[pattern] : t.fallback;
  return (
    <PageMeta
      title={entry.title}
      description={entry.description}
      path={pathname}
      noindex={pattern ? NOINDEX.has(pattern) : true}
    />
  );
}
