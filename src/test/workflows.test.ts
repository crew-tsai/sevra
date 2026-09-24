import { describe, it, expect } from "vitest";
import {
  ACTION_TYPES,
  criterionPasses,
  matchingWorkflows,
  workflowMatches,
  type Workflow,
  type WorkflowIncident,
} from "@/lib/workflows";

// These decide what the workspace does on its own, server-side, with nobody
// watching. A rule that fires when it should not can draft and send; a rule
// that silently never fires leaves a crisis unanswered.

const incident: WorkflowIncident = {
  incident_type: "outage",
  sub_type: "service_disruption",
  risk_score: 60,
  estimated_passengers_impacted: 1200,
  influencer_media_involved: false,
  regulator_involved: true,
  injury_fatality: false,
  country: "Colombia",
  source: "monitoring",
};

const rule = (over: Partial<Workflow> = {}): Workflow => ({
  id: "w1",
  name: "test",
  enabled: true,
  incident_type: null,
  sub_type: null,
  min_crisis_level: 0,
  criteria: [],
  actions: [],
  next_status: null,
  ...over,
});

describe("criterionPasses", () => {
  it("treats an unfinished rule as no filter rather than as a rule that never matches", () => {
    expect(criterionPasses(incident, { field: "country", op: "=", value: "" })).toBe(true);
    expect(criterionPasses(incident, { field: "country", op: "=", value: "   " })).toBe(true);
  });

  it("compares numbers as numbers", () => {
    expect(criterionPasses(incident, { field: "risk_score", op: ">=", value: "60" })).toBe(true);
    expect(criterionPasses(incident, { field: "risk_score", op: ">", value: "60" })).toBe(false);
    expect(criterionPasses(incident, { field: "risk_score", op: "<", value: "61" })).toBe(true);
    expect(criterionPasses(incident, { field: "risk_score", op: "=", value: "60" })).toBe(true);
  });

  it("refuses a number comparison against nonsense instead of guessing", () => {
    expect(criterionPasses(incident, { field: "risk_score", op: ">=", value: "high" })).toBe(false);
  });

  it("compares booleans by meaning, not by string", () => {
    expect(criterionPasses(incident, { field: "regulator_involved", op: "=", value: "true" })).toBe(true);
    expect(criterionPasses(incident, { field: "injury_fatality", op: "=", value: "false" })).toBe(true);
    expect(criterionPasses(incident, { field: "injury_fatality", op: "=", value: "true" })).toBe(false);
  });

  it("matches text case-insensitively", () => {
    expect(criterionPasses(incident, { field: "country", op: "=", value: "colombia" })).toBe(true);
    expect(criterionPasses(incident, { field: "country", op: "contains", value: "COLOM" })).toBe(true);
  });

  it("does not fire a country rule on an incident with no country", () => {
    // The stated intent: a missing value matches nothing rather than
    // everything. Getting this backwards fires every geographic rule on every
    // incident that has not been filled in yet.
    const blank = { ...incident, country: null } as unknown as WorkflowIncident;
    expect(criterionPasses(blank, { field: "country", op: "=", value: "Colombia" })).toBe(false);
    expect(criterionPasses(blank, { field: "country", op: "contains", value: "Col" })).toBe(false);
  });
});

describe("workflowMatches", () => {
  it("never matches a disabled rule", () => {
    expect(workflowMatches(rule({ enabled: false }), incident, 4)).toBe(false);
  });

  it("holds below the level floor and fires at it", () => {
    expect(workflowMatches(rule({ min_crisis_level: 3 }), incident, 2)).toBe(false);
    expect(workflowMatches(rule({ min_crisis_level: 3 }), incident, 3)).toBe(true);
  });

  it("treats an unset classification as 'any', not as 'none'", () => {
    expect(workflowMatches(rule({ incident_type: null }), incident, 0)).toBe(true);
    expect(workflowMatches(rule({ incident_type: "safety" }), incident, 0)).toBe(false);
    expect(workflowMatches(rule({ incident_type: "outage" }), incident, 0)).toBe(true);
  });

  it("requires every criterion, not any of them", () => {
    const both = rule({
      criteria: [
        { field: "risk_score", op: ">=", value: "50" },
        { field: "injury_fatality", op: "=", value: "true" },
      ],
    });
    expect(workflowMatches(both, incident, 0)).toBe(false);
  });
});

describe("matchingWorkflows", () => {
  it("keeps the order the rules were defined in", () => {
    const rules = [rule({ id: "a" }), rule({ id: "b" }), rule({ id: "c", enabled: false })];
    expect(matchingWorkflows(rules, incident, 4).map((w) => w.id)).toEqual(["a", "b"]);
  });
});

describe("ACTION_TYPES", () => {
  it("contains no action that publishes", () => {
    // Load-bearing, not decorative: the absence of a publish action is the
    // product's safety guarantee, and a future edit that adds one should have
    // to delete this test on purpose.
    for (const action of ACTION_TYPES) {
      expect(action).not.toMatch(/publish|post|send_public/i);
    }
  });
});
