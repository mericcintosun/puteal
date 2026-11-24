// Pure OpenStreetMap helpers: the bounding box, the Overpass query, and the parser that
// turns Overpass elements into a Village in the engine's meter frame. No fs, no window,
// no fetch, so the real adapter, the proof script and the tests all share it.

import { CONFIG } from "./config";
import { PEOPLE_PER_HOUSEHOLD } from "./data/seed";
import { boundsOf, toLngLat, toMeters } from "./engine";
import { PutealError } from "./errors";
import type { OverpassElement } from "./schemas";
import type { FootPath, Hamlet, Household, LatLon, Pt, Village } from "./types";

export interface OsmBox {
  south: number;
  west: number;
  north: number;
  east: number;
  center: LatLon;
}

/** A square box of side 2 * halfSizeM meters around the centre of the base village. */
export function bboxAround(base: Village, halfSizeM: number): OsmBox {
  const b = boundsOf(base);
  const [lon, lat] = toLngLat({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, base.origin);
  const dLat = halfSizeM / 111_320;
  const dLon = halfSizeM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, west: lon - dLon, north: lat + dLat, east: lon + dLon, center: { lat, lon } };
}

/** Overpass bbox order: south, west, north, east, five decimals (about 1 m). */
export function bboxString(box: OsmBox): string {
  return [box.south, box.west, box.north, box.east].map((n) => n.toFixed(5)).join(",");
}

/** Buildings and walkable ways inside the box, with their geometry inline. */
export function buildOsmQuery(box: OsmBox, walkable: string = CONFIG.walkableHighways): string {
  const bbox = bboxString(box);
  return `[out:json][timeout:25];(way["building"](${bbox});way["highway"~"^(${walkable})$"](${bbox}););out geom;`;
}

export interface ParseOptions {
  /** Centre of the fetched box; buildings nearest to it are kept first. */
  center: LatLon;
  maxBuildings: number;
}

/** Index of the hamlet whose centre is closest to p. */
function nearestHamlet(hamlets: Hamlet[], p: Pt): number {
  let best = 0;
  let bd = Infinity;
  hamlets.forEach((h, i) => {
    const d = Math.hypot(h.center.x - p.x, h.center.y - p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/**
 * Builds a Village from Overpass elements: every building becomes one household at its
 * centroid, every walkable way a footpath. Wells, the proposed deep well and the origin
 * stay those of the base village; each household joins the nearest base hamlet so the
 * hamlet names in the story still hold. Throws parse_failure below 5 buildings.
 */
export function parseOsmElements(elements: OverpassElement[], base: Village, opts: ParseOptions): Village {
  const origin = base.origin;
  const center = toMeters(opts.center.lon, opts.center.lat, origin);
  const households: Household[] = [];
  const paths: FootPath[] = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.geometry?.length) continue;
    const pts = el.geometry.map((g) => toMeters(g.lon, g.lat, origin));
    if (el.tags?.building) {
      const ring = pts.length > 1 ? pts.slice(0, -1) : pts;
      const c = ring.reduce((s, p) => ({ x: s.x + p.x / ring.length, y: s.y + p.y / ring.length }), { x: 0, y: 0 });
      households.push({ id: `osm-b${el.id}`, hamletId: "", label: `B-${el.id}`, pos: c, people: PEOPLE_PER_HOUSEHOLD });
    } else if (el.tags?.highway && pts.length > 1) {
      paths.push({ id: `osm-w${el.id}`, name: el.tags.name ?? el.tags.highway, pts });
    }
  }

  if (households.length < 5) {
    throw new PutealError("parse_failure", `only ${households.length} buildings mapped`);
  }

  const kept = households
    .sort((a, b) => Math.hypot(a.pos.x - center.x, a.pos.y - center.y) - Math.hypot(b.pos.x - center.x, b.pos.y - center.y))
    .slice(0, opts.maxBuildings);

  const counts = base.hamlets.map(() => 0);
  const assigned = kept.map((h) => {
    const i = nearestHamlet(base.hamlets, h.pos);
    counts[i]++;
    return { ...h, hamletId: base.hamlets[i].id };
  });
  const hamlets = base.hamlets.map((h, i) => ({ ...h, households: counts[i] }));

  return {
    ...base,
    id: `osm-${opts.center.lat.toFixed(5)},${opts.center.lon.toFixed(5)}`,
    name: `${base.name} (OSM layout)`,
    place: "OpenStreetMap buildings and paths, sample well values",
    source: "osm",
    hamlets,
    households: assigned,
    paths,
  };
}

/** Keeps only what the parser reads, so a saved snapshot stays small. */
export function slimElements(elements: OverpassElement[]): OverpassElement[] {
  return elements
    .filter((el) => el.type === "way" && el.geometry?.length && (el.tags?.building || el.tags?.highway))
    .map((el) => {
      const tags: Record<string, string> = {};
      for (const k of ["building", "highway", "name"]) {
        const v = el.tags?.[k];
        if (v !== undefined) tags[k] = v;
      }
      return {
        type: el.type,
        id: el.id,
        tags,
        geometry: (el.geometry ?? []).map((g) => ({ lat: Number(g.lat.toFixed(6)), lon: Number(g.lon.toFixed(6)) })),
      };
    });
}
