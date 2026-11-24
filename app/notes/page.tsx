import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { fakeAdapter, getAdapter } from "@/lib/adapter";
import { CONFIG } from "@/lib/config";
import { DETOUR, FAR_METERS, PEOPLE_PER_HOUSEHOLD, PROPOSED_DEEP_WELL, THRESHOLDS, WALK_M_PER_MIN, type Village } from "@/lib/data";
import { buildGraph, fmtMeters, fmtPeople, prepareVillage, solve } from "@/lib/engine";

export const metadata: Metadata = {
  title: "Method and sources",
  description: "How Puteal builds the walking graph, assigns households to wells under a capacity cap, and what is real versus sample data.",
};

// These numbers are computed by the engine from the adapter's village, not typed in.
function buildSections(v: Village): { summary: string; body: React.ReactNode }[] {
  const prep = prepareVillage(v);
  const graph = buildGraph(v.paths);
  const edges = graph.adj.reduce((s, a) => s + a.length, 0) / 2;
  const at50 = solve(prep, v.wells, { threshold: THRESHOLDS.bangladesh, capacitated: true }).kpis;
  const at10 = solve(prep, v.wells, { threshold: THRESHOLDS.who, capacitated: true }).kpis;
  const withDeep = solve(prep, [...v.wells, PROPOSED_DEEP_WELL], { threshold: THRESHOLDS.who, capacitated: true }).kpis;
  const osm = v.source === "osm";
  const where = osm ? "On the OpenStreetMap layout" : "In the sample village";

  return [
  {
    summary: "Why well switching, and why it stalls",
    body: (
      <>
        <p>
          KeebsforWater reports that about half of the tubewells tested in Bangladesh exceed the WHO guideline of 10 µg/L of arsenic.
          Drilling deep wells everywhere is slow and expensive. The cheapest proven step is well switching: a family whose pump tests
          high walks to a neighbour&apos;s pump that tests low.
        </p>
        <p>
          Studies in Araihazar upazila found that around 90 percent of people live within about 100 m of a safe well, yet switching
          stays low. Two reasons recur: nobody tells a household which well to use, and the few good pumps get crowded. Puteal answers
          the first with a named well per house and the second with a capacity cap per pump.
        </p>
      </>
    ),
  },
  {
    summary: "The walking graph",
    body: (
      <>
        <p>
          Every footpath is cut into segments of about 25 m, and shared vertices become junctions. {where} that gives{" "}
          {graph.nodes.length} nodes and {edges} edges. Each house and each well joins the graph at its nearest node; that short
          off-path stretch is multiplied by {DETOUR} because nobody walks a straight line through a paddy field.
        </p>
        <p>
          If a house sits on a fragment no path connects, or if cutting across is shorter than the lane, Puteal falls back to the
          straight line times {DETOUR} and says so on the route card.
        </p>
      </>
    ),
  },
  {
    summary: "The capacity-aware assignment",
    body: (
      <>
        <p>
          Dijkstra runs once from every well that passes the chosen limit, so each household gets a ranked list of safe wells by
          walking distance. Households are then served in order of regret: the ones that would lose the most by being bumped to their
          second choice pick first. Each takes the nearest safe well that still has room for its {PEOPLE_PER_HOUSEHOLD} people.
        </p>
        <p>
          {osm ? "On the OpenStreetMap layout with sample wells" : "With the sample data"} at 50 µg/L, {at50.shifted} households are moved past a full pump and the average walk is{" "}
          {fmtMeters(at50.avgWalk)}. This greedy pass is fast enough to rerun on every click; an exact min-cost flow is on the list
          for larger villages.
        </p>
      </>
    ),
  },
  {
    summary: "Numbers and assumptions",
    body: (
      <>
        <p>
          Household size is {PEOPLE_PER_HOUSEHOLD} people, close to the national average. A household counts as far from safe water
          when its assigned walk is longer than {FAR_METERS} m. Walking pace with a water pot is {WALK_M_PER_MIN} m per minute.
          Shallow hand pumps are capped at 80 to 100 people a day in the sample, deep wells at 200.
        </p>
        <p>
          {where}, {fmtPeople(at50.farPeople)} people are far from safe water at the Bangladesh limit of 50 µg/L and{" "}
          {fmtPeople(at10.farPeople)} at the WHO guideline of 10. One deep well by Char para brings the second figure to{" "}
          {fmtPeople(withDeep.farPeople)}.
        </p>
      </>
    ),
  },
  {
    summary: "What is real and what is sample",
    body: (
      <>
        <p>
          {osm
            ? `Real: the engine, the OpenStreetMap basemap, and the village layout on this site. Its ${v.households.length} houses are buildings mapped on OpenStreetMap and its ${v.paths.length} paths are mapped lanes and footpaths, fetched by our server from the public Overpass API.`
            : "Real: the engine and the OpenStreetMap basemap. When the site runs in live mode, or when you press the button in the planner, the houses and paths come from OpenStreetMap buildings and walkable ways, fetched by our server from the public Overpass API."}
        </p>
        <p>
          The live layout answers from the first source that works: a live Overpass call ({CONFIG.overpassTimeoutMs / 1000} seconds per try, {CONFIG.overpassRetries} retry), then a saved
          OpenStreetMap snapshot shipped with the site, then the sample village Charpara. The line under each readout says which one
          you are looking at.
        </p>
        <p>
          Sample: every arsenic value and the well list, the {PEOPLE_PER_HOUSEHOLD} people per household, and the six hamlet names
          (each mapped building joins its nearest sample hamlet){osm ? "" : ", plus the Charpara layout itself"}. We did not find a
          public, per-well test dataset we could ship. The planner is built so a field team can drop in their own results instead.
        </p>
      </>
    ),
  },
  {
    summary: "How this differs from existing tools",
    body: (
      <>
        <p>
          Nolkup, a research app from Araihazar, shows how many high-arsenic wells sit within 100 m of a user. iArsenic estimates the
          risk of a single well from its depth, location and staining. mWater maps water points and runs surveys. None of them, as far
          as we could find, assigns each household to a specific safe well by walking route while capping how many people a pump
          serves, or tests where the next deep well should go.
        </p>
      </>
    ),
  },
  {
    summary: "Stack",
    body: (
      <p>
        Next.js 15 (App Router) and TypeScript on Vercel. MapLibre GL JS over OpenStreetMap raster tiles. The Overpass API for
        buildings and paths, called from the server, no key. Zod checks every request and the Overpass response. A hand-written
        graph and Dijkstra in TypeScript, running in the browser. Lenis and Motion for the story scroll. Tailwind CSS v4 with
        shadcn-style components. Vitest for the engine, parser and schema tests.
      </p>
    ),
  },
  ];
}

