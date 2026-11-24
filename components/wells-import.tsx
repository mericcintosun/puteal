"use client";

import { useRef, useState } from "react";
import { Download, FileUp, RotateCcw } from "lucide-react";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import type { LatLon, Well } from "@/lib/types";
import { parseWellsCsv, type RejectedRow } from "@/lib/wells-csv";
import { WELLS_EXAMPLE_CSV, WELLS_EXAMPLE_NAME } from "@/lib/wells-example";

type ImportStatus =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "done"; file: string; count: number; rejected: RejectedRow[] }
  | { kind: "failed"; file: string; rejected: RejectedRow[] };

/**
 * The field worker's own tested wells in, the plan out. Parsing and the download both
 * happen in the browser; nothing is sent to or saved on the server.
 */
export function WellsImport({
  origin,
  importedFrom,
  onWells,
  onClear,
  exportCsv,
}: {
  origin: LatLon;
  /** File name of the wells now in use, or null while the sample wells are on. */
  importedFrom: string | null;
  onWells: (wells: Well[], file: string) => void;
  onClear: () => void;
  /** Builds the assignments CSV for the plan on screen. */
  exportCsv: () => string;
}) {
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = status.kind === "parsing";

  function apply(text: string, file: string) {
    const r = parseWellsCsv(text, origin);
    if (r.wells.length === 0) {
      setStatus({ kind: "failed", file, rejected: r.rejected });
      return;
    }
    onWells(r.wells, file);
    setStatus({ kind: "done", file, count: r.wells.length, rejected: r.rejected });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setStatus({ kind: "parsing" });
    try {
      const text = await f.text();
      apply(text, f.name);
    } catch {
      setStatus({ kind: "failed", file: f.name, rejected: [{ line: 1, reason: "the browser could not read this file" }] });
    }
  }

  function loadExample() {
    setStatus({ kind: "parsing" });
    apply(WELLS_EXAMPLE_CSV, WELLS_EXAMPLE_NAME);
  }

  function download() {
    const blob = new Blob([exportCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "puteal-assignments.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clear() {
    setStatus({ kind: "idle" });
    onClear();
  }

  const rejected = status.kind === "done" || status.kind === "failed" ? status.rejected : [];

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Your tested wells</p>
      <p className="text-xs text-muted-foreground">
        A CSV with the columns name, lat, lon, arsenic_ugl and an optional capacity, up to 40 wells. It replaces the sample wells;
        everything stays in this browser.
      </p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} tabIndex={-1} aria-hidden="true" />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FileUp /> Import CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={loadExample} disabled={busy}>
          Use the example file
        </Button>
      </div>

      {busy && <ListSkeleton rows={3} label="Reading the wells file" />}

      {status.kind === "done" && (
        <p className="text-xs text-ok">
          {status.count} wells from {status.file} are on the map{status.rejected.length ? `, ${status.rejected.length} rows skipped` : ""}.
        </p>
      )}

      {rejected.length > 0 && (
        <ErrorState
          title={status.kind === "failed" ? `No wells imported from ${status.file}` : `Some rows in ${status.kind === "done" ? status.file : "the file"} were skipped`}
          hint={`Line ${rejected[0].line}: ${rejected[0].reason}.`}
          retryLabel="Choose a fixed file"
          onRetry={() => fileRef.current?.click()}
        >
          {rejected.length > 1 && (
            <ul className="mt-1 w-full space-y-0.5 text-xs text-muted-foreground">
              {rejected.slice(1, 6).map((r) => (
                <li key={r.line}>
                  Line {r.line}: {r.reason}
                </li>
              ))}
              {rejected.length > 6 && <li>and {rejected.length - 6} more</li>}
            </ul>
          )}
        </ErrorState>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" className="flex-1" onClick={download} disabled={busy}>
          <Download /> Export assignments (CSV)
        </Button>
        {importedFrom && (
          <Button variant="ghost" size="sm" onClick={clear} disabled={busy}>
            <RotateCcw /> Sample wells
          </Button>
        )}
      </div>
    </div>
  );
}
