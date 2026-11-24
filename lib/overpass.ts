// Client loader for the planner's "Load OSM buildings and paths" button.
// It no longer calls Overpass from the browser: it asks our own GET /api/village?live=1,
// where the server builds the village from live OpenStreetMap (lib/osm.ts, CONFIG), with
// the saved snapshot and the sample village as fallbacks. So no Overpass URL, no env read
// and no localStorage cache live on the client any more.

import type { ErrorCode } from "./errors";
import { hintFor } from "./errors";
import type { AdapterMode, ApiResponse, Village } from "./types";

export type OsmLoad =
  | { ok: true; village: Village; mode: AdapterMode; buildings: number; ways: number }
  | { ok: false; error: ErrorCode; hint: string };

export async function loadOsmVillage(signal?: AbortSignal): Promise<OsmLoad> {
  let body: ApiResponse<Village>;
  try {
    const res = await fetch("/api/village?live=1", { signal });
    body = (await res.json()) as ApiResponse<Village>;
  } catch {
    return { ok: false, error: "upstream_error", hint: hintFor("upstream_error") };
  }
  if (!body.ok) return { ok: false, error: body.error, hint: body.hint };
  const v = body.data;
  return { ok: true, village: v, mode: body.mode, buildings: v.households.length, ways: v.paths.length };
}
