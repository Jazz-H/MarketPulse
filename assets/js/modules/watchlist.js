/* Watchlist — a persistent set of tickers the user cares about.
 * Exposes MP.watchlist so the detail drawer and other modules can toggle it. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el } = MP.utils;

  // Persistent store, created at load time so app.js drawer can use it.
  const store = MP.utils.makeStore('mp.watchlist', ['AAPL', 'NVDA', 'MSFT', 'LLY']);
  const listeners = [];
  const watchlist = {
    list: () => store.get(),
    has: (sym) => store.get().indexOf(sym) !== -1,
    add(sym) { if (!watchlist.has(sym)) { store.set(store.get().concat([sym])); emit(); } },
    remove(sym) { store.set(store.get().filter((s) => s !== sym)); emit(); },
    toggle(sym) { watchlist.has(sym) ? watchlist.remove(sym) : watchlist.add(sym); },
    onChange(fn) { listeners.push(fn); },
  };
  function emit() { listeners.forEach((f) => f(store.get())); }
  MP.watchlist = watchlist;

  MP.registerModule({
    id: 'watchlist',
    title: 'Watchlist',
    icon: '⭐',
    subtitle: 'Your tracked names in one place. Saved to this browser.',
    render(root, ctx) {
      const holder = el('div');
      root.appendChild(buildAdder());
      root.appendChild(holder);

      function buildAdder() {
        const all = MP.data.getStocks();
        const select = el('select', { class: 'field' }, [el('option', { value: '', text: 'Add a ticker…' })].concat(
          all.map((s) => el('option', { value: s.symbol, text: s.symbol + ' — ' + s.name }))
        ));
        const btn = el('button', { class: 'btn', text: '+ Add', onclick: () => { if (select.value) { watchlist.add(select.value); select.value = ''; draw(); } } });
        return el('div', { style: 'display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap' }, [select, btn]);
      }

      function draw() {
        const syms = watchlist.list();
        holder.innerHTML = '';
        if (!syms.length) {
          holder.appendChild(el('div', { class: 'card' }, [el('div', { class: 'empty' }, [el('div', { class: 'e-icon', text: '⭐' }), el('p', { text: 'Your watchlist is empty. Add a ticker above or star one from any detail panel.' })])]));
          return;
        }
        const rows = syms.map((s) => MP.data.getStock(s)).filter(Boolean);
        const card = el('div', { class: 'card', style: 'padding:6px' });
        const cols = [
          { key: 'symbol', label: 'Ticker', align: 'left' },
          { key: 'price', label: 'Price', align: 'right', fmt: (s) => fmt.money(s.price) },
          { key: 'changePct', label: 'Chg %', align: 'right', fmt: (s) => el('span', { class: 'pill ' + fmt.cls(s.changePct), text: fmt.pct(s.changePct) }) },
          { key: 'spark', label: 'Trend', align: 'left', sortable: false },
          { key: 'mktCap', label: 'Mkt Cap', align: 'right', fmt: (s) => '$' + fmt.compact(s.mktCap) },
          { key: 'remove', label: '', align: 'right', sortable: false, fmt: (s) => el('button', { class: 'btn danger sm', text: 'Remove', onclick: (e) => { e.stopPropagation(); watchlist.remove(s.symbol); draw(); } }) },
        ];
        // Custom render because of the remove column & stopPropagation.
        card.appendChild(MP.ui.stockTable(rows, { columns: cols, onRow: ctx.openStock, initialSort: 'changePct' }));
        holder.appendChild(card);

        // Aggregate stat
        const avg = rows.reduce((a, s) => a + s.changePct, 0) / rows.length;
        holder.appendChild(el('div', { class: 'mini-note', style: 'margin-top:12px', html: 'Tracking <b>' + rows.length + '</b> names · average move today <b class="' + fmt.cls(avg) + '">' + fmt.pct(avg) + '</b>' }));
      }
      draw();
    },
  });
})(typeof window !== 'undefined' ? window : this);
