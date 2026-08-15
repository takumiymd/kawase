'use strict';

const test = require('node:test');
const assert = require('node:assert');

require('../src/lib/currencies.js');
const settings = require('../src/lib/settings.js');

test('defaults survive an empty store', () => {
  const result = settings.normalize(undefined);
  assert.strictEqual(result.enabled, true);
  assert.strictEqual(result.mode, 'replace');
  assert.deepStrictEqual(result.siteMode, {});
});

test('stored values are merged over the defaults', () => {
  const result = settings.normalize({ target: 'EUR', mode: 'hover', refreshHours: 12 });
  assert.strictEqual(result.target, 'EUR');
  assert.strictEqual(result.mode, 'hover');
  assert.strictEqual(result.refreshHours, 12);
  assert.strictEqual(result.approx, true, 'untouched defaults remain');
});

test('nested objects merge rather than replace', () => {
  const result = settings.normalize({ symbolDefaults: { $: 'CAD' } });
  assert.strictEqual(result.symbolDefaults.$, 'CAD');
  assert.strictEqual(result.symbolDefaults['¥'], 'JPY', 'other symbols keep their default');
});

test('invalid values fall back instead of breaking the content script', () => {
  const result = settings.normalize({ target: 'NOTACODE', mode: 'explode', highlight: 'neon', refreshHours: 900 });
  assert.strictEqual(result.target, 'JPY');
  assert.strictEqual(result.mode, 'replace');
  assert.strictEqual(result.highlight, 'underline');
  assert.strictEqual(result.refreshHours, 48);
});

test('unknown keys are dropped', () => {
  const result = settings.normalize({ somethingElse: true });
  assert.strictEqual(result.somethingElse, undefined);
});

test('site rules override the global switch in both directions', () => {
  const off = settings.normalize({ enabled: true, siteMode: { 'example.com': 'off' } });
  assert.strictEqual(settings.isSiteEnabled(off, 'example.com'), false);
  assert.strictEqual(settings.isSiteEnabled(off, 'other.com'), true);

  const on = settings.normalize({ enabled: false, siteMode: { 'example.com': 'on' } });
  assert.strictEqual(settings.isSiteEnabled(on, 'example.com'), true);
  assert.strictEqual(settings.isSiteEnabled(on, 'other.com'), false);
});

test('forced site currencies are validated', () => {
  const config = settings.normalize({ siteCurrency: { 'a.com': 'CAD', 'b.com': 'NOPE' } });
  assert.strictEqual(settings.forcedCurrencyFor(config, 'a.com'), 'CAD');
  assert.strictEqual(settings.forcedCurrencyFor(config, 'b.com'), null);
  assert.strictEqual(settings.forcedCurrencyFor(config, 'c.com'), null);
});

test('the starting target currency follows the browser locale', () => {
  assert.strictEqual(settings.defaultTargetForLocale('ja-JP'), 'JPY');
  assert.strictEqual(settings.defaultTargetForLocale('en-CA'), 'CAD');
  assert.strictEqual(settings.defaultTargetForLocale('xx-XX'), settings.DEFAULTS.target);
});
