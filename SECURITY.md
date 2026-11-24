# SECURITY: Puteal

## 1. Contract addresses and chain id

None. Puteal has no smart contracts and talks to no chain, so there is no address and no chain id to check.

## 2. Wallet permissions

None. The app never requests a wallet, never asks to connect one and never asks for a signature.

## 3. Approvals and spenders

None. There are no tokens, no approvals and no spender addresses.

## 4. Source repository

https://github.com/mericcintosun/puteal

## Data handling

- The server route `GET /api/village` (and the pages, through the same adapter) sends one bounding box query for buildings and walkable ways to the public Overpass API. The query holds a fixed box around the sample village; no user data goes into it. The answer is checked with zod before use.
- A wells CSV is parsed in the browser and never uploaded. The assignments export is built in the browser and downloaded directly.
- Planner state lives in the page address (limit, pump cap, deep well positions). There is no database, no account and no cookie set by the app.
- Puteal needs no API keys. `.env.example` lists the only settings it reads: `ADAPTER_MODE`, `OVERPASS_URL`, and `NEXT_PUBLIC_BRAND_FILES`, which `next.config.ts` sets at build time and which is public.

## Reporting a problem

Open an issue on the repository above.
