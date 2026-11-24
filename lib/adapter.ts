// The adapter selector. Pages and API routes call getAdapter(); this is the only module
// that branches on ADAPTER_MODE (through getAdapterMode in lib/config.ts). Server only:
// no "use client" file imports it.

import { fakeAdapter } from "./adapter.fake";
import { realAdapter } from "./adapter.real";
import { getAdapterMode } from "./config";
import type { PutealAdapter } from "./types";

export type { PutealAdapter };
export { fakeAdapter };

/**
 * Returns the real adapter unless ADAPTER_MODE is "fake" (the real adapter is the default
 * and carries its own snapshot and sample fallbacks).
 * `live: true` asks for the real adapter in any mode; only the planner's
 * "Load OSM buildings and paths" button uses it, through GET /api/village?live=1.
 */
export function getAdapter(opts: { live?: boolean } = {}): PutealAdapter {
  if (getAdapterMode() === "real" || opts.live) return realAdapter;
  return fakeAdapter;
}
