// Zod schemas for everything that crosses a trust boundary: API request bodies and the
// Overpass response. Routes parse with these before any other logic.

import { z } from "zod";

/** Coordinates in meters from the village origin; bounded so a typo cannot blow up the solver. */
const coord = z.number().finite().min(-100_000).max(100_000);

export const ptSchema = z.object({ x: coord, y: coord });

export const wellSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  pos: ptSchema,
  arsenic: z.number().finite().min(0).max(2000),
  depthM: z.number().finite().min(0).max(1000),
  capacity: z.number().finite().positive().max(100_000),
  kind: z.enum(["shallow", "deep"]),
  testedOn: z.string().max(40),
  scenario: z.boolean().optional(),
});

export const solveRequestSchema = z.object({
  threshold: z
    .number()
    .finite()
    .min(1)
    .max(1000)
    .refine((t) => t === 10 || t === 50, { message: "threshold must be 10 (WHO) or 50 (Bangladesh)" }),
  capacityOn: z.boolean(),
  extraWells: z.array(wellSchema).max(20).default([]),
});

/** Query string of GET /api/village: `live=1` asks for the live OSM layout. */
export const villageQuerySchema = z.object({
  live: z.enum(["0", "1"]).optional(),
});

/** One "x,y" pair in whole meters from the village origin, inside the coord bounds above. */
const ADD_PAIR = String.raw`-?\d{1,5},-?\d{1,5}`;
/** Up to 20 pairs separated by ";". */
const ADD_RE = new RegExp(`^${ADD_PAIR}(?:;${ADD_PAIR}){0,19}$`);

/**
 * Query string of /play: `limit` is the arsenic limit (10 or 50), `cap` turns the pump cap
 * on or off, `add` lists the reader's deep wells. lib/planner-url.ts parses each field on
 * its own so one bad field falls back to its default without dropping the rest.
 */
export const plannerQuerySchema = z.object({
  limit: z.enum(["10", "50"]),
  cap: z.enum(["0", "1"]),
  add: z.string().max(260).regex(ADD_RE, "at most 20 x,y pairs in whole meters, separated by ;").optional(),
});

export type PlannerQuery = z.infer<typeof plannerQuerySchema>;

/** Reads a cell as a number: blank is missing, anything non-numeric fails as NaN. */
const csvNumber = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim())) : v);

/** One data row of a wells CSV (lib/wells-csv.ts), before the lat/lon to meters step. */
export const wellsCsvRowSchema = z.object({
  name: z.string().trim().min(1, "name is empty").max(120, "name is longer than 120 characters"),
  lat: z.preprocess(
    csvNumber,
    z.number({ required_error: "lat is missing", invalid_type_error: "lat is not a number" }).finite().min(-90, "lat must be between -90 and 90").max(90, "lat must be between -90 and 90")
  ),
  lon: z.preprocess(
    csvNumber,
    z.number({ required_error: "lon is missing", invalid_type_error: "lon is not a number" }).finite().min(-180, "lon must be between -180 and 180").max(180, "lon must be between -180 and 180")
  ),
  arsenic_ugl: z.preprocess(
    csvNumber,
    z
      .number({ required_error: "arsenic_ugl is missing", invalid_type_error: "arsenic_ugl is not a number" })
      .finite()
      .min(0, "arsenic_ugl must be between 0 and 2000")
      .max(2000, "arsenic_ugl must be between 0 and 2000")
  ),
  capacity: z.preprocess(
    csvNumber,
    z
      .number({ invalid_type_error: "capacity is not a number" })
      .finite()
      .positive("capacity must be above 0")
      .max(100_000, "capacity must be at most 100000")
      .optional()
  ),
});

export type WellsCsvRow = z.infer<typeof wellsCsvRowSchema>;

export const overpassElementSchema = z.object({
  type: z.string(),
  id: z.number(),
  tags: z.record(z.string()).optional(),
  geometry: z.array(z.object({ lat: z.number().finite(), lon: z.number().finite() })).optional(),
});

export const overpassResponseSchema = z.object({
  elements: z.array(overpassElementSchema),
});

export type OverpassElement = z.infer<typeof overpassElementSchema>;
export type SolveRequestInput = z.infer<typeof solveRequestSchema>;
