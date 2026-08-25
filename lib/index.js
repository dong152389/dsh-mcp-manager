import { defineTool } from '@deepseek-ai/dsh-tools';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// DSH MCP Manager - Host implementation.
// Loaded by the plugin loader (code.host) via fs.readText + eval. Signature: (ctx, harness) => void
export function apply(ctx) {
  const subprocess = ctx.subprocess;
  const sp = ctx.get('sandboxPolicy');
  const workspaceRoot = (sp && typeof sp.workspaceRoot === 'string') ? sp.workspaceRoot : process.cwd();
  const BRIDGE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'bridge.js');

  // MCP 配置属于非会话数据，使用 DSH 的 storage-domain + JSON backend 持久化。
  // 动态插件环境不能直接 import zod，因此这里提供一个透传 schema；实际的
  // 记录结构会在恢复时由 restoreServerRecord 做校验。
  const MCP_STORAGE_SPEC = {
    name: 'dsh_mcp_manager',
    version: 1,
    tables: {
      servers: {
        parse(value) { return value; },
        safeParse(value) { return { success: true, data: value }; },
      },
    },
  };

  // ================= 基础工具函数 =================
  function sanitizeName(s) {
    const v = String(s || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    return v.slice(0, 36);
  }
  function pickStrings(obj) {
    const out = {};
    for (const k of Object.keys(obj)) if (typeof obj[k] === 'string') out[k] = obj[k];
    return out;
  }
  function appendQuery(url, q) {
    return url + (url.includes('?') ? '&' : '?') + q;
  }
  function extractQuery(url, name) {
    const m = url.match(new RegExp('[?&]' + name + '=([^&#]+)'));
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  }
  function resolveUrl(base, ref) {
    if (!ref) return base;
    if (/^https?:\/\//i.test(ref)) return ref;
    if (ref.startsWith('//')) {
      const m = base.match(/^https?:\/\//i);
      return (m ? m[0] : 'https:') + ref;
    }
    if (ref.startsWith('/')) {
      const m = base.match(/^(https?:\/\/[^/]+)/i);
      return (m ? m[1] : '') + ref;
    }
    const idx = base.lastIndexOf('/');
    const proto = base.indexOf('://');
    const cut = idx > proto + 2 ? base.slice(0, idx + 1) : base + '/';
    return cut + ref;
  }
  function formatRpcError(err) {
    if (!err || typeof err !== 'object') return String(err);
    const code = err.code !== undefined ? '[code ' + err.code + ']' : '';
    const message = typeof err.message === 'string' ? err.message : '未知错误';
    let s = ('MCP 错误 ' + code + ' ' + message).trim();
    if (err.data !== undefined) { try { s += '\n' + JSON.stringify(err.data).slice(0, 500); } catch {} }
    return s;
  }
  function renderMcpContent(content) {
    if (!Array.isArray(content)) return content === undefined ? '' : JSON.stringify(content);
    const parts = [];
    for (const b of content) {
      if (!b || typeof b !== 'object') continue;
      if (typeof b.text === 'string') parts.push(b.text);
      else if (b.type === 'image' || b.type === 'audio') parts.push('[' + b.type + ']');
      else if (b.type === 'resource' && b.resource) parts.push(JSON.stringify(b.resource));
      else { try { parts.push(JSON.stringify(b)); } catch {} }
    }
    return parts.join('\n');
  }
  function renderMcpResult(value) {
    if (!value) return '（无结果）';
    let text = typeof value.text === 'string' && value.text ? value.text : '';
    if (!text && value.structured !== undefined && value.structured !== null) {
      try { text = JSON.stringify(value.structured, null, 2); } catch {}
    }
    if (!text) text = '（服务器返回空结果）';
    if (value.isError) text = '[MCP 工具返回错误]\n' + text;
    return text;
  }
  function renderResult(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    let s = '';
    if (typeof value.message === 'string') s = value.message;
    if (value.detail !== undefined) { try { s += '\n' + JSON.stringify(value.detail, null, 2); } catch {} }
    if (!s) { try { s = JSON.stringify(value, null, 2); } catch {} }
    return s;
  }
  function buildHeaders(cfg, cookies) {
    const h = {};
    if (cfg.headers && typeof cfg.headers === 'object') {
      for (const k of Object.keys(cfg.headers)) {
        const v = cfg.headers[k];
        if (typeof v === 'string') h[k] = v;
      }
    }
    if (cfg.token) h.authorization = 'Bearer ' + cfg.token;
    if (cookies && typeof cookies === 'object') {
      const names = Object.keys(cookies);
      if (names.length) {
        const parts = [];
        for (const k of names) parts.push(k + '=' + cookies[k]);
        h.cookie = parts.join('; ');
      }
    }
    return h;
  }
  function parseSetCookie(headerValue) {
    const out = {};
    if (!headerValue) return out;
    const parts = String(headerValue).split(/,(?=\s*[A-Za-z_][A-Za-z0-9_]*=)/);
    for (const part of parts) {
      const seg = part.split(';')[0].trim();
      const eq = seg.indexOf('=');
      if (eq <= 0) continue;
      const k = seg.slice(0, eq).trim();
      const v = seg.slice(eq + 1).trim();
      if (!k) continue;
      if (v === '' || v.toLowerCase() === 'deleted') delete out[k];
      else out[k] = v;
    }
    return out;
  }
  function applyCookies(jar, headerValue) {
    if (!headerValue) return;
    const parsed = parseSetCookie(headerValue);
    for (const k of Object.keys(parsed)) jar[k] = parsed[k];
  }

  // ================= 简易 YAML 解析器（OpenAPI 常见子集） =================
  function stripYamlComment(s) {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === q) {
          if (q === "'" && s[i + 1] === "'") { i++; continue; }
          q = null;
        }
        continue;
      }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '#' && (i === 0 || s[i - 1] === ' ' || s[i - 1] === '\t')) return s.slice(0, i);
    }
    return s;
  }
  function parseYamlScalar(v0) {
    const v = String(v0).trim();
    if (v === '' || v === '~' || v === 'null' || v === 'Null' || v === 'NULL') return null;
    if (v === 'true' || v === 'True' || v === 'TRUE') return true;
    if (v === 'false' || v === 'False' || v === 'FALSE') return false;
    if (/^-?\d+$/.test(v)) { const n = Number(v); if (Number.isSafeInteger(n)) return n; }
    if (/^-?\d+\.\d+$/.test(v) || /^-?\d+(\.\d+)?[eE][+-]?\d+$/.test(v)) { const n = Number(v); if (Number.isFinite(n)) return n; }
    if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, v.length - 1); } }
    if (v.startsWith("'")) { return v.slice(1, v.length - 1).replace(/''/g, "'"); }
    if (v.startsWith('{') || v.startsWith('[')) { try { return JSON.parse(v); } catch {} }
    const am = v.match(/^(.*?)\s+&[A-Za-z0-9_-]+$/);
    if (am) return parseYamlScalar(am[1]);
    return v;
  }
  function yamlSplitKV(s) {
    let inQ = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQ) { if (c === inQ) inQ = null; continue; }
      if (c === '"' || c === "'") { inQ = c; continue; }
      if (c === ':' && (i + 1 >= s.length || s[i + 1] === ' ' || s[i + 1] === '\t')) {
        return { key: s.slice(0, i).trim(), value: s.slice(i + 1).trim() };
      }
    }
    return null;
  }
  function buildYaml(lines, idx, indent) {
    if (idx >= lines.length) return { value: null, next: idx };
    const line = lines[idx];
    if (line.indent < indent) return { value: null, next: idx };
    if (line.indent > indent) return { value: null, next: idx };
    if (line.text.startsWith('- ')) {
      const arr = [];
      while (idx < lines.length && lines[idx].indent === indent && lines[idx].text.startsWith('- ')) {
        const rest = lines[idx].text.slice(2).trim();
        if (rest === '') {
          if (idx + 1 < lines.length && lines[idx + 1].indent > indent) {
            const child = buildYaml(lines, idx + 1, lines[idx + 1].indent);
            arr.push(child.value);
            idx = child.next;
          } else { arr.push(null); idx++; }
          continue;
        }
        const kv = yamlSplitKV(rest);
        if (kv) {
          const m = {};
          if (kv.value !== '') m[kv.key] = parseYamlScalar(kv.value);
          if (idx + 1 < lines.length && lines[idx + 1].indent > indent) {
            const nextIndent = lines[idx + 1].indent;
            const child = buildYaml(lines, idx + 1, nextIndent);
            const cv = child.value;
            if (cv !== null && typeof cv === 'object' && !Array.isArray(cv)) {
              if (kv.value === '' && nextIndent > indent + 2) m[kv.key] = cv;
              else Object.assign(m, cv);
            } else if (kv.value === '') {
              m[kv.key] = cv;
            }
            idx = child.next;
          } else {
            if (kv.value === '') m[kv.key] = null;
            idx++;
          }
          arr.push(m);
          continue;
        }
        arr.push(parseYamlScalar(rest));
        idx++;
      }
      return { value: arr, next: idx };
    }
    const kv = yamlSplitKV(line.text);
    if (!kv) return { value: parseYamlScalar(line.text), next: idx + 1 };
    const obj = {};
    while (idx < lines.length && lines[idx].indent === indent) {
      const cur = lines[idx];
      const kvs = yamlSplitKV(cur.text);
      if (!kvs) break;
      if (kvs.value !== '') { obj[kvs.key] = parseYamlScalar(kvs.value); idx++; continue; }
      if (idx + 1 < lines.length && lines[idx + 1].indent > indent) {
        const child = buildYaml(lines, idx + 1, lines[idx + 1].indent);
        obj[kvs.key] = child.value;
        idx = child.next;
      } else { obj[kvs.key] = null; idx++; }
    }
    return { value: obj, next: idx };
  }
  function parseYaml(input) {
    const src = String(input).replace(/^\uFEFF/, '').split(/\r?\n/);
    const lines = [];
    let i = 0;
    while (i < src.length) {
      const raw = src[i];
      if (/^\s*(#.*)?$/.test(raw)) { i++; continue; }
      if (/^\s*---/.test(raw)) { i++; continue; }
      if (/^\s*\.\.\.\s*$/.test(raw)) { i++; continue; }
      const indent = raw.length - raw.replace(/^\s+/, '').length;
      const body = stripYamlComment(raw.trim()).trimEnd();
      if (body === '') { i++; continue; }
      const bm = body.match(/^(.+?):\s*(\||>)([-+0-9]*)\s*$/);
      if (bm) {
        const key = bm[1].trim();
        const style = bm[2];
        const parts = [];
        let j = i + 1;
        let blockIndent = -1;
        while (j < src.length) {
          const nl = src[j];
          if (/^\s*$/.test(nl)) { parts.push(''); j++; continue; }
          if (/^\s*#/.test(nl)) { j++; continue; }
          const ni = nl.length - nl.replace(/^\s+/, '').length;
          if (ni <= indent) break;
          if (blockIndent < 0) blockIndent = ni;
          parts.push(nl.slice(blockIndent));
          j++;
        }
        let value = parts.join('\n').replace(/\n+$/, '');
        if (style === '>') value = parts.join(' ').replace(/\s*\n\s*/g, ' ').replace(/ +$/, '');
        lines.push({ indent, text: key + ': ' + JSON.stringify(value) });
        i = j;
        continue;
      }
      lines.push({ indent, text: body });
      i++;
    }
    if (!lines.length) return null;
    return buildYaml(lines, 0, lines[0].indent).value;
  }
  function parseSpec(text) {
    const t = String(text).trim();
    if (!t) throw new Error('OpenAPI 规范内容为空');
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return JSON.parse(t); } catch (e) { throw new Error('OpenAPI JSON 解析失败: ' + (e && e.message)); }
    }
    const v = parseYaml(t);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      throw new Error('OpenAPI 规范解析失败：既不是 JSON 也不是可解析的 YAML。开头内容: ' + t.slice(0, 120));
    }
    return v;
  }

  // ================= Schema 清洗（对齐 harness.defineTool 的 raw JSON Schema 子集） =================
  const SAFE_SCALAR_TYPES = ['string', 'number', 'integer', 'boolean', 'null'];
  function sanitizeNode(node, depth, resolveRef) {
    if (depth > 12) return {};
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return {};
    let n = node;
    if (typeof n.$ref === 'string') {
      const resolved = resolveRef ? resolveRef(n.$ref) : undefined;
      if (resolved === undefined) return {};
      n = resolved;
      if (n === null || typeof n !== 'object' || Array.isArray(n)) return {};
    }
    const out = {};
    if (typeof n.description === 'string' && n.description) out.description = n.description.slice(0, 500);
    if (typeof n.title === 'string' && n.title) out.title = n.title;
    const oneOfSource = Array.isArray(n.oneOf) && n.oneOf.length >= 2 ? n.oneOf : (Array.isArray(n.anyOf) && n.anyOf.length >= 2 ? n.anyOf : null);
    if (oneOfSource) {
      const oneOf = [];
      for (const b of oneOfSource) {
        const s = sanitizeNode(b, depth + 1, resolveRef);
        if (s && Object.keys(s).length) oneOf.push(s);
      }
      if (oneOf.length >= 2) { out.oneOf = oneOf; return out; }
    }
    let type = typeof n.type === 'string' ? n.type : undefined;
    if (type === undefined) {
      if (n.properties && typeof n.properties === 'object' && !Array.isArray(n.properties)) type = 'object';
      else if (n.items && typeof n.items === 'object') type = 'array';
    }
    if (type === 'object') {
      out.type = 'object';
      const props = n.properties;
      if (props && typeof props === 'object' && !Array.isArray(props)) {
        const properties = {};
        for (const key of Object.keys(props)) properties[key] = sanitizeNode(props[key], depth + 1, resolveRef);
        out.properties = properties;
        if (Array.isArray(n.required)) {
          const required = n.required.filter((r) => typeof r === 'string' && Object.prototype.hasOwnProperty.call(properties, r));
          if (required.length) out.required = required;
        }
        if (typeof n.additionalProperties === 'boolean') out.additionalProperties = n.additionalProperties;
      }
      return out;
    }
    if (type === 'array') {
      out.type = 'array';
      if (n.items && typeof n.items === 'object') out.items = sanitizeNode(n.items, depth + 1, resolveRef);
      return out;
    }
    if (SAFE_SCALAR_TYPES.includes(type)) {
      out.type = type;
      if (Array.isArray(n.enum) && n.enum.length > 0) {
        const e = n.enum.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null);
        if (e.length) out.enum = e;
      }
      if (Object.prototype.hasOwnProperty.call(n, 'const')) out.const = n.const;
      return out;
    }
    return out;
  }
  function sanitizeMcpSchema(inputSchema) {
    const root = (inputSchema && typeof inputSchema === 'object' && !Array.isArray(inputSchema)) ? inputSchema : {};
    const props = (root.properties && typeof root.properties === 'object' && !Array.isArray(root.properties)) ? root.properties : {};
    const properties = {};
    for (const key of Object.keys(props)) properties[key] = sanitizeNode(props[key], 0, undefined);
    const required = [];
    if (Array.isArray(root.required)) {
      for (const r of root.required) {
        if (typeof r === 'string' && Object.prototype.hasOwnProperty.call(properties, r) && !required.includes(r)) required.push(r);
      }
    }
    const out = { type: 'object', properties };
    if (required.length) out.required = required;
    if (typeof root.description === 'string' && root.description) out.description = root.description.slice(0, 500);
    return out;
  }
  function resolveRef(spec, ref) {
    if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
    const parts = ref.slice(2).split('/');
    let cur = spec;
    for (const p of parts) {
      let key = p;
      try { key = decodeURIComponent(p); } catch {}
      if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
      cur = cur[key];
    }
    return cur;
  }

  // ================= Node HTTP 桥（宿主沙箱无 fetch，用子进程补全 HTTP 能力） =================
  let bridge = null;
  let bridgePromise = null;

  function failAllBridge(b, err) {
    for (const [id, p] of b.pending) { b.pending.delete(id); p.reject(err); }
    for (const [id, st] of b.streams) { b.streams.delete(id); try { st.onError(err); } catch {} }
  }
  function onBridgeMessage(b, msg) {
    if (!msg || msg.id === undefined) return;
    if (msg.ok === true) {
      const p = b.pending.get(msg.id);
      if (p) { b.pending.delete(msg.id); p.resolve(msg); return; }
      const st = b.streams.get(msg.id);
      if (st) { try { if (st.onHeaders) st.onHeaders(msg.headers || {}); } catch {} }
      return;
    }
    if (msg.ev === 'msg') {
      const st = b.streams.get(msg.id);
      if (st) { try { st.onData({ name: msg.name || 'message', data: msg.d }); } catch {} }
      return;
    }
    if (msg.ev === 'end') {
      const st = b.streams.get(msg.id);
      if (st) { b.streams.delete(msg.id); try { st.onEnd(); } catch {} }
      return;
    }
    if (msg.ev === 'err') {
      const st = b.streams.get(msg.id);
      if (st) { b.streams.delete(msg.id); try { st.onError(new Error(msg.d || 'SSE 流错误')); } catch {} }
      return;
    }
    const p = b.pending.get(msg.id);
    if (p) { b.pending.delete(msg.id); p.reject(new Error(msg.error || 'HTTP 请求失败')); }
  }
  function getBridge() {
    if (bridge && bridge.alive) return Promise.resolve(bridge);
    if (bridgePromise) return bridgePromise;
    bridgePromise = (async () => {
      const exe = await subprocess.resolveExecutable('node');
      const cwd = workspaceRoot || 'C:\\';
      const handle = subprocess.spawn({
        argv: [exe, BRIDGE_PATH],
        cwd,
        stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
        graceMs: 3000,
      });
      const b = { handle, alive: true, nextId: 1, pending: new Map(), streams: new Map(), buf: '' };
      handle.done.then((outcome) => {
        b.alive = false;
        bridge = null;
        bridgePromise = null;
        failAllBridge(b, new Error('HTTP 桥进程退出（code ' + outcome.exitCode + ' / signal ' + outcome.signal + '）'));
      }).catch((err) => {
        b.alive = false;
        bridge = null;
        bridgePromise = null;
        failAllBridge(b, new Error('HTTP 桥进程启动失败: ' + String((err && err.message) || err)));
      });
      handle.stdout.on('data', (chunk) => {
        b.buf += String(chunk);
        let idx;
        while ((idx = b.buf.indexOf('\n')) >= 0) {
          const line = b.buf.slice(0, idx);
          b.buf = b.buf.slice(idx + 1);
          if (!line.trim()) continue;
          let msg;
          try { msg = JSON.parse(line); } catch { continue; }
          onBridgeMessage(b, msg);
        }
      });
      handle.stdout.on('error', () => {});
      handle.stderr.on('data', (chunk) => { const s = String(chunk).trim(); if (s) console.log('[mcp-bridge]', s.slice(0, 500)); });
      handle.stderr.on('error', () => {});
      handle.stdin.on('error', () => {});
      bridge = b;
      return b;
    })();
    bridgePromise.catch(() => { bridgePromise = null; });
    return bridgePromise;
  }
  function bridgeRequest(method, url, headers, body, timeoutMs, signal) {
    return getBridge().then((b) => {
      const id = b.nextId++;
      const cmd = {
        id, op: 'request', method, url,
        headers: headers || {},
        body: (body === null || body === undefined) ? null : String(body),
      };
      if (timeoutMs) cmd.timeoutMs = timeoutMs;
      const promise = new Promise((resolve, reject) => { b.pending.set(id, { resolve, reject }); });
      try { b.handle.stdin.write(JSON.stringify(cmd) + '\n'); } catch (err) { b.pending.delete(id); return Promise.reject(err); }
      if (signal) {
        const onAbort = () => {
          try { b.handle.stdin.write(JSON.stringify({ id, op: 'cancel' }) + '\n'); } catch {}
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
      return promise;
    });
  }
  function bridgeSse(url, headers, handlers) {
    return getBridge().then((b) => {
      const id = b.nextId++;
      b.streams.set(id, {
        onData: (ev) => { try { handlers.onData(ev); } catch {} },
        onEnd: () => { try { handlers.onEnd(); } catch {} },
        onError: (err) => { try { handlers.onError(err); } catch {} },
        onHeaders: handlers.onHeaders || null,
      });
      try { b.handle.stdin.write(JSON.stringify({ id, op: 'sse', url, headers: headers || {} }) + '\n'); } catch (err) { b.streams.delete(id); return Promise.reject(err); }
      return { id, cancel: () => { try { b.handle.stdin.write(JSON.stringify({ id, op: 'cancel' }) + '\n'); } catch {} } };
    });
  }
  function closeBridge(b) {
    if (!b || !b.handle) return;
    try { b.handle.terminate(); } catch {}
    failAllBridge(b, new Error('HTTP 桥已关闭'));
  }

  // ================= 传输层 =================
  function parseSseText(text) {
    const events = [];
    let name = 'message';
    const dataLines = [];
    const flush = () => {
      if (dataLines.length) {
        events.push({ name: name || 'message', data: dataLines.join('\n') });
        dataLines.length = 0;
      }
      name = 'message';
    };
    const lines = String(text).split(/\r?\n/);
    for (const raw of lines) {
      if (raw === '') { flush(); continue; }
      if (raw.startsWith(':')) continue;
      if (raw.startsWith('event:')) { name = raw.slice(6).trim() || 'message'; continue; }
      if (raw.startsWith('data:')) { dataLines.push(raw.slice(5).replace(/^ /, '')); continue; }
    }
    flush();
    return events;
  }

  function createStdioTransport(cfg) {
    let handle = null;
    let onMessage = null;
    let onEnd = null;
    let buf = '';
    async function start() {
      const exe = await subprocess.resolveExecutable(cfg.command);
      const cwd = cfg.cwd || workspaceRoot || 'C:\\';
      handle = subprocess.spawn({
        argv: [exe].concat(cfg.args || []),
        cwd,
        stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
        graceMs: 3000,
        env: cfg.env || undefined,
      });
      handle.done.then((o) => {
        handle = null;
        if (onEnd) onEnd(new Error('MCP 进程已退出（code ' + o.exitCode + ' / signal ' + o.signal + '）'));
      }).catch((err) => {
        handle = null;
        if (onEnd) onEnd(new Error('MCP 进程启动失败: ' + String((err && err.message) || err)));
      });
      handle.stdout.on('data', (chunk) => {
        buf += String(chunk);
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let msg;
          try { msg = JSON.parse(line); } catch { continue; }
          if (onMessage) onMessage(msg);
        }
      });
      handle.stdout.on('error', () => {});
      handle.stderr.on('data', (chunk) => { const s = String(chunk).trim(); if (s) console.log('[mcp:' + cfg.name + '] stderr:', s.slice(0, 300)); });
      handle.stderr.on('error', () => {});
      handle.stdin.on('error', () => {});
    }
    return {
      kind: 'stdio',
      start,
      async send(msg) {
        if (!handle || !handle.stdin) throw new Error('MCP 进程未运行');
        try { handle.stdin.write(JSON.stringify(msg) + '\n'); } catch (err) { throw new Error('写入 MCP 进程失败: ' + String((err && err.message) || err)); }
        return null;
      },
      setHandlers(h) { onMessage = h.onMessage; onEnd = h.onEnd; },
      notifyCancelled() {},
      close() { if (handle) { try { handle.terminate(); } catch {} handle = null; } },
    };
  }

  function createUnifiedHttpTransport(cfg, server) {
    let stream = null;
    let endpoint = null;
    let onMessage = null;
    let onEnd = null;
    let startResolve = null;
    let sessionId = server.sessionId || null;
    let protocolVersion = null;
    let isSseMode = cfg.transport === 'sse';

    function openSseStream(urlToOpen) {
      let targetUrl = urlToOpen || cfg.url;
      if (sessionId) targetUrl = appendQuery(targetUrl, 'sessionId=' + encodeURIComponent(sessionId));
      return bridgeSse(targetUrl, Object.assign({}, buildHeaders(cfg, server.cookies), { accept: 'text/event-stream' }), {
        onHeaders: (h) => {
          if (cfg.cookieSession && h && h['set-cookie']) applyCookies(server.cookies, h['set-cookie']);
        },
        onData: (ev) => {
          if (ev.name === 'endpoint') {
            endpoint = resolveUrl(cfg.url, String(ev.data || '').trim());
            const sid = extractQuery(endpoint, 'sessionId');
            if (sid) { sessionId = sid; transport.sessionId = sid; }
            if (startResolve) { const r = startResolve; startResolve = null; r(); }
            return;
          }
          if (ev.name === 'message' && onMessage) {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            onMessage(msg);
          }
        },
        onEnd: () => { stream = null; if (onEnd) onEnd(new Error('SSE 流已断开')); },
        onError: (err) => { stream = null; if (onEnd) onEnd(err); },
      }).then((s) => { stream = s; });
    }

    const transport = {
      kind: 'http',
      get sessionId() { return sessionId; },
      set sessionId(v) { sessionId = v; },
      setProtocolVersion(version) {
        protocolVersion = typeof version === 'string' && version ? version : null;
      },
      async start() {
        if (isSseMode || /\/sse(\?|$)/i.test(cfg.url)) {
          isSseMode = true;
          try {
            await openSseStream();
            if (endpoint) return;
            await new Promise((resolve) => {
              const t = ctx.timeout(() => {
                startResolve = null;
                resolve();
              }, 4000);
              startResolve = () => { t(); resolve(); };
            });
          } catch {
            isSseMode = false;
          }
        }
      },
      async send(msg, opts) {
        const targetUrl = (isSseMode && endpoint) ? endpoint : (endpoint || cfg.url);
        const headers = buildHeaders(cfg, server.cookies);
        headers['content-type'] = 'application/json';
        headers.accept = 'application/json, text/event-stream';
        if (sessionId) headers['mcp-session-id'] = sessionId;
        if (protocolVersion) headers['MCP-Protocol-Version'] = protocolVersion;
        const timeoutMs = (opts && opts.timeoutMs) || 60000;

        let res;
        try {
          res = await bridgeRequest('POST', targetUrl, headers, JSON.stringify(msg), timeoutMs, opts && opts.signal);
        } catch (err) {
          if (!isSseMode && !stream && !endpoint) {
            try {
              isSseMode = true;
              await openSseStream();
              if (!endpoint) {
                await new Promise((resolve) => {
                  const t = ctx.timeout(() => { startResolve = null; resolve(); }, 4000);
                  startResolve = () => { t(); resolve(); };
                });
              }
              const fallbackUrl = endpoint || cfg.url;
              res = await bridgeRequest('POST', fallbackUrl, headers, JSON.stringify(msg), timeoutMs, opts && opts.signal);
            } catch {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (!res.ok) {
          if ((res.status === 405 || res.status === 404) && !isSseMode && !stream && !endpoint) {
            isSseMode = true;
            try {
              await openSseStream();
              if (!endpoint) {
                await new Promise((resolve) => {
                  const t = ctx.timeout(() => { startResolve = null; resolve(); }, 4000);
                  startResolve = () => { t(); resolve(); };
                });
              }
              const retryUrl = endpoint || cfg.url;
              res = await bridgeRequest('POST', retryUrl, headers, JSON.stringify(msg), timeoutMs, opts && opts.signal);
            } catch {}
          }
          if (!res.ok) throw new Error('HTTP 请求失败: ' + res.error);
        }

        if (cfg.cookieSession && res.headers && res.headers['set-cookie']) applyCookies(server.cookies, res.headers['set-cookie']);
        if (res.headers && res.headers['mcp-session-id']) {
          sessionId = res.headers['mcp-session-id'];
          transport.sessionId = sessionId;
        }

        if (res.status === 202 && res.headers && res.headers.location) {
          const loc = resolveUrl(targetUrl, res.headers.location);
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => ctx.timeout(r, 500));
            res = await bridgeRequest('GET', loc, headers, null, 15000, opts && opts.signal);
            if (!res.ok) throw new Error('轮询异步结果失败: ' + res.error);
            if (cfg.cookieSession && res.headers && res.headers['set-cookie']) applyCookies(server.cookies, res.headers['set-cookie']);
            if (res.headers && res.headers['mcp-session-id']) {
              sessionId = res.headers['mcp-session-id'];
              transport.sessionId = sessionId;
            }
            if (res.status === 200) break;
          }
        }

        if (res.sse) {
          const events = parseSseText(res.body || '');
          let response = null;
          for (const ev of events) {
            if (ev.name !== 'message') continue;
            let m;
            try { m = JSON.parse(ev.data); } catch { continue; }
            if (m && m.result && m.result._meta && typeof m.result._meta.sessionId === 'string') {
              sessionId = m.result._meta.sessionId;
              transport.sessionId = sessionId;
            }
            if (m && m.id !== undefined && m.id !== null && m.id === msg.id) response = m;
          }
          return response;
        }

        let parsed = null;
        if (res.body && res.body.trim()) {
          try { parsed = JSON.parse(res.body); } catch {}
        }
        if (parsed && parsed.result && parsed.result._meta && typeof parsed.result._meta.sessionId === 'string') {
          sessionId = parsed.result._meta.sessionId;
          transport.sessionId = sessionId;
        }
        return parsed;
      },
      setHandlers(h) { onMessage = h.onMessage; onEnd = h.onEnd; },
      notifyCancelled() {},
      close() {
        if (stream) { try { stream.cancel(); } catch {} stream = null; }
      },
    };
    return transport;
  }

  // ================= JSON-RPC / MCP 会话 =================
  function createSession(name, transport, hooks) {
    let seq = 0;
    const pending = new Map();
    let closed = false;
    transport.setHandlers({
      onMessage: (msg) => handleMessage(msg),
      onEnd: (err) => {
        closed = true;
        failAll(err);
        if (hooks.onStreamEnd) hooks.onStreamEnd(err);
      },
    });
    function handleMessage(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.id !== undefined && msg.id !== null) {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        if (entry.timer) entry.timer();
        if (msg.error) entry.reject(new Error(formatRpcError(msg.error)));
        else entry.resolve(msg.result);
        return;
      }
      if (typeof msg.method === 'string' && msg.method === 'notifications/tools/list_changed') {
        if (hooks.onToolsChanged) hooks.onToolsChanged();
      }
    }
    function failAll(err) {
      for (const [id, entry] of pending) {
        pending.delete(id);
        if (entry.timer) entry.timer();
        entry.reject(err);
      }
    }
    return {
      get closed() { return closed; },
      async request(method, params, opts) {
        opts = opts || {};
        if (closed) throw new Error('MCP 会话已断开');
        const id = ++seq;
        const msg = { jsonrpc: '2.0', id, method, params };
        const timeoutMs = opts.timeoutMs || 60000;
        const promise = new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject, timer: null });
        });
        const timer = ctx.timeout(() => {
          const entry = pending.get(id);
          if (!entry) return;
          pending.delete(id);
          entry.reject(new Error('MCP 请求超时（' + timeoutMs + 'ms）: ' + method));
        }, timeoutMs);
        const entry = pending.get(id);
        if (entry) entry.timer = timer;
        if (opts.signal) {
          const onAbort = () => {
            const e = pending.get(id);
            if (!e) return;
            pending.delete(id);
            if (e.timer) e.timer();
            try { transport.notifyCancelled(id, msg); } catch {}
            e.reject(new Error('MCP 请求已取消: ' + method));
          };
          if (opts.signal.aborted) onAbort();
          else opts.signal.addEventListener('abort', onAbort, { once: true });
        }
        try {
          const rpc = await transport.send(msg, { timeoutMs, signal: opts.signal });
          if (rpc !== null && rpc !== undefined) handleMessage(rpc);
        } catch (err) {
          const e = pending.get(id);
          if (e) { pending.delete(id); if (e.timer) e.timer(); e.reject(err); }
        }
        return promise;
      },
      notify(method, params) {
        const msg = { jsonrpc: '2.0', method, params };
        transport.send(msg, { timeoutMs: 30000 }).catch((err) => {
          console.log('[mcp:' + name + '] 通知发送失败 ' + method + ':', String((err && err.message) || err));
        });
      },
      dispose() {
        closed = true;
        failAll(new Error('MCP 会话已关闭'));
      },
    };
  }

  // ================= 服务器注册表 =================
  const servers = new Map();
  let persistedDomain = null;
  let persistedServers = null;
  let persistenceError = null;
  let persistenceReady = Promise.resolve();

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createServer(name, config, prefix) {
    return {
      name,
      config,
      prefix: sanitizeName(prefix || name) || 'mcp',
      status: 'configured',
      serverInfo: null,
      toolCount: 0,
      skipped: [],
      lastError: null,
      stale: false,
      sessionId: null,
      cookies: {},
      transport: null,
      session: null,
      hb: null,
      refreshTimer: null,
      toolDisposers: [],
      sseAttempts: 0,
      pinging: false,
    };
  }

  function persistedRecord(s) {
    return {
      name: s.name,
      config: cloneJson(s.config),
      prefix: s.prefix,
    };
  }

  function restoreServerRecord(key, record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('记录不是对象');
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : key;
    const config = record.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('缺少 config');
    if (!['stdio', 'http', 'openapi'].includes(config.transport)) throw new Error('transport 无效');
    return createServer(name, cloneJson(config), record.prefix);
  }

  async function persistServer(s) {
    await persistenceReady;
    if (!persistedServers) throw persistenceError || new Error('DSH 持久化服务不可用');
    await persistedServers.put(s.name, persistedRecord(s));
  }

  async function deletePersistedServer(name) {
    await persistenceReady;
    if (!persistedServers) throw persistenceError || new Error('DSH 持久化服务不可用');
    await persistedServers.delete(name);
  }

  function unregisterTools(s) {
    if (s.toolDisposers && s.toolDisposers.length) {
      for (const d of s.toolDisposers) { try { d(); } catch {} }
      s.toolDisposers = [];
    }
  }
  function teardown(s) {
    if (s.refreshTimer) { try { s.refreshTimer(); } catch {} s.refreshTimer = null; }
    if (s.hb) { try { s.hb(); } catch {} s.hb = null; }
    unregisterTools(s);
    if (s.session) { try { s.session.dispose(); } catch {} s.session = null; }
    if (s.transport) { try { s.transport.close(); } catch {} s.transport = null; }
  }
  function listServers() {
    const out = [];
    for (const s of servers.values()) {
      const c = s.config;
      out.push({
        name: s.name,
        notes: c.notes || null,
        transport: c.transport === 'sse' ? 'http' : c.transport,
        status: s.status,
        serverInfo: s.serverInfo || null,
        toolCount: s.toolCount || 0,
        stale: !!s.stale,
        lastError: s.lastError || null,
        editable: {
          notes: c.notes || '',
          transport: c.transport === 'sse' ? 'http' : c.transport,
          command: c.command || '',
          args: Array.isArray(c.args) ? c.args.slice() : [],
          cwd: c.cwd || '',
          env: c.env && typeof c.env === 'object' ? Object.assign({}, c.env) : {},
          url: c.url || '',
          headers: c.headers && typeof c.headers === 'object' ? Object.assign({}, c.headers) : {},
          specUrl: c.specUrl || '',
          specText: c.specText || '',
          specFile: c.specFile || '',
          baseUrl: c.baseUrl || '',
          cookieSession: c.cookieSession === true,
          prefix: s.prefix || '',
        },
      });
    }
    return out;
  }

  async function addServer(args, options) {
    const shouldPersist = !options || options.persist !== false;
    const name = typeof args.name === 'string' ? args.name.trim() : '';
    if (!name) return { ok: false, message: '服务器名称不能为空' };
    if (name.length > 60) return { ok: false, message: '服务器名称过长（最多 60 字符）' };
    if (servers.has(name)) return { ok: false, message: '服务器 ' + name + ' 已存在，请先移除' };
    const transport = args.transport;
    if (!['stdio', 'sse', 'http', 'openapi'].includes(transport)) {
      return { ok: false, message: 'transport 必须是 stdio / http / openapi' };
    }
    const normalizedTransport = transport === 'sse' ? 'http' : transport;
    const cfg = {
      transport: normalizedTransport,
      notes: typeof args.notes === 'string' && args.notes.trim() ? args.notes.trim().slice(0, 500) : null,
    };
    if (normalizedTransport === 'stdio') {
      if (typeof args.command !== 'string' || !args.command.trim()) return { ok: false, message: 'STDIO 类型需要填写启动命令' };
      cfg.command = args.command.trim();
      cfg.args = Array.isArray(args.args) ? args.args.filter((a) => typeof a === 'string') : [];
      cfg.cwd = typeof args.cwd === 'string' && args.cwd ? args.cwd : null;
      cfg.env = (args.env && typeof args.env === 'object' && !Array.isArray(args.env)) ? pickStrings(args.env) : null;
    } else if (normalizedTransport === 'http') {
      if (typeof args.url !== 'string' || !/^https?:\/\//i.test(args.url.trim())) {
        return { ok: false, message: 'HTTP / SSE 类型需要填写有效的服务器 URL（http(s)://...）' };
      }
      cfg.url = args.url.trim();
      cfg.env = (args.env && typeof args.env === 'object' && !Array.isArray(args.env)) ? pickStrings(args.env) : null;
    } else {
      if (typeof args.specUrl !== 'string' && typeof args.specText !== 'string' && typeof args.specFile !== 'string') {
        return { ok: false, message: 'OpenAPI 类型需要提供规范 URL、JSON 模式文本或规范文件' };
      }
      cfg.specUrl = typeof args.specUrl === 'string' && args.specUrl.trim() ? args.specUrl.trim() : null;
      cfg.specText = typeof args.specText === 'string' && args.specText.trim() ? args.specText : null;
      cfg.specFile = typeof args.specFile === 'string' && args.specFile.trim() ? args.specFile.trim() : null;
      cfg.baseUrl = typeof args.baseUrl === 'string' && args.baseUrl ? args.baseUrl.trim() : null;
      cfg.cookieSession = args.cookieSession === true;
    }
    // 安全类型 → 请求头
    const userHeaders = (args.headers && typeof args.headers === 'object' && !Array.isArray(args.headers)) ? pickStrings(args.headers) : {};
    const securityHeaders = {};
    const secType = args.securityType;
    if (secType === 'bearer' && typeof args.securityToken === 'string' && args.securityToken.trim()) {
      securityHeaders.authorization = 'Bearer ' + args.securityToken.trim();
    } else if (secType === 'basic' && typeof args.basicUser === 'string' && args.basicUser) {
      securityHeaders.authorization = 'Basic ' + btoa(args.basicUser + ':' + (typeof args.basicPass === 'string' ? args.basicPass : ''));
    } else if (secType === 'apiKey' && typeof args.apiKeyName === 'string' && args.apiKeyName.trim() && typeof args.apiKeyValue === 'string' && args.apiKeyValue) {
      securityHeaders[args.apiKeyName.trim()] = args.apiKeyValue;
    }
    cfg.headers = Object.assign({}, userHeaders, securityHeaders);
    if (typeof args.token === 'string' && args.token.trim()) cfg.headers.authorization = 'Bearer ' + args.token.trim();
    cfg.token = null;
    const prefix = sanitizeName(typeof args.prefix === 'string' && args.prefix ? args.prefix : name) || 'mcp';
    const s = createServer(name, cfg, prefix);
    servers.set(name, s);
    if (shouldPersist) {
      try {
        await persistServer(s);
      } catch (err) {
        servers.delete(name);
        return { ok: false, message: '服务器已暂存但持久化失败: ' + String((err && err.message) || err) };
      }
    }
    console.log('[mcp] 已添加服务器', name, '（' + normalizedTransport + '）');
    return { ok: true, message: '已保存服务器 "' + name + '"（' + (normalizedTransport === 'http' ? 'HTTP / SSE' : normalizedTransport) + '），使用 mcp_connect 连接' };
  }

  async function updateServer(name, args) {
    await persistenceReady;
    const current = servers.get(name);
    if (!current) return { ok: false, message: '服务器不存在: ' + name };
    const wasConnected = current.status === 'connected';
    teardown(current);
    servers.delete(name);
    const payload = Object.assign({}, (args && typeof args === 'object') ? args : {}, { name });
    const saved = await addServer(payload);
    if (!saved.ok) {
      current.status = 'configured';
      current.serverInfo = null;
      current.toolCount = 0;
      current.lastError = saved.message;
      servers.set(name, current);
      return saved;
    }
    if (wasConnected) {
      const connected = await connectServer(name);
      if (!connected.ok) return { ok: false, message: '配置已更新，但重新连接失败：' + connected.message, detail: connected.detail };
    }
    return { ok: true, message: '服务器 "' + name + '" 配置已更新', detail: { reconnected: wasConnected } };
  }

  async function removeServer(name) {
    const s = servers.get(name);
    if (!s) return { ok: false, message: '服务器不存在: ' + name };
    try {
      await deletePersistedServer(name);
    } catch (err) {
      return { ok: false, message: '移除失败，持久化删除失败: ' + String((err && err.message) || err) };
    }
    teardown(s);
    servers.delete(name);
    return { ok: true, message: '已移除服务器 ' + name };
  }

  async function initializePersistence() {
    try {
      const storageDomain = ctx.get('storageDomain');
      if (!storageDomain || typeof storageDomain.open !== 'function') {
        throw new Error('storageDomain 服务不可用');
      }
      persistedDomain = await storageDomain.open(MCP_STORAGE_SPEC);
      persistedServers = persistedDomain.table('servers');
      for (const [key, record] of persistedServers.entries()) {
        try {
          const server = restoreServerRecord(key, record);
          if (!servers.has(server.name)) servers.set(server.name, server);
        } catch (err) {
          console.log('[mcp] 跳过无效的持久化服务器记录 ' + key + ':', String((err && err.message) || err));
        }
      }
      console.log('[mcp] 已恢复', servers.size, '个持久化服务器配置');
    } catch (err) {
      persistenceError = err;
      console.error('[mcp] MCP 配置持久化不可用:', String((err && err.message) || err));
    }
  }

  persistenceReady = initializePersistence();

  async function disconnectServer(name) {
    await persistenceReady;
    const s = servers.get(name);
    if (!s) return { ok: false, message: '服务器不存在: ' + name };
    teardown(s);
    s.status = 'configured';
    s.serverInfo = null;
    s.stale = false;
    return { ok: true, message: '已断开服务器 ' + name };
  }

  function registerDefs(s, defs) {
    unregisterTools(s);
    const disposers = [];
    const skipped = [];
    for (const d of defs) {
      try {
        const tool = defineTool({
          name: d.name,
          description: d.description,
          parameters: toPropertyMap(d.parameters),
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (args, value) => [{ type: 'text', text: renderMcpResult(value) }],
          },
          timeoutMs: 300000,
          execute: d.execute,
        });
        disposers.push(ctx.tools.register(tool));
      } catch (err) {
        skipped.push(d.name + '（' + String((err && err.message) || err) + '）');
      }
    }
    s.toolDisposers = disposers;
    return { count: disposers.length, skipped };
  }

  async function syncTools(s) {
    const list = await s.session.request('tools/list', {}, { timeoutMs: 60000 });
    const tools = (list && Array.isArray(list.tools)) ? list.tools : [];
    const defs = [];
    for (const t of tools) {
      if (!t || typeof t !== 'object' || typeof t.name !== 'string' || !t.name) continue;
      const serverToolName = t.name;
      defs.push({
        name: s.prefix + '_' + sanitizeName(serverToolName),
        description: ((typeof t.description === 'string' && t.description) ? t.description : 'MCP 工具（服务器 ' + s.name + '）').slice(0, 3000),
        parameters: sanitizeMcpSchema(t.inputSchema),
        execute: async (args, exec) => {
          if (s.status !== 'connected' || !s.session || s.session.closed) throw new Error('MCP 服务器 ' + s.name + ' 未连接');
          const result = await s.session.request('tools/call', { name: serverToolName, arguments: args || {} }, { timeoutMs: 300000, signal: exec && exec.signal });
          return {
            ok: !result.isError,
            text: renderMcpContent(result.content),
            structured: result.structuredContent !== undefined ? result.structuredContent : null,
            isError: !!result.isError,
          };
        },
      });
    }
    return registerDefs(s, defs);
  }

  function scheduleToolRefresh(s) {
    if (s.refreshTimer) return;
    s.refreshTimer = ctx.timeout(() => {
      s.refreshTimer = null;
      if (s.status !== 'connected' || !s.session || s.session.closed) return;
      syncTools(s).then((r) => { s.toolCount = r.count; s.skipped = r.skipped; }).catch((err) => {
        console.log('[mcp:' + s.name + '] 工具刷新失败:', String((err && err.message) || err));
      });
    }, 800);
  }

  function startHeartbeat(s) {
    if (s.hb) return;
    if (s.config.transport !== 'sse' && s.config.transport !== 'http') return;
    s.hb = ctx.interval(() => {
      if (s.status !== 'connected' || !s.session || s.session.closed || s.pinging) return;
      s.pinging = true;
      s.session.request('ping', {}, { timeoutMs: 10000 })
        .then(() => { s.stale = false; })
        .catch(() => { s.stale = true; })
        .then(() => { s.pinging = false; });
    }, 30000);
  }

  function scheduleSseReconnect(s, err) {
    if (s.status !== 'connected') return;
    s.sseAttempts = (s.sseAttempts || 0) + 1;
    if (s.sseAttempts > 3) {
      s.status = 'error';
      s.lastError = '连接断开且重连失败: ' + String((err && err.message) || err);
      return;
    }
    const delay = 1500 * s.sseAttempts;
    console.log('[mcp:' + s.name + '] 连接断开，' + delay + 'ms 后重连（第 ' + s.sseAttempts + ' 次）');
    ctx.timeout(() => {
      if (s.status !== 'connected') return;
      s.status = 'connecting';
      s.lastError = null;
      doConnect(s).then(() => {
        s.sseAttempts = 0;
      }).catch((e) => {
        s.status = 'error';
        s.lastError = '重连失败: ' + String((e && e.message) || e);
      });
    }, delay);
  }

  async function loadSpec(cfg) {
    let text;
    if (cfg.specText) {
      text = cfg.specText;
    } else if (cfg.specUrl) {
      const res = await bridgeRequest('GET', cfg.specUrl, buildHeaders(cfg), null, 60000);
      if (!res.ok) throw new Error('获取 OpenAPI 规范失败: ' + (res.error || ('HTTP ' + res.status)));
      text = res.body;
    } else if (cfg.specFile) {
      const fs = ctx.fs;
      if (!fs) throw new Error('文件系统服务不可用，无法读取本地规范文件');
      const target = await fs.resolve(cfg.specFile, workspaceRoot ? { cwd: workspaceRoot } : {});
      text = await fs.readText(target);
    } else {
      throw new Error('OpenAPI 需要 specUrl、specText 或 specFile');
    }
    return parseSpec(text);
  }

  function convertOperation(spec, path, method, op, base) {
    const opId = (typeof op.operationId === 'string' && op.operationId) ? op.operationId : method + '_' + path;
    const name = sanitizeName(opId) || 'op';
    const parts = [method.toUpperCase() + ' ' + path];
    if (typeof op.summary === 'string' && op.summary) parts.push(op.summary);
    if (typeof op.description === 'string' && op.description) parts.push(op.description);
    const description = parts.join('\n\n').slice(0, 3000);
    const params = Array.isArray(op.parameters)
      ? op.parameters.filter((p) => p && typeof p === 'object' && typeof p.name === 'string')
      : [];
    const properties = {};
    const required = [];
    const metaParams = [];
    for (const p of params) {
      const key = p.name;
      const schema = sanitizeNode(p.schema, 0, (ref) => resolveRef(spec, ref));
      const prop = Object.assign({}, schema);
      if (typeof p.description === 'string' && p.description && !prop.description) prop.description = p.description.slice(0, 300);
      if (!prop.type && !prop.oneOf) prop.type = 'string';
      properties[key] = prop;
      if (p.in === 'path' || p.required === true) required.push(key);
      metaParams.push({ name: key, in: (p.in === 'path' || p.in === 'query' || p.in === 'header') ? p.in : 'query' });
    }
    let bodyKey = null;
    if (op.requestBody && typeof op.requestBody === 'object' && op.requestBody.content) {
      const json = op.requestBody.content['application/json'];
      if (json && typeof json === 'object' && json.schema) {
        const s = sanitizeNode(json.schema, 0, (ref) => resolveRef(spec, ref));
        if (s.type === 'object' && s.properties) {
          for (const k of Object.keys(s.properties)) {
            if (!properties[k]) {
              properties[k] = s.properties[k];
              if (Array.isArray(s.required) && s.required.includes(k)) required.push(k);
            }
          }
        } else {
          bodyKey = 'body';
          properties.body = s;
          if (op.requestBody.required === true) required.push('body');
        }
      }
    }
    const finalRequired = required.filter((v, i) => required.indexOf(v) === i);
    const schema = { type: 'object', properties };
    if (finalRequired.length) schema.required = finalRequired;
    return { name, description, schema, meta: { base, path, method, metaParams, bodyKey } };
  }

  function buildOpenApiTools(spec, cfg) {
    const base = cfg.baseUrl || (
      spec.servers && Array.isArray(spec.servers) && spec.servers[0]
        && typeof spec.servers[0] === 'object' && typeof spec.servers[0].url === 'string'
        ? spec.servers[0].url : ''
    );
    if (!base) throw new Error('未找到 API 基础 URL（可在 mcp_add 时用 baseUrl 指定）');
    const paths = (spec.paths && typeof spec.paths === 'object') ? spec.paths : {};
    const out = [];
    for (const path of Object.keys(paths)) {
      const item = paths[path];
      if (!item || typeof item !== 'object') continue;
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
        const op = item[method];
        if (!op || typeof op !== 'object') continue;
        out.push(convertOperation(spec, path, method, op, base));
      }
    }
    if (!out.length) throw new Error('规范中没有可转换的 API 操作');
    return out;
  }

  function makeOpenApiExecutor(op, cfg) {
    const meta = op.meta;
    const staticHeaders = buildHeaders(cfg);
    return async (args) => {
      let url = meta.base;
      const query = [];
      const h = Object.assign({}, staticHeaders);
      for (const p of meta.metaParams) {
        const v = args[p.name];
        if (v === undefined || v === null) continue;
        if (p.in === 'path') {
          url = url.replace('{' + p.name + '}', encodeURIComponent(String(v)));
        } else if (p.in === 'query') {
          query.push(encodeURIComponent(p.name) + '=' + encodeURIComponent(String(v)));
        } else if (p.in === 'header') {
          h[p.name] = String(v);
        }
      }
      let body = null;
      if (meta.bodyKey) {
        const v = args.body;
        if (v !== undefined && v !== null) {
          body = JSON.stringify(v);
          h['content-type'] = 'application/json';
        }
      }
      if (query.length) url += (url.includes('?') ? '&' : '?') + query.join('&');
      const res = await bridgeRequest(meta.method.toUpperCase(), url, h, body, 300000);
      if (!res.ok) return { ok: false, text: '请求失败: ' + res.error, structured: null, isError: true };
      let text = res.body;
      let structured = null;
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      if (ct.includes('json')) {
        try { structured = JSON.parse(res.body); text = JSON.stringify(structured, null, 2); } catch {}
      }
      const isError = res.status >= 400;
      return { ok: !isError, text, structured, isError };
    };
  }

  async function doConnect(s) {
    unregisterTools(s);
    if (s.transport) { try { s.transport.close(); } catch {} s.transport = null; }
    if (s.session) { try { s.session.dispose(); } catch {} s.session = null; }
    if (s.hb) { try { s.hb(); } catch {} s.hb = null; }
    s.sseAttempts = 0;
    s.cookies = {};
    s.stale = false;

    if (s.config.transport === 'openapi') {
      const spec = await loadSpec(s.config);
      const ops = buildOpenApiTools(spec, s.config);
      const defs = ops.map((op) => ({
        name: s.prefix + '_' + op.name,
        description: op.description,
        parameters: op.schema,
        execute: makeOpenApiExecutor(op, s.config),
      }));
      const r = registerDefs(s, defs);
      s.serverInfo = { name: (spec.info && typeof spec.info === 'object' && spec.info.title) ? spec.info.title : s.name };
      s.toolCount = r.count;
      s.skipped = r.skipped;
      s.status = 'connected';
      console.log('[mcp:' + s.name + '] OpenAPI 已加载，注册', r.count, '个工具');
      return;
    }

    const transport = (s.config.transport === 'stdio')
      ? createStdioTransport(s.config)
      : createUnifiedHttpTransport(s.config, s);
    await transport.start();
    const session = createSession(s.name, transport, {
      onToolsChanged: () => scheduleToolRefresh(s),
      onStreamEnd: (err) => { if (s.config.transport === 'sse' || s.config.transport === 'http') scheduleSseReconnect(s, err); },
    });
    s.transport = transport;
    s.session = session;

    const initParams = {
      protocolVersion: '2025-06-18',
      capabilities: { tools: { listChanged: true } },
      clientInfo: { name: 'dsh-mcp-manager', version: '1.0.0' },
    };
    let init;
    try {
      init = await session.request('initialize', initParams, { timeoutMs: 30000 });
    } catch (err) {
      if (/protocol/i.test(String((err && err.message) || err))) {
        init = await session.request('initialize', Object.assign({}, initParams, { protocolVersion: '2024-11-05' }), { timeoutMs: 30000 });
      } else {
        throw err;
      }
    }
    if (transport.setProtocolVersion) {
      transport.setProtocolVersion((init && init.protocolVersion) || initParams.protocolVersion);
    }
    session.notify('notifications/initialized', {});
    s.serverInfo = (init && init.serverInfo) || null;
    if (transport.sessionId) s.sessionId = transport.sessionId;
    const r = await syncTools(s);
    s.toolCount = r.count;
    s.skipped = r.skipped;
    s.status = 'connected';
    startHeartbeat(s);
    console.log('[mcp:' + s.name + '] 已连接，同步', r.count, '个工具');
  }

  async function connectServer(name) {
    await persistenceReady;
    const s = servers.get(name);
    if (!s) return { ok: false, message: '服务器不存在: ' + name };
    if (s.status === 'connecting') return { ok: false, message: '服务器正在连接中' };
    if (s.status === 'connected') {
      try {
        const r = await syncTools(s);
        s.toolCount = r.count;
        s.skipped = r.skipped;
        return { ok: true, message: '服务器 ' + name + ' 已连接，工具已刷新（' + r.count + ' 个）', detail: { toolCount: r.count, skipped: r.skipped } };
      } catch (err) {
        return { ok: false, message: '刷新工具失败: ' + String((err && err.message) || err) };
      }
    }
    s.status = 'connecting';
    s.lastError = null;
    s.stale = false;
    try {
      await doConnect(s);
      return {
        ok: true,
        message: '服务器 ' + name + ' 已连接（' + (s.config.transport === 'http' ? 'HTTP / SSE' : s.config.transport) + '）',
        detail: { serverInfo: s.serverInfo, toolCount: s.toolCount, skipped: s.skipped },
      };
    } catch (err) {
      teardown(s);
      s.status = 'error';
      s.lastError = String((err && err.message) || err);
      console.error('[mcp:' + name + '] 连接失败:', s.lastError);
      return { ok: false, message: '连接失败: ' + s.lastError };
    }
  }

  async function refreshServer(name) {
    await persistenceReady;
    const s = servers.get(name);
    if (!s) return { ok: false, message: '服务器不存在: ' + name };
    if (s.status !== 'connected' || !s.session) return { ok: false, message: '服务器未连接，无法刷新' };
    try {
      const r = await syncTools(s);
      s.toolCount = r.count;
      s.skipped = r.skipped;
      return { ok: true, message: '工具已刷新（' + r.count + ' 个）', detail: { toolCount: r.count, skipped: r.skipped } };
    } catch (err) {
      return { ok: false, message: '刷新失败: ' + String((err && err.message) || err) };
    }
  }

  // ================= 参数 Schema 转换（对齐 dsh-tools 的 value schema DSL） =================
  function toPropertyMap(root) {
    const out = {};
    if (!root || typeof root !== 'object' || Array.isArray(root)) return out;
    const props = (root.properties && typeof root.properties === 'object' && !Array.isArray(root.properties)) ? root.properties : {};
    const required = new Set(Array.isArray(root.required) ? root.required.filter((x) => typeof x === 'string') : []);
    for (const key of Object.keys(props)) {
      const node = toValueNode(props[key], 0);
      if (!node) continue;
      if (required.has(key)) node.required = true;
      out[key] = node;
    }
    return out;
  }
  function toValueNode(node, depth) {
    if (depth > 12) return null;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
    const out = {};
    for (const k of ['description', 'title', 'default', 'examples']) {
      if (Object.prototype.hasOwnProperty.call(node, k)) out[k] = node[k];
    }
    if (Array.isArray(node.oneOf) && node.oneOf.length >= 2) {
      const branches = [];
      for (const b of node.oneOf) {
        const c = toValueNode(b, depth + 1);
        if (c) branches.push(c);
      }
      if (branches.length >= 2) { out.oneOf = branches; return out; }
    }
    let type = typeof node.type === 'string' ? node.type : undefined;
    if (type === undefined && node.properties && typeof node.properties === 'object' && !Array.isArray(node.properties)) type = 'object';
    if (type === 'object') {
      out.type = 'object';
      out.additionalProperties = (typeof node.additionalProperties === 'boolean') ? node.additionalProperties : true;
      if (node.properties && typeof node.properties === 'object' && !Array.isArray(node.properties)) {
        const properties = {};
        const req = new Set(Array.isArray(node.required) ? node.required.filter((x) => typeof x === 'string') : []);
        for (const key of Object.keys(node.properties)) {
          const c = toValueNode(node.properties[key], depth + 1);
          if (!c) continue;
          if (req.has(key)) c.required = true;
          properties[key] = c;
        }
        if (Object.keys(properties).length) out.properties = properties;
      }
      return out;
    }
    if (type === 'array') {
      out.type = 'array';
      if (node.items && typeof node.items === 'object' && !Array.isArray(node.items)) {
        const c = toValueNode(node.items, depth + 1);
        if (c) out.items = c;
      }
      return out;
    }
    if (['string', 'number', 'integer', 'boolean', 'null', 'json'].includes(type)) {
      out.type = type;
      if (Array.isArray(node.enum) && node.enum.length > 0) {
        const e = node.enum.filter((v) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
        if (e.length > 0) out.enum = e;
      }
      if (Object.prototype.hasOwnProperty.call(node, 'const')) out.const = node.const;
      return out;
    }
    return null;
  }

  // ================= 管理工具（模型可见） =================
  function defineMgmt(name, description, properties, required, fn) {
    const tool = defineTool({
      name,
      description,
      parameters: toPropertyMap({ type: 'object', properties, required: required || [] }),
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (args, value) => [{ type: 'text', text: renderResult(value) }],
      },
      execute: fn,
    });
    return ctx.tools.register(tool);
  }
  const str = (d) => ({ type: 'string', description: d });
  const strArr = (d) => ({ type: 'array', items: { type: 'string' }, description: d });
  const strObj = (d) => ({ type: 'object', description: d });

  defineMgmt('mcp_add', '添加一个 MCP 服务器配置（stdio / http / openapi 三种传输，其中 http 统一支持流式 HTTP 与经典 SSE）。添加后用 mcp_connect 连接，连接后服务器工具会自动注册为模型工具。', {
    name: str('服务器唯一名称（用于后续连接/断开/移除），如 my-filesystem'),
    notes: str('服务器注释（选填，说明用途）'),
    transport: { type: 'string', enum: ['stdio', 'http', 'openapi', 'sse'], description: '传输方式：stdio（本地进程）、http（HTTP / SSE 远程流式传输）、openapi（OpenAPI 规范转工具）' },
    command: str('[stdio] 启动命令，如 npx、node、python、uvx'),
    args: strArr('[stdio] 命令参数列表，如 ["-y", "@modelcontextprotocol/server-filesystem", "C:\\workspace"]'),
    cwd: str('[stdio] 工作目录（默认会话工作区）'),
    env: strObj('环境变量（字符串键值，stdio 会传给子进程；http 一并保存）'),
    url: str('[http] 服务器端点 URL（http(s)://...，自动支持 Streamable HTTP 及 SSE）'),
    headers: strObj('HTTP 请求头（字符串键值，任意传输可用）'),
    token: str('Bearer 令牌，自动附加 Authorization: Bearer <token> 请求头'),
    specUrl: str('[openapi] OpenAPI 规范 URL（JSON 或 YAML）'),
    specText: str('[openapi] OpenAPI 规范 JSON 模式文本（与 specUrl 二选一）'),
    specFile: str('[openapi] 本地 OpenAPI 规范文件路径（JSON 或 YAML，相对会话工作区）'),
    baseUrl: str('[openapi] API 基础 URL（默认取规范的 servers[0].url）'),
    securityType: { type: 'string', enum: ['none', 'bearer', 'basic', 'apiKey'], description: '[openapi] 安全类型：none 无 / bearer Bearer 令牌 / basic 基本认证 / apiKey 自定义请求头' },
    securityToken: str('[openapi] Bearer 令牌值（securityType=bearer 时）'),
    basicUser: str('[openapi] 基本认证用户名（securityType=basic 时）'),
    basicPass: str('[openapi] 基本认证密码（securityType=basic 时）'),
    apiKeyName: str('[openapi] API Key 请求头名称（securityType=apiKey 时）'),
    apiKeyValue: str('[openapi] API Key 值（securityType=apiKey 时）'),
    cookieSession: { type: 'boolean', description: '[openapi] 启用 Cookie 会话处理：保存上游 Set-Cookie 并在后续请求自动携带' },
    prefix: str('注册工具名的前缀（默认用服务器名）'),
  }, ['name', 'transport'], async (args) => {
    try { return addServer(args); } catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  defineMgmt('mcp_connect', '连接一个已添加的 MCP 服务器并同步其工具；已连接时重新同步工具。', {
    name: str('要连接的服务器名称'),
  }, ['name'], async (args) => {
    try { return await connectServer(typeof args.name === 'string' ? args.name : ''); }
    catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  defineMgmt('mcp_disconnect', '断开一个 MCP 服务器并注销其工具（配置保留）。', {
    name: str('要断开的服务器名称'),
  }, ['name'], async (args) => {
    try { return disconnectServer(typeof args.name === 'string' ? args.name : ''); }
    catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  defineMgmt('mcp_refresh', '重新拉取已连接服务器的工具列表并更新注册（服务器通知 tools/list_changed 时也会自动刷新）。', {
    name: str('要刷新的服务器名称'),
  }, ['name'], async (args) => {
    try { return await refreshServer(typeof args.name === 'string' ? args.name : ''); }
    catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  defineMgmt('mcp_remove', '移除一个 MCP 服务器配置（先断开）。', {
    name: str('要移除的服务器名称'),
  }, ['name'], async (args) => {
    try { return removeServer(typeof args.name === 'string' ? args.name : ''); }
    catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  defineMgmt('mcp_list', '列出所有已配置的 MCP 服务器及其状态（传输方式、连接状态、工具数量、错误信息）。', {}, [], async () => {
    try {
      await persistenceReady;
      const serversList = listServers();
      return { ok: true, message: '共 ' + serversList.length + ' 个服务器', detail: serversList };
    } catch (err) { return { ok: false, message: String((err && err.message) || err) }; }
  });

  // ================= Remote 服务（client 面板通信） =================
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

  // ================= 生命周期清理 =================
  ctx.effect(() => async () => {
    for (const s of servers.values()) {
      try { teardown(s); } catch {}
    }
    servers.clear();
    if (bridge) { try { closeBridge(bridge); } catch {} }
    bridge = null;
    bridgePromise = null;
    try {
      await persistenceReady;
      if (persistedDomain) await persistedDomain.close();
    } catch {}
  });

  console.log('[mcp] MCP 管理器已启动（stdio / HTTP·SSE / OpenAPI）');
};

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
