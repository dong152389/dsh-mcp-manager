import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';

const source = await readFile(new URL('../impl.js', import.meta.url), 'utf8');

test('manual disconnect cancels a still-starting MCP connection', async () => {
  const apply = Function('return (' + source.trim().slice(0, -1) + ')')();
  const registered = new Map();
  const spawned = [];
  let releaseExecutable;
  const executableReady = new Promise((resolve) => { releaseExecutable = resolve; });

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
        if (command === 'node') return executableReady;
        return command;
      },
      spawn(spec) {
        const stdout = new EventEmitter();
        const stderr = new EventEmitter();
        let terminated = false;
        spawned.push({ spec, get terminated() { return terminated; } });
        return {
          stdin: { on() {}, write() {} },
          stdout,
          stderr,
          done: new Promise(() => {}),
          terminate() { terminated = true; },
        };
      },
    },
    timeout() { return () => {}; },
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
    name: 'disconnect-race',
    transport: 'stdio',
    command: 'node',
    args: ['server.js'],
  });
  assert.equal(add.ok, true);

  const connectPromise = registered.get('mcp_connect').execute({ name: 'disconnect-race' });
  await new Promise((resolve) => setImmediate(resolve));
  const disconnect = await registered.get('mcp_disconnect').execute({ name: 'disconnect-race' });
  assert.equal(disconnect.ok, true);

  releaseExecutable('node');
  const connect = await connectPromise;
  assert.deepEqual(connect, { ok: false, message: '连接已取消' });
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].terminated, true);

  const listed = await registered.get('mcp_list').execute({});
  assert.equal(listed.detail[0].status, 'configured');
});
