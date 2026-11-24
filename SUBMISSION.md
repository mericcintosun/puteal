# SUBMISSION: Puteal

Devpost form fields in form order, ready to paste. Where the form shows a character limit, the note under the field gives the count to stay under. Fields only a person can fill (team members, eligibility confirmations) are not here; they sit in the manual checklist in HANDOFF.md.

## Project name

Puteal

## Elevator pitch (tagline)

Limit on the form: 200 characters.

A village map that sends every household to a safe, uncrowded tubewell along real footpaths and shows where one new deep well helps most.

## About the project (description)

Markdown is accepted in this field.

### Purpose

Puteal helps the people who test wells in arsenic-affected Bangladesh turn a list of test results into a plan for every door: which safe well each household should walk to, a cap on how many people one pump serves, and where a new deep well would bring the most people back within reach.

### The problem

About half of the tubewells tested in Bangladesh carry more arsenic than the WHO guideline of 10 µg/L (keebsforwater.org). The cheapest step that works is well switching: a family with a red-painted spout walks to a neighbour's safe pump. Studies in Araihazar upazila found that most people live close to a safe well, yet switching stays low. Nobody tells a household which well to use, and the few good pumps get crowded until families drift back to the red spout.

### Target audience

Field workers and student volunteers who test wells and paint spouts, plus NGO staff and union council health workers who decide where a deep well goes.

### SDG link

UN SDG 6, target 6.1: universal and equitable access to safe and affordable drinking water for all. Puteal counts the target directly for one village: the number of people who live more than 500 m from the safe well they are sent to, before and after a plan.

### What it does

- A five-chapter scroll story on one live village plan: the village and its red and green wells, why "nearest" overcrowds pumps, the capacity cap, the stricter WHO line, and where the next deep well goes. In the last chapter the reader taps the plan to drop a deep well and the "people over 500 m" count falls on the spot.
- A planner (`/play`) with every control open: switch between Bangladesh's 50 µg/L and the WHO's 10 µg/L, cap or uncap pumps, drop deep wells, click any house for a printable route card (the well, its test value, the distance and minutes each way), and share the plan as a link.
- Real OpenStreetMap buildings and footpaths on request, fetched by our server from the public Overpass API.
- A CSV import for a team's own tested wells, and a CSV export of every household's assignment, both in the browser.
- An SDG 6.1 summary card that states the plan in the target's terms and prints on its own.

Honest about data: the arsenic values in the demo are sample data, and so is the layout of the demo village Charpara. We did not find a public per-well test dataset to ship. Importing a wells CSV is the real path: the readout then says "imported test values".

### How we built it

The engine is hand-written TypeScript: footpaths become a walking graph cut into 25 m segments, Dijkstra runs from every well that passes the limit, and households are assigned in order of regret, each taking the nearest safe pump that still has room. It runs in the browser on every click. A typed adapter serves either the sample village or a live OpenStreetMap layout through a server-side Overpass call, with a saved snapshot and the sample as fallbacks. The story uses Lenis smooth scrolling and Motion scroll-linked values, so the same live plan stays pinned while the chapters change its state.

### Challenges we ran into

- A plain "nearest safe well" answer looks good on paper and fails in the village, because the best pumps overcrowd. The regret-ordered assignment with a per-pump cap fixed that without a slow solver.
- Overpass is a shared public service and can be slow. The server retries once, then falls back to a saved snapshot and then to the sample village, and a line under every readout says which layout is on screen.
- Keeping every number honest: each figure in the story text is computed by the engine at render time, never typed in, and the sample data is labelled as sample everywhere it shows.

### Accomplishments that we're proud of

Dropping one deep well and watching the far-from-safe-water count fall, with the number coming from the same engine a field team would use.

### What we learned

Safe water is often already close; the gap is information and crowding, and a small plan per household addresses both.

### What's next for Puteal

- Move the solver into a Web Worker so villages with thousands of mapped buildings stay smooth.
- Compare the greedy assignment with an exact min-cost flow on real villages.
- Edit single wells in place and carry imported wells in the share link.
- Suggest the best deep well site automatically, and print route cards in Bangla.

## Built with

Next.js, React, TypeScript, Tailwind CSS, MapLibre GL JS, OpenStreetMap, Overpass API, Motion, Lenis, Zod, Vitest, Vercel

## Try it out links

- Live site: https://puteal.vercel.app
- Source code: https://github.com/mericcintosun/puteal

## Image gallery (screenshots)

Upload at least three screenshots taken from the live site; the shot list is in `docs/SCREENSHOTS.md`.

## Prize tracks

One submission enters all three placements:

- 1st Place | $ 20 in cash
- 2nd Place | $ 10 in cash
- 3rd Place | $ 5 in cash
