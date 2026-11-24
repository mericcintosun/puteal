// The sample adapter. Serves the sample village Charpara; every number it produces is
// sample data. This is the default and the fallback; never delete or gate it.

import { SAMPLE_VILLAGE } from "./data/seed";
import { prepareVillage, solve } from "./engine";
import type { PutealAdapter } from "./types";

/** Serves the sample village Charpara. Every number it produces is sample data. */
export const fakeAdapter: PutealAdapter = {
  mode: "fake",
  async getVillage() {
    return SAMPLE_VILLAGE;
  },
  async solve(req) {
    const prep = prepareVillage(SAMPLE_VILLAGE);
    return solve(prep, [...SAMPLE_VILLAGE.wells, ...req.extraWells], {
      threshold: req.threshold,
      capacitated: req.capacityOn,
    });
  },
};
