"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crosshair, Link2, Map as MapIcon, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RouteCard } from "@/components/route-card";
import { SdgCard } from "@/components/sdg-card";
import { EmptyState, ErrorState } from "@/components/states";
import { VillageMap } from "@/components/village-map";
import { PlanLegend, VillagePlan } from "@/components/village-plan";
import { WellsImport } from "@/components/wells-import";
import { SAMPLE_VILLAGE, THRESHOLDS, proposeDeepWell, type AdapterMode, type Pt, type Village, type Well } from "@/lib/data";
import { fmtMeters, fmtPeople, kitReading, prepareVillage, routeFor, solve } from "@/lib/engine";
import type { ErrorCode } from "@/lib/errors";
import { loadOsmVillage } from "@/lib/overpass";
import { DEFAULT_PLANNER_STATE, plannerSearch, type PlannerState } from "@/lib/planner-url";
import { sourceLine } from "@/lib/source-line";
import { cn } from "@/lib/utils";
import { exportAssignmentsCsv } from "@/lib/wells-csv";

type OsmStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; code: ErrorCode; hint: string }
  | { kind: "ok"; buildings: number; ways: number };

type CopyStatus = { kind: "idle" } | { kind: "copied" } | { kind: "manual"; url: string };

/**
 * The free-form planner: same engine as the story, no narrative, every control open.
 * The starting village and the adapter mode come from the server page through the adapter seam;
 * the limit, the pump cap and the reader's deep wells come from the URL, parsed on the server.
 */
