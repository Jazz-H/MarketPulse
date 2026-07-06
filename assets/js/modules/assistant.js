/* AI Assistant — a rule-based analyst that answers over the live dataset.
 * No network calls: it interprets intent and composes answers from MP.data,
 * so it works fully offline. Swap in a real LLM by replacing answer(). */
(function (global) {
  'use strict';
  const MP = global.MP;
  const { fmt, el } = MP.utils;

  const SUGGESTIONS = [
    'How is the market today?',
    'Tell me about NVDA',
    'Top gainers',
    'Any opportunities?',
    "What's risky right now?",
    'Compare AAPL and MSFT',
  ];

  MP.registerModule({
    id: 'assistant',
    title: 'AI Assistant',
    icon: '🤖',
    subtitle: 'Ask about the market, a ticker, sentiment, opportunities or risk. Answers are generated from the dashboard data.',
    render(root, ctx) {
      const log = el('div', { class: 'chat-log' });
      const input = el('input', { class: 'field', placeholder: 'Ask about the market or a ticker…', autocomplete: 'off' });
      const sendBtn = el('button', { class: 'btn', text: 'Send' });

      function push(role, html) {
        const m = el('div', { class: 'msg ' + role, html: html });
        log.appendChild(m);
        log.scrollTop = log.scrollHeight;
      }
      function ask(q) {
        if (!q.trim()) return;
        push('user', MP.utils.esc(q));
        input.value = '';
        // Small delay to feel responsive.
        setTimeout(() => push('bot', answer(q, ctx)), 120);
      }

      sendBtn.addEventListener('click', () => ask(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(input.value); });

      const sugg = el('div', { class: 'suggestions' }, SUGGESTIONS.map((s) => el('span', { class: 'chip', text: s, onclick: () => ask(s) })));

      const card = el('div', { class: 'card' }, [
        el('div', { class: 'chat' }, [log, el('div', { class: 'chat-input' }, [input, sendBtn])]),
        sugg,
      ]);
      root.appendChild(card);

      // Greeting + optional preset query from ?q= (used by the detail drawer).
      const senti = MP.data.marketSentiment();
      push('bot', 'Hi 👋 I\'m your Market Pulse assistant. The tape currently reads <b>' + senti.label + '</b>. Ask me about a ticker, the market mood, opportunities or risks.');
      const m = location.hash.match(/[?&]q=([^&]+)/);
      if (m) { try { ask(decodeURIComponent(m[1])); } catch (e) {} }
      setTimeout(() => input.focus(), 50);
    },
  });

  /* ---- Intent engine --------------------------------------------------- */
  function tickersIn(q) {
    const up = q.toUpperCase();
    return MP.data.getStocks().filter((s) => new RegExp('\\b' + s.symbol + '\\b').test(up) || up.includes(s.name.toUpperCase().split(' ')[0])).map((s) => s.symbol);
  }
  function link(sym) { return '<b>' + sym + '</b>'; }

  function stockBlurb(sym) {
    const s = MP.data.getStock(sym);
    if (!s) return 'I don\'t track ' + sym + '.';
    const senti = MP.data.tickerSentiment().find((t) => t.symbol === sym);
    const dir = s.changePct >= 0 ? 'up' : 'down';
    let out = link(s.symbol) + ' (' + s.name + ') is trading at <b>' + fmt.money(s.price) + '</b>, ' + dir + ' <span class="' + fmt.cls(s.changePct) + '">' + fmt.pct(s.changePct) + '</span> today. ';
    out += 'It\'s a ' + s.sector + ' name with a market cap of $' + fmt.compact(s.mktCap) + ', ';
    out += s.pe > 0 ? 'a P/E of ' + fmt.num(s.pe, 1) + ' and a beta of ' + fmt.num(s.beta, 2) + '. ' : 'no positive earnings (P/E n/a) and a beta of ' + fmt.num(s.beta, 2) + '. ';
    if (senti) out += 'News sentiment is <span class="' + fmt.cls(senti.score) + '">' + (senti.score > 0.15 ? 'positive' : senti.score < -0.15 ? 'negative' : 'mixed') + '</span> across ' + senti.mentions + ' recent mention' + (senti.mentions > 1 ? 's' : '') + '. ';
    const risk = MP.data.risks().find((r) => r.symbol === sym);
    if (risk && risk.level >= 2) out += '⚠️ Risk flags: ' + risk.flags.join(', ') + '.';
    return out;
  }

  function answer(q, ctx) {
    const ql = q.toLowerCase();
    const syms = tickersIn(q);

    // Compare two tickers
    if (/\b(compare|vs\.?|versus)\b/.test(ql) && syms.length >= 2) {
      const [a, b] = syms;
      const sa = MP.data.getStock(a), sb = MP.data.getStock(b);
      const rows = [
        ['Price', fmt.money(sa.price), fmt.money(sb.price)],
        ['Change', fmt.pct(sa.changePct), fmt.pct(sb.changePct)],
        ['Mkt Cap', '$' + fmt.compact(sa.mktCap), '$' + fmt.compact(sb.mktCap)],
        ['P/E', sa.pe > 0 ? fmt.num(sa.pe, 1) : 'n/a', sb.pe > 0 ? fmt.num(sb.pe, 1) : 'n/a'],
        ['Beta', fmt.num(sa.beta, 2), fmt.num(sb.beta, 2)],
      ];
      let t = '<b>' + a + '</b> vs <b>' + b + '</b>:<br>';
      t += '<table style="width:100%;margin-top:6px;font-size:12.5px">' + rows.map((r) => '<tr><td style="color:var(--muted);padding:2px 8px 2px 0">' + r[0] + '</td><td style="font-family:var(--mono)">' + r[1] + '</td><td style="font-family:var(--mono)">' + r[2] + '</td></tr>').join('') + '</table>';
      const winner = sa.changePct >= sb.changePct ? a : b;
      t += 'Today, ' + link(winner) + ' has the stronger session.';
      return t;
    }

    // Single ticker deep-dive
    if (syms.length && /\b(about|tell me|what|how|info|price|doing|look)\b/.test(ql) || (syms.length === 1 && q.trim().split(/\s+/).length <= 3)) {
      return syms.map(stockBlurb).join('<br><br>');
    }

    // Market overview / mood
    if (/\b(market|overview|today|mood|how are things|how is it|indices|index)\b/.test(ql)) {
      const ex = MP.data.executiveSummary();
      return ex.headline + '<br><br>' + ex.bullets.slice(0, 3).map((b) => '• ' + b).join('<br>');
    }
    // Sentiment
    if (/\b(sentiment|fear|greed|mood|bullish|bearish)\b/.test(ql)) {
      const s = MP.data.marketSentiment();
      const top = MP.data.tickerSentiment().slice(0, 3).map((t) => t.symbol + ' (' + fmt.signed(t.score) + ')').join(', ');
      return 'Overall sentiment reads <b>' + s.label + '</b> at <span class="' + fmt.cls(s.score) + '">' + fmt.signed(s.score) + '</span>, blended from news tone, breadth and volatility. Most positive buzz: ' + top + '.';
    }
    // Opportunities
    if (/\b(opportunit|buy|idea|pick|undervalu|cheap|momentum)\b/.test(ql)) {
      const ops = MP.data.opportunities().slice(0, 4);
      return 'Top ideas on the Opportunity Radar right now:<br>' + ops.map((o, i) => (i + 1) + '. ' + link(o.symbol) + ' — score ' + fmt.num(o.score, 1) + ' · ' + o.reasons[0]).join('<br>') + '<br><span class="mini-note">Illustrative scoring, not investment advice.</span>';
    }
    // Risk
    if (/\b(risk|risky|danger|volatil|fragile|avoid|overvalu|expensive)\b/.test(ql)) {
      const rk = MP.data.risks().slice(0, 4);
      return 'Highest-risk names flagged:<br>' + rk.map((r) => link(r.symbol) + ' — ' + r.flags.join(', ')).join('<br>');
    }
    // Gainers / losers
    if (/\b(gainer|winner|up the most|best perform|leading)\b/.test(ql)) {
      const g = [...MP.data.getStocks()].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
      return 'Top gainers today: ' + g.map((s) => link(s.symbol) + ' ' + fmt.pct(s.changePct)).join(', ') + '.';
    }
    if (/\b(loser|laggard|down the most|worst|falling)\b/.test(ql)) {
      const l = [...MP.data.getStocks()].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
      return 'Biggest laggards today: ' + l.map((s) => link(s.symbol) + ' ' + fmt.pct(s.changePct)).join(', ') + '.';
    }
    // News
    if (/\b(news|headline|happening|story)\b/.test(ql)) {
      let news = MP.data.getNews();
      if (syms.length) news = news.filter((n) => n.tickers.some((t) => syms.includes(t)));
      news = news.slice(0, 4);
      if (!news.length) return 'No recent headlines for ' + (syms.join(', ') || 'that') + '.';
      return 'Latest headlines:<br>' + news.map((n) => '• ' + n.headline + ' <span class="mini-note">(' + n.source + ', ' + fmt.ago(n.minutesAgo) + ')</span>').join('<br>');
    }
    // Themes
    if (/\b(theme|sector|ai|semis?|cloud|energy|fintech|health)\b/.test(ql)) {
      const themes = MP.data.getThemes().slice().sort((a, b) => b.changePct - a.changePct);
      return 'Theme performance today:<br>' + themes.slice(0, 5).map((t) => link(t.name) + ' <span class="' + fmt.cls(t.changePct) + '">' + fmt.pct(t.changePct) + '</span>').join('<br>');
    }
    // Watchlist
    if (/\b(watchlist|my list|tracking|watching)\b/.test(ql)) {
      const wl = MP.watchlist.list();
      if (!wl.length) return 'Your watchlist is empty. Add names from any detail panel or the Watchlist tab.';
      const rows = wl.map((s) => MP.data.getStock(s)).filter(Boolean);
      const avg = rows.reduce((a, s) => a + s.changePct, 0) / rows.length;
      return 'You\'re tracking ' + rows.map((s) => link(s.symbol) + ' ' + fmt.pct(s.changePct)).join(', ') + '. Average move: <span class="' + fmt.cls(avg) + '">' + fmt.pct(avg) + '</span>.';
    }
    if (/\b(hi|hello|hey|help|what can you)\b/.test(ql)) {
      return 'I can help with:<br>• A ticker — "Tell me about NVDA"<br>• The market — "How is the market?"<br>• "Sentiment", "Opportunities", "What\'s risky?"<br>• "Top gainers", "Compare AAPL and MSFT", "News on TSLA"';
    }
    // Fallback: if a ticker was mentioned, describe it; else help.
    if (syms.length) return syms.map(stockBlurb).join('<br><br>');
    return 'I\'m not sure how to answer that yet, but I can talk about tickers, market mood, sentiment, opportunities, risk, news and themes. Try one of the suggestions below.';
  }
})(typeof window !== 'undefined' ? window : this);
