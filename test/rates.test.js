'use strict';

const test = require('node:test');
const assert = require('node:assert');
const rates = require('../src/lib/rates.js');

const TABLE = {
  base: 'USD',
  rates: { USD: 1, JPY: 148.32, EUR: 0.92, GBP: 0.78 },
  fetchedAt: 1_700_000_000_000,
  nextUpdate: null,
  source: 'test'
};

function fakeFetch(byUrl) {
  return async function (url) {
    const entry = byUrl[url];
    if (!entry) throw new Error('unexpected url ' + url);
    if (entry.throws) throw new Error(entry.throws);
    return {
      ok: entry.ok !== false,
      status: entry.status || 200,
      json: async () => entry.body
    };
  };
}

test('conversion goes through the usd base', () => {
  assert.strictEqual(rates.convert(10, 'USD', 'JPY', TABLE).toFixed(2), '1483.20');
  assert.strictEqual(rates.convert(100, 'JPY', 'USD', TABLE).toFixed(4), '0.6742');
  const eurToGbp = rates.convert(100, 'EUR', 'GBP', TABLE);
  assert.strictEqual(eurToGbp.toFixed(4), (100 * 0.78 / 0.92).toFixed(4));
});

test('same currency is an identity', () => {
  assert.strictEqual(rates.rateBetween(TABLE, 'JPY', 'JPY'), 1);
  assert.strictEqual(rates.convert(42, 'EUR', 'EUR', TABLE), 42);
});

test('unknown currencies convert to null', () => {
  assert.strictEqual(rates.convert(10, 'XYZ', 'JPY', TABLE), null);
  assert.strictEqual(rates.convert(10, 'USD', 'XYZ', TABLE), null);
  assert.strictEqual(rates.rateBetween(null, 'USD', 'JPY'), null);
});

test('staleness respects both the interval and the published next update', () => {
  const now = TABLE.fetchedAt + 3600 * 1000;
  assert.strictEqual(rates.isStale(TABLE, 6, now), false);
  assert.strictEqual(rates.isStale(TABLE, 1, now), true);
  assert.strictEqual(rates.isStale(null, 6, now), true);

  const scheduled = Object.assign({}, TABLE, { nextUpdate: TABLE.fetchedAt + 1000 });
  assert.strictEqual(rates.isStale(scheduled, 24, now), true);
});

test('rate payloads are sanitized', () => {
  const clean = rates.sanitizeRates({ JPY: '148.32', EUR: 0.92, BAD: -1, lower: 3, TOOLONG: 2 });
  assert.deepStrictEqual(Object.keys(clean).sort(), ['EUR', 'JPY', 'USD']);
  assert.strictEqual(clean.JPY, 148.32);
  assert.strictEqual(clean.USD, 1);
});

test('provider order honours a preference', () => {
  assert.deepStrictEqual(rates.orderFor('frankfurter'), ['frankfurter', 'erapi']);
  assert.deepStrictEqual(rates.orderFor(null), ['erapi', 'frankfurter']);
});

test('the primary provider is parsed', async () => {
  const body = {
    result: 'success',
    base_code: 'USD',
    time_last_update_unix: 1_700_000_000,
    time_next_update_unix: 1_700_086_400,
    rates: { USD: 1, JPY: 148.32, EUR: 0.92, GBP: 0.78, CAD: 1.36, AUD: 1.52, CHF: 0.88, CNY: 7.2, KRW: 1320, INR: 83.1 }
  };
  const table = await rates.fetchRates({
    fetchImpl: fakeFetch({ [rates.PROVIDERS.erapi.url]: { body } }),
    now: 1_700_000_500_000
  });
  assert.strictEqual(table.base, 'USD');
  assert.strictEqual(table.rates.JPY, 148.32);
  assert.strictEqual(table.source, 'open.er-api.com');
  assert.strictEqual(table.nextUpdate, 1_700_086_400_000);
  assert.strictEqual(table.fetchedAt, 1_700_000_500_000);
});

test('a failing primary provider falls back to the secondary', async () => {
  const frankfurter = {
    amount: 1,
    base: 'USD',
    date: '2024-05-10',
    rates: { JPY: 155.1, EUR: 0.93, GBP: 0.79, CAD: 1.37, AUD: 1.51, CHF: 0.9, CNY: 7.2, KRW: 1360, INR: 83.5, SEK: 10.8 }
  };
  const table = await rates.fetchRates({
    fetchImpl: fakeFetch({
      [rates.PROVIDERS.erapi.url]: { throws: 'network down' },
      [rates.PROVIDERS.frankfurter.url]: { body: frankfurter }
    }),
    now: 1
  });
  assert.strictEqual(table.source, 'frankfurter.dev');
  assert.strictEqual(table.rates.USD, 1, 'the base is added back');
  assert.strictEqual(table.rates.JPY, 155.1);
});

test('an exhausted provider list throws', async () => {
  await assert.rejects(
    rates.fetchRates({
      fetchImpl: fakeFetch({
        [rates.PROVIDERS.erapi.url]: { throws: 'down' },
        [rates.PROVIDERS.frankfurter.url]: { ok: false, status: 503, body: {} }
      })
    }),
    /every rate provider failed/
  );
});

test('a thin payload is rejected rather than cached', async () => {
  await assert.rejects(
    rates.fetchRates({
      fetchImpl: fakeFetch({
        [rates.PROVIDERS.erapi.url]: { body: { result: 'success', rates: { JPY: 148 } } },
        [rates.PROVIDERS.frankfurter.url]: { body: { rates: { JPY: 148 } } }
      })
    }),
    /too few rates/
  );
});
