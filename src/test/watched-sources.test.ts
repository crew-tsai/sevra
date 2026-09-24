import { describe, it, expect } from "vitest";
import {
  MONITOR_REACH,
  NETWORKS,
  SOURCE_ROLES,
  coverageOf,
  roleDefaults,
  sourceCoverage,
} from "@/lib/watched-sources";

// What the product tells a client it can see. Getting this wrong does not
// break anything visibly — it just quietly promises coverage that does not
// exist, which is the failure this module was built to end.

describe("MONITOR_REACH", () => {
  it("describes every network, with a reason", () => {
    for (const network of NETWORKS) {
      const reach = MONITOR_REACH[network];
      expect(reach, network).toBeDefined();
      expect(reach.why.length, network).toBeGreaterThan(20);
    }
  });

  it("only claims X can be searched", () => {
    // If this ever changes it must be a deliberate edit here as well: the
    // client UI, the monitor and the assistant all read this one table.
    expect(NETWORKS.filter((n) => MONITOR_REACH[n].search)).toEqual(["x"]);
  });

  it("never says a network can be searched but not reached at all", () => {
    for (const network of NETWORKS) {
      const reach = MONITOR_REACH[network];
      if (reach.search) expect(reach.ownAccount, network).toBe(true);
    }
  });
});

describe("sourceCoverage", () => {
  it("reports a source with no accounts as watching nothing", () => {
    expect(sourceCoverage([]).watchesNothing).toBe(true);
  });

  it("reports a TikTok-only source as watching nothing, however it is configured", () => {
    // The case the old watchlist showed as configured and working.
    expect(sourceCoverage(["tiktok"], ["tiktok"]).watchesNothing).toBe(true);
    expect(sourceCoverage(["tiktok"]).unreachable).toEqual(["tiktok"]);
  });

  it("separates a network needing a connection from one that has it", () => {
    expect(sourceCoverage(["facebook"], []).needsConnection).toEqual(["facebook"]);
    expect(sourceCoverage(["facebook"], []).watchesNothing).toBe(true);
    expect(sourceCoverage(["facebook"], ["facebook"]).ownAccounts).toEqual(["facebook"]);
    expect(sourceCoverage(["facebook"], ["facebook"]).watchesNothing).toBe(false);
  });

  it("counts a searchable network without needing any connection at all", () => {
    const cover = sourceCoverage(["x"], []);
    expect(cover.searched).toEqual(["x"]);
    expect(cover.watchesNothing).toBe(false);
  });

  it("puts every network in exactly one bucket", () => {
    const cover = sourceCoverage([...NETWORKS], ["facebook"]);
    const total =
      cover.searched.length + cover.ownAccounts.length + cover.needsConnection.length + cover.unreachable.length;
    expect(total).toBe(NETWORKS.length);
  });
});

describe("SOURCE_ROLES", () => {
  it("agrees with coverageOf about what each network is", () => {
    expect(coverageOf("x")).toBe("searched");
    expect(coverageOf("facebook")).toBe("own_accounts");
    expect(coverageOf("tiktok")).toBe("none");
  });

  it("gives every role a phrase the AI can use", () => {
    for (const role of SOURCE_ROLES) {
      expect(role.speaks.length, role.id).toBeGreaterThan(5);
    }
  });

  it("reads a newsroom only for what names the company, and a regulator in full", () => {
    // The distinction that keeps a client from collecting a few hundred
    // irrelevant posts a day.
    expect(roleDefaults("press").watchesEverything).toBe(false);
    expect(roleDefaults("regulator").watchesEverything).toBe(true);
  });

  it("falls back to a real role rather than undefined", () => {
    expect(roleDefaults("not-a-role").id).toBeTruthy();
  });
});
