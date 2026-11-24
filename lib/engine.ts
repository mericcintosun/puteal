// The Puteal engine: a walking graph over footpaths, Dijkstra from every safe well,
// and a capacity-aware assignment of households to wells. Pure TypeScript, no DOM,
// so it runs in the browser, on the server (the /notes page quotes its numbers) and,
// next, inside a Web Worker for large OSM villages.

import {
  DETOUR,
  FAR_METERS,
  KIT_BANDS,
  WALK_M_PER_MIN,
  type FootPath,
  type LatLon,
  type Pt,
  type Village,
  type Well,
} from "./data";

export function meters(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/* ---------- geo ---------- */

const M_PER_DEG = 111_320;

export function toLngLat(p: Pt, origin: LatLon): [number, number] {
  const lon = origin.lon + p.x / (M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180));
  const lat = origin.lat + p.y / M_PER_DEG;
  return [lon, lat];
}

export function toMeters(lon: number, lat: number, origin: LatLon): Pt {
  return {
    x: (lon - origin.lon) * M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180),
    y: (lat - origin.lat) * M_PER_DEG,
  };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(v: Village): Bounds {
  const pts: Pt[] = [...v.households.map((h) => h.pos), ...v.wells.map((w) => w.pos), ...v.paths.flatMap((p) => p.pts)];
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of pts) {
    b.minX = Math.min(b.minX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxX = Math.max(b.maxX, p.x);
    b.maxY = Math.max(b.maxY, p.y);
  }
  if (!Number.isFinite(b.minX)) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  return b;
}

/* ---------- walking graph ---------- */

export interface Edge {
  to: number;
  m: number;
}

export interface Graph {
  nodes: Pt[];
  adj: Edge[][];
}

