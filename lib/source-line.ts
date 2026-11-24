// The one honest line under each readout that says where the village layout came from.
// Pure: driven by the adapter mode and the village's own source fields, safe on the client.

import type { AdapterMode, Village } from "./types";

export function sourceLine(mode: AdapterMode, village: Village): string {
  if (village.source === "osm") {
    return village.layoutTier === "snapshot"
      ? "Saved layout: an OpenStreetMap snapshot of buildings and footpaths, fetched via Overpass. Well test values are sample data."
      : "Live layout: OpenStreetMap buildings and footpaths via Overpass. Well test values are sample data.";
  }
  if (mode === "real") return "Live OpenStreetMap was unavailable, so this is the sample village.";
  return "Sample data: the sample village Charpara, solved in your browser.";
}
