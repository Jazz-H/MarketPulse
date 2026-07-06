/* Market Overview — indices, sector heatmap and breadth snapshot. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'overview',
    title: 'Market Overview',
    icon: '🌐',
    subtitle: 'Indices, commodities, rates and how capital is rotating across sectors right now.',
    render(root, ctx) {
      // Index stat tiles
      const idxGrid = el('div', { class: 'grid cols-4' });
      MP.data.getIndices().forEach((ix) => {
        const series = MP.data.getSeries(ix.symbol, ix.value, 40, ix.kind === 'vol' ? 0.03 : 0.006);
        idxGrid.appendChild(
          el('div', { class: 'card tight stat' }, [
            el('div', { class: 's-label', text: ix.name }),
            el('div', { class: 's-value', text: (ix.unit === '$' ? '$' : '') + fmt.num(ix.value, ix.value > 1000 ? 0 : 2) + (ix.unit === '%' ? '%' : '') }),
            el('div', { class: 's-delta ' + fmt.cls(ix.changePct), text: fmt.arrow(ix.changePct) + ' ' + fmt.signed(ix.change) + ' (' + fmt.pct(ix.changePct) + ')' }),
            el('div', { class: 'spark-row', html: svg.sparkline(series, { width: 220, height: 34, color: ix.changePct >= 0 ? 'var(--up)' : 'var(--down)' }) }),
          ])
        );
      });
      root.appendChild(section('Indices, Rates & Commodities', idxGrid));

      // Sector heatmap
      const sectors = MP.data.sectorPerformance();
      const maxAbs = Math.max.apply(null, sectors.map((s) => Math.abs(s.changePct))) || 1;
      const heat = el('div', { class: 'heat-grid' });
      sectors.forEach((s) => {
        heat.appendChild(
          el('div', { class: 'heat-cell', style: 'background:' + heatColor(s.changePct, maxAbs) }, [
            el('span', { class: 'hc-sym', text: s.sector }),
            el('span', { class: 'hc-pct', text: fmt.pct(s.changePct) }),
            el('span', { class: 'hc-name', text: s.count + ' names · $' + fmt.compact(s.mktCap) }),
          ])
        );
      });

      // Breadth + leaders side by side
      const breadth = MP.data.marketBreadth();
      const t = breadth.total;
      const breadthCard = el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { text: 'Breadth' })]),
        el('div', { style: 'display:flex;justify-content:center;margin:6px 0 14px', html: svg.donut(
          [ { value: breadth.advancers, color: 'var(--up)' }, { value: breadth.unchanged, color: 'var(--muted-2)' }, { value: breadth.decliners, color: 'var(--down)' } ],
          { center: Math.round(breadth.advancers / t * 100) + '%', size: 140 }
        ) }),
        el('div', { class: 'kv' }, [
          el('span', { class: 'k' }, [el('span', { class: 'senti-dot', style: 'background:var(--up);margin-right:6px' }), 'Advancing']), el('span', { class: 'v', text: String(breadth.advancers) }),
          el('span', { class: 'k' }, [el('span', { class: 'senti-dot', style: 'background:var(--down);margin-right:6px' }), 'Declining']), el('span', { class: 'v', text: String(breadth.decliners) }),
          el('span', { class: 'k' }, [el('span', { class: 'senti-dot', style: 'background:var(--muted-2);margin-right:6px' }), 'Unchanged']), el('span', { class: 'v', text: String(breadth.unchanged) }),
        ]),
      ]);

      const heatCard = el('div', { class: 'card span-2' }, [
        el('div', { class: 'card-head' }, [el('h3', { text: 'Sector Heatmap' }), el('span', { class: 'ch-sub', text: 'cap-weighted % change' })]),
        heat,
      ]);

      const row = el('div', { class: 'grid cols-3' }, [heatCard, breadthCard]);
      root.appendChild(section('Sector Rotation', row));
    },
  });

  function section(title, node) {
    return el('div', { style: 'margin-bottom:22px' }, [
      el('h3', { style: 'font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px', text: title }),
      node,
    ]);
  }
  function heatColor(pct, maxAbs) {
    const t = Math.max(-1, Math.min(1, pct / maxAbs));
    if (t >= 0) return `rgba(38,194,129,${(0.25 + t * 0.6).toFixed(2)})`;
    return `rgba(255,92,122,${(0.25 + Math.abs(t) * 0.6).toFixed(2)})`;
  }
})(typeof window !== 'undefined' ? window : this);
