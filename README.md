# The Águia Ledger

A fan-made analytics tool for SL Benfica: squad performance, transfers, spending, managers and presidents. Not affiliated with the club.

**All data in this repo is placeholder.** Seasons 2021-22 and 2022-23 are invented; 2023-24 to 2026-27 were written from memory and are unverified. The app shows a data note on every page until a season comes from a real source.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # stat and data-layer tests
npm run lint && npm run typecheck
npm run build
```

## How it is built

- Next.js (App Router) with TypeScript, Tailwind v4 and shadcn/ui components (`src/components/ui`, owned code; `components.json` is set up for `npx shadcn add`).
- Dark theme only. Colour tokens live in `src/app/globals.css`. Red (`--brand`) is the accent; `--bad` (coral) marks money out, losses and injuries; `--good` (teal) marks money in and wins.
- Each season and tab is its own static page: `/2026-27/roster`. `#player=<name>` on any URL opens that player's card.

## Data layer

```
data/placeholder/   JSON per dataset, imported from the design handoff
data/snapshot/      written by the data pipeline (not yet built); wins when present
src/data/schema.ts  zod schemas for every model; types are inferred from them
src/data/source.ts  DataSource interface: anything that returns the Dataset shape
src/data/load.ts    picks a source (DATA_DIR env, else snapshot, else placeholder) and validates it
src/lib/stats/      every number on screen is derived here, with tests
```

Datasets: player seasons, transfers, injuries, positions (player profiles), transfer details, season context, managers, presidents, editorial notes. `data/placeholder/meta.json` records how trustworthy each dataset and season is (`illustrative`, `unverified`, `sourced`).

To plug in another source (CSV import, an API), write a `DataSource` that returns the same shape and select it in `src/data/load.ts`. Rows are validated on load, and cross-row problems (duplicate ids, unknown managers) fail the build instead of rendering wrong numbers.

### Rules the stats follow

- Fee totals count permanent transfers only (no loan fees, free transfers or academy promotions) and are shown in whole €m.
- Net spend is computed from the rounded totals, so spent, received and net on screen always add up.
- Ratings and assists can be missing: they show "—", and screens fall back to goals or minutes.
