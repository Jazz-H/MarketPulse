/* Risk Radar — names carrying elevated risk, with human-readable flags. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el } = MP.utils;

  MP.registerModule({
    id: 'risk',
    title: 'Risk Radar',
    icon: '⚠️',
    subtitle: 'Where the fragility sits — high beta, stretched valuations, negative flow and sharp drawdowns.',
    render(root, ctx) {
      const risks = MP.data.risks();
      const high = risks.filter((r) => r.level >= 3);
      const med = risks.filter((r) => r.level === 2);
      const low = risks.filter((r) => r.level <= 1);

      const tiles = el('div', { class: 'grid cols-3' }, [
        countTile('High risk', high.length, 'var(--down)'),
        countTile('Moderate', med.length, 'var(--warn)'),
        countTile('Watch', low.length, 'var(--muted-2)'),
      ]);
      root.appendChild(tiles);

      const card = el('div', { class: 'card', style: 'margin-top:16px;padding:6px' });
      const table = el('table', { class: 'tbl' });
      const thead = el('thead', {}, [el('tr', {}, ['Ticker', 'Risk', 'Beta', 'P/E', 'Chg %', 'Flags'].map((h, i) => el('th', { class: i > 1 && i < 5 ? 'num' : '' }, [document.createTextNode(h)])))]);
      table.appendChild(thead);
      const tb = el('tbody');
      risks.forEach((r) => {
        tb.appendChild(
          el('tr', { onclick: () => ctx.openStock(r.symbol) }, [
            el('td', {}, [el('div', { class: 'sym', text: r.symbol }), el('div', { class: 'name', style: 'font-size:11px', text: r.name })]),
            el('td', {}, [riskBadge(r.level)]),
            el('td', { class: 'num', text: fmt.num(r.beta, 2) }),
            el('td', { class: 'num', text: r.pe > 0 ? fmt.num(r.pe, 1) : '—' }),
            el('td', { class: 'num ' + fmt.cls(r.changePct), text: fmt.pct(r.changePct) }),
            el('td', {}, [el('div', { class: 'tag-row' }, r.flags.map((f) => el('span', { class: 'tag risk', text: f })))]),
          ])
        );
      });
      table.appendChild(tb);
      card.appendChild(el('div', { style: 'overflow-x:auto' }, [table]));
      root.appendChild(card);
    },
  });

  function countTile(label, n, color) {
    return el('div', { class: 'card tight stat' }, [
      el('div', { class: 's-label', text: label }),
      el('div', { class: 's-value', style: 'color:' + color, text: String(n) }),
      el('div', { class: 'mini-note', text: 'tickers flagged' }),
    ]);
  }
  function riskBadge(level) {
    const map = level >= 3 ? ['High', 'var(--down)', 'var(--down-soft)'] : level === 2 ? ['Moderate', 'var(--warn)', 'rgba(245,183,61,0.15)'] : ['Watch', 'var(--muted)', 'var(--panel-2)'];
    return el('span', { class: 'pill', style: 'background:' + map[2] + ';color:' + map[1], text: map[0] });
  }
})(typeof window !== 'undefined' ? window : this);
