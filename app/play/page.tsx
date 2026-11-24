import type { Metadata } from "next";
import { Planner } from "@/components/planner";
import { fakeAdapter, getAdapter } from "@/lib/adapter";
import { parsePlannerQuery } from "@/lib/planner-url";
import type { AdapterMode, Village } from "@/lib/types";

export const metadata: Metadata = {
  title: "Planner",
  description: "Assign every household to a safe well, change the arsenic limit, and drop deep wells to see who comes back within 500 m.",
};

/**
 * Reading searchParams makes this page render per request, so a cold server in real mode
 * would wait on Overpass. The page gives the adapter this long, then serves the sample.
 */
const VILLAGE_BUDGET_MS = 4000;

/**
 * Demo step 6 reads the village here. If the adapter throws or runs past the budget, the
 * planner opens on the sample village and the source line says so.
 */
async function loadVillage(): Promise<{ village: Village; mode: AdapterMode }> {
  const adapter = getAdapter();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const budget = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("village budget")), VILLAGE_BUDGET_MS);
    });
    const village = await Promise.race([adapter.getVillage(), budget]);
    return { village, mode: adapter.mode };
  } catch {
    return { village: await fakeAdapter.getVillage(), mode: "fake" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, { village, mode }] = await Promise.all([searchParams, loadVillage()]);
  const parsed = parsePlannerQuery(query);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="mb-6 max-w-prose">
        <h1 className="puteal-wipe text-3xl font-semibold sm:text-4xl">Planner</h1>
        <p className="mt-2 text-muted-foreground">
          The same engine as the story, with every control open. Switch the limit, lift the pump cap, drill deep wells anywhere, load
          the real OpenStreetMap layout, bring in your own tested wells as a CSV, and print a route card for any house. The link in
          the address bar carries your plan.
          {village.source === "sample" && ` It opens on ${village.name}, a sample village: the layout and every well test are sample data.`}
        </p>
      </div>
      <Planner initialVillage={village} mode={mode} initial={parsed.state} linkHint={parsed.hint} />
    </div>
  );
}
