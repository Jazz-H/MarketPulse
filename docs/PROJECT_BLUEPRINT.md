# Market Pulse AI — Project Blueprint

Requirements package that drove this build, plus notes on how each piece was
realised.

## Vision

A stock-intelligence dashboard that gives a fast, executive-level read on the
market: what's moving, why, where the opportunities and risks sit, and a place to
track and simulate ideas — all in one cohesive single-page app.

## Recommended stack

HTML, CSS, JavaScript — zero build step, zero dependencies. Chosen so the project
runs anywhere (double-click, `python -m http.server`, or any static host) and
stays trivially hackable.

## Core modules (all implemented)

1. **Market Overview** — indices, rates, commodities; cap-weighted sector
   heatmap; advance/decline breadth.
2. **Executive Summary** — auto-narrated digest synthesised from the other views.
3. **Top Stocks** — sortable, sector-filterable table of the tracked universe.
4. **Magnificent 7** — the mega-cap complex with index weights and trends.
5. **Theme Investing** — curated baskets (AI, semis, cloud, energy, fintech,
   healthcare, staples, EV) with per-member breakdowns.
6. **News Intelligence** — sentiment-tagged headline feed, filterable.
7. **Sentiment Engine** — fear/greed gauge blended from news, breadth, VIX;
   per-ticker sentiment leaderboard.
8. **Opportunity Radar** — ranked ideas from a transparent composite score.
9. **Risk Radar** — elevated-risk names with human-readable flags.
10. **Relationship Mapping** — correlation web across the leaders.
11. **Watchlist** — persistent, editable tracked list.
12. **Portfolio Simulator** — paper trading with P&L and allocation.
13. **AI Assistant** — rule-based analyst answering over the dataset, offline.

## Architecture

```
data.js   →  single source of truth. Baked-in realistic mock datasets +
             computed views (breadth, sentiment, opportunities, risks, exec
             summary) behind a provider abstraction. Swap in a live API by
             registering a provider with the same method surface.

utils.js  →  formatting helpers, tiny SVG chart builders (sparkline, gauge,
             donut, meter), and a localStorage-backed store factory.

app.js    →  module registry, hash router, index ticker tape, global search,
             shared stock detail drawer, theme + mobile chrome.

modules/  →  one file per module; each self-registers via MP.registerModule().
```

### Data-layer contract

Modules only ever call `MP.data.*`. The mock provider exposes:
`getIndices`, `getStocks`, `getStock`, `getThemes`, `getThemeDetail`, `getNews`,
`getRelationships`, `getSeries`, and the computed views `sectorPerformance`,
`marketBreadth`, `marketSentiment`, `tickerSentiment`, `opportunities`, `risks`,
`executiveSummary`. A live provider overrides any subset; the rest fall back to
mock.

### Scoring logic (transparent by design)

- **Sentiment** = 0.40·news-tone + 0.35·breadth + 0.25·volatility (VIX), clamped.
- **Opportunity score** = 0.5·momentum + 2.0·value-bias + 1.5·news-sentiment.
- **Risk level** = additive flags for high beta, no/《stretched》 earnings, sharp
  drawdowns and negative news flow.

All inputs are shown in the UI so the reasoning is auditable rather than a black
box.

## Non-goals / disclaimers

- Not investment advice; all figures are illustrative demo data.
- No real-time feed in this build — data is deterministic mock data, wired for a
  live provider swap.

## Possible next steps

- Live provider adapter (Finnhub/Alpha Vantage) behind an API-key config.
- Real LLM backing for the assistant (replace the rule-based `answer()`).
- Alerts on watchlist thresholds; CSV export for the portfolio.
- Historical charts (candlesticks) in the detail drawer.
