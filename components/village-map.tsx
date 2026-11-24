"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { Pt, Village, Well } from "@/lib/data";
import { boundsOf, toLngLat, toMeters, type Solution } from "@/lib/engine";

type LayerSpec = Parameters<MlMap["addLayer"]>[0];
type SourceSpec = Parameters<MlMap["addSource"]>[1];
type GeoData = Parameters<GeoJSONSource["setData"]>[0];

interface Feature {
  type: "Feature";
  properties: Record<string, string | number | boolean>;
  geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: [number, number][] };
}
interface FC {
  type: "FeatureCollection";
  features: Feature[];
}

const SOURCES = ["paths", "walks", "route", "houses", "wells"] as const;
const fc = (features: Feature[]): FC => ({ type: "FeatureCollection", features });
const asData = (x: FC) => x as unknown as GeoData;
const asLayer = (x: Record<string, unknown>) => x as unknown as LayerSpec;

interface VillageMapProps {
  village: Village;
  wells: Well[];
  solution: Solution;
  route?: Pt[];
  selected: number | null;
  dropMode: boolean;
  onPick: (p: Pt) => void;
  onHouse: (index: number) => void;
  onFail: () => void;
}

function buildData(v: Village, wells: Well[], s: Solution, route: Pt[] | undefined, selected: number | null): Record<(typeof SOURCES)[number], FC> {
  const ll = (p: Pt) => toLngLat(p, v.origin);
  const byId = new Map(wells.map((w) => [w.id, w]));
  return {
    paths: fc(v.paths.map((p): Feature => ({ type: "Feature", properties: { name: p.name }, geometry: { type: "LineString", coordinates: p.pts.map(ll) } }))),
    walks: fc(
      v.households.flatMap((h, i): Feature[] => {
        const a = s.assign[i];
        const w = a?.wellId ? byId.get(a.wellId) : undefined;
        if (!w) return [];
        return [{ type: "Feature", properties: { far: a.far }, geometry: { type: "LineString", coordinates: [ll(h.pos), ll(w.pos)] } }];
      })
    ),
    route: fc(route && route.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map(ll) } }] : []),
    houses: fc(
      v.households.map((h, i): Feature => ({
        type: "Feature",
        properties: { idx: i, far: !!s.assign[i]?.far, selected: selected === i },
        geometry: { type: "Point", coordinates: ll(h.pos) },
      }))
    ),
    wells: fc(
      wells.map((w): Feature => {
        const load = s.load[w.id] ?? 0;
        return {
          type: "Feature",
          properties: { name: w.name, state: s.state[w.id] ?? "unsafe", crowd: load / w.capacity >= 0.9 },
          geometry: { type: "Point", coordinates: ll(w.pos) },
        };
      })
    ),
  };
}

/**
 * MapLibre GL view of the same engine output, on OpenStreetMap raster tiles.
 * Colors come from the CSS tokens at runtime, so this file carries no hex.
 */
export function VillageMap({ village, wells, solution, route, selected, dropMode, onPick, onHouse, onFail }: VillageMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const live = useRef({ dropMode, onPick, onHouse, onFail, origin: village.origin });
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    live.current = { dropMode, onPick, onHouse, onFail, origin: village.origin };
  });

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !box.current) return;
        const css = getComputedStyle(document.documentElement);
        const c = (name: string) => css.getPropertyValue(name).trim();
        map = new ml.Map({
          container: box.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                maxzoom: 19,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.9, "raster-brightness-max": 0.42, "raster-contrast": -0.15 } }],
          },
          center: toLngLat({ x: 750, y: 600 }, live.current.origin),
          zoom: 14.5,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        const m = map;
        m.on("load", () => {
          for (const id of SOURCES) m.addSource(id, { type: "geojson", data: asData(fc([])) } as unknown as SourceSpec);
          m.addLayer(asLayer({ id: "paths", type: "line", source: "paths", paint: { "line-color": c("--border"), "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } }));
          m.addLayer(asLayer({ id: "walks-near", type: "line", source: "walks", filter: ["!", ["get", "far"]], paint: { "line-color": c("--ok"), "line-width": 1.2, "line-opacity": 0.6 } }));
          m.addLayer(asLayer({ id: "walks-far", type: "line", source: "walks", filter: ["get", "far"], paint: { "line-color": c("--bad"), "line-width": 1.4, "line-dasharray": [2, 2] } }));
          m.addLayer(asLayer({ id: "route", type: "line", source: "route", paint: { "line-color": c("--primary"), "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } }));
          m.addLayer(
            asLayer({
              id: "houses",
              type: "circle",
              source: "houses",
              paint: {
                "circle-radius": ["case", ["get", "selected"], 6, 3.5],
                "circle-color": ["case", ["get", "selected"], c("--primary"), ["get", "far"], c("--bad"), c("--foreground")],
                "circle-opacity": 0.9,
              },
            })
          );
          m.addLayer(
            asLayer({
              id: "wells",
              type: "circle",
              source: "wells",
              paint: {
                "circle-radius": ["match", ["get", "state"], "proposed", 9, 7.5],
                "circle-color": ["match", ["get", "state"], "safe", c("--ok"), "proposed", c("--primary"), c("--bad")],
                "circle-stroke-color": ["case", ["get", "crowd"], c("--warn"), c("--background")],
                "circle-stroke-width": ["case", ["get", "crowd"], 3.5, 1.5],
              },
            })
          );
          setReady(true);
        });
        m.on("click", (e) => {
          if (live.current.dropMode) {
            live.current.onPick(toMeters(e.lngLat.lng, e.lngLat.lat, live.current.origin));
            return;
          }
          const bbox: [[number, number], [number, number]] = [
            [e.point.x - 7, e.point.y - 7],
            [e.point.x + 7, e.point.y + 7],
          ];
          const hit = m.queryRenderedFeatures(bbox, { layers: ["houses"] })[0];
          if (hit) live.current.onHouse(Number(hit.properties?.idx));
        });
      } catch {
        if (!cancelled) live.current.onFail();
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    const data = buildData(village, wells, solution, route, selected);
    for (const id of SOURCES) (m.getSource(id) as GeoJSONSource | undefined)?.setData(asData(data[id]));
    if (fitted.current !== village.id) {
      fitted.current = village.id;
      const b = boundsOf(village);
      const sw = toLngLat({ x: b.minX, y: b.minY }, village.origin);
      const ne = toLngLat({ x: b.maxX, y: b.maxY }, village.origin);
      m.fitBounds([sw, ne], { padding: 32, duration: 0 });
    }
  }, [ready, village, wells, solution, route, selected]);

  useEffect(() => {
    const m = mapRef.current;
    if (m && ready) m.getCanvas().style.cursor = dropMode ? "crosshair" : "";
  }, [dropMode, ready]);

  return (
    <div className="relative h-full min-h-80 w-full">
      <div ref={box} role="region" aria-label={`Map of ${village.name}: households, wells and walking routes`} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-card text-sm text-muted-foreground">
          Loading the OpenStreetMap basemap and the walking graph
        </div>
      )}
    </div>
  );
}
