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
