import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const base = new URL('../', import.meta.url);
function boot(html) {
  const dom = new JSDOM(html, { url: 'http://tauri.localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const dictPath = new URL('dictionary.json', base);
  const scriptPath = new URL('translator.js', base);
  dom.window.__FLOCKBAY_ZH_DICTIONARY__ = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, 'utf8')) : {};
  if (existsSync(scriptPath)) dom.window.eval(readFileSync(scriptPath, 'utf8'));
  return dom;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 60));

test('translates interface text and attributes without restructuring DOM', () => {
  const dom = boot('<button title="Settings" aria-label="Settings">Settings <svg></svg></button><input placeholder="Type a command">');
  const button = dom.window.document.querySelector('button');
  assert.equal(button.firstChild.nodeValue.trim(), '设置');
  assert.equal(button.getAttribute('title'), '设置');
  assert.equal(button.getAttribute('aria-label'), '设置');
  assert.ok(button.querySelector('svg'));
  assert.equal(dom.window.document.querySelector('input').placeholder, '输入命令');
  dom.window.close();
});

test('protects editable text, code, chat, project names and file paths', () => {
  const dom = boot('<textarea>Settings</textarea><input value="Settings"><div contenteditable="true">Settings</div><pre>Settings</pre><code>Settings</code><div data-message-role="assistant">Settings</div><div data-project-name>Settings</div><div data-file-path>Settings</div>');
  assert.equal(dom.window.document.querySelector('textarea').value, 'Settings');
  assert.equal(dom.window.document.querySelector('input').value, 'Settings');
  for (const el of dom.window.document.querySelectorAll('div,pre,code')) assert.equal(el.textContent, 'Settings');
  assert.ok(dom.window.__flockbayChinese, 'translator must have loaded');
  dom.window.close();
});

test('translates new dialogs and externally updated text and attributes', async () => {
  const dom = boot('<main><button title="Settings">Settings</button></main>');
  const button = dom.window.document.querySelector('button');
  button.firstChild.nodeValue = 'Close';
  button.title = 'Close';
  dom.window.document.querySelector('main').insertAdjacentHTML('beforeend', '<div role="dialog"><h2>General</h2></div>');
  await settle();
  assert.equal(button.textContent, '关闭');
  assert.equal(button.title, '关闭');
  assert.equal(dom.window.document.querySelector('h2').textContent, '常规');
  dom.window.close();
});

test('restores originals and respects application updates when English is selected', async () => {
  const dom = boot('<button title="Settings">Settings</button>');
  const button = dom.window.document.querySelector('button');
  assert.ok(dom.window.__flockbayChinese, 'translator must have loaded');
  dom.window.__flockbayChinese.setEnabled(false);
  assert.equal(button.textContent, 'Settings');
  assert.equal(button.title, 'Settings');
  button.firstChild.nodeValue = 'Close';
  button.title = 'Close';
  await settle();
  dom.window.__flockbayChinese.setEnabled(true);
  assert.equal(button.textContent, '关闭');
  dom.window.__flockbayChinese.setEnabled(false);
  assert.equal(button.textContent, 'Close');
  assert.equal(button.title, 'Close');
  dom.window.close();
});

test('repeat injection does not create duplicate controls', () => {
  const dom = boot('<button>Settings</button>');
  const scriptPath = new URL('translator.js', base);
  if (existsSync(scriptPath)) dom.window.eval(readFileSync(scriptPath, 'utf8'));
  assert.equal(dom.window.document.querySelectorAll('#flockbay-zh-toggle').length, 1);
  dom.window.close();
});

test('protects actual Flockbay message and game-name selectors', () => {
  const dom = boot('<div data-message-key="m1">Settings</div><div data-testid="desktop-local-user-message">Settings</div><span data-testid="ship-game-name">Settings</span><button data-testid="desktop-local-project-name">Settings</button>');
  for (const el of dom.window.document.querySelectorAll('[data-message-key],[data-testid]')) assert.equal(el.textContent, 'Settings');
  dom.window.close();
});

test('loads at document creation before the root or body exists', async () => {
  const script = readFileSync(new URL('translator.js', base), 'utf8');
  const dict = JSON.parse(readFileSync(new URL('dictionary.json', base), 'utf8'));
  const dom = new JSDOM('<html lang="en"><body><button>Settings</button></body></html>', {
    url:'http://tauri.localhost/',runScripts:'outside-only',pretendToBeVisual:true,
    beforeParse(window) { window.__FLOCKBAY_ZH_DICTIONARY__=dict; window.eval(script); }
  });
  await settle();
  assert.equal(dom.window.document.querySelector('button').textContent, '设置');
  assert.equal(dom.window.document.querySelectorAll('#flockbay-zh-toggle').length,1);
  dom.window.__flockbayChinese.setEnabled(false);
  assert.equal(dom.window.document.documentElement.lang,'en');
  dom.window.close();
});

test('translates native select labels without changing submitted values', () => {
  const dom=boot('<select><option value="auto">Auto</option><option value="default">Default</option></select><select id="user"><option>Settings</option></select>');
  const select=dom.window.document.querySelector('select');
  assert.equal(select.selectedOptions[0].textContent,'自动');
  assert.equal(select.value,'auto');
  assert.equal(dom.window.document.querySelector('#user').value,'Settings');
  dom.window.close();
});
