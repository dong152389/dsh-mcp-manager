import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';

const source = await readFile(new URL('../impl.js', import.meta.url), 'utf8');

test('HTTP heartbeat timeout is recoverable and starts a fresh MCP session', { timeout: 3000 }, async () => {
  const apply = Function('return (' + source.trim().slice(0, -1) + ')')();
  const timers = [];
  const intervals = [];
  const registered = new Map();
  const initializeHeaders = [];
  let pingFails = true;

  function timeout(callback, delay) {
    const item = { callback, delay, cancelled: false };
    timers.push(item);
    return () => { item.cancelled = true; };
  }

  function respond(stdout, command) {
    if (command.op !== 'request') return;
    const rpc = command.body ? JSON.parse(command.body) : null;
    if (rpc && rpc.method === 'initialize') initializeHeaders.push(command.headers);
    if (rpc && rpc.method === 'ping' && pingFails) return;
    let result = null;
    if (rpc && rpc.method === 'initialize') {
      result = { protocolVersion: '2025-06-18', serverInfo: { name: 'fake-hub' } };
    } else if (rpc && rpc.method === 'tools/list') {
      result = { tools: [{ name: 'hello', inputSchema: { type: 'object', properties: {} } }] };
    }
    const body = rpc && rpc.id != null
      ? JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result })
      : '';
    queueMicrotask(() => stdout.emit('data', JSON.stringify({
      id: command.id,
      ok: true,
      status: 200,
      headers: { 'mcp-session-id': 'sid-' + initializeHeaders.length },
      body,
      sse: false,
    }) + '\n'));
  }

  const tools = {
    register(tool) { registered.set(tool.name, tool); return () => {}; },
  };
  const ctx = {
    get(name) {
      if (name === 'sandboxPolicy') return { workspaceRoot: process.cwd() };
      if (name === 'storageDomain') return {
        open: async () => ({
          table: () => ({ entries: () => [], put: async () => {}, delete: async () => {} }),
          close: async () => {},
        }),
      };
      return null;
    },
    subprocess: {
      resolveExecutable: async () => 'node',
      spawn() {
        const stdout = new EventEmitter();
        const stderr = new EventEmitter();
        const stdin = { on() {}, write(line) { respond(stdout, JSON.parse(line)); } };
        return { stdin, stdout, stderr, done: new Promise(() => {}), terminate() {} };
      },
    },
    timeout,
    interval(callback, delay) {
      const item = { callback, delay, cancelled: false };
      intervals.push(item);
      return () => { item.cancelled = true; };
    },
    effect(factory) { return factory(); },
    fs: null,
    tools,
  };
  const harness = {
    defineTool(spec) { return spec; },
    registerTool(_ctx, tool) { registered.set(tool.name, tool); return () => {}; },
    handle() {},
  };

  apply(ctx, harness);
  await new Promise((resolve) => setImmediate(resolve));
  await registered.get('mcp_add').execute({ name: 'hub', transport: 'http', url: 'http://127.0.0.1:9999/mcp' });
  assert.equal((await registered.get('mcp_connect').execute({ name: 'hub' })).ok, true);

  intervals.at(-1).callback();
  const pingTimeout = timers.find((item) => item.delay === 30000 && !item.cancelled);
  assert.ok(pingTimeout, 'ping timeout should be scheduled');
  pingTimeout.callback();
  await new Promise((resolve) => setImmediate(resolve));

  const reconnect = timers.find((item) => item.delay === 1500 && !item.cancelled);
  assert.ok(reconnect, 'heartbeat failure should schedule reconnect');
  pingFails = false;
  reconnect.callback();
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));

  const result = await registered.get('mcp_list').execute({});
  const server = result.detail.find((item) => item.name === 'hub');
  assert.equal(server.status, 'connected');
  assert.equal(server.toolCount, 1);
  assert.equal(server.stale, false);
  assert.equal(initializeHeaders.length, 2);
  assert.equal(initializeHeaders[1]['mcp-session-id'], undefined);
});

