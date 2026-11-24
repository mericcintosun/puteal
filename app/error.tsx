"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shows no error message or stack on purpose: readers get a way back, not a trace.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Puteal</p>
      <h1 className="mt-3 text-3xl font-semibold">This plan did not load</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Something broke while Puteal was drawing the village. Try again, or go back to the story and start from the first chapter.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the story</Link>
        </Button>
      </div>
    </div>
  );
}
