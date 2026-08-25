# dsh-mcp-manager

DeepSeek Harness (DSH) 的 MCP 服务器管理插件：支持 **stdio / SSE / Streamable HTTP** 三种 MCP 传输，以及将 **OpenAPI** 规范转换为模型工具。连接服务器后，其工具会自动注册为模型可调用的工具。

## 功能特性

- **四种接入方式**
  - `stdio`：派生本地进程（`npx` / `node` / `python` / `uvx` 等），JSON-RPC 2.0 over NDJSON
  - `sse`：经典 SSE 传输（`endpoint` 事件 + POST 消息端点），支持 sessionId 与断线自动重连（3 次退避）
  - `http`：Streamable HTTP（单端点 POST，`Mcp-Session-Id` 会话、JSON/SSE 双响应、202+Location 异步轮询）
  - `openapi`：从规范 URL / 本地文件 / JSON 模式文本加载 OpenAPI（JSON 与常见 YAML 子集），`paths` 自动转换为模型工具，支持 `$ref` 解析、安全类型（Bearer / Basic / API Key）、Cookie 会话处理
- **工具自动同步**：`tools/list` → 自动注册 `<前缀>_<工具名>`；收到 `notifications/tools/list_changed` 自动刷新
- **可靠性**：请求取消（`notifications/cancelled`）、心跳（SSE/HTTP 每 30s ping）、超时与错误分级
- **管理工具**（注册为模型工具）：`mcp_add` / `mcp_list` / `mcp_connect` / `mcp_disconnect` / `mcp_refresh` / `mcp_remove`
- **设置页管理面板**（正式插件 client 面）：设置 →「MCP 服务器」，提供添加服务器表单（名称/注释、四种类型的动态配置项、请求头/环境变量键值列表、安全类型、Cookie 会话开关）与服务器状态列表

## 安装

### 方式一：npm 包（正式插件，推荐）

```sh
npm install dsh-mcp-manager
# 或直接从 GitHub 安装：
npm install github:dong152389/dsh-mcp-manager
```

**安装到 DSH**（两步 + 重启）：

```sh
# 1. 把包装进 DSH 的 profile（web profile 为例）
dsh plugin --profile web add dsh-mcp-manager
#    本地开发可直接加本地路径（pnpm link，改代码即时生效）：
#    dsh plugin --profile web add "C:\path\to\dsh-mcp-manager"
```

> 想直接用 `npm install github:dong152389/dsh-mcp-manager` 也可以，但**必须在 profile 目录里执行**
> （`cd "$DSH_HOME/profiles/web" && npm install github:dong152389/dsh-mcp-manager`），
> 效果与 `dsh plugin --profile web add` 相同。不要装到别处——插件要在 profile 的
> `node_modules` 里才能被 DSH 加载器解析到（其 peer 依赖 `@deepseek-ai/dsh-tools` 等
> 由 profile 提供）。

```sh
# 2. 在组合补丁文件 $DSH_HOME/cordis.patch.yml 中注册插件行。
#    注意：新增行必须用 insert 列表（组合中不存在该 id，覆盖行写法会报
#    "entry ... not found"）：
#    - insert:
#        - id: mcp-manager
#          name: dsh-mcp-manager

# 3. 重启 DSH 生效
```

> 宿主组合文件是 **`cordis.patch.yml`**（`$DSH_HOME/cordis.patch.yml` 对默认 profile 生效；`profiles/<name>/cordis.patch.yml` 仅对该 profile 生效），**不是** `cordis.yml`——`cordis.yml` 是各 profile 的组合根（一般保持为空），patch 层负责增改行。

### 常见问题（Troubleshooting）

| 现象 | 原因与解决 |
| --- | --- |
| `dsh web` 报 `unsupported JSON schema: parameters.type must be a value schema object` | 插件版本过旧（v0.1.0 的 schema 转换 bug）。升级：`dsh plugin --profile web add dsh-mcp-manager@latest`（或重新 `npm install github:dong152389/dsh-mcp-manager`） |
| `dsh web` 报 `Cannot find package '@deepseek-ai/dsh-tools'` | 包装到了 profile 之外（peer 依赖解析不到）。按上面第 1 步用 `dsh plugin --profile web add` 重装 |
| 报 `entry "mcp-manager" not found` | patch 里用了覆盖行写法，新增行必须用 `- insert:` 列表（见上） |
| 设置里没有「MCP 服务器」页面 | 插件 Host 面已加载但 Client 面未生效：检查是否重启过 DSH；仍无效请确认包版本 ≥ 0.1.0（含 client 面） |

