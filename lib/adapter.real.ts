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
import { assertLayoutFits, bboxAround, buildOsmQuery, elementsFromOsmApi, osmApiMapUrl, parseOsmElements } from "./osm";
import { overpassResponseSchema, type OverpassElement } from "./schemas";
import type { LayoutTier, PutealAdapter, Village } from "./types";

const log = (line: string) => console.info(`${CONFIG.logPrefix} ${line}`);

const PLACE: Record<LayoutTier, string> = {
  live: "Live OpenStreetMap layout, sample well values",
  snapshot: "Saved OpenStreetMap snapshot, sample well values",
  fallback: "Live OpenStreetMap unavailable, showing the sample village",
};
const PLACE_SPARSE = "OpenStreetMap maps few buildings here yet, showing the sample village";

const warn = (line: string) => console.warn(`${CONFIG.logPrefix} ${line}`);

type Shape = "post" | "get";

/**
 * One Overpass request to one instance with its own timeout. Throws a PutealError with a code.
 * "post" is the documented form-encoded POST; "get" is the same query in ?data= with only
 * Accept and User-Agent headers, used when an instance refuses the POST with a 406.
 * `outer` aborts the request when another instance has already answered.
 */
async function overpassOnce(
  url: string,
  query: string,
  timeoutMs: number,
  shape: Shape,
  outer?: AbortSignal,
): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onOuter = () => ctrl.abort();
  outer?.addEventListener("abort", onOuter);
  try {
    const res =
      shape === "post"
        ? await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              Accept: "*/*",
              "User-Agent": CONFIG.userAgent,
            },
            body: new URLSearchParams({ data: query }).toString(),
            signal: ctrl.signal,
          })
        : await fetch(`${url}?${new URLSearchParams({ data: query }).toString()}`, {
            method: "GET",
            headers: { Accept: "*/*", "User-Agent": CONFIG.userAgent },
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
    outer?.removeEventListener("abort", onOuter);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface OverpassOptions {
  /** Per-attempt timeout; defaults to CONFIG.overpassTimeoutMs. */
  timeoutMs?: number;
  /** Total time for every attempt; defaults to CONFIG.overpassBudgetMs. */
  budgetMs?: number;
  /** Aborts every attempt, used when another source has already answered. */
  signal?: AbortSignal;
}

/** HTTP status inside a PutealError detail ("status 406"), or null for timeouts and network failures. */
function statusOf(e: unknown): number | null {
  const m = e instanceof Error ? /status (\d{3})/.exec(e.message) : null;
  return m ? Number(m[1]) : null;
}

/**
 * The Overpass call across CONFIG.overpassUrls, all instances at once: the first one that
 * answers wins and the others are aborted, so one slow or refusing mirror no longer eats
 * the time the next one needed (each instance gets the whole budget, capped by timeoutMs).
 * Per instance: a 406, 403 or 415 to the POST is tried once more as a GET; a 429, a 5xx, a
 * timeout or a network failure is retried once after CONFIG.overpassBackoffMs while the
 * budget allows; a parse failure is final (same query, same answer).
 * The thrown PutealError's message lists what every attempt got, for logs and the proof line.
 */
export async function fetchOverpassElements(
  query: string,
  opts: OverpassOptions = {},
): Promise<{ elements: OverpassElement[]; ms: number; host: string }> {
  const timeoutMs = opts.timeoutMs ?? CONFIG.overpassTimeoutMs;
  const budgetMs = opts.budgetMs ?? CONFIG.overpassBudgetMs;
  const started = Date.now();
  const left = () => budgetMs - (Date.now() - started);
  const winner = new AbortController();
  if (opts.signal?.aborted) winner.abort();
  opts.signal?.addEventListener("abort", () => winner.abort(), { once: true });
  const tried: string[] = [];
  let lastCode: ReturnType<typeof codeOf> = "upstream_error";

  async function tryInstance(url: string): Promise<{ elements: OverpassElement[]; host: string }> {
    const host = new URL(url).host;
    let shape: Shape = "post";
    let retried = false;
    for (let attempt = 1; ; attempt++) {
      if (left() < 1000) throw new PutealError(lastCode, `${host}: budget spent`);
      log(`overpass requested host=${host} attempt=${attempt} shape=${shape}`);
      try {
        const elements = await overpassOnce(url, query, Math.min(timeoutMs, left()), shape, winner.signal);
        return { elements, host };
      } catch (e) {
        if (winner.signal.aborted) throw e;
        const code = codeOf(e);
        const status = statusOf(e);
        const detail = e instanceof Error && e.message !== code ? `${code}, ${e.message}` : code;
        lastCode = code;
        tried.push(`${host} ${shape.toUpperCase()}: ${detail}`);
        warn(`overpass failed host=${host} attempt=${attempt} shape=${shape} ${detail}`);
        if (code === "parse_failure") throw e;
        if (shape === "post" && status !== null && [403, 406, 415].includes(status)) {
          shape = "get";
          continue;
        }
        const retryable = status === null || status === 429 || status >= 500;
        if (!retryable || retried || left() < 3000) throw e;
        retried = true;
        await sleep(Math.min(CONFIG.overpassBackoffMs * (status === 429 ? 3 : 1), left() / 4));
      }
    }
  }

  try {
    const { elements, host } = await Promise.any(CONFIG.overpassUrls.map((u) => tryInstance(u)));
    winner.abort();
    return { elements, ms: Date.now() - started, host };
  } catch {
    throw new PutealError(lastCode, tried.length > 0 ? tried.join("; ") : "budget spent before the first attempt");
  }
}

/** The box, query and parse options every caller shares. */
export function osmPlan() {
  const box = bboxAround(SAMPLE_VILLAGE, CONFIG.halfSizeM);
  const apiUrls = CONFIG.osmApiUrl
    ? [CONFIG.osmApiHalfSizeM, ...CONFIG.osmApiWiderHalfSizesM].map((m) =>
        osmApiMapUrl(CONFIG.osmApiUrl as string, bboxAround(SAMPLE_VILLAGE, m)),
      )
    : [];
  return {
    box,
    query: buildOsmQuery(box),
    /** The first (smallest) OSM API box, or null when the source is off. */
    apiUrl: apiUrls[0] ?? null,
    /** Every OSM API box, smallest first. */
    apiUrls,
    parse: { center: box.center, maxBuildings: CONFIG.maxBuildings },
  };
}

const buildingCount = (els: OverpassElement[]) => els.filter((e) => e.tags?.building).length;

/**
 * The same buildings and walkable ways from the OSM main API (`GET /api/0.6/map.json`).
 * Starts with a small box and widens it (CONFIG.osmApiWiderHalfSizesM) while the answer holds
 * fewer than 5 buildings, since the area around the sample centre is thinly mapped. A 400
 * (too many nodes) on a wider box stops the widening and keeps the last answer.
 */
export async function fetchOsmApiElements(
  opts: OverpassOptions = {},
): Promise<{ elements: OverpassElement[]; ms: number; host: string }> {
  const urls = osmPlan().apiUrls;
  if (urls.length === 0) throw new PutealError("not_configured", "osm api: off");
  const budgetMs = opts.budgetMs ?? CONFIG.overpassBudgetMs;
  const started = Date.now();
  let best: { elements: OverpassElement[]; ms: number; host: string } | null = null;
  const notes: string[] = [];
  for (const url of urls) {
    const left = budgetMs - (Date.now() - started);
    if (left < 1000 || opts.signal?.aborted) break;
    try {
      const r = await fetchOsmApiBox(url, { ...opts, budgetMs: left });
      const n = buildingCount(r.elements);
      log(`osm api box=${new URL(url).searchParams.get("bbox")} buildings=${n}`);
      if (!best || n > buildingCount(best.elements)) best = { ...r, ms: Date.now() - started };
      if (n >= 5) break;
      notes.push(`${r.host} GET: ${n} buildings in bbox ${new URL(url).searchParams.get("bbox")}`);
    } catch (e) {
      notes.push(e instanceof Error ? e.message : String(e));
      // A refused or failed wider box ends the widening; a failed first box ends it too.
      break;
    }
  }
  if (best) return best;
  throw new PutealError("upstream_error", notes.join("; ") || "osm api: budget spent");
}

/**
 * One OSM API box, with one retry after backoff on a 429, a 5xx, a timeout or a network
 * failure. A 400 or 509 means the box holds too many nodes or the caller is over its
 * bandwidth share: final.
 */
async function fetchOsmApiBox(
  url: string,
  opts: OverpassOptions = {},
): Promise<{ elements: OverpassElement[]; ms: number; host: string }> {
  const host = new URL(url).host;
  const timeoutMs = opts.timeoutMs ?? CONFIG.overpassTimeoutMs;
  const budgetMs = opts.budgetMs ?? CONFIG.overpassBudgetMs;
  const started = Date.now();
  const left = () => budgetMs - (Date.now() - started);
  const tried: string[] = [];
  let lastCode: ReturnType<typeof codeOf> = "upstream_error";
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (left() < 1000 || opts.signal?.aborted) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, left()));
    const onOuter = () => ctrl.abort();
    opts.signal?.addEventListener("abort", onOuter);
    log(`osm api requested host=${host} attempt=${attempt}`);
    let status: number | null = null;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": CONFIG.userAgent },
        signal: ctrl.signal,
      });
      status = res.status;
      if (!res.ok) throw new PutealError("upstream_error", `status ${res.status}`);
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        if (ctrl.signal.aborted) throw new PutealError("upstream_timeout");
        throw new PutealError("parse_failure", "body is not JSON");
      }
      const elements = elementsFromOsmApi(json);
      return { elements, ms: Date.now() - started, host };
    } catch (e) {
      const err =
        e instanceof PutealError
          ? e
          : ctrl.signal.aborted
            ? new PutealError("upstream_timeout")
            : new PutealError("upstream_error", "network");
      lastCode = err.code;
      const detail = err.message !== err.code ? `${err.code}, ${err.message}` : err.code;
      tried.push(`${host} GET: ${detail}`);
      warn(`osm api failed host=${host} attempt=${attempt} ${detail}`);
      const retryable = err.code !== "parse_failure" && (status === null || status === 429 || status >= 500) && status !== 509;
      if (!retryable || left() < 3000) break;
      await sleep(Math.min(CONFIG.overpassBackoffMs * (status === 429 ? 3 : 1), left() / 4));
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuter);
    }
  }
  throw new PutealError(lastCode, tried.length > 0 ? tried.join("; ") : `${host}: budget spent`);
}

