;(function () {
  'use strict';

  const ext = globalThis.browser || globalThis.chrome;
  const { currencies, settings, rates, format } = globalThis.Kawase;

  const LOCALES = [
    ['auto', 'Follow the browser'],
    ['en-US', 'English (United States)'],
    ['en-GB', 'English (United Kingdom)'],
    ['ja-JP', 'Japanese'],
    ['de-DE', 'German'],
    ['fr-FR', 'French'],
    ['es-ES', 'Spanish'],
    ['pt-BR', 'Portuguese (Brazil)'],
    ['zh-CN', 'Chinese (Simplified)'],
    ['ko-KR', 'Korean']
  ];

  const SAMPLES = [
    { value: 19.99, code: 'USD' },
    { value: 249, code: 'EUR' },
    { value: 12800, code: 'JPY' },
    { value: 1250000, code: 'KRW' }
  ];

  const el = (id) => document.getElementById(id);

  const state = { settings: null, table: null };

  function fillCurrencySelect(select, codes, includeAuto) {
    select.innerHTML = '';
    if (includeAuto) {
      const auto = document.createElement('option');
      auto.value = 'auto';
      auto.textContent = 'Detect';
      select.appendChild(auto);
    }
    for (const code of codes) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code + '  ' + currencies.nameFor(code);
      select.appendChild(option);
    }
  }

  function availableCodes() {
    const supported = rates.supportedCodes(state.table).filter((code) => currencies.isKnown(code));
    return supported.length > 0 ? supported : currencies.ALL_CODES.slice();
  }

  function setSwitch(id, value) {
    el(id).setAttribute('aria-checked', String(Boolean(value)));
  }

  function setSegmented(id, value) {
    for (const button of el(id).querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === String(value)));
    }
  }

  function renderPreview() {
    const container = el('previewSample');
    container.innerHTML = '';
    const target = state.settings.target;

    for (const sample of SAMPLES) {
      if (sample.code === target) continue;
      const value = rates.convert(sample.value, sample.code, target, state.table);
      if (value === null) continue;

      const item = document.createElement('div');
      item.className = 'preview-item';

      const from = document.createElement('span');
      from.className = 'from';
      from.textContent = format.formatMoney(sample.value, sample.code, { precision: 'auto', compactLarge: false });

      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';

      const to = document.createElement('span');
      to.className = 'to';
      to.textContent = format.formatMoney(value, target, {
        locale: state.settings.locale,
        precision: state.settings.precision,
        approx: state.settings.approx,
        compactLarge: state.settings.compactLarge
      });

      item.append(from, arrow, to);
      container.appendChild(item);
    }

    if (container.childElementCount === 0) {
      container.innerHTML = '<p class="empty">No rates cached yet.</p>';
    }
  }

  function renderSymbolGrid() {
    const grid = el('symbolGrid');
    grid.innerHTML = '';

    for (const symbol of currencies.AMBIGUOUS_SYMBOLS) {
      const candidates = currencies.candidatesFor(symbol);

      const row = document.createElement('div');
      row.className = 'symbol-row';

      const glyph = document.createElement('span');
      glyph.className = 'symbol-glyph';
      glyph.textContent = symbol;

      const select = document.createElement('select');
      select.className = 'field';
      for (const code of candidates) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code + '  ' + currencies.nameFor(code);
        select.appendChild(option);
      }
      const current = state.settings.symbolDefaults[symbol];
      select.value = candidates.includes(current) ? current : candidates[0];
      select.addEventListener('change', () => {
        const symbolDefaults = Object.assign({}, state.settings.symbolDefaults);
        symbolDefaults[symbol] = select.value;
        patch({ symbolDefaults });
      });

      row.append(glyph, select);
      grid.appendChild(row);
    }
  }

  function renderSites() {
    const list = el('siteList');
    list.innerHTML = '';

    const hosts = new Set([
      ...Object.keys(state.settings.siteMode || {}),
      ...Object.keys(state.settings.siteCurrency || {})
    ]);

    if (hosts.size === 0) {
      list.innerHTML = '<p class="empty">No site rules yet. Open the popup on a site to add one.</p>';
      return;
    }

    for (const host of Array.from(hosts).sort()) {
      const row = document.createElement('div');
      row.className = 'site-row';

      const name = document.createElement('span');
      name.className = 'site-host';
      name.textContent = host;
      row.appendChild(name);

      const mode = (state.settings.siteMode || {})[host];
      if (mode) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.dataset.kind = mode;
        tag.textContent = mode === 'on' ? 'Always on' : 'Off';
        row.appendChild(tag);
      }

      const forced = (state.settings.siteCurrency || {})[host];
      if (forced) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.dataset.kind = 'currency';
        tag.textContent = 'in ' + forced;
        row.appendChild(tag);
      }

      const remove = document.createElement('button');
      remove.className = 'ghost';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        const siteMode = Object.assign({}, state.settings.siteMode);
        const siteCurrency = Object.assign({}, state.settings.siteCurrency);
        delete siteMode[host];
        delete siteCurrency[host];
        patch({ siteMode, siteCurrency });
      });
      row.appendChild(remove);

      list.appendChild(row);
    }
  }

  function renderRates() {
    const meta = el('rateMeta');
    const sample = el('rateSample');
    sample.innerHTML = '';

    if (!state.table) {
      meta.textContent = 'No rates cached yet.';
      return;
    }

    const codes = rates.supportedCodes(state.table);
    const stale = rates.isStale(state.table, state.settings.refreshHours);
    meta.textContent = codes.length + ' currencies from ' + state.table.source + ', ' +
      format.formatAge(state.table.fetchedAt) + (stale ? ', due for a refresh' : '');

    const target = state.settings.target;
    for (const code of ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'KRW', 'CAD', 'AUD']) {
      if (code === target) continue;
      const rate = rates.rateBetween(state.table, code, target);
      if (!rate) continue;

      const chip = document.createElement('div');
      chip.className = 'rate-chip';
      const label = document.createElement('span');
      label.className = 'code';
      label.textContent = '1 ' + code;
      const value = document.createElement('span');
      value.textContent = rate >= 100 ? rate.toFixed(2) : rate.toFixed(4);
      chip.append(label, value);
      sample.appendChild(chip);
    }
  }

  function render() {
    setSwitch('enabled', state.settings.enabled);
    setSwitch('approx', state.settings.approx);
    setSwitch('compactLarge', state.settings.compactLarge);
    setSwitch('autoDetectPageCurrency', state.settings.autoDetectPageCurrency);
    setSwitch('convertMatchingCurrency', state.settings.convertMatchingCurrency);

    setSegmented('mode', state.settings.mode);
    setSegmented('highlight', state.settings.highlight);
    setSegmented('precision', state.settings.precision);

    el('target').value = state.settings.target;
    el('locale').value = state.settings.locale;
    el('provider').value = state.settings.provider;
    el('refreshHours').value = String(state.settings.refreshHours);

    renderPreview();
    renderSymbolGrid();
    renderSites();
    renderRates();
  }

  async function patch(update) {
    Object.assign(state.settings, update);
    await settings.setSettings(update);
    render();
  }

  function bindSwitch(id, key) {
    el(id).addEventListener('click', () => patch({ [key]: !state.settings[key] }));
  }

  function bindSegmented(id, key, cast) {
    el(id).addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (button) patch({ [key]: cast ? cast(button.dataset.value) : button.dataset.value });
    });
  }

  (async function init() {
    state.settings = await settings.getSettings();
    state.table = await settings.getRates();

    fillCurrencySelect(el('target'), availableCodes(), false);
    const localeSelect = el('locale');
    localeSelect.innerHTML = '';
    for (const [value, label] of LOCALES) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      localeSelect.appendChild(option);
    }

    const manifest = ext.runtime.getManifest();
    el('version').textContent = 'Kawase ' + manifest.version;

    bindSwitch('enabled', 'enabled');
    bindSwitch('approx', 'approx');
    bindSwitch('compactLarge', 'compactLarge');
    bindSwitch('autoDetectPageCurrency', 'autoDetectPageCurrency');
    bindSwitch('convertMatchingCurrency', 'convertMatchingCurrency');

    bindSegmented('mode', 'mode');
    bindSegmented('highlight', 'highlight');
    bindSegmented('precision', 'precision');

    el('target').addEventListener('change', (event) => patch({ target: event.target.value }));
    el('locale').addEventListener('change', (event) => patch({ locale: event.target.value }));
    el('provider').addEventListener('change', (event) => patch({ provider: event.target.value }));
    el('refreshHours').addEventListener('change', (event) => patch({ refreshHours: Number(event.target.value) }));

    el('refreshNow').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Refreshing';
      try {
        const response = await ext.runtime.sendMessage({ type: 'kawase:rates', force: true });
        if (response && response.table) state.table = response.table;
      } catch (error) {
        // Fallback
      }
      button.disabled = false;
      button.textContent = 'Refresh now';
      render();
    });

    el('tabs').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      for (const tab of el('tabs').querySelectorAll('button')) {
        tab.setAttribute('aria-selected', String(tab === button));
      }
      for (const panel of document.querySelectorAll('.panel')) {
        panel.hidden = panel.dataset.panel !== button.dataset.tab;
      }
    });

    ext.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'local' && changes.rates) {
        state.table = await settings.getRates();
        renderRates();
        renderPreview();
      }
    });

    render();
  })();
})();
