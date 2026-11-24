export default function Loading() {
  return (
    <div className="mx-auto max-w-prose px-5 pb-24 pt-12" role="status" aria-live="polite">
      <div className="h-10 w-2/3 rounded-md bg-deep" aria-hidden="true" />
      <div className="mt-8 space-y-2" aria-hidden="true">
        <div className="h-12 rounded-md border border-border border-t-edge bg-card" />
        <div className="h-12 rounded-md border border-border border-t-edge bg-card" />
        <div className="h-12 rounded-md border border-border border-t-edge bg-card" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Loading the village plan</p>
    </div>
  );
}
