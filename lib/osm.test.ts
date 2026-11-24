import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SAMPLE_VILLAGE } from "./data/seed";
import { PutealError } from "./errors";
import { bboxAround, buildOsmQuery, parseOsmElements } from "./osm";
import { overpassResponseSchema } from "./schemas";

const raw = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures", "osm-mini.json"), "utf8"));
const { elements } = overpassResponseSchema.parse(raw);
const box = bboxAround(SAMPLE_VILLAGE, 650);
const opts = { center: box.center, maxBuildings: 700 };

describe("parseOsmElements over fixtures/osm-mini.json", () => {
  const v = parseOsmElements(elements, SAMPLE_VILLAGE, opts);

  it("builds one household per building and one path per walkable way", () => {
    expect(v.source).toBe("osm");
    expect(v.households).toHaveLength(7);
    expect(v.paths).toHaveLength(3);
    expect(v.paths.find((p) => p.id === "osm-w2001")?.name).toBe("Mondal lane");
  });

  it("keeps the base wells, origin and hamlet list", () => {
    expect(v.wells).toBe(SAMPLE_VILLAGE.wells);
    expect(v.origin).toEqual(SAMPLE_VILLAGE.origin);
    expect(v.hamlets.map((h) => h.id)).toEqual(SAMPLE_VILLAGE.hamlets.map((h) => h.id));
  });

  it("assigns each household to the nearest sample hamlet and recounts", () => {
    const hamletOf = (id: string) => v.households.find((h) => h.id === id)?.hamletId;
    expect(hamletOf("osm-b1001")).toBe("mondal");
    expect(hamletOf("osm-b1002")).toBe("mondal");
    expect(hamletOf("osm-b1003")).toBe("char");
    expect(hamletOf("osm-b1004")).toBe("char");
    expect(hamletOf("osm-b1005")).toBe("bazar");
    expect(hamletOf("osm-b1006")).toBe("sheikh");
    expect(hamletOf("osm-b1007")).toBe("khan");
    const counts = Object.fromEntries(v.hamlets.map((h) => [h.id, h.households]));
    expect(counts).toEqual({ mondal: 2, bazar: 1, mia: 0, khan: 1, sheikh: 1, char: 2 });
  });

  it("throws parse_failure below 5 buildings", () => {
    const few = elements.filter((el) => !el.tags?.building || el.id <= 1004);
    expect(() => parseOsmElements(few, SAMPLE_VILLAGE, opts)).toThrow(PutealError);
  });

  it("builds a query for buildings and walkable ways inside the box", () => {
    const q = buildOsmQuery(box);
    expect(q).toContain('way["building"]');
    expect(q).toContain("footway");
    expect(q).toContain("out geom");
  });
});
