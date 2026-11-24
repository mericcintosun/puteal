"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { motion, useScroll } from "motion/react";
import { Button } from "@/components/ui/button";
import { PlanLegend, VillagePlan } from "@/components/village-plan";
import { PROPOSED_DEEP_WELL, THRESHOLDS, proposeDeepWell, type Pt, type Village, type Well } from "@/lib/data";
import { fmtMeters, fmtPeople, prepareVillage, routeFor, solve } from "@/lib/engine";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "village", label: "The village" },
  { id: "nearest", label: "Nearest is not enough" },
  { id: "share", label: "Share the load" },
  { id: "who-line", label: "The WHO line" },
  { id: "next-well", label: "The next well" },
] as const;

/**
 * The story-scroll: one live village plan stays pinned while five chapters scroll past.
 * Each chapter sets the engine state (threshold, capacity rule, proposed wells); the last
 * hands the plan to the reader. Kit K3 signature 1: Lenis root plus a chapter rail whose
 * fill is bound to page scroll. The village arrives as a prop from the server page, which
 * reads it through the adapter seam (lib/adapter.ts).
 */
export function StoryScroll({ village }: { village: Village }) {
  const baseWells = village.wells;
  const hamletName = (id: string | null) => village.hamlets.find((h) => h.id === id)?.name ?? "the far end";
  const wellName = (id: string | null) => baseWells.find((w) => w.id === id)?.name ?? "a full pump";
  const prep = useMemo(() => prepareVillage(village), [village]);
  const [active, setActive] = useState(0);
  const [mine, setMine] = useState<Well[]>([]);
  const pinned = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const { scrollYProgress } = useScroll();

  const s = useMemo(
    () => ({
      bd: solve(prep, baseWells, { threshold: THRESHOLDS.bangladesh, capacitated: true }),
      nearest: solve(prep, baseWells, { threshold: THRESHOLDS.bangladesh, capacitated: false }),
      who: solve(prep, baseWells, { threshold: THRESHOLDS.who, capacitated: true }),
      proposed: solve(prep, [...baseWells, PROPOSED_DEEP_WELL], { threshold: THRESHOLDS.who, capacitated: true }),
    }),
    [prep, baseWells]
  );
  const nextWells = useMemo(() => [...baseWells, PROPOSED_DEEP_WELL, ...mine], [baseWells, mine]);
  const next = useMemo(() => solve(prep, nextWells, { threshold: THRESHOLDS.who, capacitated: true }), [prep, nextWells]);

  // One shifted household makes the capacity rule concrete in chapter three.
  const shiftedIndex = useMemo(() => s.bd.assign.findIndex((a) => a.choice > 0), [s.bd]);
  const shiftedRoute = useMemo(
    () => (shiftedIndex >= 0 ? routeFor(prep, baseWells, s.bd.assign[shiftedIndex], shiftedIndex) : undefined),
    [prep, baseWells, s.bd, shiftedIndex]
  );

  const states = [
    { wells: baseWells, solution: s.bd, lines: false, route: undefined as Pt[] | undefined },
    { wells: baseWells, solution: s.nearest, lines: true, route: undefined },
    { wells: baseWells, solution: s.bd, lines: true, route: shiftedRoute },
    { wells: baseWells, solution: s.who, lines: true, route: undefined },
    { wells: nextWells, solution: next, lines: true, route: undefined },
  ];
  const view = states[active];
  const last = active === CHAPTERS.length - 1;

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(`chapter-${c.id}`)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index ?? 0));
        }
      },
      { rootMargin: "-70% 0px -28% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function jump(i: number) {
    const el = document.getElementById(`chapter-${CHAPTERS[i].id}`);
    if (!el) return;
    const offset = -((pinned.current?.offsetHeight ?? 0) + 56 + 8);
    if (lenis) {
      lenis.scrollTo(el, { offset });
    } else {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? "auto" : "smooth" });
    }
  }

  const unsafe50 = baseWells.filter((w) => w.arsenic > THRESHOLDS.bangladesh).length;
  const unsafe10 = baseWells.filter((w) => w.arsenic > THRESHOLDS.who).length;
  const kn = s.nearest.kpis;
  const kb = s.bd.kpis;
  const kw = s.who.kpis;
  const kp = s.proposed.kpis;
  const kx = next.kpis;
  const busiest = baseWells.find((w) => w.id === kn.busiestWellId);
  const shifted = shiftedIndex >= 0 ? village.households[shiftedIndex] : undefined;
  const shiftedA = shiftedIndex >= 0 ? s.bd.assign[shiftedIndex] : undefined;

  return (
    <section aria-label="How Puteal plans one village" className="relative mt-14">
      <div ref={pinned} className="sticky top-14 z-20 -mx-5 border-b border-border bg-background px-5 pb-3 pt-3">
        <nav aria-label="Chapters" className="mb-2">
          <div className="relative h-0.5 w-full bg-border" aria-hidden="true">
            <motion.div className="absolute inset-0 origin-left bg-primary" style={{ scaleX: scrollYProgress }} />
          </div>
          <ol className="mt-2 flex flex-wrap gap-1">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => jump(i)}
                  aria-current={active === i ? "step" : undefined}
                  className={cn("h-7 px-2", active === i && "bg-secondary text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]")}
                >
                  {c.label}
                </Button>
              </li>
            ))}
          </ol>
        </nav>
        <figure className="overflow-hidden rounded-md border border-border border-t-edge">
          <VillagePlan
            village={village}
            wells={view.wells}
            solution={view.solution}
            showLines={view.lines}
            route={view.route}
            onPick={last ? (p) => setMine((m) => (m.length >= 5 ? m : [...m, proposeDeepWell(p, m.length)])) : undefined}
            label={`Plan of ${village.name}: ${village.households.length} households, ${view.wells.length} wells, chapter: ${CHAPTERS[active].label}`}
            className="h-[34vh] min-h-56 sm:h-[38vh]"
          />
        </figure>
        <div key={active} className="puteal-wipe mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {village.source === "sample" ? "Sample data, " : ""}
            {view.solution.threshold} µg/L limit, {view.solution.capacitated ? "pumps capped" : "no pump cap"},{" "}
            <span className={view.solution.kpis.farPeople > 0 ? "text-bad" : "text-ok"}>
              {fmtPeople(view.solution.kpis.farPeople)} people over 500 m
            </span>
            {last && " · tap the plan to drop a deep well"}
          </span>
          <PlanLegend className="hidden sm:flex" />
        </div>
      </div>

      <div className="relative z-10">
        <Chapter i={0} title="A village of tubewells">
          <p>
            {village.name} is a sample village laid out on the scale of Araihazar upazila, about 30 km east of Dhaka. It has{" "}
            <strong>{village.households.length} households</strong>, roughly {fmtPeople(kb.people)} people at 4.2 per home, and{" "}
            {baseWells.length} hand-pumped tubewells. Under Bangladesh&apos;s limit of 50 µg/L, <strong>{unsafe50} of those wells</strong>{" "}
            test unsafe and get their spouts painted red.
          </p>
          <p>
            Red does not mean thirsty. Most families have a green spout a short walk away. What nobody hands them is the answer to a
            plain question: which one?
          </p>
        </Chapter>

        <Chapter i={1} title="Nearest is not enough">
          <p>
            Send every family to its nearest safe well and the walk looks easy: <strong>{fmtMeters(kn.avgWalk)}</strong> on average along
            the footpaths. But the crowd does not spread out:{" "}
            {kn.overCapWells > 0
              ? `${kn.overCapWells === 1 ? "one pump ends up" : `${kn.overCapWells} pumps end up`} serving more people than it can, and `
              : "the queues pile up at a few pumps, and "}
            the {busiest ? busiest.name : "busiest pump"} runs at <strong>{Math.round(kn.maxLoadPct)}% of its capacity</strong>.
          </p>
          <p>
            Long queues at the few good pumps are one reason families drift back to the red spout in their own yard. A switching plan
            that ignores crowding does not last a season.
          </p>
        </Chapter>

        <Chapter i={2} title="Share the load">
          <p>
            Puteal caps every pump and moves the overflow. <strong>{kb.shifted} households</strong> walk on to their second-choice well;
            the average walk becomes {fmtMeters(kb.avgWalk)} and no pump goes past its cap.
            {shifted && shiftedA && (
              <>
                {" "}
                The orange line is household {shifted.label}: {fmtMeters(shiftedA.meters)} to the {wellName(shiftedA.wellId)} instead
                of a queue at the {wellName(shiftedA.nearestWellId)}.
              </>
            )}
          </p>
          <p>
            {kb.farPeople > 0 ? (
              <>
                Even so, <strong>{fmtPeople(kb.farPeople)} people</strong> live more than 500 m from the safe well they are sent to,{" "}
                {fmtPeople(kb.topFarPeople)} of them in {hamletName(kb.topFarHamletId)}.
              </>
            ) : (
              <>Every household now has a safe well within 500 m.</>
            )}
          </p>
          <div className="pt-2">
            <Button asChild size="lg">
              <Link href="/play">Plan your own village</Link>
            </Button>
          </div>
        </Chapter>

        <Chapter i={3} title="The WHO line">
          <p>
            Bangladesh still uses 50 µg/L. The World Health Organization guideline is 10. Move the line and{" "}
            <strong>{unsafe10 - unsafe50} more wells</strong> turn red, leaving {kw.safeWells} safe pumps for {fmtPeople(kw.people)}{" "}
            people.
          </p>
          <p>
            People beyond a 500 m walk go from <strong>{fmtPeople(kb.farPeople)}</strong> to <strong>{fmtPeople(kw.farPeople)}</strong>.
            The worst hit is {hamletName(kw.topFarHamletId)}, with {fmtPeople(kw.topFarPeople)} people out of reach.
          </p>
        </Chapter>

        <Chapter i={4} title="Where the next well goes">
          <p>
            A deep well costs a union council real money, so it should go where it moves the number most. One placed on the river path
            by Char para brings the far count from {fmtPeople(kw.farPeople)} to <strong>{fmtPeople(kp.farPeople)}</strong>:{" "}
            {fmtPeople(kw.farPeople - kp.farPeople)} people back within 500 m of safe water.
          </p>
          <p>
            Your turn. Tap any open spot on the plan above to drill a deep well there.{" "}
            {mine.length > 0 ? (
              <>
                With your {mine.length === 1 ? "well" : `${mine.length} wells`}, the count stands at{" "}
                <strong className={kx.farPeople < kp.farPeople ? "text-ok" : undefined}>{fmtPeople(kx.farPeople)}</strong>
                {kx.farPeople < kp.farPeople ? `, another ${fmtPeople(kp.farPeople - kx.farPeople)} people reached.` : ". Try nearer the red dashes."}
              </>
            ) : (
              <>The count updates as soon as the well lands.</>
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={!mine.length} onClick={() => setMine((m) => m.slice(0, -1))}>
              Undo last well
            </Button>
            <Button variant="outline" size="sm" disabled={!mine.length} onClick={() => setMine([])}>
              Clear my wells
            </Button>
            <Button asChild variant="link" size="sm">
              <Link href="/play">Open the full planner, with real OSM buildings</Link>
            </Button>
          </div>
        </Chapter>
      </div>
    </section>
  );
}

function Chapter({ i, title, children }: { i: number; title: string; children: React.ReactNode }) {
  return (
    <article id={`chapter-${CHAPTERS[i].id}`} data-index={i} className="flex min-h-[78vh] scroll-mt-[60vh] flex-col justify-start pt-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-olive">{CHAPTERS[i].label}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[1.0625rem] leading-relaxed text-foreground/90">{children}</div>
    </article>
  );
}
