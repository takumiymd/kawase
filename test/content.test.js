
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM = null;
try {
  ({ JSDOM } = require('jsdom'));
} catch (error) {
  JSDOM = null;
}

const SCRIPTS = [
  'src/lib/currencies.js',
  'src/lib/parse.js',
  'src/lib/detect.js',
  'src/lib/format.js',
  'src/lib/rates.js',
  'src/lib/settings.js',
  'src/content/page-context.js',
  'src/content/content.js'
];

const TABLE = {
  base: 'USD',
  rates: { USD: 1, JPY: 150, EUR: 0.92, GBP: 0.78, CAD: 1.36 },
  fetchedAt: Date.now(),
  nextUpdate: null,
  source: 'test fixture'
};

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Product","offers":{"priceCurrency":"USD","price":"19.99"}}
  </script>
</head>
<body>
  <p id="simple">Only $19.99 today</p>
  <p id="grouped">Subtotal: $1,299.00</p>
  <p id="euro">Versand 1.234,56 &euro;</p>
  <p id="sentence">The upgrade costs $8.99 per month after the trial.</p>
  <p id="version">Version 2.1.4 released</p>
  <p id="rating">4.5 out of 5 stars</p>
  <p id="code"><code>const price = $5 + total;</code></p>
  <p id="input"><input type="text" value="$25.00"></p>
  <p id="already">Tokyo price 3,980&#x5186;</p>
  <div id="later"></div>
</body>
</html>`;

function buildEnvironment(overrides) {
  const dom = new JSDOM(PAGE, {
    url: 'https://shop.example.com/product',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  const window = dom.window;

  const stored = Object.assign({ target: 'JPY', approx: false }, overrides || {});
  const listeners = { storage: [], message: [] };

  window.browser = {
    storage: {
      sync: { get: async () => stored, set: async () => {} },
      local: { get: async () => ({ rates: TABLE }), set: async () => {} },
      onChanged: { addListener: (fn) => listeners.storage.push(fn) }
    },
    runtime: {
      sendMessage: async () => ({ ok: true, table: TABLE }),
      onMessage: { addListener: (fn) => listeners.message.push(fn) }
    }
  };

  for (const file of SCRIPTS) {
    window.eval(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  }

  return { window, document: window.document, listeners };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function textOf(document, id) {
  return document.getElementById(id).textContent;
}

test('content script', { skip: JSDOM ? false : 'jsdom is not installed' }, async (t) => {
  const env = buildEnvironment();
  const { document } = env;
  await wait(250);

  await t.test('replaces a simple price', () => {
    const span = document.querySelector('#simple [data-kawase]');
    assert.ok(span, 'no conversion was made');
    assert.strictEqual(span.getAttribute('data-kawase-original'), '$19.99');
    assert.strictEqual(span.textContent, '¥2,998');
    assert.strictEqual(textOf(document, 'simple'), 'Only ¥2,998 today');
  });

  await t.test('keeps the surrounding text intact', () => {
    assert.strictEqual(textOf(document, 'sentence'), 'The upgrade costs ¥1,349 per month after the trial.');
  });

  await t.test('handles grouped and european formats', () => {
    assert.strictEqual(textOf(document, 'grouped'), 'Subtotal: ¥194,850');
    assert.strictEqual(textOf(document, 'euro'), 'Versand ¥201,287');
  });

  await t.test('leaves prices already in the target currency alone', () => {
    assert.strictEqual(textOf(document, 'already'), 'Tokyo price 3,980円');
  });

  await t.test('leaves non prices alone', () => {
    assert.strictEqual(textOf(document, 'version'), 'Version 2.1.4 released');
    assert.strictEqual(textOf(document, 'rating'), '4.5 out of 5 stars');
  });

  await t.test('skips code blocks and form fields', () => {
    assert.strictEqual(textOf(document, 'code'), 'const price = $5 + total;');
    assert.strictEqual(document.querySelector('#input input').value, '$25.00');
  });

  await t.test('records the conversion for the tooltip', () => {
    const tip = document.querySelector('#simple [data-kawase]').getAttribute('data-kawase-tip');
    assert.ok(tip.includes('$19.99'), tip);
    assert.ok(tip.includes('1 USD = 150 JPY'), tip);
    assert.ok(tip.includes('test fixture'), tip);
  });

  await t.test('picks up content added after load', async () => {
    const paragraph = document.createElement('p');
    paragraph.id = 'late';
    paragraph.textContent = 'Late arrival: $50.00';
    document.getElementById('later').appendChild(paragraph);

    await wait(600);
    assert.strictEqual(textOf(document, 'late'), 'Late arrival: ¥7,500');
  });

  await t.test('reports its status', async () => {
    const handler = env.listeners.message[0];
    let response = null;
    handler({ type: 'kawase:status' }, {}, (value) => { response = value; });
    assert.ok(response.active);
    assert.ok(response.count >= 5, 'converted ' + response.count);
    assert.strictEqual(response.pageCurrency, 'USD');
    assert.strictEqual(response.pageCurrencySource, 'structured data');
  });
});

test('display modes', { skip: JSDOM ? false : 'jsdom is not installed' }, async (t) => {
  await t.test('alongside keeps the original visible', async () => {
    const { document } = buildEnvironment({ mode: 'append' });
    await wait(250);
    assert.strictEqual(textOf(document, 'simple'), 'Only $19.99 (¥2,998) today');
  });

  await t.test('hover leaves the text untouched', async () => {
    const { document } = buildEnvironment({ mode: 'hover' });
    await wait(250);
    assert.strictEqual(textOf(document, 'simple'), 'Only $19.99 today');
    assert.ok(document.querySelector('#simple [data-kawase]'), 'still marked up for hovering');
  });

  await t.test('a site rule can switch the extension off', async () => {
    const { document } = buildEnvironment({ siteMode: { 'shop.example.com': 'off' } });
    await wait(250);
    assert.strictEqual(textOf(document, 'simple'), 'Only $19.99 today');
    assert.strictEqual(document.querySelector('[data-kawase]'), null);
  });

  await t.test('a forced source currency overrides the page', async () => {
    const { document } = buildEnvironment({ siteCurrency: { 'shop.example.com': 'CAD' } });
    await wait(250);
    assert.strictEqual(textOf(document, 'simple'), 'Only ¥2,205 today');
  });

  await t.test('the approximate marker is applied', async () => {
    const { document } = buildEnvironment({ approx: true });
    await wait(250);
    assert.strictEqual(textOf(document, 'simple'), 'Only ≈¥2,998 today');
  });
});
