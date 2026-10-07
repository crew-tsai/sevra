import { describe, expect, it } from "vitest";
import { collapseMentionRuns, type MentionRunEvent } from "@/lib/timeline";

const label = (n: number, channel: string, author: string) => `${n} mentions on ${channel} from ${author}`;

function mention(at: string, author: string, detail: string | null = null): MentionRunEvent {
  return { at, kind: "mention", title: `Mention on twitter from ${author}`, detail, channel: "twitter", author };
}

describe("collapseMentionRuns", () => {
  it("folds an unbroken run from one author into a single row with count and span", () => {
    const events = [
      mention("2026-10-07T10:00:00Z", "@x"),
      mention("2026-10-07T10:05:00Z", "@x"),
      mention("2026-10-07T10:09:00Z", "@x"),
    ];
    const out = collapseMentionRuns(events, label);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("3 mentions on twitter from @x");
    expect(out[0].at).toBe("2026-10-07T10:00:00Z");
    expect(out[0].untilAt).toBe("2026-10-07T10:09:00Z");
  });

  it("does not fold mentions from different authors", () => {
    const out = collapseMentionRuns([mention("1", "@a"), mention("2", "@b"), mention("3", "@a")], label);
    expect(out).toHaveLength(3);
    expect(out.every((e) => e.untilAt === undefined)).toBe(true);
  });

  it("breaks the run when another event happens in between", () => {
    const events = [
      mention("2026-10-07T10:00:00Z", "@x"),
      mention("2026-10-07T10:01:00Z", "@x"),
      { at: "2026-10-07T10:02:00Z", kind: "change", title: "Crisis level changed" },
      mention("2026-10-07T10:03:00Z", "@x"),
    ];
    const out = collapseMentionRuns(events, label);
    expect(out.map((e) => e.kind)).toEqual(["mention", "change", "mention"]);
    expect(out[0].title).toBe("2 mentions on twitter from @x");
    expect(out[2].title).toBe("Mention on twitter from @x");
  });

  it("keeps the first non-empty origin detail for the folded row", () => {
    const out = collapseMentionRuns(
      [mention("1", "@x", null), mention("2", "@x", "matched #delay"), mention("3", "@x", "brought in by CEO")],
      label,
    );
    expect(out[0].detail).toBe("matched #delay");
  });

  it("does not mutate its input", () => {
    const events = [mention("1", "@x"), mention("2", "@x")];
    collapseMentionRuns(events, label);
    expect(events[0].count).toBeUndefined();
    expect(events[0].title).toBe("Mention on twitter from @x");
  });
});
