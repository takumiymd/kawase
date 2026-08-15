;(function () {
  'use strict';

  const ext = globalThis.browser || globalThis.chrome;
  const { currencies, settings, rates, format } = globalThis.Kawase;

  const CONTENT_FILES = [
    'src/lib/currencies.js',
    'src/lib/parse.js',
    'src/lib/detect.js',
    'src/lib/format.js',
    'src/lib/rates.js',
    'src/lib/settings.js',
    'src/content/page-context.js',
    'src/content/content.js'
  ];

  const COMMON = [
    'USD', 'EUR', 'JPY', 'GBP', 'CNY', 'KRW', 'CAD', 'AUD', 'CHF', 'INR',
    'HKD', 'SGD', 'TWD', 'AED', 'SAR', 'MXN', 'BRL', 'COP', 'TRY', 'THB'
  ];

  const el = (id) => document.getElementById(id);

  const ui = {
    masterToggle: el('masterToggle'),
    rateStatus: el('rateStatus'),
    combo: el('combo'),
    comboTrigger: el('comboTrigger'),
    comboCode: el('comboCode'),
    comboName: el('comboName'),
    comboPanel: el('comboPanel'),
    comboSearch: el('comboSearch'),
    comboList: el('comboList'),
    rateText: el('rateText'),
    refreshRates: el('refreshRates'),
    preview: el('preview'),
    previewFrom: el('previewFrom'),
    previewTo: el('previewTo'),
    modeGroup: el('modeGroup'),
    hostname: el('hostname'),
    siteToggle: el('siteToggle'),
    siteNote: el('siteNote'),
    sourceOverride: el('sourceOverride'),
    sourceNote: el('sourceNote'),
    notice: el('notice'),
    noticeText: el('noticeText'),
    noticeAction: el('noticeAction'),
    countText: el('countText'),
    openOptions: el('openOptions')
  };

  const state = {
    settings: null,
    table: null,
    tab: null,
    hostname: '',
    origin: null,
    status: null,
    available: [],
    filtered: [],
    activeIndex: 0
  };

  function availableCurrencies(table) {
    const supported = rates.supportedCodes(table).filter((code) => currencies.isKnown(code));
    const list = supported.length > 0 ? supported : currencies.ALL_CODES.slice();
    return list.sort((a, b) => {
      const rankA = COMMON.indexOf(a);
      const rankB = COMMON.indexOf(b);
      if (rankA !== rankB) return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
      return a.localeCompare(b);
    });
  }

  async function readTab() {
    const tabs = await ext.tabs.query({ active: true, currentWindow: true });
    state.tab = tabs && tabs[0] ? tabs[0] : null;
    if (!state.tab || !state.tab.url) return;
    try {
      const url = new URL(state.tab.url);
      state.hostname = url.hostname;
      state.origin = /^https?:$/.test(url.protocol) ? url.origin + '/*' : null;
    } catch (error) {
      state.hostname = '';
      state.origin = null;
    }
  }

  async function readStatus() {
    if (!state.tab) return null;
    try {
      return await ext.tabs.sendMessage(state.tab.id, { type: 'kawase:status' });
    } catch (error) {
      return null;
    }
  }

  function renderRateLine() {
    const target = state.settings.target;
    const source = state.status && state.status.pageCurrency
      ? state.status.pageCurrency
      : (target === 'USD' ? 'EUR' : 'USD');

    if (!state.table) {
      ui.rateText.textContent = 'No rates cached yet';
      ui.rateStatus.textContent = 'offline';
      ui.rateStatus.dataset.tone = 'error';
      ui.preview.hidden = true;
      return;
    }

    const rate = rates.rateBetween(state.table, source, target);
    ui.rateText.textContent = rate ? format.formatRate(source, target, rate) : source + ' is not quoted';

    const stale = rates.isStale(state.table, state.settings.refreshHours);
    ui.rateStatus.textContent = format.formatAge(state.table.fetchedAt);
    ui.rateStatus.dataset.tone = stale ? 'stale' : 'fresh';

    if (rate) {
      const sample = source === 'JPY' || source === 'KRW' ? 2000 : 19.99;
      ui.previewFrom.textContent = format.formatMoney(sample, source, { precision: 'auto', compactLarge: false });
      ui.previewTo.textContent = format.formatMoney(sample * rate, target, {
        locale: state.settings.locale,
        precision: state.settings.precision,
        compactLarge: state.settings.compactLarge
      });
      ui.preview.hidden = false;
    } else {
      ui.preview.hidden = true;
    }
  }

  function renderCombo() {
    const code = state.settings.target;
    ui.comboCode.textContent = code;
    ui.comboName.textContent = currencies.nameFor(code);
  }

  function renderComboList(filter) {
    const query = (filter || '').trim().toLowerCase();
    state.filtered = state.available.filter((code) => {
      if (!query) return true;
      return code.toLowerCase().includes(query) ||
        currencies.nameFor(code).toLowerCase().includes(query);
    });

    ui.comboList.innerHTML = '';
    if (state.filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'combo-empty';
      empty.textContent = 'No currency matches that';
      ui.comboList.appendChild(empty);
      return;
    }

    state.activeIndex = Math.max(0, state.filtered.indexOf(state.settings.target));
    if (query) state.activeIndex = 0;

    state.filtered.forEach((code, index) => {
      const option = document.createElement('li');
      option.className = 'combo-option mono';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(code === state.settings.target));
      option.dataset.code = code;
      option.dataset.active = String(index === state.activeIndex);

      const codeSpan = document.createElement('span');
      codeSpan.className = 'code';
      codeSpan.textContent = code;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'name';
      nameSpan.textContent = currencies.nameFor(code);

      option.append(codeSpan, nameSpan);
      option.addEventListener('click', () => selectCurrency(code));
      ui.comboList.appendChild(option);
    });

    scrollActiveIntoView();
  }

  function scrollActiveIntoView() {
    const active = ui.comboList.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function renderMode() {
    for (const button of ui.modeGroup.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.settings.mode));
    }
  }

  function renderSite() {
    ui.hostname.textContent = state.hostname || 'this page';

    const explicit = state.settings.siteMode ? state.settings.siteMode[state.hostname] : undefined;
    const enabled = settings.isSiteEnabled(state.settings, state.hostname);
    ui.siteToggle.setAttribute('aria-checked', String(enabled));
    ui.siteNote.textContent = explicit
      ? 'Set for this site'
      : (state.settings.enabled ? 'Following the global switch' : 'Global switch is off');

    const forced = state.settings.siteCurrency ? state.settings.siteCurrency[state.hostname] : '';
    ui.sourceOverride.value = forced && currencies.isKnown(forced) ? forced : 'auto';

    if (forced) {
      ui.sourceNote.textContent = 'Forced to ' + forced;
    } else if (state.status && state.status.pageCurrency) {
      ui.sourceNote.textContent = 'Detected ' + state.status.pageCurrency + ' from ' + state.status.pageCurrencySource;
    } else {
      ui.sourceNote.textContent = 'Detected from the page';
    }
  }

  function renderNotice() {
    ui.notice.hidden = true;
    ui.noticeAction.hidden = true;

    if (!state.tab) return;

    if (!state.origin) {
      ui.noticeText.textContent = 'Firefox does not allow extensions to change this page.';
      ui.notice.hidden = false;
      return;
    }

    if (!state.status) {
      ui.noticeText.textContent = 'Kawase is not running here yet.';
      ui.noticeAction.textContent = 'Enable';
      ui.noticeAction.hidden = false;
      ui.notice.hidden = false;
    }
  }

  function renderCount() {
    if (state.status && typeof state.status.count === 'number') {
      const count = state.status.count;
      ui.countText.textContent = count === 1 ? '1 price converted' : count + ' prices converted';
    } else {
      ui.countText.textContent = '';
    }
  }

  function render() {
    document.body.dataset.disabled = String(!state.settings.enabled);
    ui.masterToggle.setAttribute('aria-checked', String(state.settings.enabled));
    renderCombo();
    renderRateLine();
    renderMode();
    renderSite();
    renderNotice();
    renderCount();
  }

  async function patch(update) {
    Object.assign(state.settings, update);
    await settings.setSettings(update);
    render();
  }

  async function selectCurrency(code) {
    closeCombo();
    if (code === state.settings.target) return;
    await patch({ target: code });
  }

  function openCombo() {
    ui.comboPanel.hidden = false;
    ui.comboTrigger.setAttribute('aria-expanded', 'true');
    ui.comboSearch.value = '';
    renderComboList('');
    ui.comboSearch.focus();
  }

  function closeCombo() {
    ui.comboPanel.hidden = true;
    ui.comboTrigger.setAttribute('aria-expanded', 'false');
  }

  function moveActive(delta) {
    if (state.filtered.length === 0) return;
    state.activeIndex = (state.activeIndex + delta + state.filtered.length) % state.filtered.length;
    for (const option of ui.comboList.querySelectorAll('.combo-option')) {
      option.dataset.active = String(option.dataset.code === state.filtered[state.activeIndex]);
    }
    scrollActiveIntoView();
  }

  async function refreshRates() {
    ui.refreshRates.dataset.busy = 'true';
    try {
      const response = await ext.runtime.sendMessage({ type: 'kawase:rates', force: true });
      if (response && response.ok && response.table) {
        state.table = response.table;
        state.available = availableCurrencies(state.table);
      }
      if (response && response.error) {
        ui.rateStatus.textContent = 'refresh failed';
        ui.rateStatus.dataset.tone = 'error';
      }
    } catch (error) {
      ui.rateStatus.textContent = 'refresh failed';
      ui.rateStatus.dataset.tone = 'error';
    } finally {
      delete ui.refreshRates.dataset.busy;
      renderRateLine();
    }
  }

  async function enableHere() {
    if (!state.origin || !state.tab) return;
    try {
      const granted = await ext.permissions.request({ origins: [state.origin] });
      if (!granted) return;
    } catch (error) {
      // Permission request ignored/handled
    }

    try {
      await ext.scripting.insertCSS({ target: { tabId: state.tab.id }, files: ['src/content/content.css'] });
      await ext.scripting.executeScript({ target: { tabId: state.tab.id }, files: CONTENT_FILES });
    } catch (error) {
      ui.noticeText.textContent = 'Could not start on this page: ' + (error.message || error);
      return;
    }

    state.status = await readStatus();
    render();
  }

  function buildSourceOptions() {
    ui.sourceOverride.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = 'Detect';
    ui.sourceOverride.appendChild(auto);

    for (const code of state.available) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      ui.sourceOverride.appendChild(option);
    }
  }

  ui.masterToggle.addEventListener('click', () => patch({ enabled: !state.settings.enabled }));

  ui.comboTrigger.addEventListener('click', () => {
    if (ui.comboPanel.hidden) openCombo();
    else closeCombo();
  });

  ui.comboSearch.addEventListener('input', (event) => renderComboList(event.target.value));

  ui.comboSearch.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      const code = state.filtered[state.activeIndex];
      if (code) selectCurrency(code);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCombo();
      ui.comboTrigger.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!ui.comboPanel.hidden && !ui.combo.contains(event.target)) closeCombo();
  });

  ui.modeGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]');
    if (button) patch({ mode: button.dataset.mode });
  });

  ui.siteToggle.addEventListener('click', () => {
    const enabled = settings.isSiteEnabled(state.settings, state.hostname);
    const siteMode = Object.assign({}, state.settings.siteMode);
    siteMode[state.hostname] = enabled ? 'off' : 'on';
    patch({ siteMode });
  });

  ui.sourceOverride.addEventListener('change', (event) => {
    const siteCurrency = Object.assign({}, state.settings.siteCurrency);
    if (event.target.value === 'auto') delete siteCurrency[state.hostname];
    else siteCurrency[state.hostname] = event.target.value;
    patch({ siteCurrency });
  });

  ui.refreshRates.addEventListener('click', refreshRates);
  ui.noticeAction.addEventListener('click', enableHere);
  ui.openOptions.addEventListener('click', () => {
    ext.runtime.openOptionsPage();
    window.close();
  });

  (async function init() {
    state.settings = await settings.getSettings();
    state.table = await settings.getRates();
    state.available = availableCurrencies(state.table);

    await readTab();
    buildSourceOptions();
    state.status = await readStatus();
    render();

    if (!state.table || rates.isStale(state.table, state.settings.refreshHours)) refreshRates();
  })();
})();
