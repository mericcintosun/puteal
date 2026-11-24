# HANDOFF: Puteal

You are picking up a working Next.js 15 scaffold. Read this file, then `IDENTITY.md`, then start on the Mission list. Keep `npm run build` passing after every change.

## 1. Context

**Product:** Puteal. A village map for arsenic-affected Bangladesh that sends every household to a safe tubewell along real footpaths, keeps any one pump from getting crowded, and shows where the next deep well would bring the most people back within reach.

**Plain pitch:** You open a village map. Wells show as red (arsenic over the limit) and green (safe) points. The app draws which safe well each house should walk to, and makes sure no well gets overcrowded. Tap an empty spot and say "what if we drilled a deep well here", and you instantly see how many fewer people are left far from safe water. Every house also gets a printable route card.

**Hackathon:** Acodemic X KeebsforWater Global SDG Hackathon (Devpost, organised with Hack Club).
**Deadline:** 30 Nov 2026, 23:45 EST (1 Dec 2026, 04:45 UTC).
**Target track:** 1st Place ($20). 2nd ($10) and 3rd ($5) come from the same pool; one submission enters all three.
**Judging (unweighted):** SDG Impact & Relevance; Creativity & Originality; Execution & Functionality.

**Submission requirements (verified from the event record):**
- Public project link (live site). Ours: https://puteal.vercel.app
- Project description: purpose, the problem addressed, target audience, and the link to a UN SDG (README already covers this; SDG 6.1).
- At least three screenshots. Suggested: story chapter 3 (capped walks), story chapter 5 (deep well dropped), `/play` with a route card open.
- Tech stack list (languages, frameworks, platforms, APIs, tools).
- Source code repository link.
- Optional demo video, 1 to 5 minutes.
- The project must contain a functional digital component clearly tied to at least one SDG.
- Eligibility: students aged 13 and over only. Confirm the builder qualifies before submitting.

## 2. Current state

Identity: see IDENTITY.md (direction D8, structure S6, archetype L3, kit K3)

### Routes (Structure S6 story-scroll)