### 方式二：DSH 动态插件（快速试用）

在 DSH 会话中创建一个动态 Cordis 插件，`code.host` 使用以下加载器（需要先把本仓库的 `impl.js` 与 `lib/bridge.js` 放到本机固定路径，并修改加载器中的绝对路径）：

```js
return {
  inject: ['timer', 'subprocess', 'fs'],
  async apply(ctx) {
    const fs = ctx.fs;
    const target = await fs.resolve('C:\\path\\to\\impl.js', {});
    const source = await fs.readText(target);
    const init = eval('(' + source.trim().replace(/;+\s*$/, '') + ')');
    return init(ctx, harness);
  },
};
```

> 动态插件版与正式版共用同一份实现源码（`impl.js`），正式版通过 `scripts/build-formal.mjs` 生成。改动 `impl.js` 后运行 `npm run build:formal` 重新生成 `lib/index.js`。

## 使用示例

添加服务器后连接，服务器工具即注册为模型工具：

```
mcp_add      { name: "my-fs", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "C:\\workspace"] }
mcp_add      { name: "my-sse", transport: "sse", url: "https://example.com/sse", token: "sk-..." }
mcp_add      { name: "my-http", transport: "http", url: "https://example.com/mcp", headers: {"X-Key": "..."} }
mcp_add      { name: "petstore", transport: "openapi", specUrl: "https://petstore.swagger.io/v2/swagger.json", baseUrl: "https://petstore.swagger.io/v2", securityType: "apiKey", apiKeyName: "api_key", apiKeyValue: "..." }
mcp_connect  { name: "my-http" }   # 之后 my_http_xxx 工具可直接调用
```

OpenAPI 服务器还支持 `specText`（JSON 模式文本）、`specFile`（本地文件）、`cookieSession`（保存 Set-Cookie 并自动携带）。

### 管理工具一览

| 工具 | 说明 |
| --- | --- |
| `mcp_add` | 添加服务器（名称、注释、传输类型与对应配置） |
| `mcp_list` | 列出所有服务器及状态 |
| `mcp_connect` | 连接并同步工具（已连接时刷新） |
| `mcp_disconnect` | 断开并注销工具（配置保留） |
| `mcp_refresh` | 重新拉取工具列表 |
| `mcp_remove` | 移除配置 |

## 目录结构

```
dsh-mcp-manager/
├── lib/
│   ├── index.js        # 正式插件 Host 面（ESM，导出 name/inject/apply）
│   ├── client.js       # 正式插件 Client 面（lazy-CJS bundle，设置页面板）
│   └── bridge.js       # Node HTTP 桥（子进程，NDJSON 协议，支持请求头/SSE 流/取消）
├── impl.js             # 动态插件版实现源码（正式版 Host 面由它生成）
├── scripts/
│   └── build-formal.mjs # impl.js → lib/index.js 转换脚本
└── test/
    ├── mock-server.js  # 本地 mock MCP 服务器（流式 HTTP + SSE + Set-Cookie）
    └── test-*.jsonl    # 桥接测试用例（node test/mock-server.js 后管道喂给 lib/bridge.js）
```

## 工作原理

宿主沙箱（动态插件）没有 `fetch` / `require`，因此 HTTP 传输通过一个惰性启动的 Node 子进程桥实现：

```
插件 (cordis) ──NDJSON──▶ node lib/bridge.js ──fetch──▶ MCP 服务器
     ▲                                                        │
     └────────────────────NDJSON 响应/SSE 事件────────────────┘
```

- `request` 操作：完整收集响应（状态、头、正文、SSE 标记）
- `sse` 操作：长连接流式解析（`endpoint` / `message` 事件），支持取消

stdio 传输则直接通过 DSH 的 `subprocess` 服务派生 MCP 进程，NDJSON 帧与 JSON-RPC 在同一套会话逻辑中处理。

Client 面（设置页面板）通过 `TypertRemoteService`（`@deepseek-ai/dsh-typert-protocol`）暴露 `mcpManager` Remote 服务，浏览器 bundle 经 `connection.rpc.call("/api", ...)` 与 Host 通信（纯 JS 以模拟 decorator context 的方式写入 `@Remote` 标记，走 Gateway 的 SRC 路由）。

## Roadmap

- [ ] 服务器配置持久化（当前为进程内内存）
- [ ] MCP 资源（resources/list）与提示（prompts/list）同步

## License

MIT
