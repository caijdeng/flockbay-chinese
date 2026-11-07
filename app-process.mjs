import { spawn } from 'node:child_process';

export function startApp(executable, args = [], options = {}) {
  const child = spawn(executable, args, { ...options, stdio: 'ignore', windowsHide: true });
  // Polling keeps the launcher alive while healthy. A failure must not keep
  // Node waiting for the user's app, otherwise the hidden wrapper cannot report it.
  child.unref();
  return child;
}
