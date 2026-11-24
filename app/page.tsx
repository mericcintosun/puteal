import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { StoryScroll } from "@/components/story-scroll";
import { fakeAdapter, getAdapter } from "@/lib/adapter";
import type { AdapterMode, Village } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "Puteal: safe wells for every household" },
};

/**
 * Demo steps 1 to 5 read the village here. The real adapter already falls back from live
 * Overpass to the snapshot to the sample village; if it throws anyway, this page falls
 * back to the sample adapter so the story always renders.
 */
async function loadVillage(): Promise<{ village: Village; mode: AdapterMode }> {
  const adapter = getAdapter();
  try {
    return { village: await adapter.getVillage(), mode: adapter.mode };
  } catch {
    return { village: await fakeAdapter.getVillage(), mode: "fake" };
  }
}

// L3 editorial: one centered column at max-w-prose, magazine order. Kicker, display
// headline, standfirst, inline figure, the live story with its CTA mid-article, a coda.
export default async function Home() {
  const { village, mode } = await loadVillage();
  return (
    <article className="mx-auto max-w-prose px-5 pb-24 pt-12">
      <p className="puteal-wipe text-xs font-medium uppercase tracking-[0.2em] text-primary">
        SDG 6.1 · Arsenic in Bangladesh&apos;s tubewells
      </p>
      <h1 className="puteal-wipe puteal-wipe-2 mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">
        The safe well is usually next door. The hard part is knowing which one.
      </h1>
      <p className="puteal-wipe puteal-wipe-3 mt-6 text-lg leading-relaxed text-muted-foreground">
        About half of the tubewells tested in Bangladesh carry more arsenic than the WHO guideline allows. The cheapest fix is a
        short walk to a neighbour&apos;s safe pump, yet families rarely switch: nobody tells them which pump, and the good ones get
        crowded. Puteal matches every household to a safe well along real footpaths, keeps each pump under its load, and shows where
        one new deep well would bring the most people back within reach.
      </p>
      <p className="puteal-wipe puteal-wipe-3 mt-4 leading-relaxed">
        It is built for the field workers and student volunteers who test wells and paint spouts in arsenic-affected villages, and it
        counts what UN SDG target 6.1 asks about: how many people live more than 500 m from safe water.{" "}
        <a
          href="#chapter-village"
          className="inline-flex min-h-11 items-center text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary"
        >
          Start with chapter 1, the village
        </a>{" "}
        or{" "}
        <Link
          href="/play"
          className="inline-flex min-h-11 items-center text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary"
        >
          open the planner
        </Link>
        .
      </p>

      <figure className="mt-10">
        <div className="overflow-hidden rounded-md border border-border border-t-edge bg-card">
          <SceneSlot
            n={1}
            alt="A field worker paints the spout of a tubewell red while a family carries water pots along a footpath toward a pump marked green"
            width={960}
            height={640}
          />
        </div>
        <figcaption className="mt-2 text-sm text-muted-foreground">
          Well switching: red spouts for wells over the limit, green for the ones a family can walk to.
        </figcaption>
      </figure>

      <p className="mt-10 text-[1.0625rem] leading-relaxed">
        {village.source === "osm"
          ? "Scroll on and the plan below follows one real village layout: buildings and footpaths fetched from OpenStreetMap, with the sample wells of Charpara placed on it. The well tests are sample data, not survey results."
          : `Scroll on and the plan below follows the story of one sample village, ${village.name}. Its layout and well tests are sample data, not survey results.`}{" "}
        Every number in the text is computed live by
        the same engine that runs the planner: a walking graph over the village footpaths, shortest paths from every safe well, and a
        capacity cap on every pump.
      </p>

      <StoryScroll village={village} mode={mode} />

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">A card for every door</h2>
        <p className="mt-4 text-[1.0625rem] leading-relaxed">
          A plan only helps if it leaves the laptop. In the planner, click any household and Puteal prints a route card: the well to
          use, its test result, the distance along the path and the walk in minutes. A field worker or a student volunteer can hand it
          over at the door, the same day the spouts get painted.
        </p>
        <figure className="mt-8">
          <div className="overflow-hidden rounded-md border border-border border-t-edge bg-card">
            <SceneSlot
              n={2}
              alt="A hand holds a printed route card showing a footpath from a house to a green-marked well, with the distance written beside it"
              width={960}
              height={640}
            />
          </div>
        </figure>
        <p className="mt-6 text-sm text-muted-foreground">
          Method, assumptions and sources live in the{" "}
          <Link href="/notes" className="text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary">
            method notes
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
