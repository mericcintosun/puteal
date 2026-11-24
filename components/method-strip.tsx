"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROPOSED_DEEP_WELL, SAMPLE_VILLAGE, THRESHOLDS } from "@/lib/data";
import { fmtMeters, fmtPeople, prepareVillage, solve } from "@/lib/engine";

interface Step {
  title: string;
  sentence: string;
}

/**
 * The four engine steps, each with a number the engine computes on the sample village
 * Charpara (lib/data.ts through lib/engine.ts). Deterministic, so server and browser agree.
 */
function methodSteps(): Step[] {
  const v = SAMPLE_VILLAGE;
  const prep = prepareVillage(v);
  const junctions = prep.graph.nodes.length;
  const segments = prep.graph.adj.reduce((s, a) => s + a.length, 0) / 2;
  const kn = solve(prep, v.wells, { threshold: THRESHOLDS.bangladesh, capacitated: false }).kpis;
  const kw = solve(prep, v.wells, { threshold: THRESHOLDS.who, capacitated: true }).kpis;
  const kp = solve(prep, [...v.wells, PROPOSED_DEEP_WELL], { threshold: THRESHOLDS.who, capacitated: true }).kpis;
  const moved =
    kw.shifted > 0
      ? `${kw.shifted} households walk past a full pump to their next choice`
      : "no household has to walk past a full pump";

  return [
    {
      title: "The walking graph",
      sentence: `The footpaths of the sample village ${v.name} become a graph of ${junctions} junctions and ${segments} short segments, and each of its ${v.households.length} households joins it at the nearest junction.`,
    },
    {
      title: "The nearest safe well",
      sentence: `Dijkstra runs from each of the ${kn.safeWells} wells that pass 50 µg/L, so every house gets a ranked list of pumps; sent to the first on that list, a family walks ${fmtMeters(kn.avgWalk)} on average.`,
    },
    {
      title: "The capacity limit",
      sentence: `At the WHO line of 10 µg/L only ${kw.safeWells} of the ${v.wells.length} wells pass. With every pump capped, ${moved}, and ${fmtPeople(kw.farPeople)} people end up more than 500 m from safe water.`,
    },
    {
      title: "The deep well",
      sentence: `One deep well on the river path by Char para brings that count from ${fmtPeople(kw.farPeople)} to ${fmtPeople(kp.farPeople)}: ${fmtPeople(kw.farPeople - kp.farPeople)} people back within 500 m.`,
    },
  ];
}

function StepCard({ step, i, total, className }: { step: Step; i: number; total: number; className?: string }) {
  return (
    <li className={className}>
      <Card className="h-full">
        <CardHeader>
          <p className="text-sm text-primary">
            Step {i + 1} of {total}
          </p>
          <CardTitle className="text-lg">
            <h3>{step.title}</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-body text-foreground/90">
          <p>{step.sentence}</p>
        </CardContent>
      </Card>
    </li>
  );
}

/**
 * Kit K3, signature 3: a sticky section where vertical scroll drives the four engine
 * steps sideways. Only mounted after hydration and when motion is allowed; the server HTML
 * and the reduced-motion path are the plain vertical list in MethodStrip.
 */
function StripTrack({ steps }: { steps: Step[] }) {
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLOListElement>(null);
  const lenis = useLenis();
  const [distance, setDistance] = useState(0);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useEffect(() => {
    const measure = () => {
      if (!row.current || !frame.current) return;
      setDistance(Math.max(0, row.current.scrollWidth - frame.current.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    if (frame.current) ro.observe(frame.current);
    return () => ro.disconnect();
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStep(Math.min(steps.length - 1, Math.max(0, Math.round(v * (steps.length - 1)))));
  });

  // Keyboard and button alternative: scroll the page to the point where step i is in view.
  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = Math.max(0, el.offsetHeight - window.innerHeight);
    const target = top + (span * i) / (steps.length - 1);
    if (lenis) lenis.scrollTo(target);
    else window.scrollTo({ top: target, behavior: "smooth" });
  }

  return (
    <div ref={track} className="relative mt-6 h-[240vh]">
      <div ref={frame} className="sticky top-14 flex h-[calc(100svh-3.5rem)] flex-col justify-center overflow-hidden">
        <motion.ol ref={row} className="puteal-strip-row flex gap-4" style={{ x }}>
          {steps.map((s, i) => (
            <StepCard key={s.title} step={s} i={i} total={steps.length} className="w-[85%] shrink-0 sm:w-[78%]" />
          ))}
        </motion.ol>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => go(step - 1)} disabled={step === 0}>
            Previous step
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => go(step + 1)} disabled={step === steps.length - 1}>
            Next step
          </Button>
          <p className="ml-1 text-sm text-muted-foreground" aria-live="polite">
            Step {step + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The method strip on `/`: four engine steps, numbers from the sample village. */
export function MethodStrip() {
  const steps = useMemo(methodSteps, []);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section aria-labelledby="method-strip-title" className="mt-20 border-t border-border pt-12">
      <h2 id="method-strip-title" className="text-[1.625rem] font-semibold leading-tight sm:text-chapter">
        Four steps between a well list and a plan
      </h2>
      <p className="mt-4 text-body text-foreground/90">
        Every number on this page comes out of the same four steps, shown here on the sample village {SAMPLE_VILLAGE.name}.
      </p>
      {motionOk ? (
        <StripTrack steps={steps} />
      ) : (
        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <StepCard key={s.title} step={s} i={i} total={steps.length} />
          ))}
        </ol>
      )}
    </section>
  );
}
