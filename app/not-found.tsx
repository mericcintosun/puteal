import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Puteal</p>
      <h1 className="mt-3 text-3xl font-semibold">No footpath leads here</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        This page does not exist. The village story, the planner and the method notes are all one click away.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
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
