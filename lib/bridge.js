// DSH MCP Manager - Node HTTP bridge (child process).
// Reads newline-delimited JSON commands on stdin, writes newline-delimited JSON replies on stdout.
// Commands:
//   {"id":N,"op":"request","method":"POST","url":"...","headers":{...},"body":"...","timeoutMs":30000}
//   {"id":N,"op":"sse","url":"...","headers":{...}}
//   {"id":N,"op":"cancel"}           -> abort the request/stream with that id
// Replies for request:  {"id":N,"ok":true,"status":200,"headers":{...},"body":"...","sse":bool}
//                       {"id":N,"ok":false,"error":"..."}
// Replies for sse:      {"id":N,"ok":true,"status":200,"headers":{...}}        (after response headers)
//                       {"id":N,"ev":"msg","name":"event","d":"data"}          (per dispatched SSE event)
//                       {"id":N,"ev":"end"} / {"id":N,"ev":"err","d":"..."}
import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, terminal: false });
const active = new Map();

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function collectHeaders(res) {
  const h = {};
  res.headers.forEach(function (v, k) { h[String(k).toLowerCase()] = String(v); });
  return h;
}

async function doRequest(cmd) {
  const ctrl = new AbortController();
  active.set(cmd.id, ctrl);
  let timer = null;
  if (cmd.timeoutMs) timer = setTimeout(function () { ctrl.abort(); }, cmd.timeoutMs);
  try {
    const res = await fetch(cmd.url, {
      method: cmd.method || 'GET',
      headers: cmd.headers || {},
      body: cmd.body != null ? cmd.body : undefined,
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const text = await res.text();
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    out({ id: cmd.id, ok: true, status: res.status, headers: collectHeaders(res), body: text, sse: ct.indexOf('text/event-stream') >= 0 });
  } catch (err) {
    out({ id: cmd.id, ok: false, error: String((err && err.message) || err) });
  } finally {
    if (timer) clearTimeout(timer);
    active.delete(cmd.id);
  }
}

async function doSse(cmd) {
  const ctrl = new AbortController();
  active.set(cmd.id, ctrl);
  try {
    const res = await fetch(cmd.url, { method: 'GET', headers: cmd.headers || {}, signal: ctrl.signal, redirect: 'follow' });
    const ct = String(res.headers.get('content-type') || '');
    if (!res.ok) {
      const text = await res.text();
      out({ id: cmd.id, ev: 'err', d: 'HTTP ' + res.status + ': ' + text.slice(0, 200) });
      return;
    }
    if (ct.indexOf('text/event-stream') < 0) {
      const text = await res.text();
      out({ id: cmd.id, ev: 'err', d: 'expected text/event-stream, got ' + ct + ': ' + text.slice(0, 200) });
      return;
    }
    out({ id: cmd.id, ok: true, status: res.status, headers: collectHeaders(res) });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let eventName = 'message';
    let dataLines = [];
    function dispatch() {
      if (dataLines.length === 0) { eventName = 'message'; return; }
      out({ id: cmd.id, ev: 'msg', name: eventName || 'message', d: dataLines.join('\n') });
      eventName = 'message';
      dataLines = [];
    }
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      buf += decoder.decode(r.value, { stream: true });
      for (;;) {
        const idx = buf.indexOf('\n');
        if (idx < 0) break;
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.length && line.charAt(line.length - 1) === '\r') line = line.slice(0, -1);
        if (line === '') { dispatch(); continue; }
        if (line.charAt(0) === ':') continue;
        if (line.indexOf('event:') === 0) { eventName = line.slice(6).trim() || 'message'; continue; }
        if (line.indexOf('data:') === 0) { dataLines.push(line.slice(5).replace(/^ /, '')); continue; }
      }
    }
    dispatch();
    out({ id: cmd.id, ev: 'end' });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    out({ id: cmd.id, ev: aborted ? 'end' : 'err', d: aborted ? undefined : String((err && err.message) || err) });
  } finally {
    active.delete(cmd.id);
  }
}

rl.on('line', function (line) {
  if (!line.trim()) return;
  let cmd = null;
  try { cmd = JSON.parse(line); } catch (e) { return; }
  if (cmd.op === 'cancel') { const c = active.get(cmd.id); if (c) c.abort(); return; }
  if (cmd.op === 'request') { doRequest(cmd); return; }
  if (cmd.op === 'sse') { doSse(cmd); return; }
});
