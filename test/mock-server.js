// Mock MCP server for testing the DSH MCP Manager bridge (stdio-free HTTP test).
// Supports: POST /mcp (streamable-HTTP style JSON-RPC) and GET /sse (SSE transport).
import { createServer } from 'node:http';

const PORT = 3897;

function sendJson(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}));
  res.end(body);
}

const server = createServer(function (req, res) {
  const url = req.url || '/';
  if (req.method === 'POST' && url.startsWith('/mcp')) {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { sendJson(res, 400, { error: 'bad json' }); return; }
      const sid = req.headers['mcp-session-id'] || 'sess-abc123';
      // Cookie 会话测试：首次初始化时下发一个 Set-Cookie，后续请求要求携带
      const extra = {};
      const seenCookie = req.headers['cookie'];
      if (!seenCookie && msg.method === 'initialize') {
        extra['Set-Cookie'] = 'mock_session=abc-123; Path=/; HttpOnly';
      } else if (seenCookie && seenCookie.indexOf('mock_session=abc-123') < 0) {
        sendJson(res, 401, { jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'missing cookie' } }, { 'Mcp-Session-Id': sid });
        return;
      }
      if (msg.method === 'initialize') {
        sendJson(res, 200, {
          jsonrpc: '2.0', id: msg.id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: { listChanged: true } },
            serverInfo: { name: 'mock-mcp-server', version: '1.0.0' },
          },
        }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
        return;
      }
      if (msg.method === 'tools/list') {
        sendJson(res, 200, {
          jsonrpc: '2.0', id: msg.id,
          result: {
            tools: [
              { name: 'echo', description: '回显输入的 text 字段', inputSchema: { type: 'object', properties: { text: { type: 'string', description: '要回显的内容' } }, required: ['text'] } },
              { name: 'add', description: '两个数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
            ],
          },
        }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
        return;
      }
      if (msg.method === 'tools/call') {
        const args = (msg.params && msg.params.arguments) || {};
        if (msg.params && msg.params.name === 'add') {
          const sum = Number(args.a || 0) + Number(args.b || 0);
          sendJson(res, 200, { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'sum=' + sum }], structuredContent: { sum: sum } } }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
          return;
        }
        sendJson(res, 200, { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'echo:' + JSON.stringify(args) }], structuredContent: args } }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
        return;
      }
      if (msg.method === 'ping') {
        sendJson(res, 200, { jsonrpc: '2.0', id: msg.id, result: {} }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
        return;
      }
      sendJson(res, 200, { jsonrpc: '2.0', id: msg.id, result: {} }, Object.assign({ 'Mcp-Session-Id': sid }, extra));
    });
    return;
  }
  if (req.method === 'GET' && url.startsWith('/sse')) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write('event: endpoint\ndata: /mcp?sessionId=sse-sess-1\n\n');
    setTimeout(() => {
      res.write('event: message\ndata: {"jsonrpc":"2.0","method":"notifications/message","params":{"level":"info","data":"欢迎使用 mock MCP 服务器"}}\n\n');
    }, 400);
    setTimeout(() => { res.end(); }, 1200);
    return;
  }
  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('mock mcp server listening on http://127.0.0.1:' + PORT);
});
