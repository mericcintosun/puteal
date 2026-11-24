import { describe, expect, it } from "vitest";
import { PROPOSED_DEEP_WELL, SAMPLE_VILLAGE, THRESHOLDS } from "./data/seed";
import { prepareVillage, solve } from "./engine";

const prep = () => prepareVillage(SAMPLE_VILLAGE);
const run = (threshold: number, proposed: boolean, capacitated = true) =>
  solve(prep(), proposed ? [...SAMPLE_VILLAGE.wells, PROPOSED_DEEP_WELL] : SAMPLE_VILLAGE.wells, { threshold, capacitated });

describe("engine on the fixed-seed sample village", () => {
  it("keeps the sample seed shape", () => {
    expect(SAMPLE_VILLAGE.wells).toHaveLength(12);
    expect(SAMPLE_VILLAGE.households).toHaveLength(100);
  });

  for (const threshold of [THRESHOLDS.bangladesh, THRESHOLDS.who]) {
    for (const proposed of [false, true]) {
      it(`kpis at ${threshold} µg/L, proposed well ${proposed ? "on" : "off"}`, () => {
        expect(run(threshold, proposed).kpis).toMatchSnapshot();
      });
    }
  }

  it("is deterministic: two identical solves deep-equal", () => {
    expect(run(THRESHOLDS.who, true)).toEqual(run(THRESHOLDS.who, true));
  });

  it("never loads a well past its capacity when capacitated", () => {
    for (const threshold of [THRESHOLDS.bangladesh, THRESHOLDS.who]) {
      for (const proposed of [false, true]) {
        const wells = proposed ? [...SAMPLE_VILLAGE.wells, PROPOSED_DEEP_WELL] : SAMPLE_VILLAGE.wells;
        const s = run(threshold, proposed);
        for (const w of wells) {
          const load = s.load[w.id];
          if (load !== undefined) expect(load).toBeLessThanOrEqual(w.capacity + 1e-9);
        }
      }
    }
  });

  it("the proposed deep well never raises the far count", () => {
    for (const threshold of [THRESHOLDS.bangladesh, THRESHOLDS.who]) {
      expect(run(threshold, true).kpis.farPeople).toBeLessThanOrEqual(run(threshold, false).kpis.farPeople);
    }
  });

  it("the WHO line leaves at least as many people far as the Bangladesh line", () => {
    expect(run(THRESHOLDS.who, false).kpis.farPeople).toBeGreaterThanOrEqual(run(THRESHOLDS.bangladesh, false).kpis.farPeople);
  });
});
