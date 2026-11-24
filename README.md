# Puteal

A village map for arsenic-affected Bangladesh that sends every household to a safe tubewell along real footpaths, keeps any one pump from getting crowded, and shows where the next deep well would bring the most people back within reach.

> Live demo: https://puteal.vercel.app

## The problem

About half of the tubewells tested in Bangladesh carry more arsenic than the WHO guideline of 10 µg/L (figure from keebsforwater.org). Drilling a deep well for every family is slow and expensive. The cheapest step that works is well switching: a family with a red-painted spout walks to a neighbour's pump that tested safe.

The odd part is that safe water is often close. Studies in Araihazar upazila found that around 90 percent of people live within about 100 m of a safe well, and switching still stays low. Two things get in the way. Nobody tells a household *which* well to use, and the few good pumps get crowded until the queue costs more than the risk feels worth.

The people who feel this are the field workers and student volunteers who paint the spouts and knock on doors. They have a test kit and a list of wells. They do not have a plan.

**Who it is for:** NGO field staff, union council health workers, and student volunteers running well-testing campaigns in arsenic-affected villages.

**SDG link:** UN SDG 6, target 6.1: universal and equitable access to safe and affordable drinking water. Puteal's output is the indicator itself, counted per village: how many people live more than 500 m from a safe source.

## The solution

Puteal turns a village into a walking graph and answers the question for every door.

1. **Walking graph.** Footpaths are cut into 25 m segments; houses and wells join at the nearest node. In live mode the houses and footpaths come from OpenStreetMap through the Overpass API.
2. **Capacity-aware assignment.** Dijkstra runs from every well that passes the chosen limit. Households are then served in order of regret (whoever loses most by being bumped picks first), and each takes the nearest safe pump that still has room. A pump in the sample is capped at 80 to 200 people.
3. **The limit is a switch.** Flip between Bangladesh's 50 µg/L and the WHO's 10 µg/L and watch wells turn red and the walks redistribute.
4. **The next deep well.** Click any spot to drill a deep well. The count of people beyond 500 m updates immediately, so a union council can compare sites before spending.
5. **Route cards.** Click a household to get a printable card: which well, its test result, distance along the path, minutes each way.

6. **Your own wells, and the plan out.** In the planner, import a CSV of the village's tested wells (`name,lat,lon,arsenic_ugl` plus an optional `capacity`, up to 40 rows; `fixtures/wells-example.csv` shows the shape). Each row is checked, bad rows are listed by line, and the readout then says the values are imported, not sample. "Export assignments (CSV)" downloads one row per household with its well, the walk in meters and minutes, and whether it is over 500 m. Both happen in the browser; nothing is stored on a server.
7. **Shareable plans.** The planner's address carries the limit, the pump cap and your deep wells (`/play?limit=10&cap=1&add=1255,185`), so a link opens the same plan.
8. **An SDG 6.1 statement.** Under the planner's readout, a summary card turns the plan into the target's own terms: people farther than 500 m from safe water before and after your deep wells, the people brought back within reach in one sentence, the mean walk, and the source line. It prints on its own.

The home page tells this as a five-chapter scroll story on one sample village, Charpara. Every number in the text is computed by the engine, not typed in. The `/play` route is the same engine with every control open, and `/notes` holds the method and sources.

**Honest about data:** all arsenic values are sample data unless you import your own wells CSV, and the Charpara layout is sample data too. We did not find a public per-well dataset to ship. In live mode the buildings and paths are real OpenStreetMap data, and a line under each readout says which layout you are looking at.

## Live mode

Set `ADAPTER_MODE=real` and the village layout comes from live OpenStreetMap: the server asks the public Overpass API for every building and walkable way in a 1.3 km square around the sample village, turns each building into a household of 4.2 people, and runs the same engine on it. The real adapter needs no key, so nothing else has to be configured. The wells, their sample arsenic values and the six hamlet names stay sample data; each mapped building joins its nearest sample hamlet.

The real adapter answers from the first source that works:

1. the server's own copy, if it is younger than 10 minutes;
2. a live Overpass call, 8 seconds per try with one retry;
3. the snapshot `fixtures/osm-charpara.json`, saved by `npm run proof`;
4. the sample village Charpara.

