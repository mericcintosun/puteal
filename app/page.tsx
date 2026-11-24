import type { Metadata } from "next";
import Link from "next/link";
import { ChapterLink } from "@/components/chapter-link";
import { MethodStrip } from "@/components/method-strip";
import { SceneSlot } from "@/components/scene-slot";
import { StoryHero, StoryScroll } from "@/components/story-scroll";
import { fakeAdapter, getAdapter } from "@/lib/adapter";
import type { AdapterMode, Village } from "@/lib/types";

// The story is rendered at build time from the real adapter. Rebuild it hourly so a build
// that could not reach Overpass does not keep the sample layout until the next deploy.
export const revalidate = 3600;

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

const inlineLink = "text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary";

// L3 editorial: one centered column at max-w-prose, magazine order. Kicker, display
// headline, standfirst, inline figure (parallax), the live story with its CTA mid-article,
// the method strip, a coda.
export default async function Home() {
  const { village, mode } = await loadVillage();
  return (
    <article className="mx-auto max-w-prose px-5 pb-24 pt-12">
      <StoryHero
        text={
          <>
            <p className="text-sm font-medium text-primary">SDG 6.1, arsenic in Bangladesh&apos;s tubewells</p>
            <h1 className="mt-3 text-[2.375rem] font-semibold leading-[1.05] sm:text-display">
              The safe well is usually next door. The hard part is knowing which one.
            </h1>
            <p className="mt-5 text-standfirst text-foreground/85">
              About half of the tubewells tested in Bangladesh carry more arsenic than the WHO allows. Puteal tells every household
              which safe pump to walk to, keeps any one pump from crowding, and shows where a new deep well helps most.
            </p>
          </>
        }
        figure={
          <SceneSlot n={1}
            alt="A field worker paints the spout of a tubewell red while a family carries water pots along a footpath toward a pump marked green"
            width={1280}
            height={560}
            className="aspect-[1280/560] object-cover"
          />
        }
        caption="Well switching: red spouts for wells over the limit, green for the ones a family can walk to."
      />

      <p className="mt-10 text-body">
        Puteal is built for the field workers and student volunteers who test wells and paint spouts, and it counts what UN SDG target
        6.1 asks about: how many people live more than 500 m from safe water.{" "}
        {village.source === "osm"
          ? "The plan below is a real OpenStreetMap layout with the sample wells of Charpara on it; the well tests are sample data."
          : `The plan below is ${village.name}, a sample village; its layout and well tests are sample data, not survey results.`}{" "}
        <ChapterLink chapter="village" className={`inline-flex min-h-11 items-center ${inlineLink}`}>
          Start with chapter 1
        </ChapterLink>
        .
      </p>

      <StoryScroll village={village} mode={mode} />

      <MethodStrip />

      <section aria-labelledby="coda-title" className="mt-20 border-t border-border pt-12">
        <h2 id="coda-title" className="text-[1.625rem] font-semibold leading-tight sm:text-chapter">
          A card for every door
        </h2>
        <p className="mt-4 text-body">
          In the planner, click any household and Puteal prints a route card with the well, its test value, the distance and the
          minutes each way, so a volunteer can hand it over the same day the spouts get painted; the{" "}
          <Link href="/notes" className={inlineLink}>
            method notes
          </Link>{" "}
          hold the assumptions and sources.
        </p>
        <figure className="mx-auto mt-8 max-w-sm overflow-hidden rounded-md border border-border border-t-edge bg-card">
          <SceneSlot n={2}
            alt="A hand holds a printed route card showing a footpath from a house to a green-marked well, with the distance written beside it"
            width={640} height={640}
            className="aspect-square object-cover"
          />
        </figure>
      </section>
    </article>
  );
}