/** Densifies every footpath into ~step-meter segments; shared vertices become junctions. */
export function buildGraph(paths: FootPath[], step = 25): Graph {
  const nodes: Pt[] = [];
  const adj: Edge[][] = [];
  const index = new Map<string, number>();
  const nodeFor = (p: Pt) => {
    const k = `${Math.round(p.x * 10)}:${Math.round(p.y * 10)}`;
    let i = index.get(k);
    if (i === undefined) {
      i = nodes.length;
      nodes.push(p);
      adj.push([]);
      index.set(k, i);
    }
    return i;
  };
  const link = (a: number, b: number) => {
    if (a === b) return;
    const m = meters(nodes[a], nodes[b]);
    adj[a].push({ to: b, m });
    adj[b].push({ to: a, m });
  };
  for (const path of paths) {
    for (let s = 0; s < path.pts.length - 1; s++) {
      const a = path.pts[s];
      const b = path.pts[s + 1];
      const n = Math.max(1, Math.ceil(meters(a, b) / step));
      let prev = nodeFor(a);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const cur = nodeFor({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        link(prev, cur);
        prev = cur;
      }
    }
  }
  return { nodes, adj };
}

interface Snap {
  node: number;
  gap: number;
}

function snapTo(g: Graph, p: Pt): Snap {
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < g.nodes.length; i++) {
    const d = meters(g.nodes[i], p);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best < 0 ? { node: -1, gap: 0 } : { node: best, gap: bd };
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.ids.length;
  }
  push(id: number, key: number) {
    this.ids.push(id);
    this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number] | undefined {
    if (!this.ids.length) return undefined;
    const top: [number, number] = [this.ids[0], this.keys[0]];
    const lastId = this.ids.pop() as number;
    const lastKey = this.keys.pop() as number;
    if (this.ids.length) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.ids.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}

interface Tree {
  d: Float64Array;
  prev: Int32Array;
}

function dijkstra(g: Graph, src: number): Tree {
  const n = g.nodes.length;
  const d = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  d[src] = 0;
  const heap = new MinHeap();
  heap.push(src, 0);
  while (heap.size) {
    const [u, du] = heap.pop() as [number, number];
    if (du > d[u]) continue;
    for (const e of g.adj[u]) {
      const nd = du + e.m;
      if (nd < d[e.to]) {
        d[e.to] = nd;
        prev[e.to] = u;
        heap.push(e.to, nd);
      }
    }
  }
  return { d, prev };
}

export interface Prepared {
  village: Village;
  graph: Graph;
  houseSnap: Snap[];
  trees: Map<number, Tree>;
}

export function prepareVillage(village: Village): Prepared {
  const graph = buildGraph(village.paths);
  return { village, graph, houseSnap: village.households.map((h) => snapTo(graph, h.pos)), trees: new Map() };
}

function treeFor(prep: Prepared, node: number): Tree {
  let t = prep.trees.get(node);
  if (!t) {
    t = dijkstra(prep.graph, node);
    prep.trees.set(node, t);
  }
  return t;
}

/* ---------- assignment ---------- */

export type WellState = "safe" | "unsafe" | "proposed";

export function wellState(w: Well, threshold: number): WellState {
  if (w.scenario) return "proposed";
  return w.arsenic <= threshold ? "safe" : "unsafe";
}

export interface Assignment {
  wellId: string | null;
  nearestWellId: string | null;
  meters: number;
  /** 0 = nearest safe well, 1 = second choice, ... */
  choice: number;
  /** False when no mapped footpath connects; distance is straight line times DETOUR. */
  network: boolean;
  /** True when every reachable pump was full and the household was left on its nearest. */
  over: boolean;
  far: boolean;
}

export interface Kpis {
  households: number;
  people: number;
  wells: number;
  safeWells: number;
  unsafeWells: number;
  farPeople: number;
  farHouseholds: number;
  avgWalk: number;
  shifted: number;
  overCapWells: number;
  nearCapWells: number;
  maxLoadPct: number;
  busiestWellId: string | null;
  topFarHamletId: string | null;
  topFarPeople: number;
}

export interface Solution {
  threshold: number;
  capacitated: boolean;
  assign: Assignment[];
  load: Record<string, number>;
  state: Record<string, WellState>;
  kpis: Kpis;
}

export interface SolveOptions {
  threshold: number;
  /** false = everyone walks to the nearest safe well, no matter how crowded */
  capacitated: boolean;
}

interface Option {
  w: number;
  m: number;
  network: boolean;
}

/**
 * Multi-source shortest paths plus a regret-ordered greedy assignment:
 * households that lose the most by being bumped pick first, and each one takes the
 * nearest safe well that still has room for its people.
 */
export function solve(prep: Prepared, wells: Well[], opts: SolveOptions): Solution {
  const { village, graph } = prep;
  const state: Record<string, WellState> = {};
  for (const w of wells) state[w.id] = wellState(w, opts.threshold);
  const safe = wells.filter((w) => state[w.id] !== "unsafe");
  const wsnap = safe.map((w) => snapTo(graph, w.pos));

  const options: Option[][] = village.households.map((h, hi) => {
    const hs = prep.houseSnap[hi];
    return safe
      .map((w, wi): Option => {
        const straight = meters(h.pos, w.pos) * DETOUR;
        const ws = wsnap[wi];
        if (hs.node < 0 || ws.node < 0) return { w: wi, m: straight, network: false };
        const net = treeFor(prep, ws.node).d[hs.node];
        if (!Number.isFinite(net)) return { w: wi, m: straight, network: false };
        const m = net + (hs.gap + ws.gap) * DETOUR;
        // A neighbour's pump across the yard beats a long loop round the lane.
        return m <= straight ? { w: wi, m, network: true } : { w: wi, m: straight, network: false };
      })
      .sort((a, b) => a.m - b.m);
  });

  const load = safe.map(() => 0);
  const assign: Assignment[] = new Array(village.households.length);
  const order = village.households.map((_, i) => i);
  if (opts.capacitated) {
    const regret = (i: number) => (options[i].length > 1 ? options[i][1].m - options[i][0].m : 1e9);
    order.sort((a, b) => regret(b) - regret(a));
  }

  for (const i of order) {
    const h = village.households[i];
    const o = options[i];
    if (!o.length) {
      assign[i] = { wellId: null, nearestWellId: null, meters: Infinity, choice: -1, network: false, over: false, far: true };
      continue;
    }
    let pick = 0;
    let over = false;
    if (opts.capacitated) {
      const k = o.findIndex((c) => load[c.w] + h.people <= safe[c.w].capacity);
      if (k === -1) over = true;
      else pick = k;
    }
    const c = o[pick];
    load[c.w] += h.people;
    assign[i] = {
      wellId: safe[c.w].id,
      nearestWellId: safe[o[0].w].id,
      meters: c.m,
      choice: pick,
      network: c.network,
      over,
      far: c.m > FAR_METERS,
    };
  }

  const loadById: Record<string, number> = {};
  safe.forEach((w, i) => (loadById[w.id] = load[i]));

  const people = village.households.reduce((s, h) => s + h.people, 0);
  let farPeople = 0;
  let farHouseholds = 0;
  let walkSum = 0;
  let walkPeople = 0;
  let shifted = 0;
  const farByHamlet = new Map<string, number>();
  village.households.forEach((h, i) => {
    const a = assign[i];
    if (a.far) {
      farPeople += h.people;
      farHouseholds++;
      farByHamlet.set(h.hamletId, (farByHamlet.get(h.hamletId) ?? 0) + h.people);
    }
    if (Number.isFinite(a.meters)) {
      walkSum += a.meters * h.people;
      walkPeople += h.people;
    }
    if (a.choice > 0) shifted++;
  });

  let maxPct = 0;
  let busiest: string | null = null;
  let overCap = 0;
  let nearCap = 0;
  safe.forEach((w, i) => {
    const pct = (load[i] / w.capacity) * 100;
    if (pct > maxPct) {
      maxPct = pct;
      busiest = w.id;
    }
    if (load[i] > w.capacity) overCap++;
    else if (pct >= 90) nearCap++;
  });

  let topFarHamletId: string | null = null;
  let topFarPeople = 0;
  for (const [id, p] of farByHamlet) {
    if (p > topFarPeople) {
      topFarPeople = p;
      topFarHamletId = id;
    }
  }

  return {
    threshold: opts.threshold,
    capacitated: opts.capacitated,
    assign,
    load: loadById,
    state,
    kpis: {
      households: village.households.length,
      people,
      wells: wells.length,
      safeWells: safe.length,
      unsafeWells: wells.length - safe.length,
      farPeople,
      farHouseholds,
      avgWalk: walkPeople ? walkSum / walkPeople : 0,
      shifted,
      overCapWells: overCap,
      nearCapWells: nearCap,
      maxLoadPct: maxPct,
      busiestWellId: busiest,
      topFarHamletId,
      topFarPeople,
    },
  };
}

/** The walking route of one household to its assigned well, as points in meters. */
export function routeFor(prep: Prepared, wells: Well[], a: Assignment | undefined, hi: number): Pt[] {
  if (!a || !a.wellId) return [];
  const h = prep.village.households[hi];
  const w = wells.find((x) => x.id === a.wellId);
  if (!h || !w) return [];
  if (!a.network) return [h.pos, w.pos];
  const hs = prep.houseSnap[hi];
  const ws = snapTo(prep.graph, w.pos);
  const tree = treeFor(prep, ws.node);
  const pts: Pt[] = [h.pos];
  let u = hs.node;
  let guard = 0;
  while (u !== -1 && guard++ < 100_000) {
    pts.push(prep.graph.nodes[u]);
    u = tree.prev[u];
  }
  pts.push(w.pos);
  return pts;
}

/* ---------- formatting helpers ---------- */

export function fmtPeople(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtMeters(n: number): string {
  if (!Number.isFinite(n)) return "no route";
  return `${Math.round(n / 10) * 10} m`;
}

export function walkMinutes(m: number): number {
  return Math.max(1, Math.round(m / WALK_M_PER_MIN));
}

/** What a field kit would read for this value: the first band at or above it. */
export function kitReading(arsenic: number): string {
  const band = KIT_BANDS.find((b) => arsenic <= b);
  return band === undefined ? `over ${KIT_BANDS[KIT_BANDS.length - 1]} µg/L` : `${band} µg/L`;
}
