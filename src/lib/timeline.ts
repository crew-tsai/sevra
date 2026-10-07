// Timeline presentation rules shared by the incident timeline and its tests.

export type MentionRunEvent = {
  at: string;
  kind: string;
  title: string;
  detail?: string | null;
  channel?: string;
  author?: string;
  count?: number;
  untilAt?: string;
};

/**
 * One person posting eight times in a row is one fact, not eight. An unbroken
 * run of mentions from the same author on the same channel collapses to a
 * single event with a count and a time span. Anything else happening between
 * two mentions breaks the run, because "they kept posting while the level
 * rose" is sequence information the timeline exists to show.
 *
 * Expects events already sorted by time.
 */
export function collapseMentionRuns<E extends MentionRunEvent>(
  events: E[],
  label: (n: number, channel: string, author: string) => string,
): E[] {
  const out: E[] = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    if (
      e.kind === "mention" &&
      prev?.kind === "mention" &&
      prev.channel === e.channel &&
      prev.author === e.author
    ) {
      prev.count = (prev.count ?? 1) + 1;
      prev.title = label(prev.count, e.channel ?? "", e.author ?? "");
      prev.untilAt = e.at;
      prev.detail = prev.detail ?? e.detail;
      continue;
    }
    out.push({ ...e });
  }
  return out;
}
