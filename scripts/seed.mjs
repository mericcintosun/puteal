// Writes the sample village to fixtures/charpara.seed.json.
// Run with: npm run seed (node --experimental-strip-types scripts/seed.mjs)
// Deterministic and idempotent: the same seed module always gives the same bytes.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_VILLAGE } from "../lib/data/seed.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..", "fixtures", "charpara.seed.json");

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(SAMPLE_VILLAGE, null, 2) + "\n", "utf8");

console.log(
  `seed: wrote ${SAMPLE_VILLAGE.households.length} households and ${SAMPLE_VILLAGE.wells.length} wells (sample data) to fixtures/charpara.seed.json`
);
