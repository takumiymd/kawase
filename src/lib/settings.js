;(function (root) {
  'use strict';

  const currencies = (root.Kawase && root.Kawase.currencies) ||
    (typeof require === 'function' ? require('./currencies.js') : null);

  const ext = root.browser || root.chrome || null;

  const DEFAULTS = {
    enabled: true,
    target: 'JPY',
    mode: 'replace',
    precision: 'auto',
    approx: true,
    highlight: 'underline',
    compactLarge: true,
    locale: 'auto',
    autoDetectPageCurrency: true,
    convertMatchingCurrency: false,
    symbolDefaults: { $: 'USD', '¥': 'JPY', '£': 'GBP', kr: 'SEK', Rs: 'INR' },
    siteMode: {},
    siteCurrency: {},
    refreshHours: 6,
    provider: 'auto'
  };

  const RATES_KEY = 'rates';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(stored) {
    const settings = clone(DEFAULTS);
    if (!stored || typeof stored !== 'object') return settings;

    for (const key of Object.keys(DEFAULTS)) {
      if (!(key in stored)) continue;
      const value = stored[key];
      if (value === null || value === undefined) continue;
      if (typeof DEFAULTS[key] === 'object' && !Array.isArray(DEFAULTS[key])) {
        if (typeof value === 'object') settings[key] = Object.assign({}, DEFAULTS[key], value);
      } else {
        settings[key] = value;
      }
    }

    if (!currencies.isKnown(settings.target)) settings.target = DEFAULTS.target;
    if (!['replace', 'append', 'hover'].includes(settings.mode)) settings.mode = DEFAULTS.mode;
    if (!['underline', 'badge', 'none'].includes(settings.highlight)) settings.highlight = DEFAULTS.highlight;
    settings.refreshHours = Math.min(48, Math.max(1, Number(settings.refreshHours) || DEFAULTS.refreshHours));
    return settings;
  }

  async function getSettings() {
    if (!ext || !ext.storage) return clone(DEFAULTS);
    const stored = await ext.storage.sync.get(Object.keys(DEFAULTS));
    return normalize(stored);
  }

  async function setSettings(patch) {
    if (!ext || !ext.storage) return;
    await ext.storage.sync.set(patch);
  }

  async function getRates() {
    if (!ext || !ext.storage) return null;
    const stored = await ext.storage.local.get(RATES_KEY);
    return stored && stored[RATES_KEY] ? stored[RATES_KEY] : null;
  }

  async function setRates(table) {
    if (!ext || !ext.storage) return;
    await ext.storage.local.set({ [RATES_KEY]: table });
  }

  function isSiteEnabled(settings, hostname) {
    const mode = settings.siteMode ? settings.siteMode[hostname] : undefined;
    if (mode === 'off') return false;
    if (mode === 'on') return true;
    return Boolean(settings.enabled);
  }

  function forcedCurrencyFor(settings, hostname) {
    const code = settings.siteCurrency ? settings.siteCurrency[hostname] : undefined;
    return code && currencies.isKnown(code) ? code : null;
  }

  function defaultTargetForLocale(locale) {
    return currencies.currencyForLocale(locale) || DEFAULTS.target;
  }

  const api = {
    DEFAULTS,
    RATES_KEY,
    normalize,
    getSettings,
    setSettings,
    getRates,
    setRates,
    isSiteEnabled,
    forcedCurrencyFor,
    defaultTargetForLocale
  };

  root.Kawase = Object.assign(root.Kawase || {}, { settings: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
