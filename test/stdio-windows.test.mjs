import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';

const source = await readFile(new URL('../impl.js', import.meta.url), 'utf8');

test('Windows command shims are launched through cmd.exe while preserving argv', { skip: process.platform !== 'win32' }, async () => {
  const apply = Function('return (' + source.trim().slice(0, -1) + ')')();
  const registered = new Map();
  const spawned = [];
  const resolved = [];

  function respond(stdout, line) {
    const rpc = JSON.parse(line);
    if (rpc.id == null) return;
    const result = rpc.method === 'initialize'
      ? { protocolVersion: '2025-06-18', serverInfo: { name: 'shim-test' } }
      : rpc.method === 'tools/list'
        ? { tools: [] }
        : {};
    queueMicrotask(() => stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }) + '\n'));
  }

  const storage = {
    async open() {
      return {
        table() {
          return { entries: () => [], put: async () => {}, delete: async () => {} };
        },
        close: async () => {},
      };
    },
  };
  const ctx = {
    get(name) {
      if (name === 'sandboxPolicy') return { workspaceRoot: process.cwd() };
      if (name === 'storageDomain') return storage;
      return null;
    },
    subprocess: {
      async resolveExecutable(command) {
        resolved.push(command);
        if (command === 'npx') return 'C:\\node\\npx.cmd';
        return command;
      },
      spawn(spec) {
        spawned.push(spec);
        const stdout = new EventEmitter();
        const stderr = new EventEmitter();
        const stdin = {
          on() {},
          write(line) { respond(stdout, line); },
        };
        return { stdin, stdout, stderr, done: new Promise(() => {}), terminate() {} };
      },
    },
    timeout(callback, delay) {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    },
    interval() { return () => {}; },
    effect(factory) { return factory(); },
    fs: null,
    tools: { register() { return () => {}; } },
  };
  const harness = {
    defineTool(spec) { return spec; },
    registerTool(_ctx, tool) { registered.set(tool.name, tool); return () => {}; },
    handle() {},
  };

  apply(ctx, harness);
  await new Promise((resolve) => setImmediate(resolve));
  const add = await registered.get('mcp_add').execute({
    name: 'npx-shim',
    transport: 'stdio',
    command: 'npx',
    args: ['universal-db-mcp'],
  });
  assert.equal(add.ok, true);

  const connect = await registered.get('mcp_connect').execute({ name: 'npx-shim' });
  assert.equal(connect.ok, true);
  assert.equal(resolved[0], 'npx');
  assert.ok(resolved.some((command) => String(command).toLowerCase().endsWith('cmd.exe')));
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].argv[0].toLowerCase().endsWith('cmd.exe'), true);
  assert.deepEqual(spawned[0].argv.slice(1), ['/d', '/s', '/c', 'C:\\node\\npx.cmd', 'universal-db-mcp']);
});