/**
 * The live OSM layout from whichever source answers first: every Overpass mirror and the OSM
 * main API run at once, and the first answer with enough buildings wins (the others are
 * aborted). The thrown error lists every attempt of every source.
 */
export async function fetchOsmLayout(
  opts: Omit<OverpassOptions, "signal"> = {},
): Promise<{ elements: OverpassElement[]; ms: number; host: string }> {
  const winner = new AbortController();
  const plan = osmPlan();
  const usable = async (p: Promise<{ elements: OverpassElement[]; ms: number; host: string }>) => {
    const r = await p;
    // Fewer than 5 buildings makes the parser refuse, and a layout too sparse around the
    // sample wells fails assertLayoutFits; either way let the other source win instead.
    assertLayoutFits(parseOsmElements(r.elements, SAMPLE_VILLAGE, plan.parse));
    return r;
  };
  const sources = [usable(fetchOverpassElements(plan.query, { ...opts, signal: winner.signal }))];
  if (plan.apiUrl) sources.push(usable(fetchOsmApiElements({ ...opts, signal: winner.signal })));
  try {
    const r = await Promise.any(sources);
    winner.abort();
    return r;
  } catch (e) {
    const errors = e instanceof AggregateError ? e.errors : [e];
    const first = errors.find((x) => x instanceof PutealError) as PutealError | undefined;
    throw new PutealError(first?.code ?? "upstream_error", errors.map((x) => (x instanceof Error ? x.message : String(x))).join("; "));
  }
}

