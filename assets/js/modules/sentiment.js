/* Sentiment Engine — overall gauge plus per-ticker sentiment leaderboard. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'sentiment',
    title: 'Sentiment Engine',
    icon: '🧭',
    subtitle: 'A fear/greed read blended from news tone, market breadth and volatility.',
    render(root, ctx) {
      const senti = MP.data.marketSentiment();
      const perTicker = MP.data.tickerSentiment();

      const top = el('div', { class: 'grid cols-3' });

      // Big gauge
      top.appendChild(
        el('div', { class: 'card gauge-wrap' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: 'Fear & Greed' })]),
          el('div', { html: svg.gauge(senti.score) }),
          el('div', { class: 'gauge-score ' + fmt.cls(senti.score), text: fmt.signed(senti.score) }),
          el('div', { class: 'gauge-label', text: senti.label }),
        ])
      );

      // Component breakdown
      top.appendChild(
        el('div', { class: 'card span-2' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: 'What is driving the read' }), el('span', { class: 'ch-sub', text: 'weighted blend' })]),
          componentRow('News tone', senti.newsAvg, '40%', 'Average sentiment across the latest headlines'),
          componentRow('Market breadth', senti.breadthScore, '35%', 'Advancers minus decliners across the universe'),
          componentRow('Volatility (VIX)', senti.vixScore, '25%', 'Lower volatility reads as calmer / greedier'),
        ])
      );
      root.appendChild(top);

      // Per-ticker leaderboard
      const most = perTicker.slice(0, 6);
      const least = [...perTicker].reverse().slice(0, 6);
      const cols = el('div', { class: 'grid cols-2', style: 'margin-top:18px' });
      cols.appendChild(tickerCard('Most Positive Buzz', most, ctx));
      cols.appendChild(tickerCard('Most Negative Buzz', least, ctx));
      root.appendChild(cols);
    },
  });

  function componentRow(label, value, weight, hint) {
    return el('div', { style: 'display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line-soft)' }, [
      el('div', { style: 'flex:1' }, [
        el('div', { style: 'font-weight:600', text: label + '  ' }),
        el('div', { class: 'mini-note', text: hint }),
      ]),
      el('span', { class: 'badge', text: 'weight ' + weight }),
      el('div', { html: MP.utils.svg.meter(value, { width: 140, height: 10 }) }),
      el('span', { class: 'num ' + fmt.cls(value), style: 'width:52px', text: fmt.signed(value) }),
    ]);
  }

  function tickerCard(title, list, ctx) {
    return el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { text: title })]),
      el('div', { class: 'rowlist' }, list.map((t) => {
        const s = MP.data.getStock(t.symbol);
        return el('div', { class: 'row', onclick: () => ctx.openStock(t.symbol) }, [
          el('div', { class: 'r-main' }, [el('div', { class: 'r-title', text: t.symbol }), el('div', { class: 'r-sub', text: (s ? s.name : '') + ' · ' + t.mentions + ' mention' + (t.mentions > 1 ? 's' : '') })]),
          el('div', { html: MP.utils.svg.meter(t.score, { width: 90, height: 8 }) }),
          el('span', { class: 'num ' + fmt.cls(t.score), style: 'width:48px', text: fmt.signed(t.score) }),
        ]);
      })),
    ]);
  }
})(typeof window !== 'undefined' ? window : this);
