import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Flag,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
} from "lucide-react";
import { useIntlLocale, useMessages } from "@/i18n";
import { incidentDetailMessages } from "@/i18n/messages/incident-detail";
import { formatDateTime } from "@/lib/utils";

type Kind = "opened" | "mention" | "change" | "drafted" | "approved" | "sent" | "failed";

type Event = {
  at: string;
  kind: Kind;
  title: string;
  detail?: string | null;
  who?: string | null;
};

const ICONS: Record<Kind, typeof Flag> = {
  opened: Flag,
  mention: MessageSquare,
  change: Pencil,
  drafted: FileText,
  approved: CheckCircle2,
  sent: Send,
  failed: AlertTriangle,
};

/**
 * One crisis, in the order it happened.
 *
 * The story of an incident was spread across five places — the mentions that
 * opened it, the audit log of what changed, the drafts, the approvals, and
 * (once there was one) the record of what went out. Every one of those is a
 * different page with a different sort order, and reconstructing the sequence
 * was a job for whoever was writing the post-mortem, days later.
 *
 * During the crisis the sequence *is* the information: what did we know, when
 * did we know it, and what had we already said by then.
 */
export function IncidentTimeline({ incidentId, openedAt }: { incidentId: string; openedAt: string }) {
  const t = useMessages(incidentDetailMessages).timeline;
  const intl = useIntlLocale();
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function load() {
    const [{ data: mentions }, { data: audit }, { data: assets }, { data: sends }] = await Promise.all([
      supabase
        .from("social_mentions")
        .select("id, channel, author_handle, created_at, posted_at, monitor_sources(name, role), monitor_topics(kind, value)")
        .eq("incident_id", incidentId),
      supabase
        .from("incident_audit_log")
        .select("id, changed_by, changed_at, field_name, old_value, new_value, change_source")
        .eq("incident_id", incidentId),
      supabase
        .from("incident_assets")
        .select("id, title, asset_type, created_at, approval_status, approved_at")
        .eq("incident_id", incidentId),
      supabase
        .from("communication_sends")
        .select("id, asset_title, asset_type, channel, method, status, recipients, destination, external_url, error, sent_at")
        .eq("incident_id", incidentId),
    ]);

    // Names for the ids the audit log stores, the same way the Audit Log page
    // resolves them.
    const ids = [...new Set((audit ?? []).map((e) => e.changed_by).filter((v): v is string => !!v))];
    const people: Record<string, string> = {};
    if (ids.length) {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      for (const m of members ?? []) {
        if (m.user_id) people[m.user_id] = m.full_name?.trim() || m.email;
      }
    }

    const out: Event[] = [{ at: openedAt, kind: "opened", title: t.opened }];

    for (const m of mentions ?? []) {
      const source = (m as { monitor_sources?: { name: string } | null }).monitor_sources;
      const topic = (m as { monitor_topics?: { kind: string; value: string } | null }).monitor_topics;
      const origin = source?.name
        ? t.viaSource(source.name)
        : topic?.value
          ? t.viaTopic(topic.kind === "hashtag" ? `#${topic.value.replace(/^#/, "")}` : topic.value)
          : null;
      out.push({
        at: m.posted_at ?? m.created_at,
        kind: "mention",
        title: t.mention(m.channel, m.author_handle ? `@${m.author_handle}` : "—"),
        detail: origin,
      });
    }

    for (const e of audit ?? []) {
      out.push({
        at: e.changed_at,
        kind: "change",
        title: t.changed(t.fields[e.field_name] ?? e.field_name),
        detail: `${e.old_value ?? "—"} → ${e.new_value ?? "—"}`,
        // change_source distinguishes Sevra's own edits from a person's, which
        // is the difference between "the level rose" and "someone raised it".
        who: e.change_source && e.change_source !== "manual"
          ? t.bySevra
          : (e.changed_by && people[e.changed_by]) || t.byPerson,
      });
    }

    for (const a of assets ?? []) {
      out.push({ at: a.created_at, kind: "drafted", title: t.drafted(a.title) });
      if (a.approved_at) {
        out.push({ at: a.approved_at, kind: "approved", title: t.approved(a.title) });
      }
    }

    for (const s of sends ?? []) {
      const what = s.asset_title ?? t.aCommunication;
      if (s.status === "failed") {
        out.push({ at: s.sent_at, kind: "failed", title: t.sendFailed(what, s.channel), detail: s.error });
        continue;
      }
      out.push({
        at: s.sent_at,
        kind: "sent",
        title: s.recipients
          ? t.sentToPeople(what, s.recipients)
          : t.sentTo(what, s.channel),
        // Said out loud, because a send somebody reported and a send the
        // platform confirmed are not the same claim.
        detail: s.method === "manual" ? t.byHand : s.destination,
      });
    }

    out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    setEvents(out);
  }

  if (events === null) {
    return (
      <Card className="p-5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t.title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t.intro}</p>
      </div>

      <ol className="relative space-y-4 border-l pl-5">
        {events.map((e, i) => {
          const Icon = ICONS[e.kind];
          return (
            <li key={`${e.at}-${i}`} className="relative">
              <span
                className={`absolute -left-[1.6rem] flex h-5 w-5 items-center justify-center rounded-full border bg-background ${
                  e.kind === "failed" ? "text-risk-critical border-risk-critical/40"
                    : e.kind === "sent" ? "text-risk-low border-risk-low/40"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm text-foreground">{e.title}</span>
                {e.who && <Badge variant="outline" className="text-[10px]">{e.who}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(e.at, intl)}
                {e.detail ? ` · ${e.detail}` : ""}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
