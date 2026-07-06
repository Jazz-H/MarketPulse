/* Executive Summary — a narrated, at-a-glance digest of the session. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'summary',
    title: 'Executive Summary',
    icon: '📋',
    subtitle: 'The market in a minute — narrated highlights synthesised from prices, breadth, sentiment and news.',
    render(root, ctx) {
      const ex = MP.data.executiveSummary();
      const senti = ex.sentiment;
      const breadth = ex.breadth;
      const news = MP.data.getNews().slice(0, 4);

      const grid = el('div', { class: 'grid cols-3' });

      // Headline card (spans 2)
      grid.appendChild(
        el('div', { class: 'card span-2' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: "Today's Briefing" }), el('span', { class: 'ch-sub', text: 'Auto-generated' })]),
          el('p', { style: 'font-size:16px;font-weight:600;line-height:1.5;margin:0 0 14px', text: ex.headline }),
          el('ul', { class: 'brief-list', style: 'margin:0;padding-left:18px;display:flex;flex-direction:column;gap:9px' },
            ex.bullets.map((b) => el('li', { html: b }))
          ),
        ])
      );

      // Sentiment mini gauge
      grid.appendChild(
        el('div', { class: 'card gauge-wrap' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: 'Market Sentiment' })]),
          el('div', { html: svg.gauge(senti.score) }),
          el('div', { class: 'gauge-score ' + fmt.cls(senti.score), text: fmt.signed(senti.score) }),
          el('div', { class: 'gauge-label', text: senti.label }),
          el('button', { class: 'btn ghost sm', style: 'margin-top:12px', text: 'Open Sentiment Engine', onclick: () => ctx.navigate('sentiment') }),
        ])
      );

      // Breadth card
      const total = breadth.total;
      grid.appendChild(
        el('div', { class: 'card' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: 'Market Breadth' }), el('span', { class: 'ch-sub', text: total + ' names' })]),
          el('div', { class: 'breadth-bar', style: 'margin-bottom:10px' }, [
            el('span', { style: 'width:' + (breadth.advancers / total * 100) + '%;background:var(--up)' }),
            el('span', { style: 'width:' + (breadth.unchanged / total * 100) + '%;background:var(--muted-2)' }),
            el('span', { style: 'width:' + (breadth.decliners / total * 100) + '%;background:var(--down)' }),
          ]),
          el('div', { style: 'display:flex;justify-content:space-between;font-size:13px' }, [
            el('span', { class: 'up', text: '▲ ' + breadth.advancers + ' advancing' }),
            el('span', { class: 'down', text: breadth.decliners + ' declining ▼' }),
          ]),
        ])
      );

      // Top movers
      const stocks = MP.data.getStocks();
      const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
      const losers = [...stocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
      function moverCard(title, list, icon) {
        return el('div', { class: 'card' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: icon + ' ' + title })]),
          el('div', { class: 'rowlist' }, list.map((s) =>
            el('div', { class: 'row', onclick: () => ctx.openStock(s.symbol) }, [
              el('div', { class: 'r-main' }, [el('div', { class: 'r-title', text: s.symbol }), el('div', { class: 'r-sub', text: s.name })]),
              el('span', { class: 'pill ' + fmt.cls(s.changePct), text: fmt.pct(s.changePct) }),
            ])
          )),
        ]);
      }
      grid.appendChild(moverCard('Top Gainers', gainers, '🚀'));
      grid.appendChild(moverCard('Top Laggards', losers, '📉'));

      // Headlines
      grid.appendChild(
        el('div', { class: 'card' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: '📰 Latest Headlines' }), el('button', { class: 'btn ghost sm', text: 'All news', onclick: () => ctx.navigate('news') })]),
          el('div', {}, news.map((n) =>
            el('div', { class: 'news-item' }, [
              el('div', { class: 'news-head' }, [
                el('span', { class: 'senti-dot', style: 'background:' + sentiColor(n.sentiment) }),
                el('span', { text: n.source }), el('span', { text: '·' }), el('span', { text: fmt.ago(n.minutesAgo) }),
              ]),
              el('div', { class: 'news-headline', text: n.headline }),
            ])
          )),
        ])
      );

      root.appendChild(grid);
    },
  });

  function sentiColor(s) { return s > 0.15 ? 'var(--up)' : s < -0.15 ? 'var(--down)' : 'var(--warn)'; }
})(typeof window !== 'undefined' ? window : this);
