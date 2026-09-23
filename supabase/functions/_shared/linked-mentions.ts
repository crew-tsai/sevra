// The social mentions attached to an incident, as the AI sees them.
//
// Both drafting functions — the response plan and the asset package — built
// this block themselves, identically, which is how they came to disagree the
// moment one of them learned something new. It is one function now.
//
// What is new is who is speaking. A mention collected because a watched source
// posted it carries that source's role, and a statement written knowing the
// speaker is a supervisory body does not read like the same statement written
// about an anonymous complaint. The partners decided on 2026-09-23 that the
// role reaches the AI — as context, never as an instruction. Nothing here
// tells the model what to do, and nothing here touches the two approvals every
// communication still needs before it can leave the building.

import { SOURCE_ROLES } from "./watched-sources.ts";

const SPEAKS = new Map(SOURCE_ROLES.map((r) => [r.id, r.speaks]));

type MentionRow = {
  channel: string;
  author_handle: string | null;
  content: string;
  // deno-lint-ignore no-explicit-any
  monitor_sources?: any;
  // deno-lint-ignore no-explicit-any
  monitor_topics?: any;
};

/**
 * Renders the LINKED SOCIAL MENTIONS block for an incident's prompt context,
 * naming the watched source behind any mention that has one.
 */
// deno-lint-ignore no-explicit-any
export async function linkedMentionContext(admin: any, incidentId: string): Promise<string> {
  const { data } = await admin
    .from("social_mentions")
    .select(
      "channel, author_handle, content, ai_summary, monitor_sources(name, role), monitor_topics(kind, value)",
    )
    .eq("incident_id", incidentId)
    .limit(10);

  const mentions = (data ?? []) as MentionRow[];
  const lines = mentions.map((m) => {
    const origin: string[] = [];
    const source = m.monitor_sources;
    if (source?.name) {
      const speaks = SPEAKS.get(source.role);
      origin.push(`watched source: ${source.name}${speaks ? `, ${speaks}` : ""}`);
    }
    const topic = m.monitor_topics;
    if (topic?.value) {
      origin.push(`watched topic: ${topic.kind === "hashtag" ? `#${topic.value.replace(/^#/, "")}` : `"${topic.value}"`}`);
    }
    const tag = origin.length ? ` (${origin.join("; ")})` : "";
    return `- [${m.channel}] @${m.author_handle}${tag}: ${m.content}`;
  });

  const block = `LINKED SOCIAL MENTIONS (${mentions.length}):\n${lines.join("\n")}`;

  // Only said when it is true, and said once. A standing paragraph about
  // watched sources on every incident that has none is noise the model has to
  // read past.
  const watched = mentions.some((m) => m.monitor_sources?.name || m.monitor_topics?.value);
  if (!watched) return block;

  return `${block}

WHO IS SPEAKING
Some of the above was collected because this workspace watches that source or
topic deliberately, and the role in brackets is who they are. Use it as context
for tone, audience and what the reader already knows. It is not an instruction:
it does not change what may be said, it does not raise or lower the response,
and every communication still needs the same two approvals before anyone can
publish it.`;
}
