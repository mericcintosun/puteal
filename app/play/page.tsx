import type { Metadata } from "next";
import { Planner } from "@/components/planner";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = {
  title: "Planner",
  description: "Assign every household to a safe well, change the arsenic limit, and drop deep wells to see who comes back within 500 m.",
};

export default async function PlayPage() {
  const village = await getAdapter().getVillage();
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="mb-6 max-w-prose">
        <h1 className="puteal-wipe text-3xl font-semibold sm:text-4xl">Planner</h1>
        <p className="mt-2 text-muted-foreground">
          The same engine as the story, with every control open. Switch the limit, lift the pump cap, drill deep wells anywhere, load
          the real OpenStreetMap layout, and print a route card for any house.
          {village.source === "sample" && ` It opens on ${village.name}, a sample village: the layout and every well test are sample data.`}
        </p>
      </div>
      <Planner initialVillage={village} />
    </div>
  );
}
