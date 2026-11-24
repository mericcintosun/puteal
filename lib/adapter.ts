// The data seam. Pages and API routes read the village and solve requests through
// getAdapter(); Phase 2 fills realAdapter (live OSM with a static fallback, imported well
// results) without touching any page.

import { SAMPLE_VILLAGE } from "./data/seed";
import { prepareVillage, solve, type Solution } from "./engine";
import type { AdapterMode, SolveRequest, Village } from "./types";

export interface PutealAdapter {
  mode: AdapterMode;
  getVillage(): Promise<Village>;
  solve(req: SolveRequest): Promise<Solution>;
}

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

/** Placeholder for real data sources. Not wired yet. */
export const realAdapter: PutealAdapter = {
  mode: "real",
  async getVillage() {
    throw new Error("real adapter lands in Phase 2");
  },
  async solve() {
    throw new Error("real adapter lands in Phase 2");
  },
};

/** Returns the real adapter only when ADAPTER_MODE is "real"; the sample adapter otherwise. */
export function getAdapter(): PutealAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
