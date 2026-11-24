import { describe, expect, it } from "vitest";
import { SAMPLE_VILLAGE, THRESHOLDS, WELLS } from "./data/seed";
import { prepareVillage, solve } from "./engine";
import { WELLS_EXAMPLE_CSV } from "./wells-example";
import {
  ASSIGNMENTS_CSV_HEADER,
  exportAssignmentsCsv,
  isImportedWell,
  parseWellsCsv,
  splitCsvLine,
} from "./wells-csv";

const origin = SAMPLE_VILLAGE.origin;

describe("parseWellsCsv", () => {
  it("reads valid rows into the village meter frame", () => {
    const csv = "name,lat,lon,arsenic_ugl\nMondal bari pump,23.787698,90.642739,8\n\n";
    const r = parseWellsCsv(csv, origin);
    expect(r.rejected).toEqual([]);
    expect(r.error).toBeNull();
    expect(r.wells).toHaveLength(1);
    const w = r.wells[0];
    expect(Math.abs(w.pos.x - 330)).toBeLessThanOrEqual(1);
    expect(Math.abs(w.pos.y - 690)).toBeLessThanOrEqual(1);
    expect(w.arsenic).toBe(8);
    expect(w.capacity).toBe(100);
    expect(isImportedWell(w)).toBe(true);
  });

  it("places every example well within 2 m of its sample position", () => {
    const r = parseWellsCsv(WELLS_EXAMPLE_CSV, origin);
    expect(r.wells.length).toBeGreaterThanOrEqual(8);
    for (const w of r.wells) {
      const sample = WELLS.find((s) => s.name === w.name);
      expect(sample).toBeDefined();
      expect(Math.hypot(w.pos.x - sample!.pos.x, w.pos.y - sample!.pos.y)).toBeLessThanOrEqual(2);
    }
    expect(r.rejected).toEqual([{ line: 14, reason: "arsenic_ugl must be between 0 and 2000" }]);
  });

  it("rejects a bad header", () => {
    const r = parseWellsCsv("well,latitude,lon,arsenic\nA,23.78,90.64,5\n", origin);
    expect(r.wells).toEqual([]);
    expect(r.error).toBe("invalid_input");
    expect(r.rejected[0].line).toBe(1);
    expect(r.rejected[0].reason).toContain("missing");
  });

  it("rejects an out-of-range arsenic value and keeps the good rows", () => {
    const csv = "name,lat,lon,arsenic_ugl\nA,23.7816,90.6396,5\nB,23.7817,90.6397,2001\nC,23.7818,90.6398,-1\n";
    const r = parseWellsCsv(csv, origin);
    expect(r.wells.map((w) => w.name)).toEqual(["A"]);
    expect(r.rejected.map((x) => x.line)).toEqual([3, 4]);
    expect(r.rejected[0].reason).toContain("arsenic_ugl");
  });

  it("rejects non-numbers and wells far from the village", () => {
    const csv = "name,lat,lon,arsenic_ugl\nA,abc,90.64,5\nB,24.5,90.64,5\n";
    const r = parseWellsCsv(csv, origin);
    expect(r.wells).toEqual([]);
    expect(r.rejected[0].reason).toBe("lat is not a number");
    expect(r.rejected[1].reason).toContain("km");
  });

  it("refuses more than 40 rows", () => {
    const rows = Array.from({ length: 41 }, (_, i) => `W${i},23.7815,90.6395,5`);
    const r = parseWellsCsv(`name,lat,lon,arsenic_ugl\n${rows.join("\n")}\n`, origin);
    expect(r.wells).toEqual([]);
    expect(r.error).toBe("invalid_input");
    expect(r.rejected[0].line).toBe(42);
    expect(r.rejected[0].reason).toContain("40");
  });

  it("accepts exactly 40 rows", () => {
    const rows = Array.from({ length: 40 }, (_, i) => `W${i},23.7815,90.6395,5`);
    expect(parseWellsCsv(`name,lat,lon,arsenic_ugl\n${rows.join("\n")}`, origin).wells).toHaveLength(40);
  });

  it("splits quoted cells", () => {
    expect(splitCsvLine('"Pump, east",23.1,90.1,"5"')).toEqual(["Pump, east", "23.1", "90.1", "5"]);
  });
});

describe("exportAssignmentsCsv", () => {
  it("writes one row per household under the fixed header, and the header round-trips", () => {
    const wells = parseWellsCsv(WELLS_EXAMPLE_CSV, origin).wells;
    const sol = solve(prepareVillage(SAMPLE_VILLAGE), wells, { threshold: THRESHOLDS.who, capacitated: true });
    const csv = exportAssignmentsCsv(SAMPLE_VILLAGE, wells, sol);
    const lines = csv.trimEnd().split("\n");
    expect(lines).toHaveLength(SAMPLE_VILLAGE.households.length + 1);
    expect(splitCsvLine(lines[0])).toEqual([...ASSIGNMENTS_CSV_HEADER]);
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line);
      expect(cells).toHaveLength(ASSIGNMENTS_CSV_HEADER.length);
      expect(["yes", "no"]).toContain(cells[5]);
    }
  });
});
