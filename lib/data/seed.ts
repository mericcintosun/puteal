// Seed data for Puteal.
//
// Charpara is a SAMPLE village: its footpaths, hamlets and tubewells are laid out on the
// scale of a village in Araihazar upazila (Narayanganj, Bangladesh), but the arsenic test
// values are sample numbers, not survey results. The planner at /play can swap the layout
// for real OpenStreetMap buildings and paths (lib/overpass.ts); the wells stay sample data
// until a field team imports its own results.
//
// Coordinates are meters east (x) and north (y) of the village origin.
//
// This file is also imported by scripts/seed.mjs under `node --experimental-strip-types`,
// so it uses only `import type` with a relative path and erasable TypeScript syntax
// (no enums, no parameter properties, no path aliases). Everything here is deterministic.

import type { FootPath, Hamlet, Household, Pt, Village, Well } from "../types";

/** Household size assumption, close to Bangladesh's national average. */
export const PEOPLE_PER_HOUSEHOLD = 4.2;
/** Arsenic limits in micrograms per liter. */
export const THRESHOLDS = { who: 10, bangladesh: 50 } as const;
/** Steps a typical colorimetric field kit reads. */
export const KIT_BANDS = [0, 10, 50, 100, 200] as const;
/** Beyond this walk a household counts as "far from safe water". */
export const FAR_METERS = 500;
/** Off-path walking is longer than the straight line; used for connectors and fallbacks. */
export const DETOUR = 1.3;
/** Walking pace with a water pot, meters per minute. */
export const WALK_M_PER_MIN = 75;

export const HAMLETS: Hamlet[] = [
  { id: "mondal", code: "MP", name: "Mondal para", center: { x: 300, y: 700 }, households: 18, spread: 90, note: "West of the bazar, along the main road" },
  { id: "bazar", code: "BP", name: "Bazar para", center: { x: 660, y: 660 }, households: 22, spread: 80, note: "Around the mosque and the weekly market" },
  { id: "mia", code: "MI", name: "Mia para", center: { x: 630, y: 1040 }, households: 16, spread: 80, note: "North end, past the madrasa" },
  { id: "khan", code: "KP", name: "Khan para", center: { x: 1260, y: 860 }, households: 14, spread: 70, note: "Northeast cluster off the east lane" },
  { id: "sheikh", code: "SP", name: "Sheikh para", center: { x: 250, y: 330 }, households: 14, spread: 70, note: "Southwest, beside the paddy fields" },
  { id: "char", code: "CP", name: "Char para", center: { x: 1300, y: 190 }, households: 16, spread: 70, note: "Low land by the river, cut off in the monsoon" },
];

export const PATHS: FootPath[] = [
  { id: "main-road", name: "Main road", pts: [{ x: 0, y: 600 }, { x: 300, y: 620 }, { x: 600, y: 600 }, { x: 900, y: 580 }, { x: 1200, y: 600 }, { x: 1500, y: 620 }] },
  { id: "madrasa-lane", name: "Madrasa lane", pts: [{ x: 600, y: 600 }, { x: 620, y: 850 }, { x: 600, y: 1100 }] },
  { id: "south-track", name: "South track", pts: [{ x: 600, y: 600 }, { x: 580, y: 350 }, { x: 600, y: 100 }] },
  { id: "east-lane", name: "East lane", pts: [{ x: 1200, y: 600 }, { x: 1250, y: 900 }, { x: 1330, y: 820 }] },
  { id: "paddy-bund", name: "Paddy bund", pts: [{ x: 300, y: 620 }, { x: 250, y: 300 }] },
  { id: "river-path", name: "River path", pts: [{ x: 900, y: 580 }, { x: 1100, y: 300 }, { x: 1300, y: 150 }, { x: 1340, y: 250 }, { x: 1260, y: 260 }] },
  { id: "mondal-lane", name: "Mondal bari lane", pts: [{ x: 300, y: 620 }, { x: 320, y: 760 }, { x: 260, y: 820 }] },
  { id: "bazar-loop", name: "Bazar loop", pts: [{ x: 600, y: 600 }, { x: 700, y: 700 }, { x: 760, y: 640 }] },
  { id: "mia-spur", name: "Mia bari spur", pts: [{ x: 600, y: 1100 }, { x: 680, y: 1020 }] },
];

