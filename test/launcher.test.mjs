import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const path = new URL('../cdp.mjs', import.meta.url);
const cdp = existsSync(path) ? await import(path) : {};

test('failed launcher can exit while its spawned app remains running', async () => {
  const modulePath = new URL('../app-process.mjs',import.meta.url);
  assert.ok(existsSync(modulePath),'app process lifecycle helper missing');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { mkdtemp,readFile,rm }=await import('node:fs/promises');
  const { tmpdir }=await import('node:os');
  const { join }=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'flockbay-lifecycle-'));
  const pidFile=join(dir,'child.pid');
  // A console fixture needs its own console group on Windows to model a GUI app.
  const code=`import {startApp} from ${JSON.stringify(modulePath.href)};import {writeFileSync} from 'node:fs';const child=startApp(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true});writeFileSync(${JSON.stringify(pidFile)},String(child.pid));process.exitCode=1;`;
  let childPid;
  try {
    await assert.rejects(promisify(execFile)(process.execPath,['--input-type=module','-e',code],{timeout:3000}),error=>error.code===1 && !error.killed);
    childPid=Number(await readFile(pidFile,'utf8'));
    assert.doesNotThrow(()=>process.kill(childPid,0));
  } finally {
    if(!childPid) childPid=Number(await readFile(pidFile,'utf8').catch(()=>0));
    if(childPid) {try {process.kill(childPid);}catch{}}
    assert.ok(dir.startsWith(join(tmpdir(),'flockbay-lifecycle-')));
    await rm(dir,{recursive:true,force:true});
  }
});

test('only local Flockbay documents with local debugger URLs can receive the plugin', () => {
  assert.equal(typeof cdp.isLocalTarget, 'function', 'target guard missing');
  const valid = { type: 'page', url: 'http://tauri.localhost/', webSocketDebuggerUrl: 'ws://127.0.0.1:45678/devtools/page/abc' };
  assert.equal(cdp.isLocalTarget(valid, 45678), true);
  for (const change of [
    { url: 'https://accounts.openai.com/' },
    { url: 'http://tauri.localhost.evil.test/' },
    { url: 'javascript:alert(1)' },
    { type: 'service_worker' },
    { webSocketDebuggerUrl: 'ws://example.com:45678/devtools/page/abc' },
    { webSocketDebuggerUrl: 'ws://127.0.0.1:9999/devtools/page/abc' },
    { webSocketDebuggerUrl: 'bad url' }
  ]) assert.equal(cdp.isLocalTarget({ ...valid, ...change }, 45678), false);
});

test('CDP transport correlates real requests, rejects protocol errors and pending requests on close', async () => {
  assert.equal(typeof cdp.connectCDP, 'function', 'CDP transport missing');
  const { createServer } = await import('node:http');
  const { createHash } = await import('node:crypto');
  const server = createServer();
  server.on('upgrade', (request, socket) => {
    const accept = createHash('sha1').update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.on('data', buffer => {
      if (socket.writableEnded) return;
      if ((buffer[0] & 15) === 8) { socket.end(Buffer.from([0x88, 0])); return; }
      const length = buffer[1] & 127;
      const mask = buffer.subarray(2, 6);
      const data = buffer.subarray(6, 6 + length);
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
      const message = JSON.parse(data.toString());
      const response = message.method === 'Bad' ? { id: message.id, error: { message: 'Denied by test endpoint' } } : { id: message.id, result: { echoed: message.params.value } };
      if (message.method === 'Hang') { socket.end(Buffer.from([0x88, 0])); return; }
      const output = Buffer.from(JSON.stringify(response));
      socket.write(Buffer.concat([Buffer.from([0x81, output.length]), output]));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let client;
  try {
    client = await cdp.connectCDP('ws://127.0.0.1:' + server.address().port + '/devtools/page/test');
    assert.deepEqual(await client.send('Echo', { value: 42 }), { echoed: 42 });
    await assert.rejects(client.send('Bad'), /Denied by test endpoint/);
    await assert.rejects(client.send('Hang'), /closed/i);
  } finally {
    client?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
