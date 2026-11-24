"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

// The planner's own boundary: retry in place, or open a clean planner on the sample village.
export default function PlayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <h1 className="text-3xl font-semibold">The planner did not load</h1>
      <ErrorState
        className="mt-6"
        title="Puteal could not draw this plan"
        hint="Try again. If the link carried a plan that no longer fits, open the planner without it: the sample village Charpara is still available."
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
