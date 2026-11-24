// The one place Puteal reads its environment. Every other module takes its settings from
// CONFIG or getAdapterMode(), so a grep for process.env lands here (and next.config.ts).
// Server side only in practice: no "use client" file imports this module.

const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** One URL or a comma-separated list; anything that is not http(s) is dropped. */
function parseUrlList(raw: string | undefined, fallback: string[]): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u));
  return list.length > 0 ? list : fallback;
}

export const CONFIG = {
  /**
   * Overpass instances for the live OSM layout, tried in order until one answers. Public and
   * keyless; mirrors are listed on the OSM wiki. OVERPASS_URL takes one URL or a
   * comma-separated list and replaces the default list.
   */
  overpassUrls: parseUrlList(process.env.OVERPASS_URL, DEFAULT_OVERPASS_URLS),
  /** One Overpass attempt gives up after this many milliseconds. */
  overpassTimeoutMs: 8000,
  /** Every attempt together (each mirror, plus one retry when there is a single URL) stops after this. */
  overpassBudgetMs: 20_000,
  /** Wait before the next attempt after a 429, a 5xx, a timeout or a network failure. */
  overpassBackoffMs: 700,
  /** Overpass asks clients to identify themselves; anonymous runtime user agents are throttled first. */
  userAgent: "Puteal/0.1 (+https://puteal.vercel.app; SDG 6.1 well planner)",
  /** Half the side of the square box (in meters) fetched around the sample village centre. */
  halfSizeM: 650,
  /** Buildings kept, nearest to the centre first, so the browser solve stays quick. */
  maxBuildings: 700,
  /** OSM highway values a person carrying water would walk along. */
  walkableHighways: "footway|path|track|residential|unclassified|service|living_street|pedestrian|tertiary|steps",
  /** How long a server instance reuses an OpenStreetMap village it built, in milliseconds. */
  cacheTtlMs: 600_000,
  /** How long a server instance reuses the sample fallback before asking Overpass again. */
  fallbackCacheTtlMs: 60_000,
  /** Overpass response saved by `npm run proof`, read when the live call fails. */
  snapshotPath: "fixtures/osm-charpara.json",
  /** Prefix for every log line on the core data path. */
  logPrefix: "[core]",
} as const;

/**
 * "real" unless ADAPTER_MODE is exactly "fake". The real adapter already falls back from
 * live Overpass to the saved snapshot to the sample village, so it is the safe default;
 * ADAPTER_MODE=fake forces the sample village everywhere.
 */
export function getAdapterMode(): "fake" | "real" {
  return process.env.ADAPTER_MODE === "fake" ? "fake" : "real";
}
