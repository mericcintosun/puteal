"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function NotesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Appendix</p>
      <h1 className="mt-3 text-3xl font-semibold">The method notes did not load</h1>
      <ErrorState
        className="mt-6"
        title="Puteal could not compute the numbers for these notes"
        hint="Try again. The sample village Charpara is still available in the planner, where the same engine runs in your browser."
        onRetry={() => reset()}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href="/play">Open the sample village</Link>
        </Button>
      </ErrorState>
    </div>
  );
}
