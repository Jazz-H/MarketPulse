/*
 * Market Pulse AI — App shell
 * Registers modules, builds the sidebar, wires the router (hash-based),
 * the index tape, global search and the shared stock detail drawer.
 */
(function (global) {
  'use strict';
  const MP = (global.MP = global.MP || {});
  const { fmt, el, esc, svg } = MP.utils;

  // Module registry. Each module registers itself via MP.registerModule().
  const modules = [];
  MP.registerModule = function (mod) {
    modules.push(mod);
  };

  // Sidebar grouping for a cleaner information architecture.
  const GROUPS = [
    { label: 'Overview', ids: ['summary', 'overview'] },
    { label: 'Markets', ids: ['stocks', 'mag7', 'themes'] },
    { label: 'Intelligence', ids: ['news', 'sentiment', 'opportunity', 'risk', 'relationships'] },
    { label: 'My Desk', ids: ['watchlist', 'portfolio', 'assistant'] },
  ];

  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  let current = null;

  function modById(id) {
    return modules.find((m) => m.id === id);
  }

  function buildNav() {
    nav.innerHTML = '';
    GROUPS.forEach((g) => {
      nav.appendChild(el('div', { class: 'nav-group-label', text: g.label }));
      g.ids.forEach((id) => {
        const m = modById(id);
        if (!m) return;
        const btn = el('button', {
          class: 'nav-item',
          'data-id': id,
          onclick: () => (location.hash = '#/' + id),
        }, [
          el('span', { class: 'ni-icon', text: m.icon || '•' }),
          el('span', { text: m.title }),
        ]);
        nav.appendChild(btn);
      });
    });
  }

  function setActiveNav(id) {
    nav.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.getAttribute('data-id') === id));
  }

  function render() {
    const id = (location.hash.replace(/^#\/?/, '') || 'summary').split('?')[0];
    const mod = modById(id) || modules[0];
    current = mod;
    setActiveNav(mod.id);
    view.innerHTML = '';
    const head = el('div', { class: 'view-head' }, [
      el('h1', { text: mod.title }),
      mod.subtitle ? el('p', { text: mod.subtitle }) : null,
    ]);
    view.appendChild(head);
    const body = el('div', { class: 'module-body' });
    view.appendChild(body);
    try {
      mod.render(body, { navigate: (to) => (location.hash = '#/' + to), openStock: openStockDrawer });
    } catch (e) {
      body.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'e-icon', text: '⚠️' }), el('p', { text: 'This module failed to render: ' + e.message })]));
      console.error(e);
    }
    view.focus();
    // close mobile sidebar on navigation
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo(0, 0);
  }

  /* ---- Index tape ------------------------------------------------------ */
  function buildTape() {
    const tape = document.getElementById('ticker-tape');
    tape.innerHTML = '';
    MP.data.getIndices().forEach((ix) => {
      const cls = fmt.cls(ix.changePct);
      tape.appendChild(
        el('span', { class: 'tape-item' }, [
          el('span', { class: 't-sym', text: ix.name.replace(/ \(.*\)/, '') }),
          el('span', { class: 't-val ' + cls, html: (ix.unit === '%' ? fmt.num(ix.value) + '%' : fmt.num(ix.value)) + ' <span>' + fmt.arrow(ix.changePct) + fmt.pct(Math.abs(ix.changePct), false) + '</span>' }),
        ])
      );
    });
  }

  /* ---- Global search --------------------------------------------------- */
  function initSearch() {
    const input = document.getElementById('global-search');
    const box = document.getElementById('search-results');
    function close() { box.hidden = true; }
    function run() {
      const q = input.value.trim().toUpperCase();
      if (!q) return close();
      const matches = MP.data.getStocks().filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)).slice(0, 8);
      box.innerHTML = '';
      if (!matches.length) {
        box.appendChild(el('div', { class: 'search-row' }, [el('span', { class: 'sr-name', text: 'No matches' })]));
      }
      matches.forEach((s) => {
        box.appendChild(
          el('div', { class: 'search-row', onclick: () => { openStockDrawer(s.symbol); close(); input.value = ''; } }, [
            el('span', {}, [el('span', { class: 'sr-sym', text: s.symbol }), ' ', el('span', { class: 'sr-name', text: s.name })]),
            el('span', { class: 'num ' + fmt.cls(s.changePct), text: fmt.pct(s.changePct) }),
          ])
        );
      });
      box.hidden = false;
    }
    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) close(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); input.blur(); } });
  }

  /* ---- Shared stock detail drawer ------------------------------------- */
  function openStockDrawer(symbol) {
    const s = MP.data.getStock(symbol);
    if (!s || s.kind) return; // indices have `kind`; skip drawer for those
    const series = MP.data.getSeries(s.symbol, s.price, 60, s.beta ? 0.008 * s.beta : 0.012);
    const senti = MP.data.tickerSentiment().find((t) => t.symbol === s.symbol);
    const inWatch = MP.watchlist && MP.watchlist.has(s.symbol);

    const backdrop = el('div', { class: 'drawer-backdrop', onclick: (e) => { if (e.target === backdrop) closeDrawer(); } });
    const wl = MP.watchlist;
    const drawer = el('div', { class: 'drawer' }, [
      el('div', { class: 'drawer-head' }, [
        el('div', {}, [
          el('h2', { text: s.symbol }),
          el('div', { class: 'mini-note', text: s.name + ' · ' + s.sector }),
        ]),
        el('button', { class: 'icon-btn', text: '✕', onclick: closeDrawer, 'aria-label': 'Close' }),
      ]),
      el('div', { class: 'stat', style: 'margin-bottom:14px' }, [
        el('div', { class: 's-value', text: fmt.money(s.price) }),
        el('div', { class: 's-delta ' + fmt.cls(s.changePct), text: fmt.arrow(s.changePct) + ' ' + fmt.signed(s.change) + ' (' + fmt.pct(s.changePct) + ')' }),
      ]),
      el('div', { html: svg.sparkline(series, { width: 372, height: 90, color: s.changePct >= 0 ? 'var(--up)' : 'var(--down)' }) }),
      el('div', { class: 'kv', style: 'margin-top:16px' }, [
        el('span', { class: 'k', text: 'Market cap' }), el('span', { class: 'v', text: '$' + fmt.compact(s.mktCap) }),
        el('span', { class: 'k', text: 'P/E' }), el('span', { class: 'v', text: s.pe > 0 ? fmt.num(s.pe, 1) : 'n/a' }),
        el('span', { class: 'k', text: 'Dividend yield' }), el('span', { class: 'v', text: fmt.num(s.divYield, 2) + '%' }),
        el('span', { class: 'k', text: 'Beta' }), el('span', { class: 'v', text: fmt.num(s.beta, 2) }),
        el('span', { class: 'k', text: 'Volume' }), el('span', { class: 'v', text: fmt.compact(s.volume) }),
        el('span', { class: 'k', text: 'News sentiment' }), el('span', { class: 'v ' + (senti ? fmt.cls(senti.score) : 'flat'), text: senti ? fmt.signed(senti.score) + ' (' + senti.mentions + ')' : 'n/a' }),
      ]),
      el('div', { style: 'display:flex;gap:8px;margin-top:18px' }, [
        wl ? el('button', {
          class: 'btn ' + (inWatch ? 'ghost' : ''),
          text: inWatch ? '★ In watchlist' : '☆ Add to watchlist',
          onclick: function () {
            wl.toggle(s.symbol);
            this.textContent = wl.has(s.symbol) ? '★ In watchlist' : '☆ Add to watchlist';
            this.classList.toggle('ghost', wl.has(s.symbol));
          },
        }) : null,
        el('button', { class: 'btn ghost', text: 'Ask AI about ' + s.symbol, onclick: () => { closeDrawer(); location.hash = '#/assistant?q=' + encodeURIComponent('Tell me about ' + s.symbol); } }),
      ]),
    ]);
    backdrop.appendChild(drawer);
    document.body.appendChild(backdrop);
    MP._drawer = backdrop;
    document.addEventListener('keydown', escClose);
  }
  function closeDrawer() {
    if (MP._drawer) { MP._drawer.remove(); MP._drawer = null; }
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeDrawer(); }
  MP.openStock = openStockDrawer;

  /* ---- Theme + menu ---------------------------------------------------- */
  function initChrome() {
    const themeStore = MP.utils.makeStore('mp.theme', 'dark');
    document.body.setAttribute('data-theme', themeStore.get());
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      themeStore.set(next);
    });
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    const badge = document.getElementById('data-badge');
    badge.textContent = '● ' + MP.data.provider.label;
    badge.classList.toggle('live', MP.data.isLive);
  }

  /* ---- Boot ------------------------------------------------------------ */
  function boot() {
    initChrome();
    buildNav();
    buildTape();
    initSearch();
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/summary';
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Expose a couple of helpers modules rely on.
  MP.app = { navigate: (to) => (location.hash = '#/' + to), openStock: openStockDrawer, modById };
})(typeof window !== 'undefined' ? window : this);
