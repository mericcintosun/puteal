// The one honest line under each readout that says where the village layout came from.
// Pure: driven by the adapter mode and the village's own source fields, safe on the client.
// `importedWells` is set by the planner when a field team's CSV replaced the sample wells.

import type { AdapterMode, Village } from "./types";

export function sourceLine(mode: AdapterMode, village: Village, opts: { importedWells?: boolean } = {}): string {
  const wells = opts.importedWells ? "Well test values are imported from your file." : "Well test values are sample data.";
  if (village.source === "osm") {
    return village.layoutTier === "snapshot"
      ? `Saved layout: an OpenStreetMap snapshot of buildings and footpaths. ${wells}`
      : `Live layout: OpenStreetMap buildings and footpaths. ${wells}`;
  }
  if (opts.importedWells) return `Sample layout of Charpara with your imported wells, solved in your browser. ${wells}`;
  if (mode === "real" && village.fallbackReason === "sparse") {
    return "OpenStreetMap maps only a few buildings around these wells so far, so this is the sample village. Well test values are sample data, since no public per-well test results exist for this place.";
  }
  if (mode === "real") return "Live OpenStreetMap was unavailable, so this is the sample village.";
  return "Sample data: the sample village Charpara, solved in your browser.";
}
