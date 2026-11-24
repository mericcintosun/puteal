// The one place Puteal reads its environment. Every other module takes its settings from
// CONFIG or getAdapterMode(), so a grep for process.env lands here (and next.config.ts).
// Server side only in practice: no "use client" file imports this module.

export const CONFIG = {
  /** Overpass instance for the live OSM layout. Public and keyless; mirrors are on the OSM wiki. */
  overpassUrl: process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter",
  /** One Overpass attempt gives up after this many milliseconds. */
  overpassTimeoutMs: 8000,
  /** Extra attempts after the first one fails. Exactly one retry, never a loop. */
  overpassRetries: 1,
  /** Half the side of the square box (in meters) fetched around the sample village centre. */
  halfSizeM: 650,
  /** Buildings kept, nearest to the centre first, so the browser solve stays quick. */
  maxBuildings: 700,
  /** OSM highway values a person carrying water would walk along. */
  walkableHighways: "footway|path|track|residential|unclassified|service|living_street|pedestrian|tertiary|steps",
  /** How long a server instance reuses the village it built, in milliseconds. */
  cacheTtlMs: 600_000,
  /** Overpass response saved by `npm run proof`, read when the live call fails. */
  snapshotPath: "fixtures/osm-charpara.json",
  /** Prefix for every log line on the core data path. */
  logPrefix: "[core]",
} as const;

/** "real" only when ADAPTER_MODE is exactly "real"; the sample village otherwise. */
export function getAdapterMode(): "fake" | "real" {
  return process.env.ADAPTER_MODE === "real" ? "real" : "fake";
}
