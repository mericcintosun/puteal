import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-5 pb-24 pt-16">
      <div className="puteal-wipe-group">
        <p className="text-sm font-medium text-primary">Page not found</p>
        <h1 className="mt-3 text-[2rem] font-semibold leading-tight sm:text-chapter">No footpath leads here</h1>
        <p className="mt-4 text-body text-muted-foreground">
          This page does not exist. The village story, the planner and the method notes are all one click away.
        </p>
      </div>
      <figure className="mt-8 max-w-xs overflow-hidden rounded-md border border-border border-t-edge bg-card">
        <SceneSlot n={5}
          alt="A footpath that stops at the edge of a flooded paddy field, with a signpost pointing back toward the village wells"
          width={560}
          height={560}
        />
      </figure>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/">Back to the story</Link>
        </Button>
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/play">Open the planner</Link>
        </Button>
      </div>
    </div>
  );
}