export const WELLS: Well[] = [
  { id: "mondal-pump", name: "Mondal bari pump", pos: { x: 330, y: 690 }, arsenic: 8, depthM: 30, capacity: 100, kind: "shallow", testedOn: "2026-02-11" },
  { id: "mosque-pump", name: "Bazar mosque pump", pos: { x: 640, y: 625 }, arsenic: 35, depthM: 45, capacity: 80, kind: "shallow", testedOn: "2026-02-11" },
  { id: "school-deep", name: "Primary school deep well", pos: { x: 720, y: 575 }, arsenic: 4, depthM: 210, capacity: 200, kind: "deep", testedOn: "2026-02-12" },
  { id: "mia-pump", name: "Mia bari pump", pos: { x: 610, y: 1070 }, arsenic: 42, depthM: 38, capacity: 90, kind: "shallow", testedOn: "2026-02-12" },
  { id: "khan-pump", name: "Khan bari pump", pos: { x: 1240, y: 880 }, arsenic: 18, depthM: 35, capacity: 100, kind: "shallow", testedOn: "2026-02-14" },
  { id: "sheikh-pump", name: "Sheikh bari pump", pos: { x: 265, y: 345 }, arsenic: 6, depthM: 50, capacity: 90, kind: "shallow", testedOn: "2026-02-14" },
  { id: "char-pump", name: "Char para pump", pos: { x: 1290, y: 200 }, arsenic: 120, depthM: 22, capacity: 100, kind: "shallow", testedOn: "2026-02-15" },
  { id: "pond-pump", name: "Pond-side pump", pos: { x: 900, y: 610 }, arsenic: 95, depthM: 28, capacity: 100, kind: "shallow", testedOn: "2026-02-15" },
  { id: "haque-pump", name: "Haque bari pump", pos: { x: 1450, y: 615 }, arsenic: 22, depthM: 40, capacity: 100, kind: "shallow", testedOn: "2026-02-16" },
  { id: "union-pump", name: "Union office pump", pos: { x: 450, y: 620 }, arsenic: 150, depthM: 25, capacity: 100, kind: "shallow", testedOn: "2026-02-16" },
  { id: "brickfield-pump", name: "Brickfield road pump", pos: { x: 1100, y: 320 }, arsenic: 64, depthM: 30, capacity: 100, kind: "shallow", testedOn: "2026-02-18" },
  { id: "madrasa-deep", name: "Madrasa deep well", pos: { x: 625, y: 900 }, arsenic: 3, depthM: 180, capacity: 200, kind: "deep", testedOn: "2026-02-18" },
];

/** The site the story suggests for the next deep well, on the river path by Char para. */
export const PROPOSED_DEEP_WELL: Well = {
  id: "proposed-char-deep",
  name: "Proposed deep well, Char para",
  pos: { x: 1255, y: 185 },
  arsenic: 2,
  depthM: 220,
  capacity: 200,
  kind: "deep",
  testedOn: "proposed",
  scenario: true,
};

/** A reader-placed deep well for the what-if tool. */
export function proposeDeepWell(pos: Pt, n: number): Well {
  return {
    id: `mine-${n + 1}`,
    name: `Your deep well ${n + 1}`,
    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
    arsenic: 2,
    depthM: 200,
    capacity: 200,
    kind: "deep",
    testedOn: "proposed",
    scenario: true,
  };
}

// Deterministic PRNG so server, client and the seed script place the same houses.
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterHouseholds(hamlets: Hamlet[]): Household[] {
  const rand = mulberry32(6061);
  const out: Household[] = [];
  for (const h of hamlets) {
    for (let i = 0; i < h.households; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * h.spread;
      const label = `${h.code}-${String(i + 1).padStart(2, "0")}`;
      out.push({
        id: label,
        hamletId: h.id,
        label,
        pos: { x: Math.round(h.center.x + Math.cos(a) * r), y: Math.round(h.center.y + Math.sin(a) * r) },
        people: PEOPLE_PER_HOUSEHOLD,
      });
    }
  }
  return out;
}

/** The sample village: 6 hamlets, 9 footpaths, 12 wells, 100 households. Sample data, not survey data. */
export const SAMPLE_VILLAGE: Village = {
  id: "charpara-sample",
  name: "Charpara",
  place: "sample layout, Araihazar upazila, Narayanganj",
  origin: { lat: 23.7815, lon: 90.6395 },
  source: "sample",
  hamlets: HAMLETS,
  wells: WELLS,
  paths: PATHS,
  households: scatterHouseholds(HAMLETS),
};
