// SERVER ONLY. Never import this file from a page, a component, a route or any
// "use client" file. Only lib/adapter.ts (the selector), tests and scripts/ import it.
//
// The real adapter builds the village from live OpenStreetMap. It answers from the first
// tier that works, in this order:
//   1. this server instance's cache, if younger than CONFIG.cacheTtlMs
//   2. a live Overpass call across CONFIG.overpassUrls (per-try timeout, backoff, total budget)
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

const warn = (line: string) => console.warn(`${CONFIG.logPrefix} ${line}`);

/** One Overpass POST to one instance with its own timeout. Throws a PutealError with a code. */
async function overpassOnce(url: string, query: string, timeoutMs: number): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json, */*;q=0.5",
        "User-Agent": CONFIG.userAgent,
      },
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface OverpassOptions {
  /** Per-attempt timeout; defaults to CONFIG.overpassTimeoutMs. */
  timeoutMs?: number;
  /** Total time for every attempt; defaults to CONFIG.overpassBudgetMs. */
  budgetMs?: number;
}

/**
 * The Overpass call across CONFIG.overpassUrls: each instance once, in order, with a short
 * backoff between attempts. A single configured URL gets one retry instead. It stops at the
 * first answer, when the budget runs out, or on a parse failure (same query, same answer).
 * The thrown PutealError's message lists what every attempt got, for logs and the proof line.
 */
export async function fetchOverpassElements(
  query: string,
  opts: OverpassOptions = {},
): Promise<{ elements: OverpassElement[]; ms: number; host: string }> {
  const timeoutMs = opts.timeoutMs ?? CONFIG.overpassTimeoutMs;
  const budgetMs = opts.budgetMs ?? CONFIG.overpassBudgetMs;
  const urls = CONFIG.overpassUrls.length > 1 ? [...CONFIG.overpassUrls] : [CONFIG.overpassUrls[0], CONFIG.overpassUrls[0]];
  const started = Date.now();
  const tried: string[] = [];
  let lastCode: ReturnType<typeof codeOf> = "upstream_error";
  for (let i = 0; i < urls.length; i++) {
    const left = budgetMs - (Date.now() - started);
    if (left < 1000) break;
    if (i > 0) await sleep(Math.min(CONFIG.overpassBackoffMs * i, left / 4));
    const host = new URL(urls[i]).host;
    log(`overpass requested host=${host} attempt=${i + 1}`);
    try {
      const elements = await overpassOnce(urls[i], query, Math.min(timeoutMs, budgetMs - (Date.now() - started)));
      return { elements, ms: Date.now() - started, host };
    } catch (e) {
      lastCode = codeOf(e);
      const detail = e instanceof Error && e.message !== lastCode ? `${lastCode}, ${e.message}` : lastCode;
      tried.push(`${host}: ${detail}`);
      warn(`overpass failed host=${host} attempt=${i + 1} ${detail}`);
      if (lastCode === "parse_failure") break;
    }
  }
  throw new PutealError(lastCode, tried.length > 0 ? tried.join("; ") : "budget spent before the first attempt");
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
  const ttl = cached?.village.layoutTier === "fallback" ? CONFIG.fallbackCacheTtlMs : CONFIG.cacheTtlMs;
  if (cached && Date.now() - cached.at < ttl) {
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
    warn("sample fallback: no Overpass instance answered and no snapshot is saved");
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
