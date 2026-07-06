# 📈 Market Pulse AI

A stock-intelligence dashboard — an executive read on the market, wrapped in a
fast, single-page interface with **13 modules**, a sentiment engine, opportunity
and risk radars, a persistent watchlist, a paper-trading portfolio simulator and
a built-in analyst assistant.

It's a **zero-dependency, zero-build** static site: plain HTML, CSS and
JavaScript. Open `index.html` and it runs. All figures come from a self-contained
mock data layer, so the whole thing works offline — no API keys required — and
the data layer is designed to be swapped for a live provider later (see
[Going live](#going-live)).

> ⚠️ **Not investment advice.** All prices, scores and signals are illustrative
> demo data.

---

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Executive Summary** | Auto-narrated briefing: headline, sentiment, breadth, top movers, headlines |
| 2 | **Market Overview** | Indices, rates & commodities, cap-weighted sector heatmap, breadth donut |
| 3 | **Top Stocks** | Full universe in a sortable, sector-filterable table |
| 4 | **Magnificent 7** | The mega-cap complex — weights, P/E, trend sparklines |
| 5 | **Theme Investing** | Curated baskets (AI, semis, cloud, energy…) with member breakdowns |
| 6 | **News Skimmer** | Sentiment-tagged headline feed, filterable by tone and ticker |
| 7 | **Sentiment Engine** | Fear/greed gauge blended from news, breadth and volatility |
| 8 | **Opportunity Radar** | Ranked ideas from a transparent momentum + value + sentiment score |
| 9 | **Risk Radar** | Elevated-risk names flagged with human-readable reasons |
| 10 | **Relationship Mapping** | Correlation web across the leaders; tightest pairs |
| 11 | **Watchlist** | A persistent, editable set of tracked tickers (saved in-browser) |
| 12 | **Portfolio Simulator** | Paper portfolio with P&L, allocation donut and buy/sell trading |
| 13 | **AI Assistant** | Rule-based analyst that answers over the live dataset — offline |

Extras: global ticker search, a shared stock **detail drawer**, a light/dark
theme toggle, an index **ticker tape**, and a fully responsive layout.

---

## Run it

No tooling needed. Either:

```bash
# 1) Just open the file
open index.html            # macOS  (xdg-open on Linux)

# 2) …or serve it (recommended, avoids any file:// quirks)
python3 -m http.server 8000
#   then visit http://localhost:8000
```

Any static host works too — GitHub Pages, Netlify, Vercel, S3. There is no build
step and no server-side code.

---

## Project structure

```
marketpulse/
├── index.html                 # App shell + script includes
├── assets/
│   ├── css/styles.css         # Design system (light + dark) and layout
│   └── js/
│       ├── data.js            # Data layer: mock datasets + provider abstraction
│       ├── utils.js           # Formatting, SVG charts (sparkline/gauge/donut/meter), store
│       ├── app.js             # Module registry, router, tape, search, detail drawer
│       └── modules/           # One file per dashboard module (13)
└── docs/
    └── PROJECT_BLUEPRINT.md    # Original requirements + build notes
```

Each module is a small self-contained file that calls `MP.registerModule({...})`
with an `id`, `title`, `icon` and a `render(root, ctx)` function. The router in
`app.js` handles the rest (hash-based navigation, e.g. `#/sentiment`).

---

## Going live

The app never touches raw data directly — everything flows through `MP.data.*`,
which today is backed by a **mock provider** in `assets/js/data.js`. To connect a
real feed (Finnhub, Alpha Vantage, Polygon, …), implement a provider with the
same method surface and register it:

```js
MP.data.registerProvider({
  id: 'finnhub',
  label: 'Finnhub (live)',
  isLive: true,
  getStocks: async () => { /* fetch + map to the same shape */ },
  getIndices: async () => { /* … */ },
  // …override only what you need; the rest falls back to the mock provider
});
```

Every downstream module keeps working unchanged. The sidebar badge reflects the
active source.

---

## Tech notes

- **No dependencies, no build.** Plain scripts loaded in order; a small `MP.*`
  global namespace ties it together.
- **Deterministic mock data.** Sparklines and price histories are generated from
  a seeded PRNG so shapes stay stable across renders instead of flickering.
- **Persistence.** Watchlist, portfolio and theme choice are saved to
  `localStorage` and survive reloads.
- **Accessible + responsive.** Keyboard-dismissible drawer/search, semantic
  headings, and a mobile layout with a collapsible sidebar.

Built from the Market Pulse AI blueprint — see `docs/PROJECT_BLUEPRINT.md`.
