export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8" role="status" aria-live="polite">
      <div className="mb-6 h-9 w-48 max-w-full rounded-md bg-deep" aria-hidden="true" />
      <div className="h-[62vh] min-h-96 rounded-md border border-border border-t-edge bg-card" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted-foreground">Loading the village plan</p>
    </div>
  );
}