| Route | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.tsx` + `components/story-scroll.tsx` | Editorial column: kicker, headline, standfirst, scene 1, then five scroll chapters driving one pinned live village plan; primary CTA mid-article (chapter 3); last chapter lets the reader drop deep wells and links to `/play`; coda with scene 2 |
| `/play` | `app/play/page.tsx` + `components/planner.tsx` | Free-form planner: MapLibre map, limit and capacity toggles, deep-well drop, OSM loader, readout, wells list, route card |
| `/notes` | `app/notes/page.tsx` | Appendix: method, assumptions, real vs sample, prior tools, stack, sources; numbers computed by the engine at build time; scene 3 |

All three are linked from the header nav (`components/site-header.tsx`).

### File map

- `lib/data.ts`: types, constants (4.2 people per household, 500 m, detour 1.3, limits 10 and 50), sample village Charpara (6 hamlets, 9 footpaths, 12 wells, 100 deterministic households), `PROPOSED_DEEP_WELL`, `proposeDeepWell()`.
- `lib/engine.ts`: walking graph (`buildGraph`), binary-heap Dijkstra, `prepareVillage`, `solve` (regret-ordered capacity-aware assignment plus KPIs), `routeFor`, geo helpers `toLngLat` / `toMeters`, formatters.
- `lib/overpass.ts`: `loadOsmVillage()` makes a **real** Overpass API call (keyless) for buildings and walkable ways, caches in localStorage, and returns a `Village` in the same meter frame.
- `components/village-plan.tsx`: SVG renderer of the engine output (used by the story, and by `/play` when WebGL fails) plus `PlanLegend`.
- `components/village-map.tsx`: MapLibre GL view on OSM raster tiles; colors read from CSS tokens at runtime.
- `components/route-card.tsx`: printable household card (`@media print` rules in `app/globals.css`).
- `components/smooth-scroll.tsx`: Lenis root, not mounted under reduced motion.
- `components/ui/*`: shadcn primitives restyled for D8 (soft 0.375rem radius, LINE border, lighter top edge, orange fill only on the primary action).
- `public/logo.svg`, `app/icon.svg`, `app/opengraph-image.tsx`, `public/illustrations/scene-{1,2,3}.svg`.

### Real vs mocked

- Real: the engine, the MapLibre map, OSM tiles, the Overpass fetch in `loadOsmVillage()`.
- Sample: every arsenic value and the Charpara layout in `lib/data.ts` (`WELLS`, `HAMLETS`, `PATHS`, `scatterHouseholds`). There is no mock adapter function; the gap is a missing data import (see Mission item 3).
- Not yet built: Web Worker (the solver runs on the main thread; fine for the sample and for up to ~700 OSM buildings).

### Interaction kit K3

- Shipped, signature 1: `<ReactLenis root>` in `components/smooth-scroll.tsx`, plus the chapter rail in `components/story-scroll.tsx` whose fill is a `motion.div` bound to `useScroll().scrollYProgress`; the rail's chapter buttons jump with `lenis.scrollTo` and each chapter switches the live plan's engine state.
- Remaining, signature 2: parallax depth. In the home coda, move `<SceneSlot n={2}>` and its paragraph at different rates via `useTransform` (two layers minimum, content visible in server HTML).
- Remaining, signature 3: a sticky chapter section where vertical scroll drives horizontal movement of the product's steps. Good fit: the method on `/` or `/notes` as a horizontal strip "path graph, Dijkstra, capacity cap, route card" that slides sideways while pinned. Do not use a `role="tablist"` numbered stepper.

### One-mark proof (header home link, `components/site-header.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2">
  <BrandMark />
  <span className="font-display text-lg font-semibold tracking-tight">Puteal</span>
</Link>
```

## 3. Mission (prioritized, about 11 hours of build left)

1. **Verify the live OSM path (1.5 h).** Run `/play`, press "Load OSM buildings and paths". The default bbox centres on 23.7815 N, 90.6395 E (Araihazar area, unverified). If buildings are sparse, try nearby village centres and update `SAMPLE_VILLAGE.origin` so the sample wells land on built-up ground. Save the chosen response as a static fallback JSON in `public/` and load it when Overpass fails. Done = the button reliably fills the map with real buildings and the readout updates.
2. **Web Worker solver (1.5 h).** Move `prepareVillage` + `solve` into a worker for OSM villages; keep the main-thread path for the story. Done = dropping a well on a 700-building village responds in under 200 ms with no jank.
3. **Well editing and CSV import (2 h).** Click a well to edit its arsenic value with the `Input` primitive; a CSV import (`name,lat,lon,arsenic,depth_m,capacity`) replaces the sample wells. Label sample values "sample" everywhere they show. Done = a field team can load its own results and every number reflects them.
4. **Wow moment polish (1.5 h, schedule on day 2 morning).** In chapter 5 and on `/play`, animate the far-people count from old to new value and draw a short delta line ("340 to 85"-style, with real numbers). Rehearse: drop a deep well at the red-dashed cluster, lines redistribute, count drops. Done = the drop feels instant and the delta is obvious from across a room.
5. **Kit signatures 2 and 3 (1.5 h).** As described above. Respect reduced motion and keep server HTML readable.
6. **Route card polish (1 h).** Small route sketch on the card (reuse `VillagePlan` with the route only), Bangla line optional. Done = printed card is readable in black and white.
7. **Mobile check (1 h).** Sticky plan height on small screens, planner sidebar stacking, tap targets.
8. **Submission (1 h).** Three screenshots, README review, Devpost form, optional 90 s video.

Demo flow to rehearse (90 s): open `/`, scroll chapter 1 (village, red and green), chapter 2 (nearest only, one pump far over capacity), chapter 3 (capped, orange route for one shifted household), chapter 4 (WHO line, far count jumps), chapter 5 (proposed deep well, then drop your own and watch the count fall). Then `/play`, load OSM, click a house, print the card.

## 4. Constraints

- Stack: Next.js 15 App Router, TypeScript strict, Tailwind CSS v4 (no tailwind.config, no `@tailwind` directives), shadcn primitives in `components/ui/`, deploys to Vercel (no custom server, no runtime file writes).
- `IDENTITY.md` is law for every color, font, route, layout and animation decision. Colors only through tokens in `app/globals.css`; no raw hex in components. Space Grotesk for every h1/h2, IBM Plex Sans for body. Radius 0.375rem everywhere. Home stays one column at every breakpoint: no stat tiles, no two-column grid at lg. Motion is the `puteal-wipe` clip-path reveal only, disabled under reduced motion. Append dated lines under the Amendments heading if you must record a decision; never edit above it.
- Copy: English, human tone, numbers inside sentences. No em dashes or en dashes, no double hyphens as dashes. No marketing buzzwords or AI-cliche vocabulary; write like a builder explaining the thing to a friend. Never present sample data as survey data.
- Scope: if something threatens the deadline, cut scope rather than polish. The story plus a working `/play` beats a half-finished worker.
- Run `npm run build` after every change and keep it green.

## 5. Definition of done

- Deployed on Vercel at https://puteal.vercel.app, README demo link live.
- The 90-second flow above works end to end on the sample village with no console errors.
- The deep-well wow moment is rehearsed: one drop visibly cuts the far-from-safe-water count.
- Three screenshots, tech stack and repo link added to the Devpost submission before 30 Nov 2026, 23:45 EST.

## Phase 1: walking skeleton, seams and demo contract

**Goal.** Every step of the 90 second demo renders sample data through a typed adapter and API stubs, the shell looks like a product, and the demo path is written down in `DEMO.md`, so Phase 2 can swap fake data for real data without touching pages.

**Status.** All five slices written. Nothing was built or run by the agent; `npm run build` and `npm run seed` are unverified until the runner executes them. Mission items 1 to 3 in section 3 (live OSM with fallback, Web Worker, well editing and CSV import) belong to Phase 2.

**Decisions.**
- `lib/data.ts` is now a barrel (`export * from "./types"; export * from "./data/seed";`), so every existing `@/lib/data` import still resolves. Values and ids in `lib/data/seed.ts` are unchanged: 12 wells, 100 households from the same `mulberry32(6061)` scatter.
- `lib/types.ts` holds the model, `ApiResponse<T>`, `SolveRequest` and an `AdapterMode` type; it re-exports `Solution` from `lib/engine.ts` with `export type`.
- `PutealAdapter` carries a `mode` field ("fake" or "real") so the API routes can fill `ApiResponse.mode` without a second env read.
- `getAdapter()` returns `fakeAdapter` unless `ADAPTER_MODE` equals `"real"`. `realAdapter` throws "real adapter lands in Phase 2" from both methods.
- Server pages (`app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`) are async and read the village through `getAdapter().getVillage()`; `StoryScroll` takes `village`, `Planner` takes `initialVillage`. The browser still solves with `lib/engine.ts` directly.
- `/api/solve` solves against the adapter's village plus `extraWells`; malformed JSON or a wrong shape returns 400 with `code: "bad_request"`. Adapter failures return 500 with `code: "adapter_error"` and no internal message.
- `app/globals.css`: one `@theme static` block now carries the 11 IDENTITY hexes (`--color-ground`, `--color-surface`, `--color-deep`, `--color-line`, `--color-ink`, `--color-ember` for ACCENT, `--color-on-ember`, `--color-olive`, `--color-ok`, `--color-warn`, `--color-bad`), the 0.375rem radius, a 4px spacing base and a named type scale. `:root` aliases point at those variables and carry no hex. It changed from `@theme inline` to `@theme static` so the palette variables are always emitted; `components/village-map.tsx` reads the aliases at runtime. Check the rendered colors once after the first build.
- Home page title uses `{ absolute: ... }` so the default title is kept; `/play` is "Planner", `/notes` is "Method and sources", the 404 is "Page not found".

**Failed attempts.** None.

**Files changed.**
- New: `lib/types.ts`, `lib/data/seed.ts`, `lib/adapter.ts`, `scripts/seed.mjs`, `app/api/village/route.ts`, `app/api/solve/route.ts`, `app/loading.tsx`, `app/play/loading.tsx`, `app/notes/loading.tsx`, `DEMO.md`, `CLAUDE.md`
- Edited: `lib/data.ts`, `package.json` (seed script), `.env.example`, `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`, `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `components/story-scroll.tsx`, `components/planner.tsx`, `components/village-map.tsx`, `components/site-header.tsx`, `app/globals.css`, `README.md`, `HANDOFF.md`
- Unchanged and checked: `.gitignore` (already has `.env*` and `!.env.example`), `app/icon.svg` (Puteal mark), `tsconfig.json` (`"strict": true`), `next.config.ts` (no `output: "export"`)

**Commands run.** None, the agent has no shell.

**Open questions.**
- `lib/brand-files.ts` reads `process.env.NEXT_PUBLIC_BRAND_FILES`, which `next.config.ts` sets at build time. It is not in `.env.example`; adding it would mean a new env line beyond `ADAPTER_MODE`, so it is left out and documented in `CLAUDE.md`. Decide whether to mirror it.
- `npm run seed` needs Node 22.6 or later for `--experimental-strip-types`. If the runner's Node is older, the fix is a Phase 2 note (newer Node), not a new dependency.
- `DEMO.md` closing line has an X for the people brought back by the proposed deep well. The story computes it at render time and the agent could not run the engine; read it from chapter 5 after the first deploy and write it in.

**Unmet or unverified items.**
- Build green, seed byte-identical twice, deploy, `/api/village` returning `mode: "fake"`, and a clean browser console: runner checks, not verified here.
- `DEMO.md` closing line uses X instead of the real number (see above).
- `lib/engine.ts:221` and similar section comments use decorative runs of hyphens (`/* ---------- assignment ---------- */`). Not touched this phase, since the engine was out of scope; swap them for plain comments in Phase 2.

**Next best step.** Phase 2: live OSM path with a static fallback JSON in `public/`, the solver in a Web Worker, well editing and CSV import, all behind `realAdapter`; then `npm run proof` and `.farm-live.json`.

## Phase 2: the walking engine runs on real OpenStreetMap

**Goal.** DEMO.md step 5 becomes real: with `ADAPTER_MODE=real` the household layout and footpaths come from live OpenStreetMap through a server-side Overpass call, the capacity-aware Dijkstra in `lib/engine.ts` runs on it, and the chapter 5 deep-well drop lowers the "people over 500 m" count on real streets.

**Status.** Slices 1 to 4 written. Slice 5 (Web Worker) skipped to stay inside the budget; the solver still runs on the main thread, and live mode keeps at most 700 buildings (`CONFIG.maxBuildings`). Nothing was built, tested or run by the agent.

**Which mechanism went real.** One: the live OSM village (buildings become households, walkable ways become footpaths) feeding the existing engine, through `realAdapter` behind the selector.

**What stays fixtures.** Well arsenic values and the 12 wells (no public per-well test dataset was found), `PROPOSED_DEEP_WELL`, the 4.2 people per household assumption, the hamlet list (each OSM building joins its nearest sample hamlet so the story's hamlet names still hold), and the origin. `lib/data/seed.ts` is unchanged.

**Live-mode contract.** `.farm-live.json` is `{ "requiredEnv": [], "optionalEnv": ["OVERPASS_URL"] }`. `requiredEnv` is empty because Overpass is a public, keyless API, so the real adapter needs no secret and the live site can switch to `ADAPTER_MODE=real` on its own. `.gitignore` gained `!.farm-live.json` so the contract file can be committed despite the `.farm-*` rule.

**Decisions.**
- `lib/config.ts` is the only reader of `OVERPASS_URL` and `ADAPTER_MODE`. `lib/brand-files.ts` still reads `NEXT_PUBLIC_BRAND_FILES` (pre-existing, set by `next.config.ts`, not a secret).
- `lib/overpass.ts` (planner button): the smaller change was to stop calling Overpass from the browser. It now calls `GET /api/village?live=1`, so the client imports neither `CONFIG` nor `lib/osm.ts`, and no client file can reach `process.env`. The localStorage cache is gone; the server's module cache (10 minutes) replaces it. `getAdapter({ live: true })` returns the real adapter in any mode for that one query; `lib/adapter.ts` stays the only module that branches on the mode.
- `Village` gained an optional `layoutTier` ("live", "snapshot", "fallback"). The real adapter sets it together with `source` and `place`. The source line (`lib/source-line.ts`) reads `mode`, `village.source` and `layoutTier`, never `place` text.
- Cache: whatever tier answered is cached for `CONFIG.cacheTtlMs`, fallbacks included, so a down Overpass does not cost 16 seconds on every request.
- Retry: `fetchOverpassElements` makes 1 + `CONFIG.overpassRetries` attempts (capped at 2 in code); a parse failure is not retried.
- Pages stay statically rendered. In real mode, the layout is fetched when the page is prerendered at build time (live, else snapshot, else sample) and stays until the next deploy; `/api/village` is dynamic and answers per request. No `revalidate` was added; see Open questions.
- The snapshot holds slimmed Overpass elements (only `building`, `highway`, `name` tags, 6-decimal coordinates) and is parsed with the same `overpassResponseSchema`.
- `/api/village` validates its query (`live` must be "0" or "1") with `villageQuerySchema` before anything else; `/api/solve` uses `solveRequestSchema`. Failures are `{ ok: false, error, hint }` with status from `statusFor` in `lib/errors.ts`.
- `PutealAdapter` moved to `lib/types.ts`; `lib/adapter.ts` re-exports it and `fakeAdapter`. `fakeAdapter` moved unchanged to `lib/adapter.fake.ts`.
- Story copy on `/`, the home standfirst and `/notes` switch wording on `village.source` so the OSM layout is not called a sample village. The chapter 5 drop code is unchanged and has no branch on mode.
- The decorative hyphen comments in `lib/engine.ts` (Phase 1 open item) became plain comments.
- `scripts/proof.ts` silences `console.info` so stdout carries one line per proof; the adapter's `[core]` step logs still show on the server.

**Failed attempts.** None.

**Files changed.**
- New: `lib/config.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/osm.ts`, `lib/adapter.fake.ts`, `lib/adapter.real.ts`, `lib/source-line.ts`, `.farm-live.json`, `vitest.config.ts`, `lib/engine.test.ts`, `lib/osm.test.ts`, `lib/schemas.test.ts`, `fixtures/osm-mini.json`, `scripts/proof.ts`, `.farm-commits.json`
- Edited: `lib/adapter.ts`, `lib/overpass.ts`, `lib/types.ts`, `lib/engine.ts` (comments only), `next.config.ts`, `.env.example`, `.gitignore`, `package.json`, `app/api/solve/route.ts`, `app/api/village/route.ts`, `components/planner.tsx`, `components/story-scroll.tsx`, `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`, `README.md`, `DEMO.md`, `CLAUDE.md`, `HANDOFF.md`

**Commands run.** None, the agent has no shell.

**Open questions.**
- Should `/` and `/play` revalidate (for example every 10 minutes) so a build that fell back to the sample can pick up the live layout later? Left static for predictability; the committed snapshot covers most of the gap.
- The centre point (23.7815 N, 90.6395 E) is still unverified on the ground. If `npm run proof` reports fewer than 5 buildings or a sparse layout, move `SAMPLE_VILLAGE.origin` (a seed change, so a deliberate decision).
- With up to 700 buildings at 4.2 people each and the 12 sample wells, many pumps will be full in live mode; chapter text still reads correctly but the far counts are larger than on the sample.

**Unmet or unverified items (evidence).**
- Build, `npm test` and `npm run proof`: not run by the agent. The engine snapshot file `lib/__snapshots__/engine.test.ts.snap` is written on the first `npm test` run and should be committed.
- Slice 5, Web Worker: not done (`components/planner.tsx` still calls `solve` in `useMemo`).
- `lib/overpass.ts` does not import `lib/osm.ts` or `CONFIG` as the spec first suggested; it calls `/api/village?live=1` instead (the option the spec allowed), see `lib/overpass.ts:1`.
- Engine invariants in `lib/engine.test.ts` (proposed well never raises the far count, WHO far count not below Bangladesh) hold by reasoning on the sample, not by a proof for every village; the greedy pass does not guarantee them in general.
- DEMO.md closing number lives in the `demo-closing` marker block and is written by `npm run proof`; until then it reads "Not run yet".
- Live spot check on https://puteal.vercel.app with `ADAPTER_MODE=real`: runner and human task.

**Manual checklist.**
- Confirm the builder is a student (13 or over) before submitting.
- After `npm run proof`, commit `fixtures/osm-charpara.json` and the rewritten README.md and DEMO.md blocks.
- Set `ADAPTER_MODE=real` on Vercel production, redeploy, check that the source line names OpenStreetMap, that the chapter 5 drop lowers the far count, and that `/api/village` answers `mode: "real"`.
- Set `ADAPTER_MODE=fake` once and check the sample line shows.

**Next best step.** Phase 3: well editing and CSV import behind the adapter, then the Web Worker if the live layout feels slow on a phone.

## Phase 3: planner state, import and export on the real path

**Goal.** Make the 90 second path hold up, share and check on the real layout: a named fallback in code for every DEMO.md step, the planner's state in its URL, a field worker's own wells in by CSV and the assignments out by CSV, and Skeleton, ErrorState and EmptyState branches on every demo route.

**Status.** Slices 1 to 5 written. Slice 6 (Web Worker): deferred. Nothing was built, tested or run by the agent.

**Decisions.**

Persistence. Chosen row: "Steps only read seeded or computed data", so no store.
- The village comes from the adapter (OSM, snapshot or sample).
- The solve is pure and in memory.
- Planner state lives in URL params and component state; imported wells live in component state only.
- Rejected: KV (no demo step needs a mutable shared list), Postgres (no joins), on-chain (no chain).
- So `lib/store.ts` does not exist, there is no store secret, and the template's write-path guards do not apply. `POST /api/solve` is a pure function of its body, so repeats return the same result.
- Reset: there is no store and no chain, so reset means regenerating `fixtures/charpara.seed.json` (`npm run demo:reset`, which runs `npm run seed`) and nothing else. Browser state is cleared by loading `/play` without parameters. No migration command exists, because there is no store.
- `.env.example` and `.farm-live.json`: no new keys. Checked, both unchanged.

Fallback map (one row per DEMO.md step):

| Step | Real path (file, symbol) | Fallback (file, symbol) |
| --- | --- | --- |
| 1. Chapter 1, the village | `app/page.tsx` `loadVillage` calls `getAdapter().getVillage()`; in real mode `lib/adapter.real.ts` `loadVillage` (live Overpass, then `snapshotVillage`, then `SAMPLE_VILLAGE`) | `app/page.tsx` `loadVillage` catch returns `fakeAdapter.getVillage()` with mode "fake" |
| 2. Chapter 2, nearest is not enough | same `app/page.tsx` `loadVillage`; `components/story-scroll.tsx` solves in the browser | same catch in `app/page.tsx` `loadVillage`; inside the real adapter the snapshot then sample chain in `lib/adapter.real.ts` `loadVillage` |
| 3. Chapter 3, share the load | same `app/page.tsx` `loadVillage` | same catch in `app/page.tsx` `loadVillage` |
| 4. Chapter 4, the WHO line | same `app/page.tsx` `loadVillage` | same catch in `app/page.tsx` `loadVillage` |
| 5. Chapter 5, the next well | same `app/page.tsx` `loadVillage`; the drop runs `solve` client side in `components/story-scroll.tsx`, no network | same catch in `app/page.tsx` `loadVillage`; `lib/source-line.ts` `sourceLine` names the tier that answered |
| 6. Planner | `app/play/page.tsx` `loadVillage` (adapter raced against `VILLAGE_BUDGET_MS`, 4 s) plus `parsePlannerQuery` in `lib/planner-url.ts`; "Load OSM" runs `components/planner.tsx` `loadOsm` through `/api/village?live=1` | `app/play/page.tsx` `loadVillage` catch returns `fakeAdapter`; a bad link falls back per field in `parsePlannerQuery`; `loadOsm` failure shows `ErrorState` in the Village layout card with the sample still on the map; a bad CSV keeps the current wells (`components/wells-import.tsx` `apply`) |
| 7. Method notes | `app/notes/page.tsx` `loadSections` calls `getAdapter().getVillage()` and `buildSections` | `app/notes/page.tsx` `loadSections` catch builds the sections from `fakeAdapter.getVillage()` |

Other decisions.
- `/play` now reads `searchParams`, so it renders per request instead of at build. In real mode a cold instance would wait on Overpass (up to two 8 s tries), so the page races the adapter against a 4 s budget and serves the sample village past it. `/` and `/notes` stay static.
- `plannerQuerySchema` (zod, `lib/schemas.ts`) checks each field; `parsePlannerQuery` parses them one by one so a bad `limit` keeps a good `add`. Any ignored field sets the existing `invalid_input` code and the planner shows a dismissible line. More than 20 wells drops the `add` field entirely.
- The default plan keeps a clean `/play` address; any other state is written with `window.history.replaceState`, no navigation. Imported wells are not in the URL (40 rows would not fit well); the planner says so when wells are imported.
- Imported wells get `testedOn: "imported"` and ids `import-N` (`isImportedWell`), with depth 0 and kind "shallow" because the CSV has no depth column, and capacity 100 when the column is missing. No type or zod model change. The readout, the Wells card and `sourceLine` switch wording to "imported test values" when they replace the sample wells.
- Rows more than 5 km from the village centre are rejected as a likely lat/lon typo.
- `exportAssignmentsCsv` takes its distance from the assignment (`Assignment.meters`, the same figure the route card shows) and `walkMinutes`; it does not call `routeFor`, because the route points are not needed for the numbers.
- `fixtures/wells-example.csv` holds the 12 sample well positions turned back into lat/lon with the inverse of `toMeters` (formula in `lib/wells-example.ts`), one changed value (Haque bari pump 9 instead of 22) and one deliberate bad row (2500 µg/L, line 14) so the rejected-rows list shows. `lib/wells-example.ts` is the same text as a string; `npm run proof` warns if they drift.

**Failed attempts.** None.

**Files changed.**
- New: `components/states.tsx`, `components/wells-import.tsx`, `app/play/error.tsx`, `app/notes/error.tsx`, `lib/planner-url.ts`, `lib/planner-url.test.ts`, `lib/wells-csv.ts`, `lib/wells-csv.test.ts`, `lib/wells-example.ts`, `fixtures/wells-example.csv`, `.farm-commits.json`
- Edited: `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`, `app/loading.tsx`, `app/play/loading.tsx`, `app/notes/loading.tsx`, `app/error.tsx`, `components/planner.tsx`, `lib/schemas.ts`, `lib/source-line.ts`, `package.json`, `scripts/proof.ts`, `README.md`, `DEMO.md`, `HANDOFF.md`
- Checked, unchanged: `lib/adapter.ts`, `lib/adapter.real.ts`, `lib/adapter.fake.ts`, `scripts/seed.mjs`, `.env.example`, `.farm-live.json`

**Commands run.** None, the agent has no shell.

**Open questions.**
- Should imported wells travel in the share link (for example as a compressed param)? Left out for now.
- Should `/play` stay per request, or move the URL read to the client under `<Suspense>` so the page can be static again? The spec asked for the server read; the 4 s budget covers the cold-start risk.
- `components/scene-slot.tsx:22` and `components/brand-mark.tsx:11` render raw `<img>`. Both predate this phase, brand-mark is on the never-touch list and the illustrations keep their current loader, so they were left alone.

**Unmet or unverified items (evidence).**
- Build, `npm test` (new: `lib/planner-url.test.ts`, `lib/wells-csv.test.ts`) and `npm run proof` (new block `planner-roundtrip` in README.md): not run by the agent.
- Slice 6, Web Worker: deferred; `components/planner.tsx` still calls `solve` in `useMemo`.
- The export does not use `routeFor` (see Decisions).
- Live walk of DEMO.md steps 1 to 7 three times, the `/play?limit=10&cap=1&add=...` link check, the CSV import and export on https://puteal.vercel.app: runner and human tasks.

**Manual checklist.**
- After `npm run proof`, commit the rewritten `planner-roundtrip` block.
- On the live site open `/play?limit=10&cap=1&add=1255,185`, check the WHO toggle, the cap and one deep well are on; press "Use the example file", check 12 wells and one skipped row (line 14), then "Export assignments (CSV)".
- Confirm the builder is a student aged 13 or over before submitting.

**Next best step.** Phase 4: bounty and landing polish.

## Phase 4 start

- Current state: story, planner and notes work on the sample village and live OSM, with URL state, CSV in and out and the state triad; the header nav has no mobile disclosure and many demo-path controls are 32 to 36px tall.
- Phase goal: responsive audit and a below-md nav, the SDG 6.1 summary card on `/play` (DEMO step 8), DELIVERY.md, README and metadata polish, then the web hygiene sweep and SECURITY.md.
- Files to touch: `components/site-header.tsx`, `components/planner.tsx`, new `components/sdg-card.tsx`, `components/route-card.tsx`, `components/wells-import.tsx`, `components/story-scroll.tsx`, `components/states.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/notes/page.tsx`, `app/globals.css`, `DEMO.md`, `README.md`, new `DELIVERY.md`, new `SECURITY.md`, `HANDOFF.md`, `.farm-commits.json`.

## Phase 4: judge-facing polish, second wow, security pass

**Goal.** Make every demo route usable at 360, 768 and 1280 px with a mobile nav, add the SDG 6.1 summary card on `/play` as DEMO step 8, write the submission surface (DELIVERY.md, README, metadata, landing copy), then sweep web hygiene and write SECURITY.md.

**Status.** Slices A1, A2, A3 and B1 written. Nothing was cut. Nothing was built, tested or run by the agent.

**No bounty.** The event has no `sponsor-bounty` track, so no sponsor integration was built; README keeps an empty bounty table and says so in one sentence.

**Contracts.** `contracts/` does not exist, so the contract front was skipped: no `lib/config.ts` address work and no REDEPLOY line.

### Responsive audit (A1)

| File | Element | Rule | Result |
| --- | --- | --- | --- |
| `components/site-header.tsx` | nav links `py-1.5` (about 32px), no small-screen menu | 44px target, below-md disclosure | fixed: `md:hidden` button (`min-h-11 min-w-11`, `aria-expanded`, `aria-controls`), panel with all three links at `min-h-11`, inline list `hidden md:flex`, closes on route change and Escape |
| `components/story-scroll.tsx` | chapter jump buttons `h-7` | 44px target | fixed: `min-h-11`; the list is one row with `overflow-x-auto` so five 44px buttons do not stack inside the sticky pane |
| `components/story-scroll.tsx` | chapter 5 Undo, Clear, planner link (`h-8`) | 44px target | fixed: `min-h-11`; the long link may wrap (`whitespace-normal`) |
| `components/planner.tsx` | limit and crowding toggles (`h-8`), drop button (`h-9`), reset icon (`h-9 w-9`), copy link, Dismiss, OSM buttons | 44px target | fixed: `min-h-11` or `size-11` |
| `components/planner.tsx` | grid children could be widened by the long share URL input | `min-w-0` on flex and grid children | fixed: `grid-cols-1` below lg, `min-w-0` on both columns |
| `components/planner.tsx` | imported file name in the readout and Wells card, well names | long strings | fixed: `break-words` plus `title`; well names keep `truncate` and gain `title` |
| `components/route-card.tsx` | close button `h-7 w-7`, Print card `h-8` | 44px target | fixed: `size-11`, `min-h-11`; title and description `break-words`, header text `min-w-0` |
| `components/wells-import.tsx` | Import CSV, example, export, sample wells buttons (`h-8`) | 44px target | fixed: `min-h-11` |
| `components/wells-import.tsx` | rejected-rows list, file name in the status line | wide block, long strings | fixed: list `max-h-40 overflow-y-auto break-words` with `title` per row; status `break-words` with `title` |
| `components/states.tsx` | ErrorState and EmptyState buttons (`h-8`), titles carrying file names | 44px target, long strings | fixed: `[&_button]:min-h-11` and `[&_a]:min-h-11`; title `break-words` with `title` |
| `app/not-found.tsx` | single button `h-9` | 44px target | fixed: `min-h-11`, plus a planner link |
| `app/error.tsx`, `app/play/error.tsx`, `app/notes/error.tsx` | link buttons inside ErrorState | 44px target | fixed through `components/states.tsx` |
| `app/notes/page.tsx` | source list with URLs | long strings | fixed: `break-words` on the list; `<details>` summaries are already about 48px |
| `app/page.tsx` | inline `/notes` link in the coda | 44px target | parked: an inline link inside a sentence, not a demo-path control |
| `components/village-map.tsx`, `components/village-plan.tsx` | map and SVG | fixed widths | clean: `w-full` and `h-full`, no fixed width above 360px |
| `app/play/page.tsx` | page shell | widths | clean: `max-w-6xl px-5`, intro `max-w-prose` |

Error and not-found boundaries: `app/error.tsx`, `app/play/error.tsx`, `app/notes/error.tsx` and `app/not-found.tsx` are segment boundaries, not `global-error.tsx`, so they render inside `app/layout.tsx` and the header and footer stay.

### Decisions

- `components/sdg-card.tsx` takes the planner's existing `baseline` (same village, limit and pump rule, no reader deep wells) and `solution`, and adds one small pure helper, `sdgSummary`, that only subtracts KPIs. It imports `lib/engine`, `lib/source-line`, `lib/types` (types only), `components/states`, `components/ui/*`, `lucide-react` and `motion/react`; all existed already.
- Card states: loading (Skeleton) while "Load OSM" is in flight, error (ErrorState) if a summary figure is not a finite number, empty (EmptyState with "Drop a deep well") when no deep well is dropped; the map and readout stay on screen in every state.
- The count uses `animate` from `motion/react` with the M4 curve over 600ms, from the before number down to the after number; `useReducedMotion()` shows the final value at once. The final number is also in an `sr-only` span.
- Print: two printable cards now share the planner. The route card carries `data-print-id="route"`, the SDG card `data-print-id="sdg"`. `app/globals.css` hides the SDG card in print unless its own button set `html[data-print="sdg"]` (removed on `afterprint`), and hides the route card when it is set. Ctrl+P keeps printing the route card as before.
- Metadata: `metadataBase` is `https://puteal.vercel.app` (literal, no env read), title template `%s | Puteal`, default "Puteal: safe wells for every household", a 150 character description, `openGraph` and `twitter.card: summary_large_image`. The og:image comes from the `app/opengraph-image.tsx` file convention; `app/icon.svg` stays a file convention. No separate twitter image exists, so X falls back to og:image.
- Landing: one added paragraph under the standfirst names the audience and SDG 6.1 and links to `#chapter-village` and `/play`. L3 column, the chapter 3 CTA and the wipe are unchanged.
- `.env.example` documents `NEXT_PUBLIC_BRAND_FILES` as a commented-out line (public, written by `next.config.ts`); no new env var, `.farm-live.json` unchanged.
- The Web Worker is still not built; README now says so in the stack list.

### Part B grep results

- Wallet: `eth_requestAccounts|eth_sign|personal_sign|ethereum|wallet|connect\(` (case-insensitive) over `app/`, `components/`, `lib/`: one hit, `components/story-scroll.tsx:81` `io.disconnect()`, an IntersectionObserver call. The wallet rules hold vacuously; no wallet footer added.
- Secrets: `sk-|PRIVATE_KEY|api_key|apikey`, 64-hex and 80+ char base64 runs over `app/`, `components/`, `lib/`: no matches.
- Env reads: `process.env.OVERPASS_URL` and `process.env.ADAPTER_MODE` (`lib/config.ts`), `process.env.NEXT_PUBLIC_BRAND_FILES` (`lib/brand-files.ts`, set by `next.config.ts`). All three are in `.env.example` now.
- Links: no `target="_blank"` anywhere. `http://` only in `app/icon.svg` (the SVG XML namespace). External links in `/notes` are https.
- Console: no `console.log` in `app/` or `components/` or `lib/`.
- Vercel: no `useSearchParams`; `/play` reads `searchParams` on the server. File system: `lib/adapter.real.ts:106` reads the snapshot (read only, Node runtime), `next.config.ts` lists `public/brand` at build time, `lib/osm.test.ts` reads a fixture in tests. No writes outside `scripts/`, no edge runtime file.
- Forms: CSV parsing stays in the browser (`components/wells-import.tsx`). `/api/solve` and `/api/village` validate with zod (`solveRequestSchema`, `villageQuerySchema`) and answer with the `lib/errors.ts` taxonomy; timeout and retry live in the real adapter. No gap found, nothing rewritten.
- Sameness: dead hexes, banned keyframes, `backdrop-blur`, `--delay:`, `--d:` all clean. Six-digit hexes only in `app/globals.css`, `app/opengraph-image.tsx`, `app/icon.svg`. No em or en dash and no spaced double hyphen in the repo outside `node_modules`. Banned vocabulary: no match in the repo. One `@keyframes`, `puteal-wipe`, covered by the reduced-motion block. Exactly one `BrandMark` in the header, inside the brand link.

### Failed attempts

None.

### Files changed

- New: `components/sdg-card.tsx`, `DELIVERY.md`, `SECURITY.md`, `.farm-commits.json`
- Edited: `components/site-header.tsx`, `components/planner.tsx`, `components/states.tsx`, `components/story-scroll.tsx`, `components/route-card.tsx`, `components/wells-import.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx`, `app/notes/page.tsx`, `app/globals.css`, `.env.example`, `DEMO.md`, `README.md`, `HANDOFF.md`
- Untouched: `components/brand-mark.tsx`, `public/logo.svg`, `public/illustrations/*`, `lib/data.ts`, `lib/engine.ts`, `.farm-live.json`, `IDENTITY.md`

### Commands run

None, the agent has no shell.

### Open questions

- Lenis is mounted without its `anchors` option, so the new `#chapter-village` link on `/` uses the browser's own jump; Lenis picks the position up afterwards. If it feels abrupt, add `anchors: true` to the options in `components/smooth-scroll.tsx`.
- `lib/engine.ts:4` still says the engine runs "next, inside a Web Worker". It describes a plan, not a shipped feature; left alone because the engine is out of scope.

### Unmet or unverified items (evidence)

- Build, `npm test`, `npm run proof`: not run by the agent. Risk spots for the build: `components/sdg-card.tsx` uses `animate(from, to, { ease, onUpdate })` and `useReducedMotion` from `motion/react`, and `components/site-header.tsx` imports `Menu` and `X` from `lucide-react`.
- `scripts/proof.ts` only rewrites marker blocks (`writeBlock("DEMO.md", "demo-closing", ...)`) and does not parse step numbers, so step 8 cannot break it; not run.
- Live checks at 360, 768 and 1280 px, the mobile menu, printing the SDG card, Lighthouse, view-source og:image: runner and human tasks.

### Manual checklist

- Open `/play?limit=10&cap=1&add=1255,185`: the SDG card shows before and after far counts, the sentence and the mean walk; press "Print summary" and check that only the card prints; then open a route card and Ctrl+P: only the route card prints.
- At 360px, open the header menu, reach all three routes, and check the chapter rail scrolls sideways.
- Confirm the builder is a student aged 13 or over, then work through DELIVERY.md.

### Next best step

Phase 5, the frontend pass: kit signatures 2 and 3 (parallax coda, sticky horizontal method strip), then a real-device check of the planner at 360px.
