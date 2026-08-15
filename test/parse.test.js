'use strict';

const test = require('node:test');
const assert = require('node:assert');
const parse = require('../src/lib/parse.js');

function value(raw, options) {
  const result = parse.parseAmount(raw, options);
  return result === null ? null : result.value;
}

test('plain numbers', () => {
  assert.strictEqual(value('5'), 5);
  assert.strictEqual(value('1234'), 1234);
  assert.strictEqual(value('0'), 0);
});

test('anglo grouping and decimals', () => {
  assert.strictEqual(value('1,234.56'), 1234.56);
  assert.strictEqual(value('12,345,678.90'), 12345678.9);
  assert.strictEqual(value('99.99'), 99.99);
});

test('european grouping and decimals', () => {
  assert.strictEqual(value('1.234,56'), 1234.56);
  assert.strictEqual(value('1.234.567,89'), 1234567.89);
  assert.strictEqual(value('12,50'), 12.5);
});

test('space and apostrophe grouping', () => {
  assert.strictEqual(value('1 234,56'), 1234.56);
  assert.strictEqual(value('1 234.56'), 1234.56);
  assert.strictEqual(value("1'234.56"), 1234.56);
});

test('indian grouping', () => {
  assert.strictEqual(value('1,23,456.78'), 123456.78);
  assert.strictEqual(value('12,34,567'), 1234567);
});

test('a single separator with three trailing digits is grouping', () => {
  assert.strictEqual(value('1,234'), 1234);
  assert.strictEqual(value('1.234'), 1234);
});

test('but three trailing digits after a leading zero are decimals', () => {
  assert.strictEqual(value('0.500'), 0.5);
  assert.strictEqual(value('0,750'), 0.75);
});

test('and three trailing digits are decimals for three decimal currencies', () => {
  assert.strictEqual(value('1.234', { currencyDecimals: 3 }), 1.234);
});

test('grouping that cannot be grouping is read as a decimal', () => {
  assert.strictEqual(value('1234.567'), 1234.567);
});

test('high precision decimals survive', () => {
  assert.strictEqual(value('0.00012345'), 0.00012345);
});

test('malformed input is rejected', () => {
  assert.strictEqual(parse.parseAmount('12,34,56'), null);
  assert.strictEqual(parse.parseAmount('1,2.3,4'), null);
  assert.strictEqual(parse.parseAmount('abc'), null);
  assert.strictEqual(parse.parseAmount(''), null);
  assert.strictEqual(parse.parseAmount(null), null);
  assert.strictEqual(parse.parseAmount('.50'), null);
});

test('fraction digit count is reported', () => {
  assert.strictEqual(parse.parseAmount('19.99').fractionDigits, 2);
  assert.strictEqual(parse.parseAmount('1,234').fractionDigits, 0);
});

test('multipliers', () => {
  assert.strictEqual(parse.multiplierFor('k'), 1e3);
  assert.strictEqual(parse.multiplierFor('M'), 1e6);
  assert.strictEqual(parse.multiplierFor(' bn'), 1e9);
  assert.strictEqual(parse.multiplierFor('million'), 1e6);
  assert.strictEqual(parse.multiplierFor('万'), 1e4);
  assert.strictEqual(parse.multiplierFor('億'), 1e8);
  assert.strictEqual(parse.multiplierFor(undefined), 1);
  assert.strictEqual(parse.multiplierFor('zzz'), 1);
});

test('non ascii digit systems fold to ascii', () => {
  assert.strictEqual(parse.normalizeDigits('١٢٣٤'), '1234');
  assert.strictEqual(parse.normalizeDigits('۱۲۳۴'), '1234');
  assert.strictEqual(parse.normalizeDigits('१२३४'), '1234');
  assert.strictEqual(parse.normalizeDigits('১২৩৪'), '1234');
  assert.strictEqual(parse.normalizeDigits('๑๒๓๔'), '1234');
  assert.strictEqual(parse.normalizeDigits('1,234.56'), '1,234.56', 'ascii is passed through');
});

test('the arabic decimal separator becomes a full stop', () => {
  assert.strictEqual(parse.normalizeDigits('١٢٣٫٥٠'), '123.50');
  assert.strictEqual(value('١٢٣٫٥٠'), 123.5);
});

test('bidi marks inside a number are dropped', () => {
  assert.strictEqual(value('‏١٢٣‎'), 123);
});

test('arabic thousands separators group correctly', () => {
  assert.strictEqual(value('١٬٢٣٤٫٥٦'), 1234.56);
});
