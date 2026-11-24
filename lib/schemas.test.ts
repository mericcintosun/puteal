import { describe, expect, it } from "vitest";
import { PROPOSED_DEEP_WELL, proposeDeepWell } from "./data/seed";
import { solveRequestSchema } from "./schemas";

const valid: unknown[] = [
  { threshold: 50, capacityOn: true, extraWells: [] },
  { threshold: 10, capacityOn: false, extraWells: [] },
  { threshold: 10, capacityOn: true },
  { threshold: 50, capacityOn: true, extraWells: [PROPOSED_DEEP_WELL] },
  { threshold: 10, capacityOn: true, extraWells: [proposeDeepWell({ x: 500, y: 500 }, 0), proposeDeepWell({ x: 900, y: 300 }, 1)] },
];

const invalid: Array<[string, unknown]> = [
  ["string threshold", { threshold: "10", capacityOn: true, extraWells: [] }],
  ["threshold 7", { threshold: 7, capacityOn: true, extraWells: [] }],
  ["missing capacityOn", { threshold: 10, extraWells: [] }],
  ["21 extra wells", { threshold: 10, capacityOn: true, extraWells: Array.from({ length: 21 }, (_, i) => proposeDeepWell({ x: i * 10, y: 0 }, i)) }],
  ["NaN position", { threshold: 10, capacityOn: true, extraWells: [{ ...PROPOSED_DEEP_WELL, pos: { x: Number.NaN, y: 0 } }] }],
];

describe("solveRequestSchema", () => {
  valid.forEach((body, i) => {
    it(`accepts valid body ${i + 1}`, () => {
      expect(solveRequestSchema.safeParse(body).success).toBe(true);
    });
  });

  for (const [name, body] of invalid) {
    it(`rejects ${name}`, () => {
      expect(solveRequestSchema.safeParse(body).success).toBe(false);
    });
  }

  it("defaults extraWells to an empty list", () => {
    const r = solveRequestSchema.parse({ threshold: 10, capacityOn: true });
    expect(r.extraWells).toEqual([]);
  });
});
