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
3. **Well editing and CSV import (2 h).** Click a well to edit its arsenic value with the `Input` primitive; a CSV import (`name,lat,lon,arsenic,depth_m,capacity`) replaces the sample wells. Label sample values "sample" everywhere they show. Done = a field team can paste their own results and every number reflects them.
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
