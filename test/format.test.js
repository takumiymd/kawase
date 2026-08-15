'use strict';

const test = require('node:test');
const assert = require('node:assert');

require('../src/lib/currencies.js');
const format = require('../src/lib/format.js');
const currencies = require('../src/lib/currencies.js');

const EN = { locale: 'en-US', compactLarge: false };

test('zero decimal currencies never show cents', () => {
  assert.strictEqual(format.decimalsFor(500, 'JPY', 'auto'), 0);
  assert.ok(!format.formatMoney(2965.4, 'JPY', EN).includes('.'));
});

test('small amounts keep cents, large amounts drop them', () => {
  assert.strictEqual(format.decimalsFor(19.99, 'USD', 'auto'), 2);
  assert.strictEqual(format.decimalsFor(4200, 'USD', 'auto'), 0);
});

test('explicit precision overrides the automatic rule', () => {
  assert.strictEqual(format.decimalsFor(4200, 'USD', 2), 2);
  assert.strictEqual(format.decimalsFor(19.99, 'USD', 0), 0);
});

test('tiny amounts gain precision instead of rounding to zero', () => {
  assert.ok(format.decimalsFor(0.004, 'USD', 'auto') >= 2);
});

test('the approximate marker is opt in', () => {
  assert.ok(format.formatMoney(10, 'USD', EN).startsWith('$'));
  assert.ok(format.formatMoney(10, 'USD', { ...EN, approx: true }).startsWith('≈'));
});

test('compact notation only kicks in for very large amounts', () => {
  const plain = format.formatMoney(1_500_000, 'JPY', { locale: 'en-US', compactLarge: true });
  assert.ok(!/M/.test(plain));
  const compact = format.formatMoney(25_000_000, 'JPY', { locale: 'en-US', compactLarge: true });
  assert.ok(/M/.test(compact));
});

test('an unknown currency code still produces something readable', () => {
  const text = format.formatMoney(12.5, 'XTS', EN);
  assert.ok(text.includes('12'), text);
});

test('rate lines scale their precision', () => {
  assert.strictEqual(format.formatRate('USD', 'JPY', 148.3234), '1 USD = 148.32 JPY');
  assert.ok(format.formatRate('JPY', 'USD', 0.006742).startsWith('1 JPY = 0.0067'));
});

test('age labels', () => {
  const now = 1_700_000_000_000;
  assert.strictEqual(format.formatAge(now - 30_000, now), 'updated just now');
  assert.strictEqual(format.formatAge(now - 5 * 60_000, now), 'updated 5 min ago');
  assert.strictEqual(format.formatAge(now - 3 * 3600_000, now), 'updated 3 hours ago');
  assert.strictEqual(format.formatAge(now - 26 * 3600_000, now), 'updated 1 day ago');
  assert.strictEqual(format.formatAge(null, now), 'never updated');
});

test('the tooltip carries the original, the conversion and the provenance', () => {
  const text = format.tooltipText(
    { text: '$19.99', code: 'USD' },
    '≈¥2,965',
    148.32,
    { target: 'JPY', fetchedAt: 1_700_000_000_000, now: 1_700_003_600_000, source: 'open.er-api.com' }
  );
  assert.ok(text.includes('$19.99'));
  assert.ok(text.includes('≈¥2,965'));
  assert.ok(text.includes('1 USD = 148.32 JPY'));
  assert.ok(text.includes('open.er-api.com'));
});

test('currency metadata is coherent', () => {
  for (const code of currencies.ALL_CODES) {
    assert.match(code, /^[A-Z]{3}$/);
    const entry = currencies.get(code);
    assert.ok([0, 2, 3, 4].includes(entry.decimals), code + ' has odd decimals');
    assert.ok(Array.isArray(entry.regions) && entry.regions.length > 0, code + ' has no region');
    assert.ok(entry.name && entry.name.length > 2, code + ' has no name');
  }
});

test('every ambiguous symbol has a usable default', () => {
  for (const symbol of currencies.AMBIGUOUS_SYMBOLS) {
    const candidates = currencies.candidatesFor(symbol);
    assert.ok(candidates.length > 1, symbol + ' is not actually ambiguous');
    const resolved = currencies.resolve(symbol, {});
    assert.ok(candidates.includes(resolved), symbol + ' resolves outside its candidates');
  }
});

test('no symbol is a bare digit or empty', () => {
  for (const symbol of currencies.SYMBOL_TOKENS) {
    assert.ok(symbol.trim().length > 0, 'empty symbol');
    assert.ok(!/^[0-9]+$/.test(symbol), symbol + ' is only digits');
  }
});

test('symbols resolve to their conventional default', () => {
  assert.strictEqual(currencies.resolve('$', {}), 'USD');
  assert.strictEqual(currencies.resolve('¥', {}), 'JPY');
  assert.strictEqual(currencies.resolve('£', {}), 'GBP');
  assert.strictEqual(currencies.resolve('kr', {}), 'SEK');
  assert.strictEqual(currencies.resolve('€', {}), 'EUR');
  assert.strictEqual(currencies.resolve('C$', {}), 'CAD');
  assert.strictEqual(currencies.resolve('﷼', {}), 'SAR');
  assert.strictEqual(currencies.resolve('₩', {}), 'KRW');
  assert.strictEqual(currencies.resolve('د.إ', {}), 'AED');
  assert.strictEqual(currencies.resolve('nonsense', {}), null);
});

test('the table covers what the providers quote', () => {
  for (const code of ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'IQD', 'LBP', 'YER', 'IRR',
                      'CNY', 'CNH', 'KRW', 'MOP', 'COP', 'CLP', 'PEN', 'BOB', 'VES', 'PYG',
                      'NGN', 'GHS', 'KES', 'TZS', 'ETB', 'XOF', 'XAF', 'MAD', 'DZD', 'TND']) {
    assert.ok(currencies.isKnown(code), code + ' is missing from the table');
  }
});

test('locale and domain hints', () => {
  assert.strictEqual(currencies.currencyForLocale('ja-JP'), 'JPY');
  assert.strictEqual(currencies.currencyForLocale('en-CA'), 'CAD');
  assert.strictEqual(currencies.currencyForLocale('de'), 'EUR');
  assert.strictEqual(currencies.currencyForTld('shop.example.co.jp'), 'JPY');
  assert.strictEqual(currencies.currencyForTld('example.com'), null);
  assert.strictEqual(currencies.currencyForTld('souq.ae'), 'AED');
  assert.strictEqual(currencies.currencyForTld('tienda.com.co'), 'COP');
  assert.strictEqual(currencies.currencyForLocale('ar-SA'), 'SAR');
  assert.strictEqual(currencies.currencyForLocale('ko-KR'), 'KRW');
  assert.strictEqual(currencies.currencyForLocale('zh-CN'), 'CNY');
});
