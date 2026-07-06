/* News Skimmer — the wire, filterable by ticker and sentiment. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el } = MP.utils;

  MP.registerModule({
    id: 'news',
    title: 'News Skimmer',
    icon: '📰',
    subtitle: 'A fast, sentiment-tagged read of the tape. Filter by tone or jump to a ticker.',
    render(root, ctx) {
      const news = MP.data.getNews();
      let toneFilter = 'all';
      let query = '';

      const controls = el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
      const seg = el('div', { class: 'seg' });
      [['all', 'All'], ['pos', '🟢 Positive'], ['neu', '🟡 Neutral'], ['neg', '🔴 Negative']].forEach(([k, lbl]) => {
        seg.appendChild(el('button', { class: k === 'all' ? 'active' : '', text: lbl, onclick: function () { toneFilter = k; seg.querySelectorAll('button').forEach((b) => b.classList.remove('active')); this.classList.add('active'); draw(); } }));
      });
      const searchInput = el('input', { class: 'field', placeholder: 'Filter headlines…', oninput: function () { query = this.value.toLowerCase(); draw(); } });
      controls.appendChild(seg);
      controls.appendChild(searchInput);
      root.appendChild(controls);

      const list = el('div', { class: 'card' });
      root.appendChild(list);

      function tone(n) { return n.sentiment > 0.15 ? 'pos' : n.sentiment < -0.15 ? 'neg' : 'neu'; }
      function draw() {
        const rows = news.filter((n) => (toneFilter === 'all' || tone(n) === toneFilter) && (!query || n.headline.toLowerCase().includes(query) || n.tickers.join(' ').toLowerCase().includes(query)));
        list.innerHTML = '';
        if (!rows.length) { list.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'e-icon', text: '🔍' }), el('p', { text: 'No headlines match your filter.' })])); return; }
        rows.forEach((n) => {
          list.appendChild(
            el('div', { class: 'news-item' }, [
              el('div', { class: 'news-head' }, [
                el('span', { class: 'senti-dot', style: 'background:' + sentiColor(n.sentiment) }),
                el('span', { text: n.source }), el('span', { text: '·' }), el('span', { text: fmt.ago(n.minutesAgo) }),
                el('span', { class: 'badge', text: n.category }),
                el('span', { style: 'margin-left:auto' }, [el('span', { class: fmt.cls(n.sentiment), style: 'font-family:var(--mono);font-size:12px', text: 'sentiment ' + fmt.signed(n.sentiment) })]),
              ]),
              el('div', { class: 'news-headline', text: n.headline }),
              el('div', { class: 'news-tickers' }, n.tickers.map((t) =>
                el('span', { class: 'chip', text: t, onclick: () => { if (MP.data.getStock(t) && !MP.data.getStock(t).kind) ctx.openStock(t); } })
              )),
            ])
          );
        });
      }
      draw();
    },
  });
  function sentiColor(s) { return s > 0.15 ? 'var(--up)' : s < -0.15 ? 'var(--down)' : 'var(--warn)'; }
})(typeof window !== 'undefined' ? window : this);
