// npm run proof: three proofs, one summary line each on stdout, written between
// <!-- PROOF:BEGIN name --> and <!-- PROOF:END name --> markers in README.md and DEMO.md.
//   overpass: one real Overpass call with CONFIG and the shared query builder; on success it
//             also saves fixtures/osm-charpara.json, the snapshot the real adapter falls back to
//   engine:   solves the OSM layout (live, else the snapshot) at 10 µg/L with and without the
//             proposed deep well
//   tests:    not run here; the line names the command
// It never throws on a missing network, always exits 0 and stops itself after 110 seconds.
// Only scripts/ may write files; this is one of them.

import { promises as fs } from "fs";
import path from "path";
import { fetchOverpassElements, osmPlan } from "../lib/adapter.real";
import { CONFIG } from "../lib/config";
import { PROPOSED_DEEP_WELL, SAMPLE_VILLAGE, THRESHOLDS } from "../lib/data/seed";
import { prepareVillage, solve } from "../lib/engine";
import { codeOf } from "../lib/errors";
import { parseOsmElements, slimElements } from "../lib/osm";
import { overpassResponseSchema, type OverpassElement } from "../lib/schemas";
import type { Village } from "../lib/types";

// The adapter's [core] step logs go to console.info; keep stdout to one line per proof.
console.info = () => {};

const ROOT = process.cwd();
const today = new Date().toISOString().slice(0, 10);

const guard = setTimeout(() => {
  console.log("proof: stopped after 110 s, exiting 0");
  process.exit(0);
}, 110_000);
(guard as unknown as { unref?: () => void }).unref?.();

async function writeBlock(file: string, name: string, text: string): Promise<void> {
  const full = path.join(ROOT, file);
  const begin = `<!-- PROOF:BEGIN ${name} -->`;
  const end = `<!-- PROOF:END ${name} -->`;
  try {
    const src = await fs.readFile(full, "utf8");
    const a = src.indexOf(begin);
    const b = src.indexOf(end);
    if (a === -1 || b === -1 || b < a) {
      console.log(`proof ${name}: marker missing in ${file}, block not written`);
      return;
    }
    const next = `${src.slice(0, a + begin.length)}\n${text}\n${src.slice(b)}`;
    await fs.writeFile(full, next, "utf8");
  } catch {
    console.log(`proof ${name}: could not update ${file}`);
  }
}

interface Layout {
  village: Village;
  label: string;
}

async function proveOverpass(): Promise<Layout | null> {
  const plan = osmPlan();
  const host = new URL(CONFIG.overpassUrl).host;
  let fetched: { elements: OverpassElement[]; ms: number } | null = null;
  try {
    fetched = await fetchOverpassElements(plan.query);
  } catch (e) {
    const line = `Not run in this build: Overpass did not answer (${codeOf(e)}).`;
    console.log(`proof overpass: ${line}`);
    await writeBlock("README.md", "overpass", line);
    return null;
  }
  if (!fetched) return null;
  const { elements, ms } = fetched;

  let village: Village;
  try {
    village = parseOsmElements(elements, SAMPLE_VILLAGE, plan.parse);
  } catch (e) {
    const line = `Run on ${today}: Overpass (${host}) answered in ${ms} ms, but the layout could not be used (${codeOf(e)}), so no snapshot was saved.`;
    console.log(`proof overpass: ${line}`);
    await writeBlock("README.md", "overpass", line);
    return null;
  }

  let saved = "";
  try {
    const snapshot = { fetchedAt: new Date().toISOString(), source: host, elements: slimElements(elements) };
    const target = path.join(ROOT, CONFIG.snapshotPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(snapshot), "utf8");
    saved = ` Snapshot saved to ${CONFIG.snapshotPath}.`;
  } catch {
    saved = " The snapshot could not be saved.";
  }
  const line =
    `Run on ${today}: Overpass (${host}) answered in ${ms} ms with ${village.households.length} buildings kept ` +
    `(nearest ${CONFIG.maxBuildings} at most) and ${village.paths.length} walkable ways in a ${CONFIG.halfSizeM * 2} m square ` +
    `around the sample village centre.${saved}`;
  console.log(`proof overpass: ${line}`);
  await writeBlock("README.md", "overpass", line);
  return { village, label: "live OpenStreetMap layout" };
}

async function snapshotLayout(): Promise<Layout | null> {
  try {
    const raw = await fs.readFile(path.join(ROOT, CONFIG.snapshotPath), "utf8");
    const parsed = overpassResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { village: parseOsmElements(parsed.data.elements, SAMPLE_VILLAGE, osmPlan().parse), label: "saved OpenStreetMap snapshot" };
  } catch {
    return null;
  }
}

function farCounts(village: Village) {
  const started = Date.now();
  const prep = prepareVillage(village);
  const opts = { threshold: THRESHOLDS.who, capacitated: true };
  const before = solve(prep, village.wells, opts).kpis;
  const after = solve(prep, [...village.wells, PROPOSED_DEEP_WELL], opts).kpis;
  return { before: Math.round(before.farPeople), after: Math.round(after.farPeople), people: Math.round(before.people), ms: Date.now() - started };
}

async function proveEngine(layout: Layout | null): Promise<void> {
  const sample = farCounts(SAMPLE_VILLAGE);
  const sampleSentence =
    `On the sample village Charpara, one deep well by Char para brings ${sample.before - sample.after} people back within 500 m ` +
    `of safe water (${sample.before} to ${sample.after} far at 10 µg/L).`;

  if (!layout) {
    const line = "Not run in this build: no OSM layout available.";
    console.log(`proof engine: ${line}`);
    await writeBlock("README.md", "engine", line);
    await writeBlock("DEMO.md", "demo-closing", `${sampleSentence} The OpenStreetMap figure was not run in this build: no OSM layout available.`);
    return;
  }

  const r = farCounts(layout.village);
  const line =
    `Run on ${today} on the ${layout.label} (${layout.village.households.length} households, ${r.people} people at 4.2 per home, ` +
    `sample wells): at 10 µg/L, ${r.before} people live more than 500 m from their assigned safe well; with the proposed deep well ` +
    `by Char para, ${r.after}. That brings ${r.before - r.after} people back within 500 m. Graph build plus two solves took ${r.ms} ms.`;
  console.log(`proof engine: ${line}`);
  await writeBlock("README.md", "engine", line);
  await writeBlock(
    "DEMO.md",
    "demo-closing",
    `"One deep well by Char para brings ${r.before - r.after} people back within 500 m of safe water." Computed by lib/engine.ts ` +
      `in npm run proof on ${today}, on the ${layout.label} with sample wells. ${sampleSentence}`
  );
}

async function main() {
  let layout: Layout | null = null;
  try {
    layout = await proveOverpass();
  } catch {
    console.log("proof overpass: Not run in this build: unexpected error.");
  }
  if (!layout) layout = await snapshotLayout();
  try {
    await proveEngine(layout);
  } catch {
    console.log("proof engine: Not run in this build: unexpected error.");
  }
  console.log("proof tests: not run by this script; run npm test (vitest) for the engine, parser and schema tests.");
}

main()
  .catch(() => console.log("proof: unexpected error, exiting 0"))
  .finally(() => process.exit(0));