function villageFrom(elements: OverpassElement[], tier: LayoutTier): Village {
  const v = parseOsmElements(elements, SAMPLE_VILLAGE, osmPlan().parse);
  assertLayoutFits(v);
  return { ...v, place: PLACE[tier], layoutTier: tier };
}

/** True when the error says OSM answered but the layout was too thin to use. */
function isSparse(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /layout too sparse|buildings mapped/.test(msg);
}

async function liveVillage(): Promise<Village> {
  const { elements, ms, host } = await fetchOsmLayout();
  const v = villageFrom(elements, "live");
  log(`osm layout ok host=${host} buildings=${v.households.length} ways=${v.paths.length} ms=${ms}`);
  return v;
}

/**
 * The saved snapshot, "sparse" when it parses but is too thin around the sample wells, or
 * null when there is none or it is unreadable. A missing file is a normal miss.
 */
async function snapshotVillage(): Promise<Village | "sparse" | null> {
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
    log(`snapshot not used code=${codeOf(e)} ${e instanceof Error ? e.message : ""}`);
    return isSparse(e) ? "sparse" : null;
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
  let sparse = false;
  try {
    village = await liveVillage();
  } catch (e) {
    // Each failed attempt is logged inside the fetchers; fall through to the snapshot.
    sparse = isSparse(e);
  }
  if (!village) {
    const snap = await snapshotVillage();
    if (snap === "sparse") sparse = true;
    else if (snap) village = snap;
  }
  if (!village) {
    warn(
      sparse
        ? "sample fallback: OpenStreetMap answered, but maps too few buildings near the sample wells"
        : "sample fallback: no OpenStreetMap source answered and no usable snapshot is saved",
    );
    village = {
      ...SAMPLE_VILLAGE,
      place: sparse ? PLACE_SPARSE : PLACE.fallback,
      layoutTier: "fallback",
      fallbackReason: sparse ? "sparse" : "unavailable",
    };
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
