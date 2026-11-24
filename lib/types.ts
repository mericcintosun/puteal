// Shared model types for Puteal. Coordinates are meters east (x) and north (y) of the
// village origin. Keep this file free of runtime code so any module can import it.

import type { Solution } from "./engine";
import type { ApiError } from "./errors";

export interface Pt {
  x: number;
  y: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Hamlet {
  id: string;
  code: string;
  name: string;
  center: Pt;
  households: number;
  spread: number;
  note: string;
}

export type WellKind = "shallow" | "deep";

export interface Well {
  id: string;
  name: string;
  pos: Pt;
  /** Arsenic in micrograms per liter, from a field kit or lab test. */
  arsenic: number;
  depthM: number;
  /** People one pump can serve in a day before queues get long. */
  capacity: number;
  kind: WellKind;
  testedOn: string;
  /** True for proposed wells (the what-if tool); they count as safe sources. */
  scenario?: boolean;
}

export interface FootPath {
  id: string;
  name: string;
  pts: Pt[];
}

export interface Household {
  id: string;
  hamletId: string;
  label: string;
  pos: Pt;
  people: number;
}

/**
 * Which tier of the real adapter produced the layout: a live Overpass call, the saved
 * snapshot, or the sample village after both failed. Absent on the plain sample village.
 */
export type LayoutTier = "live" | "snapshot" | "fallback";

export interface Village {
  id: string;
  name: string;
  place: string;
  origin: LatLon;
  source: "sample" | "osm";
  layoutTier?: LayoutTier;
  hamlets: Hamlet[];
  wells: Well[];
  paths: FootPath[];
  households: Household[];
}

/** Which adapter produced a response: the sample village or a real data source. */
export type AdapterMode = "fake" | "real";

/** The one response shape every API route returns. */
export type ApiResponse<T> = { ok: true; data: T; mode: AdapterMode } | (ApiError & { ok: false });

/** Body of POST /api/solve. */
export interface SolveRequest {
  /** Arsenic limit in micrograms per liter (10 for WHO, 50 for Bangladesh). */
  threshold: number;
  /** Cap each pump at its capacity, or send everyone to the nearest safe well. */
  capacityOn: boolean;
  /** Proposed wells added on top of the village's tested wells. */
  extraWells: Well[];
}

/** The data seam. Pages and API routes read the village and solve through one of these. */
export interface PutealAdapter {
  mode: AdapterMode;
  getVillage(): Promise<Village>;
  solve(req: SolveRequest): Promise<Solution>;
}

export type { Solution };
