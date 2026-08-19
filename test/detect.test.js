'use strict';

const test = require('node:test');
const assert = require('node:assert');

require('../src/lib/currencies.js');
require('../src/lib/parse.js');
const detect = require('../src/lib/detect.js');

function find(text, context) {
  return detect.findMatches(text, context || {});
}

function one(text, context) {
  const matches = find(text, context);
  assert.strictEqual(matches.length, 1, 'expected exactly one match in ' + JSON.stringify(text) +
    ', got ' + JSON.stringify(matches.map((m) => m.text)));
  return matches[0];
}

test('symbol before the amount', () => {
  const match = one('Only $19.99 today');
  assert.strictEqual(match.code, 'USD');
  assert.strictEqual(match.value, 19.99);
  assert.strictEqual(match.text, '$19.99');
  assert.strictEqual(match.start, 5);
  assert.strictEqual(match.end, 11);
});

test('symbol after the amount', () => {
  const match = one('Preis: 1.234,56 € inklusive');
  assert.strictEqual(match.code, 'EUR');
  assert.strictEqual(match.value, 1234.56);
});

test('iso code before and after', () => {
  assert.strictEqual(one('JPY 12,800 total').value, 12800);
  assert.strictEqual(one('10.50 USD').value, 10.5);
  assert.strictEqual(one('10.50 USD').code, 'USD');
});

test('japanese yen written with kanji', () => {
  const match = one('1,000円');
  assert.strictEqual(match.code, 'JPY');
  assert.strictEqual(match.value, 1000);
});

test('japanese myriad multipliers', () => {
  assert.strictEqual(one('¥1万').value, 10000);
  assert.strictEqual(one('¥2.5億').value, 250000000);
});

test('english magnitude suffixes', () => {
  assert.strictEqual(one('$1.2M raised').value, 1200000);
  assert.strictEqual(one('$100k seed').value, 100000);
  assert.strictEqual(one('$4.5 billion').value, 4500000000);
});

test('disambiguating dollar prefixes', () => {
  const matches = find('US$45 next to C$60 and A$70');
  assert.deepStrictEqual(matches.map((m) => m.code), ['USD', 'CAD', 'AUD']);
});

test('an ambiguous symbol follows the page currency', () => {
  assert.strictEqual(one('$50', { pageCurrency: 'CAD' }).code, 'CAD');
  assert.strictEqual(one('$50', { pageCurrency: 'JPY' }).code, 'USD', 'JPY is not a dollar');
});

test('a site override beats the page currency', () => {
  assert.strictEqual(one('$50', { pageCurrency: 'CAD', forced: 'AUD' }).code, 'AUD');
});

test('user symbol defaults apply when nothing else is known', () => {
  assert.strictEqual(one('$50', { symbolDefaults: { $: 'SGD' } }).code, 'SGD');
  assert.strictEqual(one('¥500', { symbolDefaults: { '¥': 'CNY' } }).code, 'CNY');
});

test('ambiguity is reported', () => {
  assert.strictEqual(one('$50').ambiguous, true);
  assert.strictEqual(one('€50').ambiguous, false);
});

test('negative and accounting style amounts', () => {
  assert.strictEqual(one('-$12.34').value, -12.34);
  assert.strictEqual(one('($5.00)').value, -5);
  assert.strictEqual(one('($5.00)').text, '($5.00)');
});

test('several prices in one string', () => {
  const matches = find('Was $99.00, now $79.00');
  assert.deepStrictEqual(matches.map((m) => m.value), [99, 79]);
});

test('ranges keep both ends', () => {
  const matches = find('$10-$20');
  assert.deepStrictEqual(matches.map((m) => m.value), [10, 20]);
});

test('indian rupee grouping', () => {
  assert.strictEqual(one('₹1,23,456.78').value, 123456.78);
});

test('three decimal currencies', () => {
  assert.strictEqual(one('KWD 1.234').value, 1.234);
});

test('text without a currency marker is ignored', () => {
  assert.deepStrictEqual(find('Version 2.1.4 released'), []);
  assert.deepStrictEqual(find('Call 555-1234 now'), []);
  assert.deepStrictEqual(find('item 5 of 20'), []);
  assert.deepStrictEqual(find('Posted 2024-05-11 at 10:30'), []);
  assert.deepStrictEqual(find('4.5 out of 5 stars'), []);
});

test('a marker glued to latin text is not a price', () => {
  assert.deepStrictEqual(find('abc$5'), []);
  assert.deepStrictEqual(find('$5abc'), []);
});

test('a marker glued to cjk text is still a price', () => {
  const match = one('商品¥1000です');
  assert.strictEqual(match.code, 'JPY');
  assert.strictEqual(match.value, 1000);
});

test('risky iso codes are not matched as bare words', () => {
  assert.deepStrictEqual(find('ALL 5 items'), []);
  assert.deepStrictEqual(find('TOP 10 results'), []);
});

test('empty and digitless input short circuits', () => {
  assert.deepStrictEqual(find(''), []);
  assert.deepStrictEqual(find('no numbers here'), []);
  assert.deepStrictEqual(detect.findMatches(null, {}), []);
});

test('the pattern is reusable across calls', () => {
  const first = find('$5');
  const second = find('$5');
  assert.strictEqual(first.length, second.length);
  assert.strictEqual(second[0].value, 5);
});

test('arabic-indic digits', () => {
  const match = one('د.إ ١٢٣٫٥٠');
  assert.strictEqual(match.code, 'AED');
  assert.strictEqual(match.value, 123.5);
});

