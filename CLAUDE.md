# CLAUDE.md: Puteal

Read `IDENTITY.md` first; it is law for color, type, routes, layout and motion. `HANDOFF.md` holds the current state and the next steps. `DEMO.md` is the demo contract.

## Commands

- `npm run dev`: local dev server on http://localhost:3000
- `npm run build`: production build, must stay green (strict TypeScript)
- `npm run seed`: writes `fixtures/charpara.seed.json` from `lib/data/seed.ts` (`node --experimental-strip-types scripts/seed.mjs`; needs Node 22.6 or later)

## Layout

- `lib/types.ts`: model types, `ApiResponse<T>`, `SolveRequest`
- `lib/data/seed.ts`: the sample village Charpara (deterministic; import type only, relative paths, erasable syntax so Node can strip it)
- `lib/data.ts`: barrel over the two files above; existing `@/lib/data` imports go through it
- `lib/adapter.ts`: `getAdapter()` returns `fakeAdapter` unless `ADAPTER_MODE=real`
- `lib/engine.ts`: pure solver, safe on server and client
- `app/api/village`, `app/api/solve`: route handlers that answer through the adapter
- Pages `/`, `/play`, `/notes` read the village through `getAdapter()` and pass it down as a prop

## Stack pitfalls

- Next.js 15 App Router, React 19. Server components by default; add `"use client"` only where hooks or browser APIs are used.
- Tailwind CSS v4: there is no `tailwind.config` and no `@tailwind` directives. Tokens live in the one `@theme` block in `app/globals.css`.
- MapLibre GL must stay client only (`components/village-map.tsx` imports it dynamically inside an effect). If WebGL fails, the planner falls back to the SVG `VillagePlan`.
- Lenis is not mounted under `prefers-reduced-motion: reduce` (`components/smooth-scroll.tsx`). Every kit import lives in a `"use client"` file.

## Never touch

- `public/illustrations/`, `public/logo.svg`, `.next/`, `node_modules/`
- the visuals of `app/opengraph-image.tsx` and the styling in `components/ui/*`

## Vercel guardrails

- No file system writes at request time. Only `scripts/` may write files.
- Any `useSearchParams` sits under a `<Suspense>` boundary.
- No Node only APIs in edge runtime code.
- No custom server and no `output: "export"` in `next.config.ts`.
- Every `process.env` key the app reads is mirrored in `.env.example` (`NEXT_PUBLIC_BRAND_FILES` is the exception: `next.config.ts` sets it at build time).

## Colors

Colors only through tokens. Components use token classes (`bg-background`, `text-primary`, `border-border`, `text-ok`) or the `:root` aliases, never a raw hex and never a Tailwind palette class like `bg-red-500`. The only allowed hex literals outside `app/globals.css` are in `app/opengraph-image.tsx` and `app/icon.svg`, because neither can read CSS variables.

## Copy rules

- English, plain human tone, numbers inside sentences.
- No em dashes, en dashes or double hyphens used as dashes, anywhere: copy, comments, docs, commit messages.
- No marketing buzzwords or AI cliche vocabulary; write like a builder explaining the thing to a friend.
- The sample village is sample data. Label it "sample" wherever its numbers appear; never present it as survey data.

when compacting preserve the list of modified files and test commands
