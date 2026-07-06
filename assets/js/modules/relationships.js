/* Relationship Mapping — a correlation graph across key tickers. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, esc } = MP.utils;

  MP.registerModule({
    id: 'relationships',
    title: 'Relationship Mapping',
    icon: '🕸️',
    subtitle: 'How the leaders move together — thicker links mean tighter co-movement.',
    render(root, ctx) {
      const g = MP.data.getRelationships();
      const W = 640, H = 460, cx = W / 2, cy = H / 2, R = 175;
      // Deterministic circular layout.
      const pos = {};
      g.nodes.forEach((n, i) => {
        const a = (i / g.nodes.length) * Math.PI * 2 - Math.PI / 2;
        pos[n] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
      });

      let parts = [];
      // edges
      g.edges.forEach((e) => {
        const p1 = pos[e.a], p2 = pos[e.b];
        if (!p1 || !p2) return;
        const width = 1 + e.weight * 5;
        const color = e.kind === 'supply' ? 'var(--accent-2)' : e.weight >= 0.7 ? 'var(--accent)' : 'var(--line)';
        const opacity = 0.35 + e.weight * 0.5;
        parts.push(`<line class="edge" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(1)}" stroke-opacity="${opacity.toFixed(2)}"/>`);
      });
      // nodes
      g.nodes.forEach((n) => {
        const s = MP.data.getStock(n);
        const p = pos[n];
        const fill = s ? (s.changePct >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--muted)';
        const r = s ? 14 + Math.min(14, Math.sqrt(s.mktCap / 1e11)) : 16;
        parts.push(
          `<g class="node" data-sym="${esc(n)}" style="cursor:pointer">` +
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="0.9" stroke="var(--bg)" stroke-width="2"/>` +
          `<text x="${p.x.toFixed(1)}" y="${(p.y + r + 13).toFixed(1)}" text-anchor="middle">${esc(n)}</text>` +
          `</g>`
        );
      });

      const svgEl = el('div', { class: 'graph-wrap', html:
        `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto">${parts.join('')}</svg>`
      });
      // Attach click handlers to node groups.
      svgEl.querySelectorAll('.node').forEach((node) => {
        node.addEventListener('click', () => ctx.openStock(node.getAttribute('data-sym')));
      });

      const legend = el('div', { style: 'display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--muted)' }, [
        legendItem('var(--accent)', 'Strong co-movement (ρ ≥ 0.7)'),
        legendItem('var(--accent-2)', 'Supply-chain link'),
        legendItem('var(--up)', 'Node up today'),
        legendItem('var(--down)', 'Node down today'),
        el('span', { text: 'Node size ∝ market cap' }),
      ]);

      const card = el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { text: 'Correlation Web' }), el('span', { class: 'ch-sub', text: g.nodes.length + ' nodes · ' + g.edges.length + ' links' })]),
        svgEl,
        legend,
      ]);
      root.appendChild(card);

      // Strongest pairs table
      const pairs = [...g.edges].sort((a, b) => b.weight - a.weight).slice(0, 6);
      const list = el('div', { class: 'card', style: 'margin-top:16px' }, [
        el('div', { class: 'card-head' }, [el('h3', { text: 'Tightest Pairs' })]),
        el('div', { class: 'rowlist' }, pairs.map((p) =>
          el('div', { class: 'row' }, [
            el('div', { class: 'r-main' }, [el('div', { class: 'r-title', text: p.a + ' ↔ ' + p.b }), el('div', { class: 'r-sub', text: p.kind === 'supply' ? 'Supply-chain relationship' : 'Historical co-movement' })]),
            el('div', { style: 'display:flex;align-items:center;gap:10px' }, [
              el('div', { class: 'breadth-bar', style: 'width:120px;height:8px' }, [el('span', { style: 'width:' + (p.weight * 100) + '%;background:var(--accent)' })]),
              el('span', { class: 'num', style: 'width:44px', text: 'ρ ' + fmt.num(p.weight, 2) }),
            ]),
          ])
        )),
      ]);
      root.appendChild(list);
    },
  });

  function legendItem(color, label) {
    return el('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, [el('span', { class: 'senti-dot', style: 'background:' + color }), label]);
  }
})(typeof window !== 'undefined' ? window : this);
