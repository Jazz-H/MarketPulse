/* Theme Investing — curated baskets and their constituents. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  MP.registerModule({
    id: 'themes',
    title: 'Theme Investing',
    icon: '🧩',
    subtitle: 'Track the structural narratives — AI, semis, cloud, energy — as coherent baskets.',
    render(root, ctx) {
      const themes = MP.data.getThemes();
      let activeId = themes[0].id;

      const layout = el('div', { class: 'grid cols-3' });
      const list = el('div', { class: 'card', style: 'align-self:start' }, [el('div', { class: 'card-head' }, [el('h3', { text: 'Themes' })])]);
      const detailHolder = el('div', { class: 'card span-2' });
      layout.appendChild(list);
      layout.appendChild(detailHolder);

      const rowlist = el('div', { class: 'rowlist' });
      themes.forEach((t) => {
        rowlist.appendChild(
          el('div', { class: 'row', 'data-id': t.id, onclick: () => { activeId = t.id; drawDetail(); markActive(); }, style: 'cursor:pointer' }, [
            el('div', { class: 'r-main' }, [el('div', { class: 'r-title', text: t.name }), el('div', { class: 'r-sub', text: t.tickers.length + ' holdings' })]),
            el('span', { class: 'pill ' + fmt.cls(t.changePct), text: fmt.pct(t.changePct) }),
          ])
        );
      });
      list.appendChild(rowlist);
      function markActive() {
        rowlist.querySelectorAll('.row').forEach((r) => r.style.background = r.getAttribute('data-id') === activeId ? 'var(--panel-2)' : '');
      }

      function drawDetail() {
        const t = MP.data.getThemeDetail(activeId);
        detailHolder.innerHTML = '';
        const avg = t.changePct;
        detailHolder.appendChild(el('div', { class: 'card-head' }, [
          el('div', {}, [el('h3', { text: t.name }), el('div', { class: 'mini-note', text: t.blurb })]),
          el('span', { class: 'pill ' + fmt.cls(avg), style: 'font-size:14px', text: fmt.pct(avg) }),
        ]));
        // member bars
        const members = [...t.members].sort((a, b) => b.changePct - a.changePct);
        const maxAbs = Math.max.apply(null, members.map((m) => Math.abs(m.changePct))) || 1;
        const bars = el('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-top:6px' });
        members.forEach((m) => {
          const w = (Math.abs(m.changePct) / maxAbs) * 50;
          bars.appendChild(
            el('div', { style: 'display:flex;align-items:center;gap:10px;cursor:pointer', onclick: () => ctx.openStock(m.symbol) }, [
              el('span', { style: 'width:56px;font-weight:700', text: m.symbol }),
              el('div', { style: 'flex:1;display:flex;align-items:center;justify-content:center;position:relative;height:20px' }, [
                el('div', { style: 'position:absolute;left:50%;width:1px;height:100%;background:var(--line)' }),
                el('div', { style: 'position:absolute;left:50%;height:14px;border-radius:4px;' + (m.changePct >= 0 ? 'width:' + w + '%;background:var(--up)' : 'width:' + w + '%;transform:translateX(-100%);background:var(--down)') }),
              ]),
              el('span', { class: 'num ' + fmt.cls(m.changePct), style: 'width:64px', text: fmt.pct(m.changePct) }),
            ])
          );
        });
        detailHolder.appendChild(bars);
      }

      root.appendChild(layout);
      drawDetail();
      markActive();
    },
  });
})(typeof window !== 'undefined' ? window : this);
