# DEMO: Puteal in 90 seconds

**Start route:** `/`

**Problem.** About half of the tested tubewells in Bangladesh carry more arsenic than the WHO limit of 10 µg/L. The cheapest fix is a short walk to a neighbour's safe well, but nobody tells a family which well to use, and the few safe wells get crowded until people drift back to the red spout.

**Trigger.** A field worker has a list of tested wells for one village and needs to know where each household should fetch water, and where one new deep well would help most.

**Wow moment.** In chapter 5 the reader drops a deep well on an empty footpath corner and the "people over 500 m" count in the pinned readout falls on the spot.

**Data.** Every number in this demo comes from the sample village Charpara (6 hamlets, 12 wells, 100 households), served by the fake adapter (`lib/adapter.ts`, `ADAPTER_MODE=fake`). It is sample data, not survey data, and the UI says so.

## Steps

1. **Chapter 1, the village** (`app/page.tsx`, `components/story-scroll.tsx`). Open `/`, read the headline, scroll to the pinned plan. 100 households and 12 wells; the red wells fail the Bangladesh limit of 50 µg/L.
2. **Chapter 2, nearest is not enough** (`app/page.tsx`). Every family goes to its nearest safe well; the busiest pump runs far past its capacity, and the text names it with its load percentage.
3. **Chapter 3, share the load** (`app/page.tsx`). Pumps are capped, the overflow walks on, one shifted household's route shows in orange. Point at the mid-article CTA "Plan your own village".
4. **Chapter 4, the WHO line** (`app/page.tsx`). The limit drops to 10 µg/L, more wells turn red and the far-from-safe-water count jumps.
5. **Chapter 5, the next well** (`app/page.tsx`). The proposed deep well by Char para cuts the far count. Tap an open footpath corner near the red dashes to drill your own; the count falls again. This is the wow moment.
6. **Planner** (`app/play/page.tsx`, `components/planner.tsx`). Click "Plan your own village" or the header link, click a house on the map, and the route card opens with the well, its sample test value, the distance and the minutes each way.
7. **Method notes** (`app/notes/page.tsx`). Open `/notes` to show the walking graph, the capacity rule, what is real and what is sample, and the sources.

## Closing line

"One deep well by Char para brings X people back within 500 m of safe water." Read X from chapter 5 on the running app: it is the difference between the WHO far count and the far count with the proposed well, both printed in the chapter text and computed by `lib/engine.ts`. The numbers are not typed into this file because the engine computes them at render time; fill X in after the first run on the deployed site.
