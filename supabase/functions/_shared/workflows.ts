// The rule model, and the matching that decides whether a rule applies.
//
// Rules are written by an administrator and carried out by the monitor, so the
// same definition has to be readable in two places: the builder in the app, and
// the engine in the edge functions. This file is the definition; it is mirrored
// at supabase/functions/_shared/workflows.ts and `npm run build` checks that
// the two copies are identical.
//
// What a rule may do is deliberately limited to things that stay inside the
// workspace and can be undone by hand. There is no "publish" action: a crisis
// statement that goes out without a person approving it is how one crisis
// becomes two, and the two approvals exist for that reason.

export type Criterion = { field: string; op: string; value: string };
export type WorkflowAction = { type: ActionType; detail: string };

export type ActionType =
  /** Write the communication package now, instead of waiting to be asked. */
  | "draft_package"
  /** Email an address list that the workspace has defined. */
  | "notify"
  /** Move the incident's status. */
  | "set_status"
  /** Mark the incident as not public, so nothing can be pushed out. */
  | "lock_public"
  /** Record that the rule matched and do nothing else. */
  | "log_only";

export const ACTION_TYPES: ActionType[] = [
  "draft_package",
  "notify",
  "set_status",
  "lock_public",
  "log_only",
];

/** Incident columns a rule can test. */
export const CRITERIA_FIELDS = [
  "risk_score",
  "estimated_passengers_impacted",
  "influencer_media_involved",
  "regulator_involved",
  "injury_fatality",
  "country",
  "source",
] as const;

export const CRITERIA_OPS = [">=", ">", "=", "<", "<=", "contains"] as const;

export const INCIDENT_STATUSES = ["active", "monitoring", "contained", "resolved"] as const;

export type Workflow = {
  id: string;
  name: string;
  enabled: boolean;
  /** null = any type. */
  incident_type: string | null;
  /** null = any sub-type. */
  sub_type: string | null;
  min_crisis_level: number;
  criteria: Criterion[];
  actions: WorkflowAction[];
  next_status: string | null;
};

/** The incident fields matching needs. */
export type WorkflowIncident = {
  incident_type?: string | null;
  sub_type?: string | null;
  risk_score?: number | null;
  estimated_passengers_impacted?: number | null;
  influencer_media_involved?: boolean | null;
  regulator_involved?: boolean | null;
  injury_fatality?: boolean | null;
  country?: string | null;
  source?: string | null;
};

function fieldValue(incident: WorkflowIncident, field: string): unknown {
  return (incident as Record<string, unknown>)[field];
}

/** "true"/"yes"/"1" all mean true, because the value arrives as typed text. */
function asBoolean(value: string): boolean {
  return ["true", "yes", "1", "sí", "si"].includes(value.trim().toLowerCase());
}

export function criterionPasses(incident: WorkflowIncident, c: Criterion): boolean {
  const actual = fieldValue(incident, c.field);
  const wanted = (c.value ?? "").trim();
  if (!wanted) return true; // An empty value is an unfinished rule, not a filter.

  if (typeof actual === "boolean") return actual === asBoolean(wanted);

  if (typeof actual === "number") {
    const n = Number(wanted);
    if (Number.isNaN(n)) return false;
    switch (c.op) {
      case ">=": return actual >= n;
      case ">": return actual > n;
      case "<": return actual < n;
      case "<=": return actual <= n;
      case "=": return actual === n;
      case "contains": return String(actual).includes(wanted);
      default: return false;
    }
  }

  const text = String(actual ?? "").toLowerCase();
  const target = wanted.toLowerCase();
  // A missing value matches nothing rather than everything: a rule for
  // Colombia should not fire on an incident with no country.
  if (!text) return false;
  return c.op === "contains" ? text.includes(target) : text === target;
}

/**
 * Whether this rule applies to this incident at this level.
 *
 * Every part must agree: the classification, the level floor, and all of the
 * criteria. A disabled rule never matches.
 */
export function workflowMatches(
  workflow: Workflow,
  incident: WorkflowIncident,
  crisisLevel: number,
): boolean {
  if (!workflow.enabled) return false;
  if (workflow.incident_type && workflow.incident_type !== incident.incident_type) return false;
  if (workflow.sub_type && workflow.sub_type !== incident.sub_type) return false;
  if (crisisLevel < workflow.min_crisis_level) return false;
  return (workflow.criteria ?? []).every((c) => criterionPasses(incident, c));
}

/** The rules that apply, in the order they were defined. */
export function matchingWorkflows(
  workflows: Workflow[],
  incident: WorkflowIncident,
  crisisLevel: number,
): Workflow[] {
  return workflows.filter((w) => workflowMatches(w, incident, crisisLevel));
}
