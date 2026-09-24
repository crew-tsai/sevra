import { describe, it, expect } from "vitest";
import { CRISIS_RULES, crisisLevel } from "@/lib/crisis-level";

// The number every screen sorts by, every workflow rule compares against, and
// every client's sense of how bad today is. It was verified once, by hand,
// against 704 input combinations in a script that no longer exists. These are
// that check, kept.

describe("crisisLevel", () => {
  it("takes the level from the risk word", () => {
    expect(crisisLevel({ risk: "critical" })).toBe(4);
    expect(crisisLevel({ risk: "high" })).toBe(3);
    expect(crisisLevel({ risk: "medium" })).toBe(2);
    expect(crisisLevel({ risk: "low" })).toBe(1);
  });

  it("is case-insensitive about the risk word and unbothered by nonsense", () => {
    expect(crisisLevel({ risk: "CRITICAL" })).toBe(4);
    expect(crisisLevel({ risk: "banana" })).toBe(0);
    expect(crisisLevel({})).toBe(0);
  });

  it("takes the higher of the risk word and the score", () => {
    // Score says 4, word says 1. The worse reading wins, always.
    expect(crisisLevel({ risk: "low", riskScore: 95 })).toBe(4);
    // Word says 4, score says 0. Still 4.
    expect(crisisLevel({ risk: "critical", riskScore: 0 })).toBe(4);
  });

  it("puts each score band where the rules say", () => {
    for (const band of CRISIS_RULES.byScore) {
      expect(crisisLevel({ riskScore: band.min })).toBe(band.level);
    }
    expect(crisisLevel({ riskScore: 0 })).toBe(0);
  });

  describe("floors only ever raise", () => {
    it("an injury forces at least L4", () => {
      expect(crisisLevel({ risk: "low", injuryFatality: true })).toBe(4);
    });

    it("a regulator forces at least L3", () => {
      expect(crisisLevel({ risk: "low", regulatorInvolved: true })).toBe(3);
    });

    it("a floor never lowers a level that was already higher", () => {
      // Regulator floors at 3; this is already 4 and must stay there.
      expect(crisisLevel({ risk: "critical", regulatorInvolved: true })).toBe(4);
    });
  });

  describe("amplification", () => {
    it("adds one level to something already above the threshold", () => {
      expect(crisisLevel({ risk: "medium", amplified: true })).toBe(3);
    });

    it("cannot turn a routine post into a crisis", () => {
      // The whole reason amplification has a floor: a nobody-level post from
      // a verified account is still a nobody-level post.
      expect(crisisLevel({ risk: "banana", amplified: true })).toBe(0);
      expect(crisisLevel({ riskScore: 0, amplified: true })).toBe(0);
    });

    it("cannot push past the cap", () => {
      expect(crisisLevel({ risk: "critical", amplified: true })).toBe(CRISIS_RULES.amplification.cap);
    });
  });

  it("never leaves 0..4, over every combination of inputs", () => {
    const words = ["critical", "high", "medium", "low", "nonsense", ""];
    const scores = [-50, 0, 19, 20, 39, 40, 59, 60, 79, 80, 100, 1000];
    let checked = 0;
    for (const risk of words) {
      for (const riskScore of scores) {
        for (const injuryFatality of [true, false]) {
          for (const regulatorInvolved of [true, false]) {
            for (const amplified of [true, false]) {
              const level = crisisLevel({ risk, riskScore, injuryFatality, regulatorInvolved, amplified });
              expect(Number.isInteger(level)).toBe(true);
              expect(level).toBeGreaterThanOrEqual(0);
              expect(level).toBeLessThanOrEqual(4);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBe(words.length * scores.length * 8);
  });

  it("is monotonic in severity: nothing that makes an incident worse lowers the level", () => {
    // The property that actually matters. A client who adds "the regulator is
    // involved" must never see the number go down.
    const base = { risk: "medium", riskScore: 45 };
    const level = crisisLevel(base);
    expect(crisisLevel({ ...base, injuryFatality: true })).toBeGreaterThanOrEqual(level);
    expect(crisisLevel({ ...base, regulatorInvolved: true })).toBeGreaterThanOrEqual(level);
    expect(crisisLevel({ ...base, amplified: true })).toBeGreaterThanOrEqual(level);
    expect(crisisLevel({ ...base, riskScore: 90 })).toBeGreaterThanOrEqual(level);
  });
});
