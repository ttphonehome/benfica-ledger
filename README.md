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
- Each language, season and tab is its own static page: `/pt/2026-27/roster`. `#player=<name>` on any URL opens that player's card.
- Portuguese (Portugal) is the default language, with English at `/en`. Interface text lives in `src/i18n/dictionaries/{pt,en}.ts` (a test checks both have the same keys and placeholders); numbers, money (`12,5 M€` / `€12.5m`), dates and position codes are formatted per language in `src/i18n/format.ts`. Text that comes from the data (notes, competition names) is shown as entered.

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
- Win %, points per game, records, tenure and titles are derived from W-D-L rows and dates, never stored.
- Transfer Audit judges a departure on the player's last season at the club (a summer sale has no row in the window season).
- A season's transfer spend is credited to the president in office on 1 July. Seasons with no transfer rows show "—", not zero.
- "Now" on timelines is `meta.asOf`, the date the data describes, so builds are reproducible.

### Coverage

`meta.coverageTarget` sets the goal: the last ten seasons (from 2016-17), and at minimum every season of Rui Costa's presidency (from 2021-22). The footer shows how many target seasons are covered and which are missing. The placeholder covers 2021-22 to 2026-27; managers and presidents go back to 2015-16.
