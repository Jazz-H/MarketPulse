/*
 * Market Pulse AI — Data Layer
 * ----------------------------------------------------------------------------
 * A single, pluggable data source for the whole dashboard.
 *
 * The app never touches raw arrays directly; it calls MP.data.* which today
 * returns realistic baked-in mock data. To go live, implement a provider with
 * the same method signatures (see MP.data.registerProvider) that fetches from a
 * real API (Finnhub, Alpha Vantage, Polygon, ...). Everything downstream keeps
 * working unchanged.
 */
(function (global) {
  'use strict';

  const MP = (global.MP = global.MP || {});

  /* --------------------------------------------------------------------- */
  /* Deterministic pseudo-random helpers                                    */
  /* Seeded so sparklines & histories are stable across a page load, which  */
  /* keeps the UI from "flickering" different shapes on every re-render.    */
  /* --------------------------------------------------------------------- */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Generate a believable intraday/period price series ending at `last`.
  function genSeries(seedStr, last, points, volatility) {
    const rnd = mulberry32(seedFrom(seedStr));
    points = points || 40;
    volatility = volatility == null ? 0.012 : volatility;
    const series = new Array(points);
    // Walk backwards from the known close so the series terminates at `last`.
    let price = last;
    for (let i = points - 1; i >= 0; i--) {
      series[i] = Math.max(0.01, price);
      const drift = (rnd() - 0.5) * 2 * volatility;
      price = price / (1 + drift);
    }
    return series.map((p) => +p.toFixed(2));
  }

  /* --------------------------------------------------------------------- */
  /* Base reference data                                                    */
  /* --------------------------------------------------------------------- */

  const INDICES = [
    { symbol: 'SPX', name: 'S&P 500', value: 5638.94, change: 41.63, changePct: 0.74, kind: 'index' },
    { symbol: 'NDX', name: 'Nasdaq 100', value: 20174.12, change: 173.44, changePct: 0.87, kind: 'index' },
    { symbol: 'DJI', name: 'Dow Jones', value: 40861.71, change: -63.22, changePct: -0.15, kind: 'index' },
    { symbol: 'RUT', name: 'Russell 2000', value: 2119.05, change: 12.87, changePct: 0.61, kind: 'index' },
    { symbol: 'VIX', name: 'Volatility (VIX)', value: 14.62, change: -0.83, changePct: -5.37, kind: 'vol' },
    { symbol: 'US10Y', name: '10Y Treasury', value: 4.21, change: 0.03, changePct: 0.72, kind: 'rate', unit: '%' },
    { symbol: 'GOLD', name: 'Gold (spot)', value: 2508.30, change: 11.10, changePct: 0.44, kind: 'commodity', unit: '$' },
    { symbol: 'WTI', name: 'Crude Oil (WTI)', value: 72.85, change: -1.04, changePct: -1.41, kind: 'commodity', unit: '$' },
    { symbol: 'BTC', name: 'Bitcoin', value: 63140.0, change: 1420.0, changePct: 2.30, kind: 'crypto', unit: '$' },
  ];

  // Master universe. price/changePct hand-picked to look like a plausible session.
  // sparkline & history are generated on demand from the symbol seed.
  const STOCKS = [
    // Magnificent 7
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 226.84, changePct: 0.92, mktCap: 3450e9, pe: 34.6, divYield: 0.45, beta: 1.10, mag7: true },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 419.14, changePct: 1.21, mktCap: 3120e9, pe: 37.2, divYield: 0.72, beta: 0.93, mag7: true },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication', price: 165.32, changePct: -0.34, mktCap: 2040e9, pe: 24.1, divYield: 0.48, beta: 1.05, mag7: true },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Disc.', price: 178.22, changePct: 1.64, mktCap: 1860e9, pe: 42.8, divYield: 0.0, beta: 1.15, mag7: true },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', price: 122.44, changePct: 3.18, mktCap: 3010e9, pe: 61.5, divYield: 0.03, beta: 1.68, mag7: true },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Communication', price: 512.20, changePct: 0.58, mktCap: 1300e9, pe: 27.9, divYield: 0.38, beta: 1.22, mag7: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Disc.', price: 214.11, changePct: -2.05, mktCap: 683e9, pe: 58.4, divYield: 0.0, beta: 2.01, mag7: true },
    // Large-cap tech / semis
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', price: 162.10, changePct: 2.44, mktCap: 755e9, pe: 33.7, divYield: 1.30, beta: 1.19 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', price: 148.65, changePct: 2.90, mktCap: 240e9, pe: 45.9, divYield: 0.0, beta: 1.70 },
    { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', price: 254.40, changePct: 0.77, mktCap: 246e9, pe: 44.2, divYield: 0.62, beta: 1.28 },
    { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', price: 141.90, changePct: 1.02, mktCap: 391e9, pe: 36.1, divYield: 1.10, beta: 1.02 },
    { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', price: 552.30, changePct: -0.61, mktCap: 245e9, pe: 45.6, divYield: 0.0, beta: 1.31 },
    { symbol: 'PLTR', name: 'Palantir Tech.', sector: 'Technology', price: 29.85, changePct: 4.12, mktCap: 66e9, pe: 71.0, divYield: 0.0, beta: 2.30 },
    { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', price: 21.48, changePct: -3.44, mktCap: 91e9, pe: 0, divYield: 1.90, beta: 1.06 },
    // Financials
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', price: 210.55, changePct: 0.41, mktCap: 601e9, pe: 11.8, divYield: 2.15, beta: 1.09 },
    { symbol: 'BAC', name: 'Bank of America', sector: 'Financials', price: 39.72, changePct: -0.22, mktCap: 306e9, pe: 12.4, divYield: 2.60, beta: 1.30 },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', price: 271.60, changePct: 0.66, mktCap: 545e9, pe: 29.5, divYield: 0.78, beta: 0.96 },
    { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', price: 468.90, changePct: 0.54, mktCap: 434e9, pe: 34.9, divYield: 0.58, beta: 1.04 },
    // Healthcare
    { symbol: 'LLY', name: 'Eli Lilly & Co.', sector: 'Healthcare', price: 918.40, changePct: 1.35, mktCap: 872e9, pe: 112.0, divYield: 0.57, beta: 0.42 },
    { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', price: 588.10, changePct: -0.48, mktCap: 542e9, pe: 34.7, divYield: 1.42, beta: 0.55 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 164.20, changePct: 0.19, mktCap: 395e9, pe: 22.0, divYield: 3.02, beta: 0.51 },
    // Energy / Industrials
    { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', price: 114.30, changePct: -0.88, mktCap: 509e9, pe: 13.6, divYield: 3.30, beta: 0.87 },
    { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', price: 146.70, changePct: -0.51, mktCap: 271e9, pe: 14.1, divYield: 4.40, beta: 0.90 },
    { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', price: 342.80, changePct: 0.72, mktCap: 165e9, pe: 15.9, divYield: 1.55, beta: 1.01 },
    { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials', price: 172.55, changePct: -1.62, mktCap: 106e9, pe: 0, divYield: 0.0, beta: 1.45 },
    // Consumer
    { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', price: 892.10, changePct: 0.88, mktCap: 396e9, pe: 53.2, divYield: 0.52, beta: 0.79 },
    { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', price: 74.90, changePct: 0.34, mktCap: 602e9, pe: 40.1, divYield: 1.10, beta: 0.50 },
    { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', price: 69.85, changePct: 0.12, mktCap: 301e9, pe: 26.4, divYield: 2.80, beta: 0.58 },
    { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer Disc.', price: 78.40, changePct: -1.10, mktCap: 118e9, pe: 21.3, divYield: 1.85, beta: 1.08 },
    // Comms / media
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', price: 678.20, changePct: 1.44, mktCap: 291e9, pe: 43.7, divYield: 0.0, beta: 1.26 },
    { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication', price: 89.60, changePct: -0.66, mktCap: 163e9, pe: 38.2, divYield: 0.99, beta: 1.35 },
  ];

  // Attach absolute change ($) derived from price & pct so callers get both.
  STOCKS.forEach((s) => {
    const prev = s.price / (1 + s.changePct / 100);
    s.change = +(s.price - prev).toFixed(2);
    s.volume = Math.round((0.5 + (seedFrom(s.symbol) % 1000) / 1000) * (s.mag7 ? 55e6 : 22e6));
  });

  const THEMES = [
    { id: 'ai', name: 'Artificial Intelligence', changePct: 2.61, blurb: 'Model builders, accelerators and AI-native software.', tickers: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'PLTR', 'AVGO'] },
    { id: 'semis', name: 'Semiconductors', changePct: 1.92, blurb: 'Chip designers and fabs powering compute demand.', tickers: ['NVDA', 'AVGO', 'AMD', 'INTC'] },
    { id: 'cloud', name: 'Cloud & SaaS', changePct: 0.84, blurb: 'Hyperscalers and subscription software platforms.', tickers: ['MSFT', 'AMZN', 'GOOGL', 'CRM', 'ORCL', 'ADBE'] },
    { id: 'ev', name: 'Electric Vehicles', changePct: -1.34, blurb: 'EV makers and the charging/battery supply chain.', tickers: ['TSLA', 'NKE'] },
    { id: 'energy', name: 'Traditional Energy', changePct: -0.71, blurb: 'Integrated oil & gas majors and services.', tickers: ['XOM', 'CVX'] },
    { id: 'fintech', name: 'Payments & Fintech', changePct: 0.59, blurb: 'Card networks and digital payment rails.', tickers: ['V', 'MA', 'JPM'] },
    { id: 'health', name: 'Healthcare & GLP-1', changePct: 0.63, blurb: 'Pharma, insurers and the obesity-drug wave.', tickers: ['LLY', 'UNH', 'JNJ'] },
    { id: 'consumer', name: 'Consumer Staples', changePct: 0.28, blurb: 'Defensive, dividend-rich household names.', tickers: ['COST', 'WMT', 'KO'] },
  ];

  const NEWS = [
    { id: 1, headline: 'Nvidia extends rally as hyperscalers signal record AI capex for next year', source: 'Bloomberg', minutesAgo: 12, tickers: ['NVDA', 'MSFT', 'AMZN'], sentiment: 0.82, category: 'Earnings' },
    { id: 2, headline: 'Fed minutes hint at a possible rate cut, lifting rate-sensitive sectors', source: 'Reuters', minutesAgo: 34, tickers: ['JPM', 'BAC'], sentiment: 0.55, category: 'Macro' },
    { id: 3, headline: 'Tesla deliveries miss estimates; margins pressured by price cuts', source: 'CNBC', minutesAgo: 51, tickers: ['TSLA'], sentiment: -0.61, category: 'Earnings' },
    { id: 4, headline: 'Apple unveils on-device AI features ahead of fall product cycle', source: 'The Verge', minutesAgo: 68, tickers: ['AAPL'], sentiment: 0.47, category: 'Product' },
    { id: 5, headline: 'Oil slips as demand worries offset supply cuts from OPEC+', source: 'Reuters', minutesAgo: 88, tickers: ['XOM', 'CVX', 'WTI'], sentiment: -0.32, category: 'Commodities' },
    { id: 6, headline: 'Eli Lilly raises guidance on booming GLP-1 obesity drug demand', source: 'WSJ', minutesAgo: 103, tickers: ['LLY'], sentiment: 0.74, category: 'Healthcare' },
    { id: 7, headline: 'Broadcom guides higher on custom AI silicon for cloud customers', source: 'Bloomberg', minutesAgo: 121, tickers: ['AVGO', 'GOOGL'], sentiment: 0.68, category: 'Earnings' },
    { id: 8, headline: 'Boeing faces fresh regulatory scrutiny over production quality', source: 'AP', minutesAgo: 142, tickers: ['BA'], sentiment: -0.58, category: 'Regulatory' },
    { id: 9, headline: 'Amazon expands same-day pharmacy delivery to more metro areas', source: 'CNBC', minutesAgo: 165, tickers: ['AMZN', 'UNH'], sentiment: 0.36, category: 'Product' },
    { id: 10, headline: 'Intel weighs foundry restructuring as turnaround costs mount', source: 'Reuters', minutesAgo: 190, tickers: ['INTC'], sentiment: -0.44, category: 'Corporate' },
    { id: 11, headline: 'Microsoft and OpenAI deepen partnership with new enterprise tier', source: 'The Information', minutesAgo: 213, tickers: ['MSFT'], sentiment: 0.6, category: 'Product' },
    { id: 12, headline: 'Consumer sentiment ticks up as inflation cools for a third month', source: 'Reuters', minutesAgo: 240, tickers: ['WMT', 'COST', 'KO'], sentiment: 0.41, category: 'Macro' },
    { id: 13, headline: 'Palantir wins expanded government AI contract, shares jump', source: 'Bloomberg', minutesAgo: 262, tickers: ['PLTR'], sentiment: 0.7, category: 'Corporate' },
    { id: 14, headline: 'Netflix ad tier tops expectations, boosting subscriber growth', source: 'Variety', minutesAgo: 288, tickers: ['NFLX'], sentiment: 0.52, category: 'Earnings' },
    { id: 15, headline: 'Bitcoin climbs as ETF inflows accelerate into risk assets', source: 'CoinDesk', minutesAgo: 305, tickers: ['BTC'], sentiment: 0.49, category: 'Crypto' },
  ];

  // Correlation-style relationship edges among a focused set of tickers.
  const RELATIONSHIPS = {
    nodes: ['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'AAPL', 'META', 'AMD', 'AVGO', 'TSLA', 'JPM'],
    edges: [
      { a: 'NVDA', b: 'AMD', weight: 0.86, kind: 'peer' },
      { a: 'NVDA', b: 'AVGO', weight: 0.78, kind: 'peer' },
      { a: 'NVDA', b: 'MSFT', weight: 0.71, kind: 'supply' },
      { a: 'MSFT', b: 'GOOGL', weight: 0.74, kind: 'peer' },
      { a: 'GOOGL', b: 'META', weight: 0.8, kind: 'peer' },
      { a: 'MSFT', b: 'AMZN', weight: 0.69, kind: 'peer' },
      { a: 'AAPL', b: 'MSFT', weight: 0.64, kind: 'peer' },
      { a: 'AMZN', b: 'AAPL', weight: 0.58, kind: 'peer' },
      { a: 'TSLA', b: 'NVDA', weight: 0.41, kind: 'weak' },
      { a: 'JPM', b: 'META', weight: 0.22, kind: 'weak' },
      { a: 'AMD', b: 'AVGO', weight: 0.66, kind: 'peer' },
    ],
  };

  /* --------------------------------------------------------------------- */
  /* Derived / computed views                                               */
  /* --------------------------------------------------------------------- */

  function bySymbol(sym) {
    return STOCKS.find((s) => s.symbol === sym) || INDICES.find((i) => i.symbol === sym) || null;
  }

  // Sector aggregation for heatmaps / breadth.
  function sectorPerformance() {
    const map = {};
    STOCKS.forEach((s) => {
      const bucket = (map[s.sector] = map[s.sector] || { sector: s.sector, sumPct: 0, sumCap: 0, count: 0 });
      bucket.sumPct += s.changePct * s.mktCap;
      bucket.sumCap += s.mktCap;
      bucket.count += 1;
    });
    return Object.values(map)
      .map((b) => ({ sector: b.sector, changePct: +(b.sumPct / b.sumCap).toFixed(2), count: b.count, mktCap: b.sumCap }))
      .sort((a, b) => b.changePct - a.changePct);
  }

  function marketBreadth() {
    const advancers = STOCKS.filter((s) => s.changePct > 0).length;
    const decliners = STOCKS.filter((s) => s.changePct < 0).length;
    const unchanged = STOCKS.length - advancers - decliners;
    return { advancers, decliners, unchanged, total: STOCKS.length };
  }

  // Theme performance enriched with member snapshots.
  function themeDetail(id) {
    const t = THEMES.find((x) => x.id === id);
    if (!t) return null;
    const members = t.tickers.map((sym) => bySymbol(sym)).filter(Boolean);
    return Object.assign({}, t, { members });
  }

  // Overall market sentiment gauge (-1..1) blended from news + breadth + VIX.
  function marketSentiment() {
    const newsAvg = NEWS.reduce((a, n) => a + n.sentiment, 0) / NEWS.length;
    const breadth = marketBreadth();
    const breadthScore = (breadth.advancers - breadth.decliners) / breadth.total; // -1..1
    const vix = INDICES.find((i) => i.symbol === 'VIX').value;
    const vixScore = Math.max(-1, Math.min(1, (20 - vix) / 15)); // calm > 1 clamps
    const score = +(newsAvg * 0.4 + breadthScore * 0.35 + vixScore * 0.25).toFixed(3);
    let label = 'Neutral';
    if (score > 0.5) label = 'Extreme Greed';
    else if (score > 0.2) label = 'Greed';
    else if (score < -0.5) label = 'Extreme Fear';
    else if (score < -0.2) label = 'Fear';
    return { score, label, newsAvg: +newsAvg.toFixed(3), breadthScore: +breadthScore.toFixed(3), vixScore: +vixScore.toFixed(3) };
  }

  // Per-ticker sentiment aggregated from news mentions.
  function tickerSentiment() {
    const acc = {};
    NEWS.forEach((n) => {
      n.tickers.forEach((t) => {
        (acc[t] = acc[t] || { symbol: t, sum: 0, mentions: 0 }).sum += n.sentiment;
        acc[t].mentions += 1;
      });
    });
    return Object.values(acc)
      .map((a) => ({ symbol: a.symbol, score: +(a.sum / a.mentions).toFixed(2), mentions: a.mentions }))
      .filter((a) => bySymbol(a.symbol))
      .sort((a, b) => b.score - a.score);
  }

  // Opportunity radar: rank stocks by a simple composite momentum/value score.
  function opportunities() {
    const senti = {};
    tickerSentiment().forEach((t) => (senti[t.symbol] = t.score));
    return STOCKS.map((s) => {
      const momentum = s.changePct; // proxy for near-term momentum
      const valueBias = s.pe > 0 ? Math.max(-1.5, (30 - s.pe) / 30) : -0.5; // cheaper = higher
      const sentiScore = senti[s.symbol] || 0;
      const score = +(momentum * 0.5 + valueBias * 2.0 + sentiScore * 1.5).toFixed(2);
      const reasons = [];
      if (momentum > 1.5) reasons.push('Strong upside momentum');
      if (valueBias > 0.2) reasons.push('Attractive valuation vs. peers');
      if (sentiScore > 0.4) reasons.push('Positive news sentiment');
      if (s.mag7) reasons.push('Mega-cap liquidity');
      if (!reasons.length) reasons.push('Steady, in-line performance');
      return { symbol: s.symbol, name: s.name, sector: s.sector, price: s.price, changePct: s.changePct, score, reasons };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  // Risk radar: surface elevated-risk names with human-readable flags.
  function risks() {
    return STOCKS.map((s) => {
      const flags = [];
      let level = 0;
      if (s.beta >= 1.6) { flags.push('High beta / volatility'); level += 2; }
      else if (s.beta >= 1.25) { flags.push('Above-market beta'); level += 1; }
      if (s.pe === 0) { flags.push('No positive earnings (P/E n/a)'); level += 2; }
      else if (s.pe > 55) { flags.push('Stretched valuation'); level += 1; }
      if (s.changePct <= -1.5) { flags.push('Sharp session drawdown'); level += 1; }
      const st = tickerSentiment().find((t) => t.symbol === s.symbol);
      if (st && st.score <= -0.4) { flags.push('Negative news flow'); level += 1; }
      return { symbol: s.symbol, name: s.name, sector: s.sector, beta: s.beta, pe: s.pe, changePct: s.changePct, level, flags };
    })
      .filter((r) => r.flags.length)
      .sort((a, b) => b.level - a.level);
  }

  // Executive summary: a narrated digest built from the other views.
  function executiveSummary() {
    const senti = marketSentiment();
    const breadth = marketBreadth();
    const sectors = sectorPerformance();
    const gainers = [...STOCKS].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
    const losers = [...STOCKS].sort((a, b) => a.changePct - b.changePct).slice(0, 3);
    const topSector = sectors[0];
    const bottomSector = sectors[sectors.length - 1];
    const spx = INDICES.find((i) => i.symbol === 'SPX');

    const headline =
      spx.changePct >= 0
        ? `Risk appetite firm — S&P 500 +${spx.changePct.toFixed(2)}% with ${breadth.advancers} of ${breadth.total} names higher.`
        : `Cautious tone — S&P 500 ${spx.changePct.toFixed(2)}% as ${breadth.decliners} of ${breadth.total} names slip.`;

    const bullets = [
      `Sentiment reads <strong>${senti.label}</strong> (${senti.score >= 0 ? '+' : ''}${senti.score.toFixed(2)}), blended from news, breadth and volatility.`,
      `<strong>${topSector.sector}</strong> leads (${topSector.changePct >= 0 ? '+' : ''}${topSector.changePct}%) while <strong>${bottomSector.sector}</strong> lags (${bottomSector.changePct}%).`,
      `Standouts: ${gainers.map((g) => `${g.symbol} +${g.changePct.toFixed(2)}%`).join(', ')}.`,
      `Under pressure: ${losers.map((l) => `${l.symbol} ${l.changePct.toFixed(2)}%`).join(', ')}.`,
      `Volatility (VIX) at ${INDICES.find((i) => i.symbol === 'VIX').value}, ${senti.vixScore > 0 ? 'a calm backdrop' : 'signalling caution'}.`,
    ];
    return { headline, bullets, sentiment: senti, breadth };
  }

  /* --------------------------------------------------------------------- */
  /* Provider abstraction                                                   */
  /* --------------------------------------------------------------------- */

  const mockProvider = {
    id: 'mock',
    label: 'Mock data (offline demo)',
    isLive: false,
    getIndices: () => INDICES.slice(),
    getStocks: () => STOCKS.slice(),
    getStock: (sym) => bySymbol(sym),
    getThemes: () => THEMES.slice(),
    getThemeDetail: themeDetail,
    getNews: () => NEWS.slice(),
    getRelationships: () => RELATIONSHIPS,
    getSeries: genSeries,
    // computed views
    sectorPerformance,
    marketBreadth,
    marketSentiment,
    tickerSentiment,
    opportunities,
    risks,
    executiveSummary,
  };

  let activeProvider = mockProvider;

  MP.data = {
    // Swap in a live provider that implements the same surface as mockProvider.
    registerProvider(provider) {
      activeProvider = Object.assign({}, mockProvider, provider);
      return activeProvider;
    },
    get provider() {
      return activeProvider;
    },
    get isLive() {
      return !!activeProvider.isLive;
    },
    // Pass-throughs so callers stay decoupled from the active provider.
    getIndices: (...a) => activeProvider.getIndices(...a),
    getStocks: (...a) => activeProvider.getStocks(...a),
    getStock: (...a) => activeProvider.getStock(...a),
    getThemes: (...a) => activeProvider.getThemes(...a),
    getThemeDetail: (...a) => activeProvider.getThemeDetail(...a),
    getNews: (...a) => activeProvider.getNews(...a),
    getRelationships: (...a) => activeProvider.getRelationships(...a),
    getSeries: (...a) => activeProvider.getSeries(...a),
    sectorPerformance: (...a) => activeProvider.sectorPerformance(...a),
    marketBreadth: (...a) => activeProvider.marketBreadth(...a),
    marketSentiment: (...a) => activeProvider.marketSentiment(...a),
    tickerSentiment: (...a) => activeProvider.tickerSentiment(...a),
    opportunities: (...a) => activeProvider.opportunities(...a),
    risks: (...a) => activeProvider.risks(...a),
    executiveSummary: (...a) => activeProvider.executiveSummary(...a),
  };
})(typeof window !== 'undefined' ? window : this);
