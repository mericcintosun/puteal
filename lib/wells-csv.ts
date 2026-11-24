// A field team's own tested wells in, the household assignments out. Pure and client safe:
// the planner parses in the browser and downloads the export as a Blob, nothing is written
// on the server.
//
// Import format, one well per row, at most 40 rows:
//   name,lat,lon,arsenic_ugl[,capacity]
// lat/lon are WGS84 degrees; they are turned into the village meter frame with toMeters
// from lib/engine.ts and the village origin. Each row is checked with wellsCsvRowSchema;
// a bad row is listed in `rejected` with its line number and does not stop the others.

import { toMeters, walkMinutes } from "./engine";
import type { ErrorCode } from "./errors";
import { wellsCsvRowSchema } from "./schemas";
import type { LatLon, Village, Well } from "./types";
import type { Solution } from "./engine";

export const WELLS_CSV_REQUIRED = ["name", "lat", "lon", "arsenic_ugl"] as const;
export const WELLS_CSV_OPTIONAL = ["capacity"] as const;
export const WELLS_CSV_MAX_ROWS = 40;
/** A well further than this from the village centre is almost surely a typo in lat or lon. */
export const WELLS_CSV_MAX_DISTANCE_M = 5000;
/** Capacity used when the file has no capacity column, the sample's shallow pump figure. */
export const WELLS_CSV_DEFAULT_CAPACITY = 100;
/** testedOn value that marks a well as an imported test value, never a sample one. */
export const IMPORTED_TESTED_ON = "imported";

export interface RejectedRow {
  /** 1-based line number in the file, header included. */
  line: number;
  reason: string;
}

export interface WellsCsvResult {
  wells: Well[];
  rejected: RejectedRow[];
  /** invalid_input when any row or the header was rejected, else null. */
  error: ErrorCode | null;
}

export function isImportedWell(w: Well): boolean {
  return w.testedOn === IMPORTED_TESTED_ON;
}

/** Splits one CSV line, honouring double quotes ("a, b" and "" inside quotes). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function fail(line: number, reason: string): WellsCsvResult {
  return { wells: [], rejected: [{ line, reason }], error: "invalid_input" };
}

export function parseWellsCsv(text: string, origin: LatLon): WellsCsvResult {
  // Strip a byte order mark and split on any line ending; keep the real line numbers.
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  const headerIndex = lines.findIndex((l) => l.trim() !== "");
  if (headerIndex === -1) return fail(1, "the file is empty");

  const header = splitCsvLine(lines[headerIndex]).map((h) => h.trim().toLowerCase());
  const allowed = new Set<string>([...WELLS_CSV_REQUIRED, ...WELLS_CSV_OPTIONAL]);
  const missing = WELLS_CSV_REQUIRED.filter((h) => !header.includes(h));
  const unknown = header.filter((h) => !allowed.has(h));
  if (missing.length || unknown.length || new Set(header).size !== header.length) {
    return fail(
      headerIndex + 1,
      `the header must be name,lat,lon,arsenic_ugl with an optional capacity column` +
        (missing.length ? ` (missing: ${missing.join(", ")})` : "") +
        (unknown.length ? ` (unknown: ${unknown.join(", ")})` : "")
    );
  }

  const rows: { line: number; cells: string[] }[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    rows.push({ line: i + 1, cells: splitCsvLine(lines[i]) });
  }
  if (rows.length === 0) return fail(headerIndex + 2, "the file has a header but no wells");
  if (rows.length > WELLS_CSV_MAX_ROWS) {
    return fail(rows[WELLS_CSV_MAX_ROWS].line, `the file has ${rows.length} wells; the planner takes ${WELLS_CSV_MAX_ROWS} at most, so split it`);
  }

  const wells: Well[] = [];
  const rejected: RejectedRow[] = [];
  for (const { line, cells } of rows) {
    if (cells.length !== header.length) {
      rejected.push({ line, reason: `expected ${header.length} columns, found ${cells.length}` });
      continue;
    }
    const record: Record<string, string> = {};
    header.forEach((h, i) => (record[h] = cells[i]));
    const parsed = wellsCsvRowSchema.safeParse(record);
    if (!parsed.success) {
      rejected.push({ line, reason: parsed.error.issues[0]?.message ?? "the row is not valid" });
      continue;
    }
    const r = parsed.data;
    const p = toMeters(r.lon, r.lat, origin);
    if (Math.hypot(p.x, p.y) > WELLS_CSV_MAX_DISTANCE_M) {
      rejected.push({ line, reason: `the well is more than ${WELLS_CSV_MAX_DISTANCE_M / 1000} km from the village centre; check lat and lon` });
      continue;
    }
    const n = wells.length + 1;
    wells.push({
      id: `import-${n}`,
      name: r.name,
      pos: { x: Math.round(p.x), y: Math.round(p.y) },
      arsenic: r.arsenic_ugl,
      depthM: 0,
      capacity: r.capacity ?? WELLS_CSV_DEFAULT_CAPACITY,
      kind: "shallow",
      testedOn: IMPORTED_TESTED_ON,
    });
  }

  return { wells, rejected, error: rejected.length ? "invalid_input" : null };
}

export const ASSIGNMENTS_CSV_HEADER = [
  "household",
  "hamlet",
  "well",
  "distance_m",
  "minutes_each_way",
  "far_from_safe_water",
] as const;

/** Quotes a cell when it holds a comma, a quote or a line break. */
export function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * One row per household: its assigned well, the walk along the path in meters (the same
 * figure the route card shows), the minutes each way, and whether it is over 500 m.
 */
export function exportAssignmentsCsv(village: Village, wells: Well[], solution: Solution): string {
  const hamlet = new Map(village.hamlets.map((h) => [h.id, h.name]));
  const wellName = new Map(wells.map((w) => [w.id, w.name]));
  const lines = [ASSIGNMENTS_CSV_HEADER.join(",")];
  village.households.forEach((h, i) => {
    const a = solution.assign[i];
    const reachable = !!a && !!a.wellId && Number.isFinite(a.meters);
    lines.push(
      [
        h.label,
        hamlet.get(h.hamletId) ?? "",
        a?.wellId ? (wellName.get(a.wellId) ?? a.wellId) : "no safe well",
        reachable ? Math.round(a.meters) : "",
        reachable ? walkMinutes(a.meters) : "",
        !a || a.far ? "yes" : "no",
      ]
        .map(csvCell)
        .join(",")
    );
  });
  return `${lines.join("\n")}\n`;
}
