# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D8 graphite
GROUND: #151413 warm-graphite
SURFACE: #1d1c1a
DEEP: #262421
LINE: #38352f
INK: #eceae6
ACCENT: #e0632c warm-orange
ON_ACCENT: #151413
SECOND: #8a9a5b olive
OK: #69a56f
WARN: #e0b84e
BAD: #ef6a5a
FONT_DISPLAY: F5 Space Grotesk (next/font/google: Space_Grotesk)
FONT_BODY: IBM Plex Sans (next/font/google: IBM_Plex_Sans, weight: ["400", "500", "600"] is required)
FONT_MONO: none
STRUCTURE: S6 story-scroll
ARCHETYPE: L3 editorial
MOTION: M4 wipe, prefix puteal-
KIT: K3 scroll
RADIUS: soft
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: IdeaLab Hacks (D19, S1, L2, K4); Peninsula Innovation Hackathon (D6, S5, L4, K1); Aevum Builder Challenge #1 (D7, S2, L7, K7). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D8 graphite

Warm graphite neutral dark with a single brass or orange light.

Surface treatment: Warm grey panels with 1px lighter top edges, brass used as thin lines and one filled control, compact dense layout, no blue cast anywhere.

Every hex in app/globals.css comes from the key block above. RADIUS soft means 0.375rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S6 story-scroll

One long scroll narrative on the home route with the live product embedded and driven by the chapters.

Route map (name the bracketed parts with the product's own words):
- `/` : 3 to 5 scroll chapters, each changing the state of the same live component with seed data
- `/play` : the free-form tool without the narrative
- `/notes` : method, numbers and sponsor tech as an appendix

Rules:
- the same live component stays on screen while the chapter text changes beside or over it
- a chapter indicator shows progress and lets the reader jump between chapters
- the last chapter hands control to the reader and links to `/play`

## Archetype: L3 editorial (the composition of the home route)

A single centered column at max-w-prose in magazine order: kicker, display headline, standfirst, inline figure, CTA mid-article; numbers appear inside sentences.

MUSTs: one column at every breakpoint; the display voice leads; the CTA appears mid-flow.
Bans: stat tiles; any two-column grid at lg.

## Motion: M4 wipe (the entrance signature)

clip-path inset reveal, cubic-bezier(0.65, 0, 0.35, 1), 600ms. One keyframe block implements it; every keyframe name starts with `puteal-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K3 scroll

Lenis smooth scrolling with Motion scroll-linked values: parallax and scroll chapters.

Packages for package.json dependencies: "lenis": "^1.3.27", "motion": "^14.14.0".

Typical import: `import { ReactLenis } from "lenis/react"; import { motion, useScroll, useTransform } from "motion/react";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. a smooth-scrolling root (`<ReactLenis root>` in a client provider) with a progress indicator bound to page scroll
2. parallax depth: at least two layers (an illustration or scene slot and its text) move at different rates through `useTransform`
3. a sticky chapter section where vertical scroll drives the horizontal movement of the product's steps

Rules:
- do not mount Lenis under `(prefers-reduced-motion: reduce)`
- in-page anchor links still work (use `lenis.scrollTo`)
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)

- 2026-11-24 phase 5: kit interactions completed, no row changed.
