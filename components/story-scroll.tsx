"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { scrollToChapter } from "@/components/chapter-link";
import { Button } from "@/components/ui/button";
import { PlanLegend, VillagePlan } from "@/components/village-plan";
import { PROPOSED_DEEP_WELL, THRESHOLDS, proposeDeepWell, type AdapterMode, type Pt, type Village, type Well } from "@/lib/data";
import { fmtMeters, fmtPeople, prepareVillage, routeFor, solve } from "@/lib/engine";
import { plannerSearch } from "@/lib/planner-url";
import { sourceLine } from "@/lib/source-line";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "village", label: "The village" },
  { id: "nearest", label: "Nearest is not enough" },
  { id: "share", label: "Share the load" },
  { id: "who-line", label: "The WHO line" },
  { id: "next-well", label: "The next well" },
] as const;

/**
 * Kit K3, signature 2: parallax depth on the first screen. The headline block and the
 * scene slot sit in one column and move at different rates while the hero scrolls away
 * (text up by a fifth of its height, the picture down inside its frame). Both start at
 * their resting place, so the server HTML is in place with JavaScript off; under reduced
 * motion no transform is applied at all.
 */
export function StoryHero({ text, figure, caption }: { text: ReactNode; figure: ReactNode; caption: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const figureY = useTransform(scrollYProgress, [0, 1], ["0%", "7%"]);

  return (
    <div ref={ref}>
      <motion.div className="puteal-wipe-group" style={reduce ? undefined : { y: textY }}>
        {text}
      </motion.div>
      <figure className="mt-9">
        <div className="overflow-hidden rounded-md border border-border border-t-edge bg-card">
          <motion.div className="origin-top scale-[1.08]" style={reduce ? undefined : { y: figureY }}>
            {figure}
          </motion.div>
        </div>
        <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>
      </figure>
    </div>
  );
}

/**
 * The story-scroll: one live village plan stays pinned while five chapters scroll past.
 * Each chapter sets the engine state (threshold, capacity rule, proposed wells); the last
 * hands the plan to the reader. Kit K3 signature 1: Lenis root plus a chapter rail whose
 * fill is bound to page scroll, and chapter jumps through lenis.scrollTo. The village
 * arrives as a prop from the server page, which reads it through the adapter seam; the
 * same code runs on the sample village and on a live OpenStreetMap layout.
 */
export function StoryScroll({ village, mode }: { village: Village; mode: AdapterMode }) {
  const baseWells = village.wells;
  const hamletName = (id: string | null) => village.hamlets.find((h) => h.id === id)?.name ?? "the far end";
  const wellName = (id: string | null) => baseWells.find((w) => w.id === id)?.name ?? "a full pump";
  const prep = useMemo(() => prepareVillage(village), [village]);
  const [active, setActive] = useState(0);
  const [mine, setMine] = useState<Well[]>([]);
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
    scrollToChapter(lenis, CHAPTERS[i].id);
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
  // The reader's plan travels to /play in the address: WHO limit, pumps capped, every deep well.
  const playHref = `/play${plannerSearch({ threshold: THRESHOLDS.who, capacitated: true, added: [PROPOSED_DEEP_WELL, ...mine] })}`;

  return (
    <section aria-label="How Puteal plans one village" className="relative mt-14">
      <div id="story-pin" className="sticky top-14 z-20 -mx-5 border-b border-border bg-background px-5 pb-3 pt-3">
        <nav aria-label="Chapters" className="mb-2">
          <div className="relative h-0.5 w-full bg-border" aria-hidden="true">
            <motion.div className="absolute inset-0 origin-left bg-primary" style={{ scaleX: scrollYProgress }} />
          </div>
          {/* One row that scrolls sideways on narrow screens, so 44px targets do not stack. */}
          <ol className="mt-2 flex gap-1 overflow-x-auto">
            {CHAPTERS.map((c, i) => (
              <li key={c.id} className="shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => jump(i)}
                  aria-current={active === i ? "step" : undefined}
                  className={cn("min-h-11 px-2", active === i && "bg-secondary text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]")}
                >
                  {c.label}
                </Button>
              </li>
            ))}
          </ol>
        </nav>
        <figure aria-label="Live village plan" className="overflow-hidden rounded-md border border-border border-t-edge bg-card">
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
            {view.solution.threshold} µg/L limit, {view.solution.capacitated ? "pumps capped" : "no pump cap"},{" "}
            <span className={view.solution.kpis.farPeople > 0 ? "text-bad" : "text-ok"}>
              {fmtPeople(view.solution.kpis.farPeople)} people over 500 m
            </span>
            {last && ", tap the plan to drop a deep well"}
          </span>
          <PlanLegend className="hidden sm:flex" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{sourceLine(mode, village)}</p>
      </div>

      <div className="relative z-10">
        <Chapter i={0} title="A village of tubewells">
          <p>
            {village.source === "osm"
              ? `This is a real stretch of Araihazar upazila, about 30 km east of Dhaka: every house on the plan is a building mapped on OpenStreetMap, and the paths are its mapped lanes and footpaths. The wells are still the sample wells of Charpara. It has `
              : `${village.name} is a sample village laid out on the scale of Araihazar upazila, about 30 km east of Dhaka. It has `}
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
            {kb.shifted > 0 ? (
              <>
                Puteal caps every pump and moves the overflow. <strong>{kb.shifted} households</strong> walk on past a full pump to
                their next choice; the average walk becomes {fmtMeters(kb.avgWalk)} and no pump goes past its cap.
              </>
            ) : (
              <>
                Puteal caps every pump at the number of people it can serve. At 50 µg/L the safe pumps still have room, so
                nobody has to walk past a full pump and the average walk stays at <strong>{fmtMeters(kb.avgWalk)}</strong>.
              </>
            )}
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
            {kw.shifted > 0 && ` With fewer pumps to share, ${kw.shifted} households now walk past a full one.`}
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
            <Button asChild variant="outline" className="min-h-11">
              <Link href={playHref}>Take this plan to the planner</Link>
            </Button>
            <Button variant="ghost" className="min-h-11" disabled={!mine.length} onClick={() => setMine((m) => m.slice(0, -1))}>
              Undo last well
            </Button>
            <Button variant="ghost" className="min-h-11" disabled={!mine.length} onClick={() => setMine([])}>
              Clear my wells
            </Button>
          </div>
        </Chapter>
      </div>
    </section>
  );
}

function Chapter({ i, title, children }: { i: number; title: string; children: ReactNode }) {
  return (
    <article id={`chapter-${CHAPTERS[i].id}`} data-index={i} className="flex min-h-[60vh] scroll-mt-[56vh] flex-col justify-start pt-12">
      <p className="text-sm font-medium text-muted-foreground">
        Chapter {i + 1} of {CHAPTERS.length}
      </p>
      <h2 className="mt-1 text-[1.625rem] font-semibold leading-tight sm:text-chapter">{title}</h2>
      <div className="mt-4 space-y-4 text-body text-foreground/90">{children}</div>
    </article>
  );
}
