/* Top Stocks — sortable, filterable table of the tracked universe.
 * Also exposes MP.ui.stockTable, reused by Mag 7 and Watchlist modules. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  const COLUMNS = [
    { key: 'symbol', label: 'Ticker', align: 'left' },
    { key: 'price', label: 'Price', align: 'right', fmt: (s) => fmt.money(s.price) },
    { key: 'changePct', label: 'Chg %', align: 'right', fmt: (s) => el('span', { class: 'pill ' + fmt.cls(s.changePct), text: fmt.pct(s.changePct) }) },
    { key: 'spark', label: 'Trend', align: 'left', sortable: false },
    { key: 'mktCap', label: 'Mkt Cap', align: 'right', fmt: (s) => '$' + fmt.compact(s.mktCap) },
    { key: 'pe', label: 'P/E', align: 'right', fmt: (s) => (s.pe > 0 ? fmt.num(s.pe, 1) : '—') },
    { key: 'volume', label: 'Volume', align: 'right', fmt: (s) => fmt.compact(s.volume) },
    { key: 'sector', label: 'Sector', align: 'left' },
  ];

  // Reusable sortable stock table. opts: { columns, onRow, initialSort }
  function stockTable(rows, opts) {
    opts = opts || {};
    const cols = opts.columns || COLUMNS;
    let sortKey = opts.initialSort || 'mktCap';
    let sortDir = opts.initialDir || -1;
    const wrap = el('div', { style: 'overflow-x:auto' });
    const table = el('table', { class: 'tbl' });
    wrap.appendChild(table);

    function draw() {
      const sorted = [...rows].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') return sortDir * va.localeCompare(vb);
        return sortDir * ((va || 0) - (vb || 0));
      });
      table.innerHTML = '';
      const thead = el('thead');
      const htr = el('tr');
      cols.forEach((c) => {
        const th = el('th', {
          class: (c.sortable === false ? '' : 'sortable') + (c.align === 'right' ? ' num' : ''),
          onclick: c.sortable === false ? null : () => { if (sortKey === c.key) sortDir *= -1; else { sortKey = c.key; sortDir = typeof rows[0][c.key] === 'string' ? 1 : -1; } draw(); },
        }, [document.createTextNode(c.label + ' '), sortKey === c.key ? el('span', { class: 'sort-ind', text: sortDir < 0 ? '▼' : '▲' }) : null]);
        htr.appendChild(th);
      });
      thead.appendChild(htr);
      table.appendChild(thead);
      const tb = el('tbody');
      sorted.forEach((s) => {
        const tr = el('tr', { onclick: () => opts.onRow && opts.onRow(s.symbol) });
        cols.forEach((c) => {
          let content;
          if (c.key === 'symbol') content = el('td', {}, [el('div', { class: 'sym', text: s.symbol }), el('div', { class: 'name', style: 'font-size:11px', text: s.name })]);
          else if (c.key === 'spark') content = el('td', { html: svg.sparkline(MP.data.getSeries(s.symbol, s.price, 30, 0.01), { width: 96, height: 26, color: s.changePct >= 0 ? 'var(--up)' : 'var(--down)' }) });
          else {
            const val = c.fmt ? c.fmt(s) : s[c.key];
            content = el('td', { class: c.align === 'right' ? 'num' : '' }, [typeof val === 'string' || typeof val === 'number' ? document.createTextNode(val) : val]);
          }
          tr.appendChild(content);
        });
        tb.appendChild(tr);
      });
      table.appendChild(tb);
    }
    draw();
    return wrap;
  }
  MP.ui = MP.ui || {};
  MP.ui.stockTable = stockTable;

  MP.registerModule({
    id: 'stocks',
    title: 'Top Stocks',
    icon: '📊',
    subtitle: 'The full tracked universe. Click any column to sort, any row for details.',
    render(root, ctx) {
      const stocks = MP.data.getStocks();
      const sectors = ['All', ...Array.from(new Set(stocks.map((s) => s.sector)))];
      let sectorFilter = 'All';

      const controls = el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
      const seg = el('div', { class: 'seg' });
      const tableHolder = el('div', { class: 'card', style: 'padding:6px' });

      function refresh() {
        const rows = sectorFilter === 'All' ? stocks : stocks.filter((s) => s.sector === sectorFilter);
        tableHolder.innerHTML = '';
        tableHolder.appendChild(stockTable(rows, { onRow: ctx.openStock }));
      }
      sectors.forEach((sec) => {
        seg.appendChild(el('button', { class: sec === 'All' ? 'active' : '', text: sec, onclick: function () { sectorFilter = sec; seg.querySelectorAll('button').forEach((b) => b.classList.remove('active')); this.classList.add('active'); refresh(); } }));
      });
      controls.appendChild(seg);
      root.appendChild(controls);
      root.appendChild(tableHolder);
      refresh();
    },
  });
})(typeof window !== 'undefined' ? window : this);
