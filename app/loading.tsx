export default function Loading() {
  return (
    <div className="mx-auto max-w-prose px-5 pb-24 pt-12" role="status" aria-live="polite">
      <div className="h-3 w-1/3 rounded-md bg-deep" aria-hidden="true" />
      <div className="mt-4 h-10 w-full rounded-md bg-deep" aria-hidden="true" />
      <div className="mt-6 h-[34vh] min-h-56 rounded-md border border-border border-t-edge bg-card" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted-foreground">Loading the village plan</p>
    </div>
  );
}
