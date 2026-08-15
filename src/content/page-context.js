;(function (root) {
  'use strict';

  const currencies = root.Kawase.currencies;

  function fromAttribute(selector, attribute) {
    try {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getAttribute(attribute);
      return value && currencies.isKnown(value.trim()) ? value.trim().toUpperCase() : null;
    } catch (error) {
      return null;
    }
  }

  function fromStructuredData() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text || text.indexOf('riceCurrency') === -1) continue;
      const match = text.match(/"price[Cc]urrency"\s*:\s*"([A-Za-z]{3})"/);
      if (match && currencies.isKnown(match[1])) return match[1].toUpperCase();
    }
    return null;
  }

  function fromMicrodata() {
    return fromAttribute('meta[itemprop="priceCurrency"][content]', 'content') ||
      fromAttribute('[itemprop="priceCurrency"][content]', 'content');
  }

  function fromOpenGraph() {
    return fromAttribute('meta[property="og:price:currency"][content]', 'content') ||
      fromAttribute('meta[property="product:price:currency"][content]', 'content') ||
      fromAttribute('meta[name="currency"][content]', 'content');
  }

  function detectPageCurrency(location, documentElement) {
    const structured = fromStructuredData();
    if (structured) return { code: structured, source: 'structured data' };

    const micro = fromMicrodata();
    if (micro) return { code: micro, source: 'microdata' };

    const openGraph = fromOpenGraph();
    if (openGraph) return { code: openGraph, source: 'page metadata' };

    const host = (location && location.hostname) || '';
    const byTld = currencies.currencyForTld(host);
    if (byTld) return { code: byTld, source: 'domain' };

    const lang = (documentElement && documentElement.getAttribute('lang')) || '';
    const byLang = lang ? currencies.currencyForLocale(lang) : null;
    if (byLang) return { code: byLang, source: 'page language' };

    return { code: null, source: 'none' };
  }

  root.Kawase = Object.assign(root.Kawase || {}, {
    pageContext: { detectPageCurrency }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
