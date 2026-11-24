import type { Metadata } from "next";
import { Planner } from "@/components/planner";

export const metadata: Metadata = {
  title: "Planner · Puteal",
  description: "Assign every household to a safe well, change the arsenic limit, and drop deep wells to see who comes back within 500 m.",
};

export default function PlayPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="mb-6 max-w-prose">
        <h1 className="puteal-wipe text-3xl font-semibold sm:text-4xl">Planner</h1>
        <p className="mt-2 text-muted-foreground">
          The same engine as the story, with every control open. Switch the limit, lift the pump cap, drill deep wells anywhere, load
          the real OpenStreetMap layout, and print a route card for any house.
        </p>
      </div>
      <Planner />
    </div>
  );
}
