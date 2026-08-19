;(function (root) {
  'use strict';

  const SPACE_SEPARATORS = /[\u0020\u00a0\u2007\u2009\u202f\u3000\u066c\u0027\u2019]/g;

  const DIGIT_RANGES = [
    [0x0660, 0x0669],   // Arabic-Indic
    [0x06f0, 0x06f9],   // Persian
    [0x0966, 0x096f],   // Devanagari
    [0x09e6, 0x09ef],   // Bengali
    [0x0e50, 0x0e59],   // Thai
    [0xff10, 0xff19]    // Fullwidth ０-９
  ];

  const ARABIC_DECIMAL = 0x066b;
  const BIDI_MARKS = new Set([0x200e, 0x200f, 0x061c]);

  function normalizeDigits(text) {
    const input = String(text);
    if (/^[0-9.,\s]*$/.test(input)) return input;

    let output = '';
    for (const char of input) {
      const code = char.codePointAt(0);
      if (code === ARABIC_DECIMAL || code === 0xff0e) { output += '.'; continue; }
      if (code === 0xff0c) { output += ','; continue; }
      if (code === 0x3000) { output += ' '; continue; }
      if (BIDI_MARKS.has(code)) continue;

      let mapped = char;
      for (const [start, end] of DIGIT_RANGES) {
        if (code >= start && code <= end) {
          mapped = String(code - start);
          break;
        }
      }
      output += mapped;
    }
    return output;
  }

  const MULTIPLIERS = {
    k: 1e3, K: 1e3,
    m: 1e6, M: 1e6, mm: 1e6, MM: 1e6, mn: 1e6, Mn: 1e6, MN: 1e6,
    b: 1e9, B: 1e9, bn: 1e9, Bn: 1e9, BN: 1e9,
    t: 1e12, T: 1e12, tn: 1e12, Tn: 1e12, TN: 1e12,
    thousand: 1e3, Thousand: 1e3,
    million: 1e6, Million: 1e6,
    billion: 1e9, Billion: 1e9,
    trillion: 1e12, Trillion: 1e12,
    '万': 1e4,
    '億': 1e8,
    '兆': 1e12
  };

  function multiplierFor(token) {
    if (!token) return 1;
    const key = String(token).trim();
    if (Object.prototype.hasOwnProperty.call(MULTIPLIERS, key)) return MULTIPLIERS[key];
    const lower = key.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(MULTIPLIERS, lower)) return MULTIPLIERS[lower];
    return 1;
  }

  function isValidGrouping(digits, separator) {
    const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const western = new RegExp('^\\d{1,3}(?:' + escaped + '\\d{3})+$');
    const indian = new RegExp('^\\d{1,2}(?:' + escaped + '\\d{2})+' + escaped + '\\d{3}$');
    return western.test(digits) || indian.test(digits);
  }

  function parseAmount(raw, options) {
    const opts = options || {};
    if (raw === null || raw === undefined) return null;

    const compact = normalizeDigits(raw).trim().replace(SPACE_SEPARATORS, '');

    // CJK compound numbers with 億, 兆, 万
    if (/[\u4e07\u5104\u5146]/.test(compact)) {
      let s = compact;
      let total = 0;
      let hasCompound = false;

      const choMatch = s.match(/([0-9.,]+)\s*[\u5146]/);
      if (choMatch) {
        const parsed = parseAmount(choMatch[1], opts);
        if (parsed) { total += parsed.value * 1e12; hasCompound = true; }
        s = s.slice(choMatch.index + choMatch[0].length);
      }

      const okuMatch = s.match(/([0-9.,]+)\s*[\u5104]/);
      if (okuMatch) {
        const parsed = parseAmount(okuMatch[1], opts);
        if (parsed) { total += parsed.value * 1e8; hasCompound = true; }
        s = s.slice(okuMatch.index + okuMatch[0].length);
      }

      const manMatch = s.match(/([0-9.,]+)\s*[\u4e07]/);
      if (manMatch) {
        const parsed = parseAmount(manMatch[1], opts);
        if (parsed) { total += parsed.value * 1e4; hasCompound = true; }
      } else if (s.trim() && hasCompound) {
        const parsed = parseAmount(s.trim(), opts);
        if (parsed) total += parsed.value * 1e4;
      }

      if (hasCompound) {
        return {
          value: total,
          fractionDigits: 0,
          decimalSeparator: null
        };
      }
    }

    if (!/^\d[\d.,]*$/.test(compact)) return null;
    if (compact.replace(/[.,]/g, '').length > 18) return null;

    const lastDot = compact.lastIndexOf('.');
    const lastComma = compact.lastIndexOf(',');
    let decimalSeparator = null;

    if (lastDot >= 0 && lastComma >= 0) {
      decimalSeparator = lastDot > lastComma ? '.' : ',';
    } else if (lastDot >= 0 || lastComma >= 0) {
      const separator = lastDot >= 0 ? '.' : ',';
      const occurrences = compact.split(separator).length - 1;
      const head = compact.slice(0, compact.lastIndexOf(separator));
      const tail = compact.slice(compact.lastIndexOf(separator) + 1);

      if (occurrences > 1) {
        decimalSeparator = null;
      } else if (tail.length <= 2) {
        decimalSeparator = separator;
      } else if (tail.length === 3) {
        if (opts.currencyDecimals === 3) decimalSeparator = separator;
        else if (/^0$/.test(head)) decimalSeparator = separator;
        else if (!isValidGrouping(compact, separator)) decimalSeparator = separator;
        else decimalSeparator = null;
      } else {
        decimalSeparator = separator;
      }
    }

    let integerPart = compact;
    let fractionPart = '';
    if (decimalSeparator) {
      const index = compact.lastIndexOf(decimalSeparator);
      integerPart = compact.slice(0, index);
      fractionPart = compact.slice(index + 1);
    }

    const groupingChars = integerPart.match(/[.,]/g);
    if (groupingChars && groupingChars.length > 0) {
      const groupingSeparator = groupingChars[0];
      if (groupingChars.some((char) => char !== groupingSeparator)) return null;
      if (!isValidGrouping(integerPart, groupingSeparator)) return null;
      integerPart = integerPart.split(groupingSeparator).join('');
    }

    if (!/^\d+$/.test(integerPart)) return null;
    if (fractionPart && !/^\d+$/.test(fractionPart)) return null;

    const value = Number(integerPart + (fractionPart ? '.' + fractionPart : ''));
    if (!Number.isFinite(value)) return null;

    return {
      value,
      fractionDigits: fractionPart.length,
      decimalSeparator
    };
  }

  const api = { parseAmount, multiplierFor, normalizeDigits, MULTIPLIERS, DIGIT_RANGES, isValidGrouping };

  root.Kawase = Object.assign(root.Kawase || {}, { parse: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
