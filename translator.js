(() => {
  'use strict';
  if (location.hostname !== 'tauri.localhost') return;
  if (globalThis.__flockbayChinese) return;
  const dictionary = globalThis.__FLOCKBAY_ZH_DICTIONARY__ || {};
  delete globalThis.__FLOCKBAY_ZH_DICTIONARY__;
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const attrNames = ['title', 'aria-label', 'placeholder', 'alt', 'data-placeholder'];
  const protectedSelector = [
    'script', 'style', 'noscript', 'pre', 'code', 'kbd', 'samp',
    '[contenteditable]:not([contenteditable="false"])',
    '[data-message-role]', '[data-message-id]', '[data-chat-message]',
    '[data-message-key]', '[data-testid="desktop-local-user-message"]',
    '[data-testid="desktop-local-markdown"]',
    '[data-testid="ship-game-name"]', '[data-testid="desktop-local-project-name"]',
    '[data-testid="desktop-local-project-card"] .text-fb-row.font-medium',
    '[data-testid="desktop-local-project-line"]',
    '[data-project-name]', '[data-file-path]', '[data-zh-skip]',
    '.prose', '.markdown-body', '.monaco-editor', '.cm-editor',
    '#flockbay-zh-toggle'
  ].join(',');
  const preference = '__flockbay_chinese_enabled_v1';
  let enabled = true;
  try { enabled = localStorage.getItem(preference) !== 'false'; } catch {}
  let originalLang = '';
  let observer;
  let timer;
  const pending = new Set();
  const stats = { translated: 0, passes: 0 };

  function translated(value) {
    const key = value.trim().replace(/\s+/g, ' ');
    const result = Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
    if (typeof result !== 'string' || result === key) return value;
    return value.slice(0, value.length - value.trimStart().length) + result + value.slice(value.trimEnd().length);
  }

  function translateValue(current, record) {
    const source = record && current === record.output ? record.source : current;
    const output = enabled ? translated(source) : source;
    return { source, output };
  }

  function visit(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (!parent || parent.closest(protectedSelector + ',textarea,input,option:not([value])')) return;
      const record = translateValue(root.nodeValue, originals.get(root));
      if (root.nodeValue !== record.output) { root.nodeValue = record.output; stats.translated++; }
      originals.set(root, record);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.closest(protectedSelector)) return;
    let records = attributes.get(root);
    if (!records) { records = {}; attributes.set(root, records); }
    for (const name of attrNames) {
      if (!root.hasAttribute(name)) { delete records[name]; continue; }
      const current = root.getAttribute(name);
      const record = translateValue(current, records[name]);
      if (current !== record.output) { root.setAttribute(name, record.output); stats.translated++; }
      records[name] = record;
    }
    if (root.matches('input,textarea,option:not([value])')) return;
    for (const child of root.childNodes) visit(child);
  }

  function observe() {
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: attrNames
    });
  }

  function flush() {
    timer = undefined;
    // Drain records before disconnecting so another pending UI change cannot be lost.
    for (const record of observer.takeRecords()) pending.add(record.target);
    observer.disconnect();
    try {
      stats.passes++;
      for (const root of pending) visit(root);
      pending.clear();
      document.documentElement.lang = enabled ? 'zh-CN' : originalLang;
    } finally { observe(); }
  }

  function setEnabled(value) {
    enabled = !!value;
    try { localStorage.setItem(preference, String(enabled)); } catch {}
    if (timer !== undefined) clearTimeout(timer);
    pending.add(document.body);
    flush();
    const toggle = document.getElementById('flockbay-zh-toggle');
    if (toggle) {
      toggle.textContent = enabled ? '中文 · EN' : 'EN · 中文';
      toggle.title = enabled ? '切换为英文界面' : '切换为简体中文';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-pressed', String(enabled));
    }
  }

  observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') {
        for (const child of record.addedNodes) pending.add(child);
      } else pending.add(record.target);
    }
    if (pending.size && timer === undefined) timer = setTimeout(flush, 40);
  });
  globalThis.__flockbayChinese = { version: '1.0.0', setEnabled, get enabled() { return enabled; }, stats };

  function mount() {
    if (!document.body) return;
    originalLang = document.documentElement.lang;
    const toggle = document.createElement('button');
    toggle.id = 'flockbay-zh-toggle';
    toggle.type = 'button';
    toggle.style.cssText = 'position:fixed;left:72px;bottom:16px;z-index:2147483000;padding:6px 10px;border:1px solid #78787866;border-radius:7px;background:#242424;color:#eee;font:12px/1.5 "Microsoft YaHei",sans-serif;cursor:pointer;box-shadow:0 2px 8px #0003;-webkit-app-region:no-drag;';
    toggle.addEventListener('click', () => setEnabled(!enabled));
    document.body.appendChild(toggle);
    setEnabled(enabled);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
