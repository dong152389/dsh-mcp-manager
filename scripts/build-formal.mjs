// 临时构建脚本：把动态插件的 impl.js 转换为正式 ESM 插件 lib/index.js
// 用法：node build-formal.mjs   （生成后删除本脚本）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'impl.js'), 'utf8');

let out = src;

// 1. 函数签名 → export function apply(ctx)
out = out.replace(/^\(ctx, harness\) => \{/, 'export function apply(ctx) {');

// 2. 绝对路径 → 包内 bridge.js（import.meta.url 定位）
out = out.replace(
  /const BRIDGE_PATH = 'C:\\\\Users\\\\dong5\\\\dsh-mcp-manager\\\\bridge\.js';/,
  "const BRIDGE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'bridge.js');"
);

// 3. harness.defineTool → defineTool
out = out.split('harness.defineTool(').join('defineTool(');

// 4. harness.registerTool(ctx, tool) → ctx.tools.register(tool)
out = out.split('harness.registerTool(ctx, tool)').join('ctx.tools.register(tool)');

// 5. 删除 Client RPC 块（harness.handle ... 到 生命周期清理 注释之前）
const rpcStart = out.indexOf('  // ================= Client RPC');
const cleanup = '  // ================= 生命周期清理 =================';
const cleanupIdx = out.indexOf(cleanup, rpcStart);
if (rpcStart < 0 || cleanupIdx < 0) throw new Error('RPC 块标记未找到');
out = out.slice(0, rpcStart) + out.slice(cleanupIdx);

// 6. loadSpec 里 ctx.get('fs') → ctx.fs（正式插件已 inject fs）
out = out.split("const fs = ctx.get('fs');").join('const fs = ctx.fs;');

// 7. workspaceRoot fallback：正式插件可用 process.cwd()
out = out.replace(
  "const workspaceRoot = (sp && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : null;",
  "const workspaceRoot = (sp && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : process.cwd();"
);

// 8. 文件尾部：补 export name/inject
out = out.replace(/\n\}$/, '\n}\n');

// 9. 顶部加 import
const header = `import { defineTool } from '@deepseek-ai/dsh-tools';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

`;
out = header + out;

// 10. 追加插件元信息导出
out += `
export const name = 'dsh-mcp-manager';
export const inject = ['timer', 'subprocess', 'fs'];
`;

mkdirSync(join(root, 'lib'), { recursive: true });
writeFileSync(join(root, 'lib', 'index.js'), out, 'utf8');
console.log('lib/index.js 已生成，长度', out.length);
