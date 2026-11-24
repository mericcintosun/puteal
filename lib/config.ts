// The one place Puteal reads its environment. Every other module takes its settings from
// CONFIG or getAdapterMode(), so a grep for process.env lands here (and next.config.ts).
// Server side only in practice: no "use client" file imports this module.

const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
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
   * Overpass instances for the live OSM layout, all asked at once; the first answer wins.
   * Public and keyless; mirrors are listed on the OSM wiki. OVERPASS_URL takes one URL or a
   * comma-separated list and replaces the default list.
   */
  overpassUrls: parseUrlList(process.env.OVERPASS_URL, DEFAULT_OVERPASS_URLS),
  /** One Overpass attempt gives up after this many milliseconds (mirrors run in parallel). */
  overpassTimeoutMs: 18_000,
  /** Every attempt together (all mirrors in parallel, plus one retry each) stops after this. */
  overpassBudgetMs: 20_000,
  /** Wait before retrying an instance after a 429 (three times this), a 5xx, a timeout or a network failure. */
  overpassBackoffMs: 700,
  /** Overpass asks clients to identify themselves; anonymous runtime user agents are throttled first. */
  userAgent: "Puteal/0.1 (+https://puteal.vercel.app; SDG 6.1 well planner)",
  /**
   * The OpenStreetMap main API (v0.6 `map.json`), a second keyless source on different
   * servers from every Overpass mirror. It is raced alongside Overpass, so a layout still
   * loads when all Overpass instances are overloaded or refuse the caller.
   * OSM_API_URL replaces the base URL; set it to "off" to skip this source.
   */
  osmApiUrl: (() => {
    const raw = (process.env.OSM_API_URL ?? "").trim();
    if (raw === "off") return null;
    return /^https?:\/\//.test(raw) ? raw.replace(/\/+$/, "") : "https://api.openstreetmap.org";
  })(),
  /**
   * Half side of the box asked from the OSM API. Smaller than halfSizeM because `map`
   * answers with every node in the box (limit 50,000) and the parser keeps only the
   * nearest maxBuildings anyway.
   */
  osmApiHalfSizeM: 450,
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