test('arabic grouping and decimal separators', () => {
  assert.strictEqual(one('١٬٢٣٤٫٥٦ ر.ق').value, 1234.56);
  assert.strictEqual(one('١٬٢٣٤٫٥٦ ر.ق').code, 'QAR');
});

test('persian digits', () => {
  assert.strictEqual(one('IRR ۱۲۳۴۵').value, 12345);
});

test('devanagari, bengali and thai digits', () => {
  assert.strictEqual(one('₹१,२३,४५६').value, 123456);
  assert.strictEqual(one('৳১২৩').value, 123);
  assert.strictEqual(one('฿๑๒๓').value, 123);
});

test('a bidi mark between the symbol and the number', () => {
  assert.strictEqual(one('ر.س‏ 499').code, 'SAR');
  assert.strictEqual(one('ر.س‏ 499').value, 499);
});

test('gulf currencies and their three decimal amounts', () => {
  assert.strictEqual(one('KWD 1.234').value, 1.234);
  assert.strictEqual(one('BHD 12.500').value, 12.5);
  assert.strictEqual(one('OMR 0.750').value, 0.75);
  assert.strictEqual(one('د.ك 45').code, 'KWD');
});

test('the riyal sign defaults to saudi but follows the page', () => {
  assert.strictEqual(one('﷼ 500').code, 'SAR');
  assert.strictEqual(one('﷼ 500', { pageCurrency: 'YER' }).code, 'YER');
  assert.strictEqual(one('﷼ 500', { pageCurrency: 'IRR' }).code, 'IRR');
});

test('chinese and korean renderings', () => {
  assert.strictEqual(one('CN¥199').code, 'CNY');
  assert.strictEqual(one('元 199').code, 'CNY');
  assert.strictEqual(one('圆 199').code, 'CNY');
  assert.strictEqual(one('RMB 199').code, 'CNY');
  assert.strictEqual(one('₩1,250,000').value, 1250000);
  assert.strictEqual(one('50,000원').code, 'KRW');
  assert.strictEqual(one('MOP$88').code, 'MOP');
});

test('a bare yen sign can be read as chinese when the page says so', () => {
  assert.strictEqual(one('¥199', { pageCurrency: 'CNY' }).code, 'CNY');
  assert.strictEqual(one('¥199').code, 'JPY');
});

test('latin american currencies', () => {
  assert.strictEqual(one('COP 45.000').value, 45000);
  assert.strictEqual(one('COL$45.000').code, 'COP');
  assert.strictEqual(one('S/ 199.90').code, 'PEN');
  assert.strictEqual(one('Bs. 1.500').code, 'BOB');
  assert.strictEqual(one('₲ 250.000').code, 'PYG');
  assert.strictEqual(one('R$ 1.299,90').value, 1299.9);
});

test('the cordoba shares its symbol with the canadian dollar', () => {
  assert.strictEqual(one('C$60').code, 'CAD');
  assert.strictEqual(one('C$60', { pageCurrency: 'NIO' }).code, 'NIO');
});

test('african currencies', () => {
  assert.strictEqual(one('KSh 4,500').code, 'KES');
  assert.strictEqual(one('₦25,000').code, 'NGN');
  assert.strictEqual(one('GH₵120').code, 'GHS');
  assert.strictEqual(one('CFA 15 000').code, 'XOF');
  assert.strictEqual(one('د.م. 350').code, 'MAD');
});

test('short latin abbreviations are not treated as symbols', () => {
  assert.deepStrictEqual(find('VT100 terminal'), []);
  assert.deepStrictEqual(find('FC 24 release date'), []);
  assert.deepStrictEqual(find('SM 58 microphone'), []);
  assert.deepStrictEqual(find('MT 900 message'), []);
});

test('but those currencies still match through their iso code', () => {
  assert.strictEqual(one('VUV 1,200').code, 'VUV');
  assert.strictEqual(one('MZN 500').code, 'MZN');
  assert.strictEqual(one('CDF 2,500').code, 'CDF');
});

test('japanese fullwidth numbers and yen', () => {
  const match1 = one('２，６００万円');
  assert.strictEqual(match1.code, 'JPY');
  assert.strictEqual(match1.value, 26000000);

  const match2 = one('￥１００，０００');
  assert.strictEqual(match2.code, 'JPY');
  assert.strictEqual(match2.value, 100000);

  const match3 = one('５００円');
  assert.strictEqual(match3.code, 'JPY');
  assert.strictEqual(match3.value, 500);
});

test('compound japanese numeral magnitudes', () => {
  assert.strictEqual(one('1億1980万円').value, 119800000);
  assert.strictEqual(one('1億480万円').value, 104800000);
  assert.strictEqual(one('2億990万円').value, 209900000);
  assert.strictEqual(one('1億円').value, 100000000);
});

test('japanese real estate prices and ranges', () => {
  const matches1 = find('本体価格 2,600万円 〜 2,699万円');
  assert.strictEqual(matches1.length, 2);
  assert.strictEqual(matches1[0].value, 26000000);
  assert.strictEqual(matches1[1].value, 26990000);

  const matches2 = find('(79.7万円 〜 82.7万円/坪)');
  assert.strictEqual(matches2.length, 2);
  assert.strictEqual(matches2[0].value, 797000);
  assert.strictEqual(matches2[1].value, 827000);

  const matches3 = find('2,600万〜2,699万円');
  assert.strictEqual(matches3.length, 2);
  assert.strictEqual(matches3[0].value, 26000000);
  assert.strictEqual(matches3[1].value, 26990000);
});
