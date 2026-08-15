;(function () {
  'use strict';

  const ext = globalThis.browser || globalThis.chrome;
  const { currencies, detect, format, settings, rates, pageContext } = globalThis.Kawase;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'SVG', 'MATH', 'CANVAS', 'IFRAME',
    'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'TEMPLATE', 'HEAD', 'TITLE'
  ]);

  const MAX_CONVERSIONS = 6000;
  const CHUNK_SIZE = 240;
  const MUTATION_DEBOUNCE = 250;

  const state = {
    settings: null,
    table: null,
    pageCurrency: null,
    pageCurrencySource: 'none',
    forced: null,
    hostname: location.hostname,
    active: false,
    converted: [],
    scanning: false,
    queue: []
  };

  const createdNodes = new WeakSet();

  let tooltipHost = null;
  let tooltipBody = null;

  function ensureTooltip() {
    if (tooltipHost && tooltipHost.isConnected) return;

    tooltipHost = document.createElement('kawase-tooltip');
    tooltipHost.setAttribute('data-kawase-ui', '1');
    const shadow = tooltipHost.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; position: fixed; z-index: 2147483647; pointer-events: none;',
      '  top: 0; left: 0; opacity: 0; transition: opacity 90ms ease-out; }',
      ':host([data-visible="1"]) { opacity: 1; }',
      '.tip { font: 12px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;',
      '  background: #14171c; color: #e8ebef; border: 1px solid #2a3038; border-radius: 8px;',
      '  padding: 8px 10px; box-shadow: 0 8px 24px rgba(0,0,0,.35); white-space: pre;',
      '  max-width: 320px; letter-spacing: .01em; }',
      '.tip b { color: #4ecfa4; font-weight: 600; }'
    ].join('\n');
    tooltipBody = document.createElement('div');
    tooltipBody.className = 'tip';
    shadow.append(style, tooltipBody);
    (document.body || document.documentElement).appendChild(tooltipHost);
  }

  function showTooltip(target) {
    const text = target.getAttribute('data-kawase-tip');
    if (!text) return;
    ensureTooltip();
    tooltipBody.textContent = text;
    const rect = target.getBoundingClientRect();
    const width = tooltipHost.offsetWidth || 220;
    const height = tooltipHost.offsetHeight || 60;
    let left = rect.left;
    let top = rect.top - height - 8;
    if (top < 4) top = rect.bottom + 8;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    tooltipHost.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
    tooltipHost.setAttribute('data-visible', '1');
  }

  function hideTooltip() {
    if (tooltipHost) tooltipHost.removeAttribute('data-visible');
  }

  document.addEventListener('mouseover', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-kawase]') : null;
    if (target) showTooltip(target);
  }, true);

  document.addEventListener('mouseout', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-kawase]')) hideTooltip();
  }, true);

  window.addEventListener('scroll', hideTooltip, { passive: true, capture: true });

  function shouldSkipElement(element) {
    if (!element) return true;
    if (SKIP_TAGS.has(element.tagName)) return true;
    if (element.isContentEditable) return true;
    if (element.hasAttribute('data-kawase') || element.hasAttribute('data-kawase-ui')) return true;
    return false;
  }

  function isInsideSkipped(node) {
    let element = node.parentElement;
    while (element) {
      if (shouldSkipElement(element)) return true;
      element = element.parentElement;
    }
    return false;
  }

  function collectTextNodes(rootNode) {
    const nodes = [];
    if (!rootNode) return nodes;

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (createdNodes.has(node)) return NodeFilter.FILTER_REJECT;
        const text = node.nodeValue;
        if (!text || text.length < 2 || !detect.hasDigit(text)) return NodeFilter.FILTER_REJECT;
        if (isInsideSkipped(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  }

  function buildReplacement(match, converted, rate) {
    const span = document.createElement('span');
    span.setAttribute('data-kawase', '1');
    span.setAttribute('data-kawase-original', match.text);
    span.className = 'kawase-price kawase-highlight-' + state.settings.highlight;

    const tip = format.tooltipText(match, converted, rate, {
      target: state.settings.target,
      fetchedAt: state.table.fetchedAt,
      source: state.table.source,
      now: Date.now()
    });
    span.setAttribute('data-kawase-tip', tip);
    span.setAttribute('aria-label', match.text + ' converted to ' + converted);

    const mode = state.settings.mode;
    if (mode === 'hover') {
      span.textContent = match.text;
    } else if (mode === 'append') {
      span.textContent = match.text;
      const extra = document.createElement('span');
      extra.className = 'kawase-appended';
      extra.textContent = ' (' + converted + ')';
      span.appendChild(extra);
    } else {
      span.textContent = converted;
    }

    for (const child of span.childNodes) createdNodes.add(child);
    return span;
  }

  function convertMatch(match) {
    if (!state.table) return null;
    const target = state.settings.target;
    if (match.code === target && !state.settings.convertMatchingCurrency) return null;

    const value = rates.convert(match.value, match.code, target, state.table);
    if (value === null) return null;

    const rate = rates.rateBetween(state.table, match.code, target);
    const converted = format.formatMoney(value, target, {
      locale: state.settings.locale,
      precision: state.settings.precision,
      approx: state.settings.approx && state.settings.mode !== 'append',
      compactLarge: state.settings.compactLarge
    });
    return { converted, rate };
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    const matches = detect.findMatches(text, {
      pageCurrency: state.settings.autoDetectPageCurrency ? state.pageCurrency : null,
      forced: state.forced,
      symbolDefaults: state.settings.symbolDefaults
    });
    if (matches.length === 0) return 0;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let applied = 0;

    for (const match of matches) {
      if (state.converted.length + applied >= MAX_CONVERSIONS) break;
      const result = convertMatch(match);
      if (!result) continue;

      if (match.start > cursor) {
        const before = document.createTextNode(text.slice(cursor, match.start));
        createdNodes.add(before);
        fragment.appendChild(before);
      }
      const span = buildReplacement(match, result.converted, result.rate);
      fragment.appendChild(span);
      state.converted.push(span);
      cursor = match.end;
      applied += 1;
    }

    if (applied === 0) return 0;

    if (cursor < text.length) {
      const after = document.createTextNode(text.slice(cursor));
      createdNodes.add(after);
      fragment.appendChild(after);
    }

    const parent = node.parentNode;
    if (!parent) return 0;
    parent.replaceChild(fragment, node);
    return applied;
  }

  function idle(callback) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, { timeout: 500 });
    else setTimeout(callback, 16);
  }

  function drainQueue() {
    if (state.scanning) return;
    state.scanning = true;

    const step = () => {
      if (!state.active || state.queue.length === 0) {
        state.scanning = false;
        return;
      }
      const slice = state.queue.splice(0, CHUNK_SIZE);
      for (const node of slice) {
        if (!node.isConnected) continue;
        try {
          processTextNode(node);
        } catch (error) {
          // Skip problematic node and continue
        }
      }
      if (state.queue.length > 0 && state.converted.length < MAX_CONVERSIONS) idle(step);
      else state.scanning = false;
    };

    idle(step);
  }

  function scan(rootNode) {
    if (!state.active || !state.table) return;
    const nodes = collectTextNodes(rootNode || document.body);
    if (nodes.length === 0) return;
    state.queue.push(...nodes);
    drainQueue();
  }

  function revertAll() {
    hideTooltip();
    for (const span of state.converted) {
      if (!span.isConnected) continue;
      const parent = span.parentNode;
      if (!parent) continue;
      const original = document.createTextNode(span.getAttribute('data-kawase-original') || span.textContent);
      parent.replaceChild(original, span);
      parent.normalize();
    }
    state.converted = [];
    state.queue = [];
  }

  let mutationTimer = null;
  let pendingRoots = new Set();

  const observer = new MutationObserver((records) => {
    if (!state.active) return;

    for (const record of records) {
      if (record.type === 'characterData') {
        const node = record.target;
        if (node && !createdNodes.has(node) && !isInsideSkipped(node)) pendingRoots.add(node.parentElement || node);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!createdNodes.has(node)) pendingRoots.add(node.parentElement || node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (!shouldSkipElement(node)) pendingRoots.add(node);
        }
      }
    }

    if (pendingRoots.size === 0) return;
    if (mutationTimer) clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      const roots = Array.from(pendingRoots);
      pendingRoots = new Set();
      for (const node of roots) {
        if (node && node.isConnected) scan(node);
      }
    }, MUTATION_DEBOUNCE);
  });

  function startObserver() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function loadState() {
    state.settings = await settings.getSettings();
    state.forced = settings.forcedCurrencyFor(state.settings, state.hostname);

    const detected = pageContext.detectPageCurrency(location, document.documentElement);
    state.pageCurrency = state.forced || detected.code;
    state.pageCurrencySource = state.forced ? 'site override' : detected.source;

    state.table = await settings.getRates();
    if (!state.table || rates.isStale(state.table, state.settings.refreshHours)) {
      try {
        const response = await ext.runtime.sendMessage({ type: 'kawase:rates' });
        if (response && response.ok && response.table) state.table = response.table;
      } catch (error) {
        // Cached table fallback
      }
    }
  }

  async function apply(rescan) {
    await loadState();
    const enabled = settings.isSiteEnabled(state.settings, state.hostname);

    if (!enabled || !state.table) {
      state.active = false;
      revertAll();
      return;
    }

    state.active = true;
    if (rescan) revertAll();
    scan(document.body);
  }

  ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') apply(true);
    if (area === 'local' && changes.rates) apply(true);
  });

  ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return false;

    if (message.type === 'kawase:status') {
      sendResponse({
        ok: true,
        hostname: state.hostname,
        active: state.active,
        count: state.converted.filter((span) => span.isConnected).length,
        pageCurrency: state.pageCurrency,
        pageCurrencySource: state.pageCurrencySource
      });
      return false;
    }

    if (message.type === 'kawase:rescan') {
      apply(true).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
      return true;
    }

    return false;
  });

  function boot() {
    apply(false).then(startObserver).catch(() => {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
