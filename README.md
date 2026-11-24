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

1. **Walking graph.** Footpaths are cut into 25 m segments; houses and wells join at the nearest node. In the planner, the layout can come live from OpenStreetMap through the Overpass API.
2. **Capacity-aware assignment.** Dijkstra runs from every well that passes the chosen limit. Households are then served in order of regret (whoever loses most by being bumped picks first), and each takes the nearest safe pump that still has room. A pump in the sample is capped at 80 to 200 people.
3. **The limit is a switch.** Flip between Bangladesh's 50 µg/L and the WHO's 10 µg/L and watch wells turn red and the walks redistribute.
4. **The next deep well.** Click any spot to drill a deep well. The count of people beyond 500 m updates immediately, so a union council can compare sites before spending.
5. **Route cards.** Click a household to get a printable card: which well, its test result, distance along the path, minutes each way.

The home page tells this as a five-chapter scroll story on one sample village, Charpara. Every number in the text is computed by the engine, not typed in. The `/play` route is the same engine with every control open, and `/notes` holds the method and sources.

**Honest about data:** the Charpara layout and all arsenic values are sample data. We did not find a public per-well dataset to ship. The buildings and paths loaded in the planner are real OpenStreetMap data.

## Required and sponsor tech

There is no sponsor SDK for this hackathon. The external services Puteal calls are all public and keyless:

- **Overpass API** (`lib/overpass.ts`): fetches buildings and walkable ways for the village bounding box, converts them to the engine's meter frame and caches the response in localStorage.
- **OpenStreetMap raster tiles** through **MapLibre GL JS** (`components/village-map.tsx`).

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript (strict)
- MapLibre GL JS 5, OpenStreetMap raster tiles
- Overpass API, no key
- Hand-written walking graph, binary-heap Dijkstra and regret-ordered assignment in TypeScript (`lib/engine.ts`), running in the browser
- Lenis and Motion for the scroll story
- Tailwind CSS v4 with shadcn-style components
- Vercel for hosting

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are required. `.env.example` lists one optional variable, `NEXT_PUBLIC_OVERPASS_URL`, for pointing the planner at an Overpass mirror.

## What we would build next

- Move the solver into a Web Worker so OSM villages with thousands of buildings stay smooth.
- Replace the greedy pass with an exact min-cost flow and compare the two on real villages.
- CSV import for a field team's own test results, plus an "edit this well" panel.
- Suggest the best deep-well site automatically by scoring every graph node.
- Bangla route cards.

## AI use

<!-- Adjust this section to each hackathon's disclosure rules. -->
We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
