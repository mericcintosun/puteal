"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { Crosshair, Printer } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMeters, fmtPeople, type Solution } from "@/lib/engine";
import { sourceLine } from "@/lib/source-line";
import type { AdapterMode, Village } from "@/lib/types";

/** Before and after numbers for the SDG 6.1 statement. Pure; null when a figure is not a number. */
export interface SdgSummary {
  people: number;
  farBefore: number;
  farAfter: number;
  /** People brought back within 500 m; negative if the change pushed people out. */
  reached: number;
  walkBefore: number;
  walkAfter: number;
}

export function sdgSummary(baseline: Solution, after: Solution): SdgSummary | null {
  const s: SdgSummary = {
    people: after.kpis.people,
    farBefore: baseline.kpis.farPeople,
    farAfter: after.kpis.farPeople,
    reached: baseline.kpis.farPeople - after.kpis.farPeople,
    walkBefore: baseline.kpis.avgWalk,
    walkAfter: after.kpis.avgWalk,
  };
  const ok = [s.people, s.farBefore, s.farAfter, s.reached].every(Number.isFinite);
  return ok ? s : null;
}

// The M4 wipe curve, reused so the count moves like the rest of the product.
const WIPE_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Counts from the last shown value to the new one; under reduced motion it shows the final value at once. */
function CountTo({ value, from }: { value: number; from: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const current = useRef(from);

  useEffect(() => {
    if (reduce || current.current === value) {
      current.current = value;
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration: 0.6,
      ease: WIPE_EASE,
      onUpdate: (v) => {
        current.current = v;
        setShown(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <>
      <span aria-hidden="true">{fmtPeople(shown)}</span>
      <span className="sr-only">{fmtPeople(value)}</span>
    </>
  );
}

function printSummary() {
  const root = document.documentElement;
  root.dataset.print = "sdg";
  const clear = () => {
    delete root.dataset.print;
  };
  window.addEventListener("afterprint", clear, { once: true });
  window.print();
}

/**
 * DEMO step 8: the planner's numbers as an SDG 6.1 statement. Before is the same village,
 * limit and pump rule without the reader's deep wells; after is the plan on screen.
 */
export function SdgCard({
  village,
  mode,
  importedWells,
  baseline,
  solution,
  addedCount,
  loading = false,
  onDropWell,
}: {
  village: Village;
  mode: AdapterMode;
  importedWells: boolean;
  baseline: Solution;
  solution: Solution;
  addedCount: number;
  /** True while a new village layout is on its way; the numbers would be stale. */
  loading?: boolean;
  onDropWell: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const summary = sdgSummary(baseline, solution);
  const source = sourceLine(mode, village, { importedWells });
  const limit = `${solution.threshold} µg/L`;
  const rule = solution.capacitated ? "every pump capped" : "nearest pump only, no cap";

  return (
    <Card className="puteal-print" data-print-id="sdg" role="region" aria-labelledby="sdg-card-title">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">UN SDG target 6.1</p>
        <CardTitle id="sdg-card-title" className="font-display">
          Safe and affordable drinking water for all
        </CardTitle>
        <CardDescription>
          By 2030, universal and equitable access to safe and affordable drinking water. Counted here as the people who live more
          than 500 m from the safe well they are sent to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <p className="text-xs text-muted-foreground">Recounting for the new village layout</p>
          </div>
        ) : summary === null ? (
          <ErrorState
            key={attempt}
            title="The SDG summary could not be counted"
            hint="The plan on the map is unchanged. Count again, or change a rule and the summary follows."
            retryLabel="Count again"
            onRetry={() => setAttempt((a) => a + 1)}
          />
        ) : addedCount === 0 ? (
          <>
            <p>
              At the {limit} limit with {rule}, <strong className={summary.farAfter > 0 ? "text-bad" : "text-ok"}>{fmtPeople(summary.farAfter)} of {fmtPeople(summary.people)} people</strong>{" "}
              in {village.name} live farther than 500 m from safe water.
            </p>
            <EmptyState
              title="No deep well dropped yet"
              hint="Tap an open footpath corner on the map to drill a deep well. The card then shows how many people it brings back within 500 m."
              actionLabel="Drop a deep well"
              actionIcon={<Crosshair />}
              onAction={onDropWell}
            />
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              {village.name}, {limit} limit, {rule}, {addedCount === 1 ? "one deep well" : `${addedCount} deep wells`} dropped.
            </p>
            <dl className="divide-y divide-border rounded-md border border-border border-t-edge">
              <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <dt className="min-w-0 text-muted-foreground">Farther than 500 m, before</dt>
                <dd className="shrink-0 font-display text-lg font-semibold tabular-nums">{fmtPeople(summary.farBefore)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <dt className="min-w-0 text-muted-foreground">Farther than 500 m, after</dt>
                <dd className={`shrink-0 font-display text-lg font-semibold tabular-nums ${summary.farAfter < summary.farBefore ? "text-ok" : ""}`}>
                  <CountTo value={summary.farAfter} from={summary.farBefore} />
                </dd>
              </div>
            </dl>
            <p className="text-base">
              {summary.reached > 0
                ? `${addedCount === 1 ? "This deep well brings" : "These deep wells bring"} ${fmtPeople(summary.reached)} people back within 500 m of safe water.`
                : summary.reached === 0
                  ? `${addedCount === 1 ? "This deep well does" : "These deep wells do"} not change the far count yet. Try a corner nearer the red dashes.`
                  : `This plan leaves ${fmtPeople(-summary.reached)} more people farther than 500 m, because full pumps send households on.`}
            </p>
            <p>
              The mean walk to a safe well goes from {fmtMeters(summary.walkBefore)} to {fmtMeters(summary.walkAfter)}.
            </p>
          </>
        )}
        <p className="break-words border-t border-border pt-2 text-xs text-muted-foreground">{source}</p>
      </CardContent>
      <CardFooter className="puteal-noprint">
        <Button variant="outline" size="sm" className="min-h-11" onClick={printSummary} disabled={loading || summary === null}>
          <Printer /> Print summary
        </Button>
      </CardFooter>
    </Card>
  );
}