export function Planner({
  initialVillage,
  mode: initialMode,
  initial = DEFAULT_PLANNER_STATE,
  linkHint = null,
}: {
  initialVillage: Village;
  mode: AdapterMode;
  initial?: PlannerState;
  /** Set when part of the incoming link was invalid and fell back to a default. */
  linkHint?: string | null;
}) {
  const [village, setVillage] = useState<Village>(initialVillage);
  const [mode, setMode] = useState<AdapterMode>(initialMode);
  const [threshold, setThreshold] = useState<number>(initial.threshold);
  const [capacitated, setCapacitated] = useState(initial.capacitated);
  const [dropMode, setDropMode] = useState(false);
  const [added, setAdded] = useState<Well[]>(initial.added);
  const [selected, setSelected] = useState<number | null>(null);
  const [osm, setOsm] = useState<OsmStatus>({ kind: "idle" });
  const [mapFailed, setMapFailed] = useState(false);
  // The field worker's own wells replace the sample wells until cleared. Not in the URL.
  const [imported, setImported] = useState<{ wells: Well[]; file: string } | null>(null);
  const [copy, setCopy] = useState<CopyStatus>({ kind: "idle" });
  const [showLinkHint, setShowLinkHint] = useState(linkHint !== null);

  const baseWells = imported?.wells ?? village.wells;
  const prep = useMemo(() => prepareVillage(village), [village]);
  const wells = useMemo(() => [...baseWells, ...added], [baseWells, added]);
  const solution = useMemo(() => solve(prep, wells, { threshold, capacitated }), [prep, wells, threshold, capacitated]);
  const baseline = useMemo(() => solve(prep, baseWells, { threshold, capacitated }), [prep, baseWells, threshold, capacitated]);

  // Keep the address bar on the plan without a navigation, so the link can be shared.
  // The default plan keeps a clean /play address.
  const search = plannerSearch({ threshold, capacitated, added });
  const isDefault = search === plannerSearch(DEFAULT_PLANNER_STATE);
  useEffect(() => {
    const target = isDefault ? "" : search;
    if (window.location.search === target) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${target}`);
    setCopy({ kind: "idle" });
  }, [search, isDefault]);

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setCopy({ kind: "copied" });
    } catch {
      setCopy({ kind: "manual", url });
    }
  }

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
    const r = await loadOsmVillage();
    if (!r.ok) {
      setOsm({ kind: "error", code: r.error, hint: r.hint });
      return;
    }
    setVillage(r.village);
    setMode(r.mode);
    setSelected(null);
    // The server fell back to the sample village: say so through the code, not provider text.
    setOsm(r.village.source === "osm" ? { kind: "ok", buildings: r.buildings, ways: r.ways } : { kind: "error", code: "upstream_error", hint: sourceLine(r.mode, r.village) });
  }

  function backToSample() {
    setVillage(SAMPLE_VILLAGE);
    setMode("fake");
    setSelected(null);
    setOsm({ kind: "idle" });
  }

  function resetAll() {
    backToSample();
    setImported(null);
    setAdded([]);
    setDropMode(false);
  }

  function applyImportedWells(next: Well[], file: string) {
    setImported({ wells: next, file });
    setSelected(null);
    setAdded([]);
  }

  function clearImported() {
    setImported(null);
    setSelected(null);
    setAdded([]);
  }

  const k = solution.kpis;
  const kb = baseline.kpis;
  const sel = selected === null ? null : village.households[selected];
  const selA = selected === null ? undefined : solution.assign[selected];
  const hamletName = (id: string) => village.hamlets.find((h) => h.id === id)?.name ?? "Unknown hamlet";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 space-y-2">
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

      <aside className="min-w-0 space-y-3">
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
              <Button className="min-h-11 flex-1" onClick={() => setDropMode((d) => !d)} aria-pressed={dropMode}>
                <Crosshair /> {dropMode ? "Click the map to drill" : "Drop a deep well"}
              </Button>
              <Button variant="outline" size="icon" className="size-11" onClick={() => setAdded([])} disabled={!added.length} aria-label="Remove your deep wells">
                <RotateCcw />
              </Button>
            </div>
            <div className="space-y-1.5 border-t border-border pt-3">
              <Button variant="ghost" size="sm" className="min-h-11 w-full" onClick={copyLink}>
                {copy.kind === "copied" ? <Check /> : <Link2 />}
                {copy.kind === "copied" ? "Link copied" : "Copy link to this plan"}
              </Button>
              {copy.kind === "manual" && (
                <>
                  <p className="text-xs text-muted-foreground">This browser blocked the clipboard. Copy the link from here:</p>
                  <Input readOnly value={copy.url} onFocus={(e) => e.currentTarget.select()} aria-label="Link to this plan" />
                </>
              )}
              {imported && (
                <p className="text-xs text-muted-foreground">
                  The link carries the limit, the cap and your deep wells. Imported wells stay in this browser.
                </p>
              )}
              {showLinkHint && linkHint && (
                <p className="text-xs text-warn">
                  {linkHint}{" "}
                  <button type="button" className="inline-flex min-h-11 items-center underline underline-offset-2" onClick={() => setShowLinkHint(false)}>
                    Dismiss
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              {fmtPeople(k.people)} people in {k.households} households. {k.safeWells - added.length} of {baseWells.length} tested wells pass
              at {threshold} µg/L
              {baseWells.length > 0 ? (
                imported ? (
                  <span className="break-words" title={imported.file}>
                    {" "}
                    (imported test values from {imported.file})
                  </span>
                ) : (
                  " (sample test values)"
                )
              ) : (
                ""
              )}
              .
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
            <p className="break-words border-t border-border pt-2 text-xs text-muted-foreground">
              {sourceLine(mode, village, { importedWells: imported !== null })}
            </p>
          </CardContent>
        </Card>

        <SdgCard
          village={village}
          mode={mode}
          importedWells={imported !== null}
          baseline={baseline}
          solution={solution}
          addedCount={added.length}
          loading={osm.kind === "loading"}
          onDropWell={() => setDropMode(true)}
        />

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
            <CardContent className="p-4 text-sm text-muted-foreground">
              Click a house on the map and its route card opens here: the well to use, its test value, the distance along the path and
              the minutes each way, ready to print.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Village layout</CardTitle>
            <CardDescription>
              {village.source === "sample"
                ? "Sample layout of Charpara. Load real buildings and paths from OpenStreetMap through the Overpass API."
                : `${village.place}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {osm.kind === "error" ? (
              <ErrorState
                title={osm.code === "upstream_timeout" ? "OpenStreetMap took too long" : "OpenStreetMap layout not loaded"}
                hint={`${osm.hint} The sample village stays on the map meanwhile.`}
                retryLabel="Ask Overpass again"
                onRetry={loadOsm}
              />
            ) : village.source === "sample" ? (
              <Button variant="outline" className="min-h-11 w-full" onClick={loadOsm} disabled={osm.kind === "loading"}>
                <MapIcon /> {osm.kind === "loading" ? "Asking Overpass for buildings" : "Load OSM buildings and paths"}
              </Button>
            ) : (
              <Button variant="ghost" className="min-h-11 w-full" onClick={backToSample}>
                Back to the sample village
              </Button>
            )}
            {osm.kind === "ok" && (
              <p className="text-xs text-muted-foreground">
                {osm.buildings} buildings and {osm.ways} walkable ways from OpenStreetMap.
              </p>
            )}
            <WellsImport
              origin={village.origin}
              importedFrom={imported?.file ?? null}
              onWells={applyImportedWells}
              onClear={clearImported}
              exportCsv={() => exportAssignmentsCsv(village, wells, solution)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wells</CardTitle>
            {imported && (
              <CardDescription className="break-words" title={imported.file}>
                Imported test values from {imported.file}, not sample data.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {wells.length === 0 ? (
              <EmptyState
                title="No wells yet"
                hint="Click the map to drill a deep well, or go back to the sample village and its 12 tested wells."
                actionLabel="Drop a deep well"
                actionIcon={<Crosshair />}
                onAction={() => setDropMode(true)}
                secondaryLabel="Reset to the sample village"
                onSecondary={resetAll}
              />
            ) : (
            <ul className="divide-y divide-border text-sm">
              {wells.map((w) => {
                const st = solution.state[w.id];
                const load = solution.load[w.id] ?? 0;
                return (
                  <li key={w.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate" title={w.name}>
                      {w.name}
                    </span>
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
      className={cn("min-h-11 w-full whitespace-normal", on && "border-primary/70 text-foreground")}
    >
      {children}
    </Button>
  );
}
