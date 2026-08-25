// 构建脚本：把动态插件的 impl.js 转换为正式 ESM 插件 lib/index.js
// 用法：node scripts/build-formal.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(root);
const src = readFileSync(join(repoRoot, 'impl.js'), 'utf8');

let out = src;

// 1. 函数签名 → export function apply(ctx)（用 m 标志匹配行首，文件开头是注释）
const sig = out.match(/^\(ctx, harness\) => \{/m);
if (!sig) throw new Error('impl.js 签名未找到');
out = out.slice(0, sig.index) + 'export function apply(ctx) {' + out.slice(sig.index + sig[0].length);

// 2. 绝对路径 → 包内 bridge.js（import.meta.url 定位）
out = out.replace(
  /const BRIDGE_PATH = 'C:\\\\Users\\\\dong5\\\\dsh-mcp-manager\\\\lib\\\\bridge\.js';/,
  "const BRIDGE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'bridge.js');"
);

// 3. harness.defineTool → defineTool
out = out.split('harness.defineTool(').join('defineTool(');

// 4. harness.registerTool(ctx, tool) → ctx.tools.register(tool)
out = out.split('harness.registerTool(ctx, tool)').join('ctx.tools.register(tool)');

// 5. 删除 Client RPC 块（harness.handle ...），原位插入 Remote 服务（设置面板通信）
const rpcStart = out.indexOf('  // ================= Client RPC');
const cleanup = '  // ================= 生命周期清理 =================';
const cleanupIdx = out.indexOf(cleanup, rpcStart);
if (rpcStart < 0 || cleanupIdx < 0) throw new Error('RPC 块标记未找到');
const remoteBlock = `  // ================= Remote 服务（client 面板通信） =================
  class McpManagerService extends TypertRemoteService {
    constructor() {
      super(ctx, 'mcpManager');
      markRemoteMethods(this);
    }
    async list() {
      return { servers: listServers() };
    }
    async save(payload) {
      return addServer((payload && typeof payload === 'object') ? payload : {});
    }
    async update(serverName, payload) {
      return updateServer(typeof serverName === 'string' ? serverName : '', (payload && typeof payload === 'object') ? payload : {});
    }
    async connect(serverName) {
      return connectServer(typeof serverName === 'string' ? serverName : '');
    }
    async disconnect(serverName) {
      return disconnectServer(typeof serverName === 'string' ? serverName : '');
    }
    async remove(serverName) {
      return removeServer(typeof serverName === 'string' ? serverName : '');
    }
    async refresh(serverName) {
      return refreshServer(typeof serverName === 'string' ? serverName : '');
    }
  }
  new McpManagerService();

  // 严格模式注册：不依赖模块级 markers（SRC 模式要求与网关共享同一份
  // dsh-typert-protocol 模块实例，第三方插件无法保证），直接向 typert
  // 注册完整描述符；网关的 resolveDescriptor 优先使用严格定义。
  const typert = ctx.typert;
  if (typert && typeof typert.register === 'function') {
    try {
      const wire = (name) => ({ name, wire: name, source: 'json', codec: { mode: 'src-json' } });
      typert.register({
        package: 'dsh-mcp-manager',
        face: 'host',
        model: {},
        schemas: [],
        invocations: [
          { id: 'dsh-mcp-manager#mcpManager/list', service: 'mcpManager', namespace: 'mcpManager', method: 'list', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/save', service: 'mcpManager', namespace: 'mcpManager', method: 'save', invocation: { kind: 'direct' }, parameters: [wire('payload')], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/update', service: 'mcpManager', namespace: 'mcpManager', method: 'update', invocation: { kind: 'direct' }, parameters: [wire('serverName'), wire('payload')], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/connect', service: 'mcpManager', namespace: 'mcpManager', method: 'connect', invocation: { kind: 'direct' }, parameters: [wire('serverName')], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/disconnect', service: 'mcpManager', namespace: 'mcpManager', method: 'disconnect', invocation: { kind: 'direct' }, parameters: [wire('serverName')], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/remove', service: 'mcpManager', namespace: 'mcpManager', method: 'remove', invocation: { kind: 'direct' }, parameters: [wire('serverName')], result: { mode: 'src-json' } },
          { id: 'dsh-mcp-manager#mcpManager/refresh', service: 'mcpManager', namespace: 'mcpManager', method: 'refresh', invocation: { kind: 'direct' }, parameters: [wire('serverName')], result: { mode: 'src-json' } },
        ],
      });
      console.log('[mcp] Remote 服务已严格注册到 typert 网关');
    } catch (err) {
      console.log('[mcp] Remote 严格注册失败（回退 SRC 模式）:', String((err && err.message) || err));
    }
  }

`;
out = out.slice(0, rpcStart) + remoteBlock + out.slice(cleanupIdx);

// 6. loadSpec 里 ctx.get('fs') → ctx.fs（正式插件已 inject fs）
out = out.split("const fs = ctx.get('fs');").join('const fs = ctx.fs;');

// 7. workspaceRoot 兜底：正式插件可用 process.cwd()
out = out.replace(
  "const workspaceRoot = (sp && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : null;",
  "const workspaceRoot = (sp && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : process.cwd();"
);

// 8. 顶部加 import
const header = `import { defineTool } from '@deepseek-ai/dsh-tools';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

`;
out = header + out;

// 9. 追加 Remote 装饰器模拟 + 插件元信息导出
const tail = `
// 纯 JS 模拟 @Remote('name') 装饰器：构造 decorator context，把标记写入服务原型。
function markRemoteMethods(service) {
  const methods = ['list', 'save', 'update', 'connect', 'disconnect', 'remove', 'refresh'];
  for (const method of methods) {
    const initializers = [];
    const fakeContext = {
      name: method,
      static: false,
      private: false,
      addInitializer(fn) { initializers.push(fn); },
    };
    Remote(method)(undefined, fakeContext);
    for (const fn of initializers) fn.call(service);
  }
}

export const name = 'dsh-mcp-manager';
export const inject = ['timer', 'subprocess', 'fs', 'tools', 'typert', 'storageDomain'];
`;
out += tail;

mkdirSync(join(repoRoot, 'lib'), { recursive: true });
writeFileSync(join(repoRoot, 'lib', 'index.js'), out, 'utf8');
console.log('lib/index.js 已生成，长度', out.length);
