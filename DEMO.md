# DEMO: Puteal in 90 seconds

**Start route:** `/`

**Problem.** About half of the tested tubewells in Bangladesh carry more arsenic than the WHO limit of 10 µg/L. The cheapest fix is a short walk to a neighbour's safe well, but nobody tells a family which well to use, and the few safe wells get crowded until people drift back to the red spout.

**Trigger.** A field worker has a list of tested wells for one village and needs to know where each household should fetch water, and where one new deep well would help most.

**Wow moment.** In chapter 5 the reader drops a deep well on an empty footpath corner and the "people over 500 m" count in the pinned readout falls on the spot.

**Data.** With `ADAPTER_MODE=real` (the live site) the household layout and footpaths come from live OpenStreetMap through a server-side Overpass call (`lib/adapter.real.ts`), falling back to a saved snapshot and then to the sample village. The 12 wells and their arsenic values stay sample data in every mode, because no public per-well test dataset was found. With `ADAPTER_MODE=fake` or unset, every number comes from the sample village Charpara (6 hamlets, 12 wells, 100 households). A line under the pinned readout says which layout is on screen.

## Steps

1. **Chapter 1, the village** (`app/page.tsx`, `components/story-scroll.tsx`). Open `/`, read the headline, scroll to the pinned plan. 100 households and 12 wells; the red wells fail the Bangladesh limit of 50 µg/L.
2. **Chapter 2, nearest is not enough** (`app/page.tsx`). Every family goes to its nearest safe well; the busiest pump runs far past its capacity, and the text names it with its load percentage.
3. **Chapter 3, share the load** (`app/page.tsx`). Pumps are capped, the overflow walks on, one shifted household's route shows in orange. Point at the mid-article CTA "Plan your own village".
4. **Chapter 4, the WHO line** (`app/page.tsx`). The limit drops to 10 µg/L, more wells turn red and the far-from-safe-water count jumps.
5. **Chapter 5, the next well** (`app/page.tsx`). The proposed deep well by Char para cuts the far count. Tap an open footpath corner near the red dashes to drill your own; the count falls again. In live mode this happens on real OpenStreetMap streets and buildings; point at the source line under the readout. This is the wow moment.
6. **Planner** (`app/play/page.tsx`, `components/planner.tsx`). Click "Plan your own village" or the header link, click a house on the map, and the route card opens with the well, its sample test value, the distance and the minutes each way. On the sample village, "Load OSM buildings and paths" swaps in the live OpenStreetMap layout through `/api/village?live=1`. The planner link carries the plan, and a CSV of the village's tested wells can be imported and the household assignments exported as a CSV.
7. **Method notes** (`app/notes/page.tsx`). Open `/notes` to show the walking graph, the capacity rule, what is real and what is sample, and the sources.
8. **SDG 6.1 summary card** (`/play`, `components/sdg-card.tsx`). Back in the planner, switch to WHO 10 µg/L and drop a deep well on an open footpath corner near the red dashes (or open `/play?limit=10&cap=1&add=1255,185`). Below the readout, the SDG 6.1 card shows the limit, the pump rule and how many deep wells are dropped, then the people farther than 500 m before and after, with the after number counting down, one sentence with the number of people brought back within 500 m, and the mean walk before and after. The source line says sample or live layout. "Print summary" prints the card alone. With no deep well dropped, the card says how to drill one.

## Closing line

The number below is written by `npm run proof`, which runs `lib/engine.ts` at 10 µg/L with and without the proposed deep well. Chapter 5 on the running app prints the same difference for whichever layout the site is serving.

<!-- PROOF:BEGIN demo-closing -->
"One deep well by Char para brings 0 people back within 500 m of safe water." Computed by lib/engine.ts in npm run proof on 2026-11-24, on the live OpenStreetMap layout with sample wells. On the sample village Charpara, one deep well by Char para brings 67 people back within 500 m of safe water (126 to 59 far at 10 µg/L).
<!-- PROOF:END demo-closing -->
