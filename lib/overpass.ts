// Real OpenStreetMap layout through the public Overpass API (no key needed).
// Pulls buildings (each one becomes a household) and walkable ways (each one a footpath)
// around the sample village's centre, converts them into the same meter frame, and keeps
// the sample wells in place so the engine can run on a real village layout.
// Responses are cached in localStorage so a demo never waits on Overpass twice.

import { PEOPLE_PER_HOUSEHOLD, type FootPath, type Household, type Village } from "./data";
import { boundsOf, toLngLat, toMeters } from "./engine";

const OVERPASS_URL = process.env.NEXT_PUBLIC_OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const MAX_BUILDINGS = 700;
const WALKABLE = "footway|path|track|residential|unclassified|service|living_street|pedestrian|tertiary|steps";

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface OsmVillage {
  village: Village;
  buildings: number;
  ways: number;
  fromCache: boolean;
}

export async function loadOsmVillage(base: Village, halfSizeM = 650, signal?: AbortSignal): Promise<OsmVillage> {
  const b = boundsOf(base);
  const [lon, lat] = toLngLat({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, base.origin);
  const dLat = halfSizeM / 111_320;
  const dLon = halfSizeM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((n) => n.toFixed(5)).join(",");
  const query = `[out:json][timeout:25];(way["building"](${bbox});way["highway"~"^(${WALKABLE})$"](${bbox}););out geom;`;

  const cacheKey = `puteal:osm:${bbox}`;
  let elements: OverpassElement[] | null = null;
  let fromCache = false;
  try {
    const hit = window.localStorage.getItem(cacheKey);
    if (hit) {
      elements = JSON.parse(hit) as OverpassElement[];
      fromCache = true;
    }
  } catch {
    // storage unavailable (private mode): fetch live
  }

  if (!elements) {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }).toString(),
      signal,
    });
    if (!res.ok) throw new Error(`Overpass answered ${res.status}. The public server may be busy; try again in a minute.`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    elements = json.elements ?? [];
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(elements));
    } catch {
      // cache is best effort
    }
  }

  const origin = base.origin;
  const center = toMeters(lon, lat, origin);
  const households: Household[] = [];
  const paths: FootPath[] = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.geometry?.length) continue;
    const pts = el.geometry.map((g) => toMeters(g.lon, g.lat, origin));
    if (el.tags?.building) {
      const ring = pts.length > 1 ? pts.slice(0, -1) : pts;
      const c = ring.reduce((s, p) => ({ x: s.x + p.x / ring.length, y: s.y + p.y / ring.length }), { x: 0, y: 0 });
      households.push({ id: `osm-b${el.id}`, hamletId: "osm", label: `B-${el.id}`, pos: c, people: PEOPLE_PER_HOUSEHOLD });
    } else if (el.tags?.highway && pts.length > 1) {
      paths.push({ id: `osm-w${el.id}`, name: el.tags.name ?? el.tags.highway, pts });
    }
  }

  if (households.length < 5) {
    throw new Error(`OpenStreetMap has only ${households.length} buildings mapped here, too few to plan with. The sample layout stays on.`);
  }

  const kept = households
    .sort((a, b) => Math.hypot(a.pos.x - center.x, a.pos.y - center.y) - Math.hypot(b.pos.x - center.x, b.pos.y - center.y))
    .slice(0, MAX_BUILDINGS);

  return {
    village: {
      ...base,
      id: `osm-${bbox}`,
      name: `${base.name} (OSM layout)`,
      place: "OpenStreetMap buildings and paths, sample well values",
      source: "osm",
      hamlets: [{ id: "osm", code: "B", name: "OSM building", center, households: kept.length, spread: halfSizeM, note: "Mapped by OpenStreetMap contributors" }],
      households: kept,
      paths,
    },
    buildings: kept.length,
    ways: paths.length,
    fromCache,
  };
}
