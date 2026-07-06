/* Magnificent 7 Tracker — the mega-cap complex, weighted and compared. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'mag7',
    title: 'Magnificent 7',
    icon: '✨',
    subtitle: 'AAPL · MSFT · GOOGL · AMZN · NVDA · META · TSLA — the mega-caps steering the index.',
    render(root, ctx) {
      const mag7 = MP.data.getStocks().filter((s) => s.mag7);
      const totalCap = mag7.reduce((a, s) => a + s.mktCap, 0);
      const weightedChg = mag7.reduce((a, s) => a + s.changePct * s.mktCap, 0) / totalCap;
      const best = [...mag7].sort((a, b) => b.changePct - a.changePct)[0];
      const worst = [...mag7].sort((a, b) => a.changePct - b.changePct)[0];

      // Summary tiles
      const tiles = el('div', { class: 'grid cols-4' }, [
        statTile('Combined Market Cap', '$' + fmt.compact(totalCap), null),
        statTile('Group Move (wtd)', fmt.pct(weightedChg), weightedChg),
        statTile('Leader', best.symbol + ' ' + fmt.pct(best.changePct), best.changePct),
        statTile('Laggard', worst.symbol + ' ' + fmt.pct(worst.changePct), worst.changePct),
      ]);
      root.appendChild(tiles);

      // Cards per member
      const cards = el('div', { class: 'grid cols-3', style: 'margin-top:18px' });
      mag7.forEach((s) => {
        const series = MP.data.getSeries(s.symbol, s.price, 50, 0.01 * (s.beta || 1));
        const weight = (s.mktCap / totalCap) * 100;
        cards.appendChild(
          el('div', { class: 'card', style: 'cursor:pointer', onclick: () => ctx.openStock(s.symbol) }, [
            el('div', { class: 'card-head' }, [
              el('div', {}, [el('h3', { text: s.symbol }), el('div', { class: 'mini-note', text: s.name })]),
              el('span', { class: 'pill ' + fmt.cls(s.changePct), text: fmt.pct(s.changePct) }),
            ]),
            el('div', { html: svg.sparkline(series, { width: 340, height: 60, color: s.changePct >= 0 ? 'var(--up)' : 'var(--down)' }) }),
            el('div', { class: 'kv', style: 'margin-top:12px' }, [
              el('span', { class: 'k', text: 'Price' }), el('span', { class: 'v', text: fmt.money(s.price) }),
              el('span', { class: 'k', text: 'Index weight' }), el('span', { class: 'v', text: fmt.num(weight, 1) + '%' }),
              el('span', { class: 'k', text: 'P/E' }), el('span', { class: 'v', text: fmt.num(s.pe, 1) }),
            ]),
            el('div', { class: 'breadth-bar', style: 'margin-top:10px;height:6px' }, [el('span', { style: 'width:' + weight + '%;background:var(--accent)' })]),
          ])
        );
      });
      root.appendChild(cards);
    },
  });

  function statTile(label, value, delta) {
    return el('div', { class: 'card tight stat' }, [
      el('div', { class: 's-label', text: label }),
      el('div', { class: 's-value ' + (delta == null ? '' : fmt.cls(delta)), text: value }),
    ]);
  }
})(typeof window !== 'undefined' ? window : this);
