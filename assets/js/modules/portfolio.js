/* Portfolio Simulator — a paper portfolio with P&L, saved to the browser. */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el, svg } = MP.utils;

  const store = MP.utils.makeStore('mp.portfolio', {
    cash: 100000,
    holdings: [
      { symbol: 'AAPL', shares: 40, cost: 198.5 },
      { symbol: 'NVDA', shares: 120, cost: 98.2 },
      { symbol: 'MSFT', shares: 25, cost: 401.0 },
    ],
  });

  MP.registerModule({
    id: 'portfolio',
    title: 'Portfolio Simulator',
    icon: '💼',
    subtitle: 'A risk-free paper portfolio. Buy and sell against live-style prices and watch P&L move.',
    render(root, ctx) {
      const holder = el('div');
      root.appendChild(holder);
      draw();

      function draw() {
        const pf = store.get();
        holder.innerHTML = '';
        const rows = pf.holdings.map((h) => {
          const s = MP.data.getStock(h.symbol) || { price: h.cost, name: h.symbol, changePct: 0 };
          const value = h.shares * s.price;
          const costBasis = h.shares * h.cost;
          const pl = value - costBasis;
          const plPct = (pl / costBasis) * 100;
          return { h, s, value, costBasis, pl, plPct };
        });
        const invested = rows.reduce((a, r) => a + r.value, 0);
        const totalCost = rows.reduce((a, r) => a + r.costBasis, 0);
        const totalPl = invested - totalCost;
        const totalPlPct = totalCost ? (totalPl / totalCost) * 100 : 0;
        const equity = invested + pf.cash;
        const dayChange = rows.reduce((a, r) => a + r.value * (r.s.changePct / 100), 0);

        // Summary tiles
        holder.appendChild(el('div', { class: 'grid cols-4' }, [
          tile('Total Equity', fmt.money(equity, { decimals: 0 }), null),
          tile('Invested', fmt.money(invested, { decimals: 0 }), null),
          tile('Cash', fmt.money(pf.cash, { decimals: 0 }), null),
          tile('Total P&L', fmt.signed(totalPl, 0).replace(/^([+-])/, '$1$') + ' (' + fmt.pct(totalPlPct) + ')', totalPl),
        ]));

        // Allocation donut + day change
        const palette = ['#4f8cff', '#7c5cff', '#26c281', '#f5b73d', '#ff5c7a', '#33c9dc', '#a06bff', '#ff9f4d'];
        const segs = rows.map((r, i) => ({ value: r.value, color: palette[i % palette.length], label: r.h.symbol }));
        if (pf.cash > 0) segs.push({ value: pf.cash, color: 'var(--muted-2)', label: 'Cash' });
        const allocCard = el('div', { class: 'card' }, [
          el('div', { class: 'card-head' }, [el('h3', { text: 'Allocation' })]),
          el('div', { style: 'display:flex;justify-content:center;margin:6px 0 12px', html: svg.donut(segs, { center: rows.length + '', size: 150 }) }),
          el('div', { class: 'rowlist' }, segs.map((sg) =>
            el('div', { style: 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12.5px' }, [
              el('span', { class: 'senti-dot', style: 'background:' + sg.color }),
              el('span', { style: 'flex:1', text: sg.label }),
              el('span', { class: 'num', text: fmt.num((sg.value / equity) * 100, 1) + '%' }),
            ])
          )),
        ]);

        const dayCard = el('div', { class: 'card span-3', style: 'padding:6px' });
        const table = el('table', { class: 'tbl' });
        table.appendChild(el('thead', {}, [el('tr', {}, ['Ticker', 'Shares', 'Avg Cost', 'Price', 'Mkt Value', 'P&L', ''].map((h, i) => el('th', { class: i >= 1 && i <= 5 ? 'num' : '' }, [document.createTextNode(h)])))]));
        const tb = el('tbody');
        rows.forEach((r) => {
          tb.appendChild(el('tr', {}, [
            el('td', { onclick: () => ctx.openStock(r.h.symbol), style: 'cursor:pointer' }, [el('div', { class: 'sym', text: r.h.symbol }), el('div', { class: 'name', style: 'font-size:11px', text: r.s.name })]),
            el('td', { class: 'num', text: fmt.num(r.h.shares, 0) }),
            el('td', { class: 'num', text: fmt.money(r.h.cost) }),
            el('td', { class: 'num', text: fmt.money(r.s.price) }),
            el('td', { class: 'num', text: fmt.money(r.value, { decimals: 0 }) }),
            el('td', { class: 'num ' + fmt.cls(r.pl) }, [document.createTextNode(fmt.signed(r.pl, 0) + ' (' + fmt.pct(r.plPct) + ')')]),
            el('td', { class: 'num' }, [
              el('button', { class: 'btn ghost sm', text: 'Trade', onclick: () => openTrade(r.h.symbol) }),
            ]),
          ]));
        });
        table.appendChild(tb);
        dayCard.appendChild(el('div', { class: 'card-head', style: 'padding:10px 10px 0' }, [
          el('h3', { text: 'Holdings' }),
          el('span', { class: 'ch-sub ' + fmt.cls(dayChange) }, [document.createTextNode("Today's move: " + fmt.signed(dayChange, 0).replace(/^([+-])/, '$1$'))]),
        ]));
        dayCard.appendChild(el('div', { style: 'overflow-x:auto' }, [table]));

        holder.appendChild(el('div', { class: 'grid cols-4', style: 'margin-top:16px' }, [dayCard, allocCard]));

        // Trade panel
        holder.appendChild(buildTrader());
        holder.appendChild(el('div', { style: 'margin-top:12px;display:flex;gap:10px' }, [
          el('button', { class: 'btn ghost sm', text: 'Reset to demo portfolio', onclick: () => { if (confirm('Reset the simulator to the demo portfolio?')) { localStorage.removeItem('mp.portfolio'); location.reload(); } } }),
        ]));

        let preselect = null;
        function openTrade(sym) { preselect = sym; const sel = holder.querySelector('#trade-sym'); if (sel) { sel.value = sym; sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }

        function buildTrader() {
          const all = MP.data.getStocks();
          const symSel = el('select', { class: 'field', id: 'trade-sym' }, all.map((s) => el('option', { value: s.symbol, text: s.symbol + ' — ' + fmt.money(s.price) })));
          const sideSel = el('select', { class: 'field' }, [el('option', { value: 'buy', text: 'Buy' }), el('option', { value: 'sell', text: 'Sell' })]);
          const sharesInput = el('input', { class: 'field', type: 'number', min: '1', step: '1', value: '10', style: 'width:100px' });
          const msg = el('span', { class: 'mini-note' });
          const submit = el('button', { class: 'btn', text: 'Execute', onclick: () => {
            const sym = symSel.value, side = sideSel.value, qty = Math.max(0, Math.floor(+sharesInput.value || 0));
            const stock = MP.data.getStock(sym);
            if (!qty) { msg.textContent = 'Enter a share quantity.'; return; }
            const pf2 = store.get();
            const cost = qty * stock.price;
            const holding = pf2.holdings.find((h) => h.symbol === sym);
            if (side === 'buy') {
              if (cost > pf2.cash) { msg.textContent = 'Not enough cash (need ' + fmt.money(cost, { decimals: 0 }) + ').'; msg.className = 'mini-note down'; return; }
              pf2.cash -= cost;
              if (holding) { const totalShares = holding.shares + qty; holding.cost = (holding.cost * holding.shares + cost) / totalShares; holding.shares = totalShares; }
              else pf2.holdings.push({ symbol: sym, shares: qty, cost: stock.price });
            } else {
              if (!holding || holding.shares < qty) { msg.textContent = 'You do not hold enough shares to sell.'; msg.className = 'mini-note down'; return; }
              holding.shares -= qty; pf2.cash += cost;
              if (holding.shares === 0) pf2.holdings = pf2.holdings.filter((h) => h.symbol !== sym);
            }
            store.set(pf2);
            draw();
          } });
          return el('div', { class: 'card', style: 'margin-top:16px' }, [
            el('div', { class: 'card-head' }, [el('h3', { text: 'Paper Trade' })]),
            el('div', { style: 'display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap' }, [
              field('Action', sideSel), field('Ticker', symSel), field('Shares', sharesInput), submit, msg,
            ]),
          ]);
        }
      }

      function tile(label, value, delta) {
        return el('div', { class: 'card tight stat' }, [
          el('div', { class: 's-label', text: label }),
          el('div', { class: 's-value ' + (delta == null ? '' : fmt.cls(delta)), style: 'font-size:20px', text: value }),
        ]);
      }
      function field(label, input) { return el('div', {}, [el('label', { class: 'lbl', text: label }), input]); }
    },
  });
})(typeof window !== 'undefined' ? window : this);
