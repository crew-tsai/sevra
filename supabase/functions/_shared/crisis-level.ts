// L0–L4, the scale the whole product is ordered by: the Dashboard, Welcome and
// Approvals all sort by crisis_level before anything else, and the badge a
// person reads first is this number.
//
// It used to be derived in one place for display (a social mention's badge) and
// never written to an incident, so every incident the monitor created sat at
// L0 — a data breach with risk=high wearing a "Routine" badge. One function
// now decides the level, and both the app and the AI functions call it, so the
// mention's badge and the incident it opens always agree.
//
// This file is mirrored at supabase/functions/_shared/crisis-level.ts. The two
// copies must stay byte-identical; `npm run build` checks it.

export type CrisisInput = {
  /** critical | high | medium | low, however it was spelled. */
  risk?: string | null;
  /** 0–100. */
  riskScore?: number | null;
  injuryFatality?: boolean | null;
  regulatorInvolved?: boolean | null;
  /** A verified or influencer account, or media already carrying it. */
  amplified?: boolean | null;
};

/** The L0–L4 level for an incident or a mention. */
export function crisisLevel(input: CrisisInput): number {
  const risk = (input.risk ?? "").toLowerCase();
  let level =
    risk === "critical" ? 4 : risk === "high" ? 3 : risk === "medium" ? 2 : risk === "low" ? 1 : 0;

  const score = input.riskScore;
  if (typeof score === "number") {
    const byScore = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
    if (byScore > level) level = byScore;
  }

  // Harm to a person is catastrophic whatever the model scored it, and a
  // regulator in the room is at least a major crisis: both are floors, never
  // reductions.
  if (input.injuryFatality) level = Math.max(level, 4);
  if (input.regulatorInvolved) level = Math.max(level, 3);

  // Reach escalates a crisis that already exists; it does not turn a routine
  // post into one, so this only lifts a level that is already above L0.
  if (input.amplified && level >= 1) level = Math.min(level + 1, 4);

  return Math.max(0, Math.min(4, level));
}
