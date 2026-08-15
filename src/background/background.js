;(function () {
  'use strict';

  const ext = globalThis.browser || globalThis.chrome;
  const { settings, rates, currencies } = globalThis.Kawase;

  const ALARM_NAME = 'kawase-refresh';
  let refreshInFlight = null;

  async function refreshRates(force) {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const config = await settings.getSettings();
      const cached = await settings.getRates();

      if (!force && cached && !rates.isStale(cached, config.refreshHours)) {
        return { table: cached, refreshed: false };
      }

      try {
        const table = await rates.fetchRates({
          preference: config.provider === 'auto' ? null : config.provider
        });
        await settings.setRates(table);
        return { table, refreshed: true };
      } catch (error) {
        if (cached) return { table: cached, refreshed: false, error: String(error.message || error) };
        throw error;
      }
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function scheduleAlarm() {
    const config = await settings.getSettings();
    const minutes = Math.max(30, config.refreshHours * 60);
    await ext.alarms.clear(ALARM_NAME);
    ext.alarms.create(ALARM_NAME, { periodInMinutes: minutes, delayInMinutes: minutes });
  }

  async function initializeDefaults() {
    const stored = await ext.storage.sync.get('target');
    if (stored && stored.target) return;
    const locale = (ext.i18n && ext.i18n.getUILanguage && ext.i18n.getUILanguage()) ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const target = settings.defaultTargetForLocale(locale);
    await settings.setSettings({ target });
  }

  ext.runtime.onInstalled.addListener(async (details) => {
    await initializeDefaults();
    await scheduleAlarm();
    await refreshRates(true).catch(() => {});
    if (details && details.reason === 'install' && ext.runtime.openOptionsPage) {
      ext.runtime.openOptionsPage();
    }
  });

  ext.runtime.onStartup.addListener(async () => {
    await scheduleAlarm();
    await refreshRates(false).catch(() => {});
  });

  ext.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) refreshRates(true).catch(() => {});
  });

  ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.refreshHours) scheduleAlarm();
    if (area === 'sync' && changes.provider) refreshRates(true).catch(() => {});
  });

  ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return false;

    if (message.type === 'kawase:rates') {
      refreshRates(Boolean(message.force))
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => sendResponse({ ok: false, error: String(error.message || error) }));
      return true;
    }

    if (message.type === 'kawase:supported') {
      settings.getRates()
        .then((table) => sendResponse({
          ok: true,
          codes: rates.supportedCodes(table).filter((code) => currencies.isKnown(code))
        }))
        .catch(() => sendResponse({ ok: false, codes: [] }));
      return true;
    }

    return false;
  });

  refreshRates(false).catch(() => {});
})();