/**
 * Demo step 7. The notes must never throw: if the adapter fails, or the engine cannot
 * compute the numbers for the village it returned, fall back to the sample village.
 */
async function loadSections(): Promise<ReturnType<typeof buildSections>> {
  try {
    const village = await getAdapter().getVillage();
    return buildSections(village);
  } catch {
    return buildSections(await fakeAdapter.getVillage());
  }
}

export default async function NotesPage() {
  const sections = await loadSections();
  return (
    <article className="mx-auto max-w-prose px-5 pb-24 pt-12">
      <div className="puteal-wipe-group">
        <p className="text-sm font-medium text-primary">Appendix</p>
        <h1 className="mt-3 text-[2.375rem] font-semibold leading-[1.05] sm:text-display">Method notes</h1>
        <p className="mt-5 text-standfirst text-foreground/85">
          How Puteal decides who walks where, the assumptions behind every number in the story, and which parts are real data. Open
          any section for the detail.
        </p>
      </div>

      <figure className="mt-8 overflow-hidden rounded-md border border-border border-t-edge bg-card">
        <SceneSlot n={3}
          alt="Top-down sketch of a village footpath network with houses joined to the nearest path and a new deep well marked in orange"
          width={960}
          height={640}
        />
      </figure>

      <div className="mt-10 space-y-2">
        {sections.map((s) => (
          <details key={s.summary} className="group rounded-md border border-border border-t-edge bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display font-semibold [&::-webkit-details-marker]:hidden">
              {s.summary}
              <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-4 leading-relaxed text-foreground/90">{s.body}</div>
          </details>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-[1.625rem] font-semibold leading-tight sm:text-chapter">Sources</h2>
        <details className="group mt-4 rounded-md border border-border border-t-edge bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display font-semibold [&::-webkit-details-marker]:hidden">
            Five sources, from KeebsforWater to the UN goal text
            <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
        <ul className="space-y-2 break-words border-t border-border px-4 py-4 text-sm text-muted-foreground">
          <li>
            KeebsforWater, on arsenic in Bangladesh&apos;s tubewells:{" "}
            <a className="text-primary underline underline-offset-4" href="https://keebsforwater.org/">
              keebsforwater.org
            </a>
          </li>
          <li>
            Well switching and the Araihazar studies:{" "}
            <a className="text-primary underline underline-offset-4" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8670558/">
              PMC8670558
            </a>{" "}
            and{" "}
            <a className="text-primary underline underline-offset-4" href="https://pubmed.ncbi.nlm.nih.gov/12378292/">
              PubMed 12378292
            </a>
          </li>
          <li>
            Nolkup trial registration:{" "}
            <a className="text-primary underline underline-offset-4" href="https://www.socialscienceregistry.org/trials/15469">
              AEA RCT Registry 15469
            </a>
          </li>
          <li>
            UN SDG target 6.1, safe and affordable drinking water for all:{" "}
            <a className="text-primary underline underline-offset-4" href="https://sdgs.un.org/goals/goal6">
              sdgs.un.org/goals/goal6
            </a>
          </li>
          <li>
            Map data from OpenStreetMap contributors (© OpenStreetMap contributors, ODbL): the map tiles, and the buildings and paths
            fetched through the Overpass API.
          </li>
        </ul>
        </details>
        <p className="mt-8 text-sm">
          <Link href="/play" className="text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary">
            Back to the planner
          </Link>
        </p>
      </section>
    </article>
  );
}
