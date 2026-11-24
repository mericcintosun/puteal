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
6. **Planner** (`app/play/page.tsx`, `components/planner.tsx`). Click "Plan your own village" or the header link, click a house on the map, and the route card opens with the well, its sample test value, the distance and the minutes each way. On the sample village, "Load OSM buildings and paths" swaps in the live OpenStreetMap layout through `/api/village?live=1`.
7. **Method notes** (`app/notes/page.tsx`). Open `/notes` to show the walking graph, the capacity rule, what is real and what is sample, and the sources.

## Closing line

The number below is written by `npm run proof`, which runs `lib/engine.ts` at 10 µg/L with and without the proposed deep well. Chapter 5 on the running app prints the same difference for whichever layout the site is serving.

<!-- PROOF:BEGIN demo-closing -->
On the sample village Charpara, one deep well by Char para brings 67 people back within 500 m of safe water (126 to 59 far at 10 µg/L). The OpenStreetMap figure was not run in this build: no OSM layout available.
<!-- PROOF:END demo-closing -->
