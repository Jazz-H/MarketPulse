/* Opportunity Radar — ranked ideas from a transparent composite score. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'opportunity',
    title: 'Opportunity Radar',
    icon: '🎯',
    subtitle: 'A ranked shortlist scored on momentum, valuation and news sentiment. Illustrative, not advice.',
    render(root, ctx) {
      const ops = MP.data.opportunities();
      const maxScore = Math.max.apply(null, ops.map((o) => o.score)) || 1;

      const intro = el('div', { class: 'card', style: 'margin-bottom:16px' }, [
        el('div', { class: 'mini-note', html: 'Score = <b>0.5·momentum</b> + <b>2.0·value bias</b> + <b>1.5·sentiment</b>. Every input is visible so you can judge the logic yourself.' }),
      ]);
      root.appendChild(intro);

      const grid = el('div', { class: 'grid cols-2' });
      ops.forEach((o, i) => {
        const series = MP.data.getSeries(o.symbol, o.price, 40, 0.011);
        grid.appendChild(
          el('div', { class: 'card', style: 'cursor:pointer', onclick: () => ctx.openStock(o.symbol) }, [
            el('div', { class: 'card-head' }, [
              el('div', { style: 'display:flex;align-items:center;gap:10px' }, [
                el('span', { class: 'badge', style: 'font-weight:700', text: '#' + (i + 1) }),
                el('div', {}, [el('h3', { text: o.symbol }), el('div', { class: 'mini-note', text: o.name + ' · ' + o.sector })]),
              ]),
              el('span', { class: 'pill ' + fmt.cls(o.changePct), text: fmt.pct(o.changePct) }),
            ]),
            el('div', { style: 'display:flex;align-items:center;gap:14px' }, [
              el('div', { style: 'flex:1' }, [
                el('div', { style: 'display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px' }, [el('span', { text: 'Opportunity score' }), el('span', { class: 'num', text: fmt.num(o.score, 1) })]),
                el('div', { class: 'breadth-bar', style: 'height:8px' }, [el('span', { style: 'width:' + Math.max(6, (o.score / maxScore) * 100) + '%;background:linear-gradient(90deg,var(--accent),var(--accent-2))' })]),
              ]),
              el('div', { html: svg.sparkline(series, { width: 100, height: 34, color: o.changePct >= 0 ? 'var(--up)' : 'var(--down)' }) }),
            ]),
            el('div', { class: 'tag-row', style: 'margin-top:12px' }, o.reasons.map((r) => el('span', { class: 'tag good', text: r }))),
          ])
        );
      });
      root.appendChild(grid);
    },
  });
})(typeof window !== 'undefined' ? window : this);
