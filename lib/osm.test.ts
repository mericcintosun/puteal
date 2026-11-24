import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SAMPLE_VILLAGE } from "./data/seed";
import { PutealError } from "./errors";
import { bboxAround, buildOsmQuery, elementsFromOsmApi, osmApiMapUrl, parseOsmElements } from "./osm";
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

describe("elementsFromOsmApi", () => {
  it("resolves way geometry from nodes and keeps only buildings and walkable ways", () => {
    const json = {
      elements: [
        { type: "node", id: 1, lat: 23.7, lon: 90.6 },
        { type: "node", id: 2, lat: 23.7001, lon: 90.6 },
        { type: "node", id: 3, lat: 23.7001, lon: 90.6001 },
        { type: "way", id: 10, nodes: [1, 2, 3, 1], tags: { building: "yes" } },
        { type: "way", id: 11, nodes: [1, 3], tags: { highway: "footway", name: "Mondal lane" } },
        { type: "way", id: 12, nodes: [1, 2], tags: { highway: "motorway" } },
        { type: "way", id: 13, nodes: [2, 3], tags: { waterway: "canal" } },
      ],
    };
    const out = elementsFromOsmApi(json);
    expect(out.map((e) => e.id)).toEqual([10, 11]);
    expect(out[0].geometry).toHaveLength(4);
    expect(out[1].geometry?.[1]).toEqual({ lat: 23.7001, lon: 90.6001 });
  });

  it("throws parse_failure on a body without elements", () => {
    expect(() => elementsFromOsmApi({ error: "x" })).toThrow(PutealError);
  });

  it("puts the API bbox in west, south, east, north order", () => {
    expect(osmApiMapUrl("https://api.openstreetmap.org", box)).toBe(
      `https://api.openstreetmap.org/api/0.6/map.json?bbox=${[box.west, box.south, box.east, box.north].map((n) => n.toFixed(5)).join(",")}`,
    );
  });
});
