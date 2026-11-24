"use client";

import { useCallback, useMemo, useState } from "react";
import { Crosshair, Map as MapIcon, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteCard } from "@/components/route-card";
import { VillageMap } from "@/components/village-map";
import { PlanLegend, VillagePlan } from "@/components/village-plan";
import { THRESHOLDS, proposeDeepWell, type Pt, type Village, type Well } from "@/lib/data";
import { fmtMeters, fmtPeople, kitReading, prepareVillage, routeFor, solve } from "@/lib/engine";
import { loadOsmVillage } from "@/lib/overpass";
import { cn } from "@/lib/utils";

type OsmStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; buildings: number; ways: number; cached: boolean };

/**
 * The free-form planner: same engine as the story, no narrative, every control open.
 * The starting village comes from the server page through the adapter seam.
 */
export function Planner({ initialVillage }: { initialVillage: Village }) {
  const [village, setVillage] = useState<Village>(initialVillage);
  const [threshold, setThreshold] = useState<number>(THRESHOLDS.bangladesh);
  const [capacitated, setCapacitated] = useState(true);
  const [dropMode, setDropMode] = useState(false);
  const [added, setAdded] = useState<Well[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [osm, setOsm] = useState<OsmStatus>({ kind: "idle" });
  const [mapFailed, setMapFailed] = useState(false);

  const prep = useMemo(() => prepareVillage(village), [village]);
  const wells = useMemo(() => [...village.wells, ...added], [village, added]);
  const solution = useMemo(() => solve(prep, wells, { threshold, capacitated }), [prep, wells, threshold, capacitated]);
  const baseline = useMemo(() => solve(prep, village.wells, { threshold, capacitated }), [prep, village, threshold, capacitated]);
  const route = useMemo(
    () => (selected === null ? undefined : routeFor(prep, wells, solution.assign[selected], selected)),
    [prep, wells, solution, selected]
  );

  const pick = useCallback(
    (p: Pt) => {
      if (!dropMode) return;
      setAdded((prev) => [...prev, proposeDeepWell(p, prev.length)]);
    },
    [dropMode]
  );

  async function loadOsm() {
    setOsm({ kind: "loading" });
    try {
      const r = await loadOsmVillage(initialVillage);
      setVillage(r.village);
      setSelected(null);
      setOsm({ kind: "ok", buildings: r.buildings, ways: r.ways, cached: r.fromCache });
    } catch (e) {
      setOsm({ kind: "error", message: e instanceof Error ? e.message : "Overpass did not answer." });
    }
  }

  function backToSample() {
    setVillage(initialVillage);
    setSelected(null);
    setOsm({ kind: "idle" });
  }

  function resetAll() {
    backToSample();
    setAdded([]);
    setDropMode(false);
  }

  const k = solution.kpis;
  const kb = baseline.kpis;
  const sel = selected === null ? null : village.households[selected];
  const selA = selected === null ? undefined : solution.assign[selected];
  const hamletName = (id: string) => village.hamlets.find((h) => h.id === id)?.name ?? "Unknown hamlet";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="space-y-2">
        <Card className="h-[62vh] min-h-96 overflow-hidden lg:h-[74vh]">
          {mapFailed ? (
            <div className="flex h-full flex-col">
              <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                This browser could not start the WebGL map, so the planner shows the plain village plan instead. Everything else works.
              </p>
              <VillagePlan
                village={village}
                wells={wells}
                solution={solution}
                route={route}
                selected={selected}
                onPick={dropMode ? pick : undefined}
                onHouse={setSelected}
                label={`Plan of ${village.name}`}
                className="min-h-0 flex-1"
              />
            </div>
          ) : (
            <VillageMap
              village={village}
              wells={wells}
              solution={solution}
              route={route}
              selected={selected}
              dropMode={dropMode}
              onPick={pick}
              onHouse={setSelected}
              onFail={() => setMapFailed(true)}
            />
          )}
        </Card>
        <PlanLegend />
      </div>

      <aside className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>Change a rule and every walk is recomputed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Arsenic limit</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Toggle on={threshold === THRESHOLDS.bangladesh} onClick={() => setThreshold(THRESHOLDS.bangladesh)}>
                  Bangladesh 50 µg/L
                </Toggle>
                <Toggle on={threshold === THRESHOLDS.who} onClick={() => setThreshold(THRESHOLDS.who)}>
                  WHO 10 µg/L
                </Toggle>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Crowding</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Toggle on={capacitated} onClick={() => setCapacitated(true)}>
                  Cap each pump
                </Toggle>
                <Toggle on={!capacitated} onClick={() => setCapacitated(false)}>
                  Nearest only
                </Toggle>
              </div>
            </div>
            <div className="flex gap-1.5 pt-1">
              <Button className="flex-1" onClick={() => setDropMode((d) => !d)} aria-pressed={dropMode}>
                <Crosshair /> {dropMode ? "Click the map to drill" : "Drop a deep well"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setAdded([])} disabled={!added.length} aria-label="Remove your deep wells">
                <RotateCcw />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              {fmtPeople(k.people)} people in {k.households} households. {k.safeWells - added.length} of {village.wells.length} tested wells pass
              at {threshold} µg/L{village.wells.length > 0 ? " (sample test values)" : ""}.
            </p>
            <p>
              <span className={k.farPeople > 0 ? "font-semibold text-bad" : "font-semibold text-ok"}>{fmtPeople(k.farPeople)} people</span> live
              more than 500 m from the safe well they are assigned to. The average walk is {fmtMeters(k.avgWalk)}.
            </p>
            <p className="text-muted-foreground">
              {capacitated
                ? `${k.shifted} households walk past a full pump to their next choice.`
                : `${k.overCapWells} pumps are over capacity; the busiest runs at ${Math.round(k.maxLoadPct)}%.`}
            </p>
            {added.length > 0 && (
              <p>
                Your {added.length === 1 ? "deep well moves" : `${added.length} deep wells move`} the far count from {fmtPeople(kb.farPeople)} to{" "}
                <strong className="text-ok">{fmtPeople(k.farPeople)}</strong>.
              </p>
            )}
          </CardContent>
        </Card>

        {sel && selA ? (
          <RouteCard
            household={sel}
            hamletName={hamletName(sel.hamletId)}
            villageName={village.name}
            assignment={selA}
            well={wells.find((w) => w.id === selA.wellId)}
            nearest={wells.find((w) => w.id === selA.nearestWellId)}
            threshold={threshold}
            onClose={() => setSelected(null)}
          />
        ) : (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">Click a house on the map to get its walking card.</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Village layout</CardTitle>
            <CardDescription>
              {village.source === "sample"
                ? "Sample layout of Charpara. Load real buildings and paths from OpenStreetMap through the Overpass API."
                : "Real OpenStreetMap buildings and paths. Well values are still sample data."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {village.source === "sample" ? (
              <Button variant="outline" className="w-full" onClick={loadOsm} disabled={osm.kind === "loading"}>
                <MapIcon /> {osm.kind === "loading" ? "Asking Overpass for buildings" : "Load OSM buildings and paths"}
              </Button>
            ) : (
              <Button variant="ghost" className="w-full" onClick={backToSample}>
                Back to the sample village
              </Button>
            )}
            {osm.kind === "ok" && (
              <p className="text-xs text-muted-foreground">
                {osm.buildings} buildings and {osm.ways} walkable ways{osm.cached ? ", from this browser's cache" : ", fetched live"}.
              </p>
            )}
            {osm.kind === "error" && <p className="text-xs text-bad">{osm.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wells</CardTitle>
          </CardHeader>
          <CardContent>
            {wells.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No wells yet. Click the map to add one, or reset to the sample village.</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setDropMode(true)}>
                    <Crosshair /> Drop a deep well
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetAll}>
                    <RotateCcw /> Reset to the sample village
                  </Button>
                </div>
              </div>
            ) : (
            <ul className="divide-y divide-border text-sm">
              {wells.map((w) => {
                const st = solution.state[w.id];
                const load = solution.load[w.id] ?? 0;
                return (
                  <li key={w.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">{w.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {st === "unsafe" ? (
                        <Badge variant="bad">kit {kitReading(w.arsenic)}</Badge>
                      ) : st === "proposed" ? (
                        <Badge variant="default">proposed</Badge>
                      ) : (
                        <Badge variant={load > w.capacity ? "warn" : "ok"}>
                          {Math.round(load)}/{w.capacity}
                        </Badge>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={on ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      aria-pressed={on}
      className={cn("w-full", on && "border-primary/70 text-foreground")}
    >
      {children}
    </Button>
  );
}
