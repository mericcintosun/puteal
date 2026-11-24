import { describe, expect, it } from "vitest";
import { proposeDeepWell } from "./data/seed";
import { DEFAULT_PLANNER_STATE, parsePlannerQuery, plannerSearch, toPlannerQuery, type PlannerState } from "./planner-url";

describe("planner URL", () => {
  it("round-trips a full state", () => {
    const state: PlannerState = {
      threshold: 10,
      capacitated: false,
      added: [proposeDeepWell({ x: 1255, y: 185 }, 0), proposeDeepWell({ x: -40, y: 900 }, 1)],
    };
    const back = parsePlannerQuery(toPlannerQuery(state));
    expect(back.error).toBeNull();
    expect(back.state).toEqual(state);
  });

  it("round-trips through the search string", () => {
    const state: PlannerState = { threshold: 50, capacitated: true, added: [proposeDeepWell({ x: 600, y: 350 }, 0)] };
    const search = plannerSearch(state);
    expect(search).toBe("?limit=50&cap=1&add=600,350");
    expect(parsePlannerQuery(new URLSearchParams(search)).state).toEqual(state);
  });

  it("gives the defaults for an empty query", () => {
    const r = parsePlannerQuery({});
    expect(r.error).toBeNull();
    expect(r.state).toEqual(DEFAULT_PLANNER_STATE);
  });

  it("falls back on a bad limit and keeps the other fields", () => {
    const r = parsePlannerQuery({ limit: "7", cap: "0", add: "10,20" });
    expect(r.error).toBe("invalid_input");
    expect(r.state.threshold).toBe(DEFAULT_PLANNER_STATE.threshold);
    expect(r.state.capacitated).toBe(false);
    expect(r.state.added).toHaveLength(1);
  });

  it("ignores more than 20 wells instead of throwing", () => {
    const add = Array.from({ length: 21 }, (_, i) => `${i * 10},${i * 5}`).join(";");
    const r = parsePlannerQuery({ limit: "10", add });
    expect(r.error).toBe("invalid_input");
    expect(r.state.added).toEqual([]);
    expect(r.state.threshold).toBe(10);
  });

  it("accepts exactly 20 wells", () => {
    const add = Array.from({ length: 20 }, (_, i) => `${i * 10},${i * 5}`).join(";");
    const r = parsePlannerQuery({ add });
    expect(r.error).toBeNull();
    expect(r.state.added).toHaveLength(20);
  });

  it("never throws on junk", () => {
    for (const q of [{ add: "abc" }, { add: "1.5,2" }, { cap: ["1", "0"] }, { limit: "" }, { add: ";;" }]) {
      expect(() => parsePlannerQuery(q)).not.toThrow();
    }
  });
});
