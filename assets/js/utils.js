/*
 * Market Pulse AI — Utilities
 * Formatting helpers, tiny SVG chart builders, and a localStorage-backed store.
 */
(function (global) {
  'use strict';
  const MP = (global.MP = global.MP || {});

  /* ---- Formatting ------------------------------------------------------ */
  const fmt = {
    money(n, opts) {
      opts = opts || {};
      const d = opts.decimals == null ? 2 : opts.decimals;
      return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    num(n, d) {
      d = d == null ? 2 : d;
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    pct(n, withSign) {
      const s = (withSign !== false && n > 0 ? '+' : '') + Number(n).toFixed(2) + '%';
      return s;
    },
    signed(n, d) {
      d = d == null ? 2 : d;
      return (n > 0 ? '+' : '') + Number(n).toFixed(d);
    },
    compact(n) {
      const abs = Math.abs(n);
      if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
      if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    },
    ago(minutes) {
      if (minutes < 60) return minutes + 'm ago';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return h + 'h' + (m ? ' ' + m + 'm' : '') + ' ago';
    },
    cls(n) {
      return n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    },
    arrow(n) {
      return n > 0 ? '▲' : n < 0 ? '▼' : '■';
    },
  };

  /* ---- Tiny DOM helper ------------------------------------------------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---- SVG charts ------------------------------------------------------ */
  const svg = {
    // Sparkline path from a series of numbers.
    sparkline(series, opts) {
      opts = opts || {};
      const w = opts.width || 120;
      const h = opts.height || 34;
      const pad = 2;
      const min = Math.min.apply(null, series);
      const max = Math.max.apply(null, series);
      const range = max - min || 1;
      const stepX = (w - pad * 2) / (series.length - 1);
      const pts = series.map((v, i) => {
        const x = pad + i * stepX;
        const y = pad + (h - pad * 2) * (1 - (v - min) / range);
        return [x, y];
      });
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const up = series[series.length - 1] >= series[0];
      const color = opts.color || (up ? 'var(--up)' : 'var(--down)');
      const areaD = d + ` L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;
      const gid = 'sg' + Math.floor((min + max + series.length) * 1000).toString(36);
      return (
        `<svg class="sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true">` +
        `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">` +
        `<stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>` +
        `<stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>` +
        `<path d="${areaD}" fill="url(#${gid})" stroke="none"/>` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>` +
        `</svg>`
      );
    },
    // Horizontal bar meter (-1..1) used for sentiment rows.
    meter(value, opts) {
      opts = opts || {};
      const w = opts.width || 120;
      const h = opts.height || 8;
      const mid = w / 2;
      const v = Math.max(-1, Math.min(1, value));
      const barW = Math.abs(v) * (w / 2 - 1);
      const x = v >= 0 ? mid : mid - barW;
      const color = v > 0.05 ? 'var(--up)' : v < -0.05 ? 'var(--down)' : 'var(--muted)';
      return (
        `<svg class="meter" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">` +
        `<rect x="0" y="${h / 2 - 1}" width="${w}" height="2" rx="1" fill="var(--line)"/>` +
        `<rect x="${x.toFixed(1)}" y="0" width="${barW.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${color}"/>` +
        `<rect x="${mid - 0.5}" y="0" width="1" height="${h}" fill="var(--muted)" opacity="0.5"/>` +
        `</svg>`
      );
    },
    // Semicircular gauge for the sentiment score (-1..1).
    gauge(value, opts) {
      opts = opts || {};
      const w = 220, h = 130, cx = w / 2, cy = 118, r = 92;
      const v = Math.max(-1, Math.min(1, value));
      const angle = Math.PI * (1 - (v + 1) / 2); // 1 -> 0rad (right), -1 -> PI (left)... invert below
      // Map -1..1 to 180..0 degrees so needle sweeps left(fear)->right(greed).
      const a = Math.PI - ((v + 1) / 2) * Math.PI;
      const nx = cx + Math.cos(a) * (r - 12);
      const ny = cy - Math.sin(a) * (r - 12);
      function arc(from, to, color) {
        const a0 = Math.PI - ((from + 1) / 2) * Math.PI;
        const a1 = Math.PI - ((to + 1) / 2) * Math.PI;
        const x0 = cx + Math.cos(a0) * r, y0 = cy - Math.sin(a0) * r;
        const x1 = cx + Math.cos(a1) * r, y1 = cy - Math.sin(a1) * r;
        return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>`;
      }
      return (
        `<svg class="gauge" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true">` +
        arc(-1, -0.33, 'var(--down)') +
        arc(-0.33, 0.33, 'var(--warn)') +
        arc(0.33, 1, 'var(--up)') +
        `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="${cx}" cy="${cy}" r="6" fill="var(--text)"/>` +
        `</svg>`
      );
    },
    donut(segments, opts) {
      opts = opts || {};
      const size = opts.size || 120, r = size / 2 - 8, cx = size / 2, cy = size / 2;
      const total = segments.reduce((a, s) => a + s.value, 0) || 1;
      const circ = 2 * Math.PI * r;
      let offset = 0;
      const rings = segments
        .map((s) => {
          const frac = s.value / total;
          const dash = frac * circ;
          const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
          offset += dash;
          return seg;
        })
        .join('');
      return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${rings}<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" class="donut-label">${esc(opts.center || '')}</text></svg>`;
    },
  };

  /* ---- Persistent store ------------------------------------------------ */
  function makeStore(key, fallback) {
    let cache;
    try {
      cache = JSON.parse(localStorage.getItem(key));
    } catch (e) {
      cache = null;
    }
    if (cache == null) cache = fallback;
    return {
      get: () => cache,
      set(v) {
        cache = v;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch (e) {
          /* storage may be unavailable (private mode) — keep in-memory */
        }
        return cache;
      },
    };
  }

  MP.utils = { fmt, el, esc, svg, makeStore };
})(typeof window !== 'undefined' ? window : this);
