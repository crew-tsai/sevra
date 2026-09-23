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

/**
 * The rules, as data.
 *
 * They live here rather than inside the function because two things need them:
 * the calculation, and the assistant that has to explain the calculation to a
 * client. A prose description kept beside the code drifts from it silently —
 * the first person to notice is a user who was told the wrong thing about
 * their own crisis. Generating the explanation from the same table the
 * arithmetic reads makes that impossible.
 */
export const CRISIS_RULES = {
  labels: ["routine", "localized", "significant", "major", "catastrophic"] as const,

  /** Risk word to level. */
  byRisk: { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>,

  /** Score to level: the first band whose minimum the score reaches. */
  byScore: [
    { min: 80, level: 4 },
    { min: 60, level: 3 },
    { min: 40, level: 2 },
    { min: 20, level: 1 },
  ],

  /**
   * Facts that set a floor under the level, never a ceiling. Harm to a person
   * is catastrophic whatever the model scored it, and a regulator in the room
   * is at least a major crisis.
   */
  floors: [
    { field: "injuryFatality", atLeast: 4, says: "someone was hurt or killed" },
    { field: "regulatorInvolved", atLeast: 3, says: "a regulator is involved" },
  ],

  /**
   * Reach escalates a crisis that already exists; it does not turn a routine
   * post into one, which is why it only lifts a level already above L0.
   */
  amplification: { adds: 1, onlyAboveLevel: 0, cap: 4 },
} as const;

/** The L0–L4 level for an incident or a mention. */
export function crisisLevel(input: CrisisInput): number {
  const risk = (input.risk ?? "").toLowerCase();
  let level = CRISIS_RULES.byRisk[risk] ?? 0;

  const score = input.riskScore;
  if (typeof score === "number") {
    const band = CRISIS_RULES.byScore.find((b) => score >= b.min);
    if (band && band.level > level) level = band.level;
  }

  for (const floor of CRISIS_RULES.floors) {
    if (input[floor.field as keyof CrisisInput]) level = Math.max(level, floor.atLeast);
  }

  const amp = CRISIS_RULES.amplification;
  if (input.amplified && level > amp.onlyAboveLevel) level = Math.min(level + amp.adds, amp.cap);

  return Math.max(0, Math.min(4, level));
}
