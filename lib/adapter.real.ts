// SERVER ONLY. Never import this file from a page, a component, a route or any
// "use client" file. Only lib/adapter.ts (the selector), tests and scripts/ import it.
//
// The real adapter builds the village from live OpenStreetMap. It answers from the first
// tier that works, in this order:
//   1. this server instance's cache, if younger than CONFIG.cacheTtlMs
//   2. a live Overpass call (timeout CONFIG.overpassTimeoutMs, CONFIG.overpassRetries retry)
//   3. the snapshot saved by `npm run proof` at CONFIG.snapshotPath (read only)
//   4. the sample village
// The tier that answered is written to village.layoutTier and village.place, so pages can
// say where the layout came from without knowing about tiers. Wells stay sample data.

import { promises as fs } from "fs";
import path from "path";
import { CONFIG } from "./config";
import { SAMPLE_VILLAGE } from "./data/seed";
import { prepareVillage, solve, type Prepared } from "./engine";
import { PutealError, codeOf } from "./errors";
import { bboxAround, buildOsmQuery, parseOsmElements } from "./osm";
import { overpassResponseSchema, type OverpassElement } from "./schemas";
import type { LayoutTier, PutealAdapter, Village } from "./types";

const log = (line: string) => console.info(`${CONFIG.logPrefix} ${line}`);

const PLACE: Record<LayoutTier, string> = {
  live: "Live OpenStreetMap layout, sample well values",
  snapshot: "Saved OpenStreetMap snapshot, sample well values",
  fallback: "Live OpenStreetMap unavailable, showing the sample village",
};

/** One Overpass POST with its own timeout. Throws a PutealError with a code. */
async function overpassOnce(query: string): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.overpassTimeoutMs);
  try {
    const res = await fetch(CONFIG.overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ data: query }).toString(),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new PutealError("upstream_error", `status ${res.status}`);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (ctrl.signal.aborted) throw new PutealError("upstream_timeout");
      throw new PutealError("parse_failure", "body is not JSON");
    }
    const parsed = overpassResponseSchema.safeParse(json);
    if (!parsed.success) throw new PutealError("parse_failure", "unexpected shape");
    return parsed.data.elements;
  } catch (e) {
    if (e instanceof PutealError) throw e;
    if (ctrl.signal.aborted) throw new PutealError("upstream_timeout");
    throw new PutealError("upstream_error", "network");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The Overpass call with exactly CONFIG.overpassRetries extra attempts (one). A parse
 * failure is not retried, since the same query gives the same answer.
 */
export async function fetchOverpassElements(query: string): Promise<{ elements: OverpassElement[]; ms: number }> {
  const started = Date.now();
  const attempts = 1 + Math.max(0, Math.min(CONFIG.overpassRetries, 1));
  let lastError: unknown = new PutealError("upstream_error");
  for (let attempt = 1; attempt <= attempts; attempt++) {
    log(`overpass requested attempt=${attempt}`);
    try {
      const elements = await overpassOnce(query);
      return { elements, ms: Date.now() - started };
    } catch (e) {
      lastError = e;
      log(`overpass failed code=${codeOf(e)} attempt=${attempt}`);
      if (codeOf(e) === "parse_failure") break;
    }
  }
  throw lastError;
}

/** The box, query and parse options every caller shares. */
export function osmPlan() {
  const box = bboxAround(SAMPLE_VILLAGE, CONFIG.halfSizeM);
  return { box, query: buildOsmQuery(box), parse: { center: box.center, maxBuildings: CONFIG.maxBuildings } };
}

function villageFrom(elements: OverpassElement[], tier: LayoutTier): Village {
  const v = parseOsmElements(elements, SAMPLE_VILLAGE, osmPlan().parse);
  return { ...v, place: PLACE[tier], layoutTier: tier };
}

async function liveVillage(): Promise<Village> {
  const { elements, ms } = await fetchOverpassElements(osmPlan().query);
  const v = villageFrom(elements, "live");
  log(`overpass ok buildings=${v.households.length} ways=${v.paths.length} ms=${ms}`);
  return v;
}

/** The saved snapshot, or null when there is none. A missing file is a normal miss. */
async function snapshotVillage(): Promise<Village | null> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(process.cwd(), CONFIG.snapshotPath), "utf8");
  } catch {
    log("snapshot miss");
    return null;
  }
  try {
    const parsed = overpassResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new PutealError("parse_failure");
    const v = villageFrom(parsed.data.elements, "snapshot");
    log(`snapshot hit buildings=${v.households.length} ways=${v.paths.length}`);
    return v;
  } catch (e) {
    log(`snapshot failed code=${codeOf(e)}`);
    return null;
  }
}

let cached: { at: number; village: Village } | null = null;

async function loadVillage(): Promise<Village> {
  if (cached && Date.now() - cached.at < CONFIG.cacheTtlMs) {
    log(`cache hit tier=${cached.village.layoutTier ?? "none"}`);
    return cached.village;
  }
  let village: Village | null = null;
  try {
    village = await liveVillage();
  } catch {
    // logged inside fetchOverpassElements; fall through to the snapshot
  }
  if (!village) village = await snapshotVillage();
  if (!village) {
    log("sample fallback");
    village = { ...SAMPLE_VILLAGE, place: PLACE.fallback, layoutTier: "fallback" };
  }
  cached = { at: Date.now(), village };
  return village;
}

// prepareVillage builds the walking graph; reuse it while the same village object is cached.
const prepared = new WeakMap<Village, Prepared>();

export const realAdapter: PutealAdapter = {
  mode: "real",
  async getVillage() {
    return loadVillage();
  },
  async solve(req) {
    const village = await loadVillage();
    let prep = prepared.get(village);
    if (!prep) {
      prep = prepareVillage(village);
      prepared.set(village, prep);
    }
    return solve(prep, [...village.wells, ...req.extraWells], {
      threshold: req.threshold,
      capacitated: req.capacityOn,
    });
  },
};
