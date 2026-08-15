;(function (root) {
  'use strict';

  const currencies = (root.Kawase && root.Kawase.currencies) ||
    (typeof require === 'function' ? require('./currencies.js') : null);

  const APPROX = '≈';

  function resolveLocale(locale) {
    if (locale && locale !== 'auto') return locale;
    if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
    return 'en-US';
  }

  function decimalsFor(value, code, precision) {
    const natural = currencies ? currencies.decimalsFor(code) : 2;
    if (precision === 0 || precision === '0') return 0;
    if (precision === 2 || precision === '2') return Math.min(2, natural);
    const magnitude = Math.abs(value);
    if (natural === 0) return 0;
    if (magnitude >= 1000) return 0;
    if (magnitude >= 1 && natural > 2) return 2;
    if (magnitude < 0.01 && magnitude > 0) return Math.max(natural, 4);
    return natural;
  }

  function formatMoney(value, code, options) {
    const opts = options || {};
    const locale = resolveLocale(opts.locale);
    const digits = decimalsFor(value, code, opts.precision === undefined ? 'auto' : opts.precision);
    const useCompact = opts.compactLarge !== false && Math.abs(value) >= 1e7;

    let text;
    try {
      text = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
        notation: useCompact ? 'compact' : 'standard',
        maximumFractionDigits: useCompact ? 2 : digits,
        minimumFractionDigits: useCompact ? 0 : digits
      }).format(value);
    } catch (error) {
      try {
        text = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: digits,
          minimumFractionDigits: digits
        }).format(value);
      } catch (fallbackError) {
        text = value.toFixed(digits) + ' ' + code;
      }
    }

    return opts.approx ? APPROX + text : text;
  }

  function formatRate(from, to, rate) {
    if (!Number.isFinite(rate)) return '';
    const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
    const value = Number(rate.toFixed(digits));
    return '1 ' + from + ' = ' + value.toLocaleString(resolveLocale(), { maximumFractionDigits: digits }) + ' ' + to;
  }

  function formatAge(timestamp, now) {
    if (!timestamp) return 'never updated';
    const elapsed = Math.max(0, (now || Date.now()) - timestamp);
    if (elapsed < 60000) return 'updated just now';
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return 'updated ' + minutes + ' min ago';
    const hours = Math.round(minutes / 60);
    if (hours < 24) return 'updated ' + hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hours / 24);
    return 'updated ' + days + (days === 1 ? ' day ago' : ' days ago');
  }

  function tooltipText(match, converted, rate, meta) {
    const lines = [];
    lines.push(match.text + '  ' + '→' + '  ' + converted);
    if (Number.isFinite(rate)) lines.push(formatRate(match.code, meta.target, rate));
    if (meta.fetchedAt) lines.push(formatAge(meta.fetchedAt, meta.now) + ' via ' + (meta.source || 'cache'));
    return lines.join('\n');
  }

  const api = { formatMoney, formatRate, formatAge, tooltipText, decimalsFor, resolveLocale, APPROX };

  root.Kawase = Object.assign(root.Kawase || {}, { format: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
