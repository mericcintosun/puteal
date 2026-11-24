// The state triad every demo route shares: skeletons while loading, an error panel with a
// retry, and an empty panel that points at the next click. D8 panels through Card and
// Button; no motion of their own. No hooks here, so server loading files can render the
// skeletons and client components can pass handlers to the panels.

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** One grey block in the shape of the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-md bg-deep", className)} />;
}

/** The article column of `/` and `/notes`: kicker, headline, standfirst, figure, sections. */
export function PageSkeleton({ label = "Loading the village plan", sections = 0 }: { label?: string; sections?: number }) {
  return (
    <div className="mx-auto max-w-prose px-5 pb-24 pt-12" role="status" aria-live="polite">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-2/3" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-8 h-[34vh] min-h-56 rounded-md border border-border border-t-edge bg-card" aria-hidden="true" />
      {sections > 0 && (
        <div className="mt-8 space-y-2" aria-hidden="true">
          {Array.from({ length: sections }, (_, i) => (
            <div key={i} className="h-12 rounded-md border border-border border-t-edge bg-card" />
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** The `/play` layout: the plan pane on the left, rules and readout on the right. */
export function PlannerSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8" role="status" aria-live="polite">
      <div className="mb-6 max-w-prose">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="h-[62vh] min-h-96 rounded-md border border-border border-t-edge bg-card lg:h-[74vh]" aria-hidden="true" />
        <div className="space-y-3" aria-hidden="true">
          <div className="space-y-2 rounded-md border border-border border-t-edge bg-card p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-2 rounded-md border border-border border-t-edge bg-card p-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Loading the village plan</p>
    </div>
  );
}

/** A few rows while a list is being worked out (the wells import). */
export function ListSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-1.5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({
  title,
  hint,
  onRetry,
  retryLabel = "Try again",
  children,
  className,
}: {
  title: string;
  hint: string;
  onRetry: () => void;
  retryLabel?: string;
  /** Extra actions next to the retry button, such as a link back to the story. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card role="alert" className={cn("border-l-2 border-l-bad", className)}>
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-2 font-display font-semibold">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-bad" />
          {title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw /> {retryLabel}
          </Button>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  actionIcon,
  secondaryLabel,
  onSecondary,
  className,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAction: () => void;
  actionIcon?: ReactNode;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-md border border-dashed border-border p-3 text-sm", className)}>
      <p className="flex items-center gap-2 font-medium">
        <Inbox aria-hidden="true" className="size-4 shrink-0 text-primary" />
        {title}
      </p>
      <p className="text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionIcon} {actionLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" size="sm" onClick={onSecondary}>
            <RotateCcw /> {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
