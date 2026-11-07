export function isLocalTarget(target, port) {
  try {
    const page = new URL(target.url);
    const socket = new URL(target.webSocketDebuggerUrl);
    return target.type === 'page' &&
      ['http:', 'https:'].includes(page.protocol) && page.hostname === 'tauri.localhost' &&
      socket.protocol === 'ws:' && socket.hostname === '127.0.0.1' && Number(socket.port) === port &&
      !socket.username && !socket.password && socket.pathname.startsWith('/devtools/page/');
  } catch { return false; }
}

export async function connectCDP(url, timeoutMs = 8000) {
  const address = new URL(url);
  if (address.protocol !== 'ws:' || address.hostname !== '127.0.0.1') throw new Error('Only loopback CDP endpoints are allowed');
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error('CDP connection timed out')); }, timeoutMs);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed')); }, { once: true });
  });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message || 'CDP protocol error'));
    else request.resolve(message.result);
  });
  function rejectPending() {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('CDP connection closed'));
    }
    pending.clear();
  }
  socket.addEventListener('close', rejectPending);
  socket.addEventListener('error', rejectPending);
  return {
    get isOpen() { return socket.readyState === WebSocket.OPEN; },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        if (socket.readyState !== WebSocket.OPEN) { reject(new Error('CDP connection closed')); return; }
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP request timed out: ' + method)); }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try { socket.send(JSON.stringify({ id, method, params })); }
        catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
      });
    },
    close() { rejectPending(); socket.close(); }
  };
}
