;(function (root) {
  'use strict';

  const currencies = (root.Kawase && root.Kawase.currencies) ||
    (typeof require === 'function' ? require('./currencies.js') : null);
  const parse = (root.Kawase && root.Kawase.parse) ||
    (typeof require === 'function' ? require('./parse.js') : null);

  const DIGIT = '[0-9\\u0660-\\u0669\\u06f0-\\u06f9\\u0966-\\u096f\\u09e6-\\u09ef\\u0e50-\\u0e59]';
  const DECIMAL_SEP = '[.,\\u066b]';

  function D(min, max) {
    return DIGIT + '{' + min + ',' + max + '}';
  }

  const GROUP_SEP = '[.,\\u00a0\\u202f\\u2009\\u2007\\u0020\\u0027\\u2019\\u066c]';
  const GAP = '[\\u0020\\u00a0\\u202f\\u2009\\u200e\\u200f\\u061c]{0,3}';

  const NUMBER =
    '(?:' +
      D(1, 2) + '(?:,' + D(2, 2) + ')+,' + D(3, 3) + '(?:\\.' + D(1, 3) + ')?' +
      '|' + D(1, 3) + '(?:' + GROUP_SEP + D(3, 3) + ')+(?:' + DECIMAL_SEP + D(1, 3) + ')?' +
      '|' + DIGIT + '+(?:' + DECIMAL_SEP + D(1, 6) + ')?' +
    ')';

  const MULTIPLIER =
    '(?:' +
      '[\\u0020\\u00a0]?(?:[Tt]housand|[Mm]illion|[Bb]illion|[Tt]rillion)(?![A-Za-z])' +
      '|[\\u0020\\u00a0]?(?:MM|mm|[Bb]n|BN|[Mm]n|MN|[Tt]n|TN|[kKmMbBtT])(?![A-Za-z0-9])' +
      '|[\\u4e07\\u5104\\u5146]' +
    ')';

  const ADJACENT = /[A-Za-z0-9]/;
  const ANY_DIGIT = /[0-9\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef\u0e50-\u0e59]/;

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  let cachedPattern = null;

  function buildPattern() {
    if (cachedPattern) return cachedPattern;

    const symbols = currencies.SYMBOL_TOKENS
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|');

    const codes = currencies.MATCHABLE_CODES.join('|');
    const marker = '(?:' + symbols + '|(?:' + codes + ')(?![A-Za-z]))';

    const source =
      '(?<pre>' + marker + ')' + GAP + '(?<num1>' + NUMBER + ')(?<mul1>' + MULTIPLIER + ')?' +
      '|' +
      '(?<num2>' + NUMBER + ')(?<mul2>' + MULTIPLIER + ')?' + GAP + '(?<post>' + marker + ')';

    cachedPattern = new RegExp(source, 'gu');
    return cachedPattern;
  }

  const QUICK_TEST = ANY_DIGIT;

  function hasDigit(text) {
    return QUICK_TEST.test(text);
  }

  function findMatches(text, context) {
    if (typeof text !== 'string' || text.length === 0 || !hasDigit(text)) return [];

    const ctx = context || {};
    const pattern = buildPattern();
    pattern.lastIndex = 0;

    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }

      const groups = match.groups;
      const marker = groups.pre || groups.post;
      const numberRaw = groups.num1 || groups.num2;
      const multiplierRaw = groups.mul1 || groups.mul2;

      let start = match.index;
      let end = start + match[0].length;

      const before = start > 0 ? text[start - 1] : '';
      const after = end < text.length ? text[end] : '';
      if (before && ADJACENT.test(before)) continue;
      if (after && ADJACENT.test(after)) continue;

      const candidates = currencies.candidatesFor(marker);
      const code = currencies.resolve(marker, ctx);
      if (!code) continue;

      const parsed = parse.parseAmount(numberRaw, {
        currencyDecimals: currencies.decimalsFor(code)
      });
      if (!parsed) continue;

      const multiplier = parse.multiplierFor(multiplierRaw);
      let value = parsed.value * multiplier;

      let negative = false;
      if (before === '-' || before === '−') {
        const beforeSign = start > 1 ? text[start - 2] : '';
        if (!ANY_DIGIT.test(beforeSign)) {
          negative = true;
          start -= 1;
        }
      } else if (before === '(' && after === ')') {
        negative = true;
        start -= 1;
        end += 1;
      }
      if (negative) value = -value;

      results.push({
        start,
        end,
        text: text.slice(start, end),
        code,
        value,
        symbol: marker,
        ambiguous: candidates.length > 1,
        multiplier,
        fractionDigits: parsed.fractionDigits
      });
    }

    return results;
  }

  const api = { findMatches, buildPattern, hasDigit, escapeRegExp, DIGIT, NUMBER, MULTIPLIER };

  root.Kawase = Object.assign(root.Kawase || {}, { detect: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
