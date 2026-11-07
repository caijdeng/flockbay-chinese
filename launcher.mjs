import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, appendFile, open, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { isLocalTarget, connectCDP } from './cdp.mjs';
import { startApp } from './app-process.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const lockPath = join(directory, 'launcher.lock');
const statePath = join(directory, 'state.json');
const errorPath = join(directory, 'last-error.txt');
const appPath = join(process.env.LOCALAPPDATA, 'Flockbay', 'flockbay-desktop.exe');
const powershell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const execute = promisify(execFile);
const clients = new Map();
let ownsLock = false;
let app;
let appExited = false;

function isAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function log(message) {
  await appendFile(join(directory, 'launcher.log'), `${new Date().toISOString()} ${message}\n`).catch(() => {});
}

async function acquireLock() {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const file = await open(lockPath, 'wx');
      await file.writeFile(String(process.pid));
      await file.close();
      ownsLock = true;
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(await readFile(lockPath, 'utf8').catch(() => '0'));
      if (isAlive(pid)) {
        // The old app can close before its launcher finishes its polling cycle.
        // Let that launcher release the lock before treating this as a duplicate.
        if (attempt < 19) { await delay(200); continue; }
        throw new Error('Flockbay 中文版已经运行。请切换到已有窗口。');
      }
      if (!pid) {
        const info = await stat(lockPath).catch(() => null);
        if (info && Date.now() - info.mtimeMs < 30000) {
          if (attempt < 19) { await delay(200); continue; }
          throw new Error('中文启动器正在启动，请稍后重试。');
        }
      }
      await unlink(lockPath).catch(() => {});
    }
  }
  throw new Error('另一个中文启动器正在启动，请稍后重试。');
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function main() {
  if (!existsSync(appPath)) throw new Error('找不到 Flockbay：' + appPath);
  await acquireLock();
  const { stdout } = await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command',
    "@(Get-Process -Name 'flockbay-desktop' -ErrorAction SilentlyContinue).Count"], { windowsHide: true });
  if (Number(stdout.trim()) > 0) throw new Error('Flockbay 正在运行。请先正常关闭 Flockbay 窗口，再双击“Flockbay 中文版”。\n启动器不会强制结束或重启你的项目。');
  const port = await freePort();
  const dictionary = JSON.parse(await readFile(join(directory, 'dictionary.json'), 'utf8'));
  const translator = await readFile(join(directory, 'translator.js'), 'utf8');
  // Check the origin inside every future document as well as in the target allowlist.
  const source = `if (location.hostname === 'tauri.localhost' && ['http:', 'https:'].includes(location.protocol)) { globalThis.__FLOCKBAY_ZH_DICTIONARY__ = ${JSON.stringify(dictionary)};\n${translator}\n}`;
  const inherited = process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS || '';
  const args = inherited.replace(/--remote-debugging-(?:port|address)=\S+/g, '').trim();
  app = startApp(appPath, [], {
    cwd: dirname(appPath), stdio: 'ignore', windowsHide: true,
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `${args} --remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}`.trim() }
  });
  app.once('exit', () => { appExited = true; });
  let spawnError;
  app.once('error', error => { spawnError = error; appExited = true; });
  const state = { launcherPid: process.pid, appPid: app.pid, port, startedAt: new Date().toISOString(), translatedTargets: 0 };
  await writeFile(statePath, JSON.stringify(state, null, 2));
  await log('Started Flockbay; waiting for local WebView2.');
  const deadline = Date.now() + 60000;
  let activated = false;
  while (!appExited) {
    let targets = [];
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1800), redirect: 'error' });
      if (response.ok) targets = await response.json();
      if (!Array.isArray(targets)) targets = [];
    } catch {}
    const valid = targets.filter(target => isLocalTarget(target, port));
    const liveIds = new Set(valid.map(target => target.id));
    for (const [id, client] of clients) {
      if (!liveIds.has(id) || !client.isOpen) { client.close(); clients.delete(id); }
    }
    for (const target of valid) {
      if (clients.has(target.id)) continue;
      try {
        const client = await connectCDP(target.webSocketDebuggerUrl);
        clients.set(target.id, client);
        await client.send('Page.enable');
        await client.send('Page.addScriptToEvaluateOnNewDocument', { source });
        const result = await client.send('Runtime.evaluate', { expression: source, returnByValue: true });
        if (result.exceptionDetails) throw new Error('汉化脚本执行失败：' + (result.exceptionDetails.text || 'unknown'));
        activated = true;
        state.translatedTargets++;
        await writeFile(statePath, JSON.stringify(state, null, 2));
        await log('Chinese translator attached to a local Flockbay page.');
      } catch (error) {
        clients.get(target.id)?.close();
        clients.delete(target.id);
        await log('Attach retry: ' + error.message);
      }
    }
    if (!activated && Date.now() > deadline) throw new Error('未能连接 Flockbay 界面。原程序仍可使用；请关闭后重试。详情见 launcher.log。');
    await delay(1200);
  }
  if (spawnError) throw spawnError;
  if (!activated) throw new Error('Flockbay 在汉化加载前退出。请重新双击中文入口；如果仍失败，请查看 launcher.log。');
  await log('Flockbay closed normally.');
}

try { await main(); }
catch (error) {
  await writeFile(errorPath, error.message, 'utf8').catch(() => {});
  await log('Error: ' + error.message);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const client of clients.values()) client.close();
  if (ownsLock) {
    await unlink(lockPath).catch(() => {});
    await unlink(statePath).catch(() => {});
  }
}
