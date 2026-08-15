;(function (root) {
  'use strict';

  const BASE = 'USD';

  const PROVIDERS = {
    erapi: {
      id: 'erapi',
      label: 'open.er-api.com',
      url: 'https://open.er-api.com/v6/latest/' + BASE,
      parse(payload) {
        if (!payload || payload.result !== 'success' || !payload.rates) return null;
        return {
          rates: payload.rates,
          nextUpdate: payload.time_next_update_unix ? payload.time_next_update_unix * 1000 : null,
          asOf: payload.time_last_update_unix ? payload.time_last_update_unix * 1000 : null
        };
      }
    },
    frankfurter: {
      id: 'frankfurter',
      label: 'frankfurter.dev',
      url: 'https://api.frankfurter.dev/v1/latest?base=' + BASE,
      parse(payload) {
        if (!payload || !payload.rates) return null;
        return {
          rates: Object.assign({ [BASE]: 1 }, payload.rates),
          nextUpdate: null,
          asOf: payload.date ? Date.parse(payload.date + 'T00:00:00Z') : null
        };
      }
    }
  };

  const PROVIDER_ORDER = ['erapi', 'frankfurter'];

  function orderFor(preference) {
    if (preference && PROVIDERS[preference]) {
      return [preference].concat(PROVIDER_ORDER.filter((id) => id !== preference));
    }
    return PROVIDER_ORDER.slice();
  }

  function sanitizeRates(rates) {
    const clean = {};
    for (const [code, rate] of Object.entries(rates || {})) {
      const value = Number(rate);
      if (/^[A-Z]{3}$/.test(code) && Number.isFinite(value) && value > 0) clean[code] = value;
    }
    clean[BASE] = 1;
    return clean;
  }

  async function fetchRates(options) {
    const opts = options || {};
    const doFetch = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) throw new Error('no fetch implementation available');

    const errors = [];
    for (const id of orderFor(opts.preference)) {
      const provider = PROVIDERS[id];
      try {
        const response = await doFetch(provider.url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(provider.label + ' responded ' + response.status);
        const parsed = provider.parse(await response.json());
        if (!parsed) throw new Error(provider.label + ' returned an unusable payload');
        const rates = sanitizeRates(parsed.rates);
        if (Object.keys(rates).length < 10) throw new Error(provider.label + ' returned too few rates');
        return {
          base: BASE,
          rates,
          fetchedAt: opts.now || Date.now(),
          nextUpdate: parsed.nextUpdate,
          asOf: parsed.asOf,
          source: provider.label
        };
      } catch (error) {
        errors.push(error && error.message ? error.message : String(error));
      }
    }
    throw new Error('every rate provider failed: ' + errors.join('; '));
  }

  function rateBetween(table, from, to) {
    if (!table || !table.rates) return null;
    if (from === to) return 1;
    const fromRate = table.rates[from];
    const toRate = table.rates[to];
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0) return null;
    return toRate / fromRate;
  }

  function convert(amount, from, to, table) {
    const rate = rateBetween(table, from, to);
    if (rate === null || !Number.isFinite(amount)) return null;
    return amount * rate;
  }

  function isStale(table, refreshHours, now) {
    if (!table || !table.fetchedAt) return true;
    const current = now || Date.now();
    if (table.nextUpdate && current >= table.nextUpdate) return true;
    const maxAge = Math.max(1, Number(refreshHours) || 6) * 3600 * 1000;
    return current - table.fetchedAt >= maxAge;
  }

  function supportedCodes(table) {
    if (!table || !table.rates) return [];
    return Object.keys(table.rates).sort();
  }

  const api = { BASE, PROVIDERS, PROVIDER_ORDER, fetchRates, rateBetween, convert, isStale, supportedCodes, sanitizeRates, orderFor };

  root.Kawase = Object.assign(root.Kawase || {}, { rates: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
