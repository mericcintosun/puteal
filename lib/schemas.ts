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
