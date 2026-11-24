"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

// Shows no error message or stack on purpose: readers get a way back, not a trace.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Puteal</p>
      <h1 className="mt-3 text-3xl font-semibold">This plan did not load</h1>
      <ErrorState
        className="mt-6"
        title="Something broke while Puteal was drawing the village"
        hint="Try again. The sample village Charpara is still available in the planner, and the story starts over from the first chapter."
        onRetry={() => reset()}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href="/play">Open the sample village</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Back to the story</Link>
        </Button>
      </ErrorState>
    </div>
  );
}