With `ADAPTER_MODE=fake` (or unset) everything runs on the sample village. In either mode the planner's "Load OSM buildings and paths" button asks the server for the live layout through `GET /api/village?live=1`.

Last proof of the live path:

<!-- PROOF:BEGIN overpass -->
Not run in this build: Overpass did not answer (upstream_error).
<!-- PROOF:END overpass -->

<!-- PROOF:BEGIN engine -->
Not run in this build: no OSM layout available.
<!-- PROOF:END engine -->

## Placements and sponsor tech

Puteal is entered in the Acodemic X KeebsforWater Global SDG Hackathon. One submission enters all three placements:

| Placement | Prize |
| --- | --- |
| 1st Place | $ 20 in cash |
| 2nd Place | $ 10 in cash |
| 3rd Place | $ 5 in cash |

| Bounty | Prize | Slots | Required tech | Code file | DEMO step |
| --- | --- | --- | --- | --- | --- |

The event publishes no sponsor bounty, and the three placements share one pool, so no row above is filled in and no sponsor integration was built.

The external services Puteal calls are all public and keyless:

- **Overpass API** (`lib/adapter.real.ts`, `lib/osm.ts`): the server fetches buildings and walkable ways for the village bounding box, checks the response with zod and converts it to the engine's meter frame.
- **OpenStreetMap raster tiles** through **MapLibre GL JS** (`components/village-map.tsx`).

## Tech stack

Next.js 15, React 19, TypeScript, Tailwind CSS 4, MapLibre GL JS 5, Motion 14, Lenis, zod 3, Vitest, Vercel, Overpass API, OpenStreetMap tiles.

- Next.js 15 (App Router), React 19, TypeScript (strict)
- MapLibre GL JS 5 over OpenStreetMap raster tiles
- Overpass API, called from the server, no key
- Hand-written walking graph, binary-heap Dijkstra and regret-ordered assignment in TypeScript (`lib/engine.ts`), running on the browser's main thread (no Web Worker is built; see "What we would build next")
- Lenis and Motion 14 for the scroll story and the SDG card's count
- Tailwind CSS 4 with shadcn-style components and lucide-react icons
- A typed data adapter (`lib/adapter.ts`) behind the pages and two JSON routes, `GET /api/village` and `POST /api/solve`
- zod 3 for request and Overpass response validation
- Vitest for tests, tsx for the proof script
- Hosted on Vercel

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are required. `.env.example` lists two optional ones: `ADAPTER_MODE` (default `fake`, which serves the sample village; `real` turns on live mode) and `OVERPASS_URL`, for pointing the server at another Overpass mirror.

```bash
npm test        # vitest: engine snapshot and invariants, OSM parser, request schemas, planner URL, wells CSV
npm run proof   # one live Overpass call, saves the snapshot, rewrites the proof lines above
```

`npm run seed` writes the sample village to `fixtures/charpara.seed.json` (Node 22.6 or later, for type stripping).

Last proof of the planner round trip (the example wells CSV through the planner's parser and the engine):

<!-- PROOF:BEGIN planner-roundtrip -->
Run on 2026-11-24: fixtures/wells-example.csv gives 12 valid wells and 1 rejected row. On the sample village at 10 µg/L with those wells, 67 people live more than 500 m from their assigned safe well (126 with the sample wells).
<!-- PROOF:END planner-roundtrip -->

## Resetting the demo

```bash
npm run demo:reset   # same as npm run seed
```

Puteal has no store and no chain: the village comes from the adapter, the solve runs in memory, and planner state lives in the URL and in the page. So a reset means regenerating `fixtures/charpara.seed.json` and nothing else. Browser state is cleared by loading `/play` without parameters. There is no migration command, because there is no database to migrate.

## What we would build next

- Move the solver into a Web Worker so OSM villages with thousands of buildings stay smooth (live mode keeps the nearest 700 buildings for now).
- Replace the greedy pass with an exact min-cost flow and compare the two on real villages.
- An "edit this well" panel next to the CSV import, and imported wells carried in the share link.
- Suggest the best deep-well site automatically by scoring every graph node.
- Bangla route cards.

## AI use

<!-- Adjust this section to each hackathon's disclosure rules. -->
We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
