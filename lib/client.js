// DSH MCP Manager - Client bundle (lazy-CJS factory format).
// Loaded by the dsh.client module system; discovered via package.json dsh.client + exports["./client"].
window.__ModuleLoader__.load({
	id: "dsh-mcp-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		// ── CSS 注入（shipped bundle 同款模式） ──────────────────────────
		const css = ".dshmcp-panel{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);min-width:300px;max-width:640px}.dshmcp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;margin-bottom:8px}.dshmcp-list{display:flex;flex-direction:column;gap:4px}.dshmcp-row{display:flex;align-items:center;gap:6px;padding:5px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1)}.dshmcp-row-main{flex:1;min-width:0}.dshmcp-dot{width:8px;height:8px;border-radius:50%;flex:none}.dshmcp-dot-connected{background:var(--dsw-alias-state-success-primary)}.dshmcp-dot-connecting{background:var(--dsw-alias-state-warn-primary)}.dshmcp-dot-error{background:var(--dsw-alias-state-error-primary)}.dshmcp-dot-configured{background:var(--dsw-alias-label-secondary);opacity:.5}.dshmcp-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshmcp-notes{color:var(--dsw-alias-label-secondary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshmcp-transport{color:var(--dsw-alias-label-secondary);font-size:11px;flex:none}.dshmcp-status{color:var(--dsw-alias-label-secondary);flex:none;font-size:11px}.dshmcp-actions{display:flex;gap:4px;flex:none}.dshmcp-btn{font-size:11px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer}.dshmcp-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary)}.dshmcp-btn:disabled{opacity:.5;cursor:default}.dshmcp-btn-primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.dshmcp-btn-danger:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.dshmcp-hint{color:var(--dsw-alias-label-secondary);font-size:11px;padding:2px 0}.dshmcp-error{color:var(--dsw-alias-state-error-primary);font-size:11px;margin:4px 0;word-break:break-all;white-space:pre-wrap}.dshmcp-form{display:flex;flex-direction:column;gap:10px}.dshmcp-field{display:flex;flex-direction:column;gap:3px}.dshmcp-label{font-size:11px;color:var(--dsw-alias-label-secondary)}.dshmcp-label-req::after{content:' *';color:var(--dsw-alias-state-error-primary)}.dshmcp-input{font-size:12px;padding:3px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dshmcp-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}.dshmcp-textarea{font-size:12px;padding:3px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:inherit;resize:vertical;min-height:56px}.dshmcp-type-tabs{display:flex;gap:4px}.dshmcp-type-tab{flex:1;font-size:11px;padding:4px 0;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;text-align:center}.dshmcp-type-tab-active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);font-weight:600}.dshmcp-kv{display:flex;flex-direction:column;gap:4px}.dshmcp-kvrow{display:flex;gap:4px;align-items:center}.dshmcp-kvrow .dshmcp-input{flex:1;min-width:0}.dshmcp-sec{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}.dshmcp-sec input[type=checkbox]{accent-color:var(--dsw-alias-brand-primary)}.dshmcp-form-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}.dshmcp-seg{display:flex;gap:4px}.dshmcp-seg-item{font-size:11px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}.dshmcp-seg-item-active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}";
		const tagId = "dsh-mcp-manager/panel.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-mcp-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		// ── Host 通信：connection.rpc.call("/api", "mcpManager/<method>", { args }) ──
		const STATUS_TEXT = { configured: "未连接", connecting: "连接中", connected: "已连接", error: "错误" };
		const TRANSPORT_TEXT = { stdio: "STDIO", sse: "SSE", http: "流式 HTTP", openapi: "OpenAPI" };

		function makeApi(ctx) {
			const call = (method, args) => {
				const connection = ctx.get("connection");
				if (connection === undefined) return Promise.reject(new Error("连接服务不可用"));
				return connection.rpc.call("/api", "mcpManager/" + method, { args: args || {} }, undefined)
					.then((res) => {
						if (res && res.ok) return res.value;
						throw new Error((res && res.error && res.error.message) || "调用失败");
					});
			};
			return {
				status: () => call("list"),
				save: (payload) => call("save", { payload }),
				connect: (name) => call("connect", { serverName: name }),
				disconnect: (name) => call("disconnect", { serverName: name }),
				remove: (name) => call("remove", { serverName: name }),
			};
		}

		// ── 组件 ──────────────────────────────────────────────────────────
		let kvSeq = 1;
		const newKv = () => ({ id: "kv" + (kvSeq++), k: "", v: "" });
		const kvToObj = (list) => {
			const out = {};
			for (const it of list) { if (it.k.trim()) out[it.k.trim()] = it.v; }
			return out;
		};

		function KeyValueList(props) {
			const items = props.items || [];
			const setItems = props.setItems;
			const setOne = (id, field, value) => setItems(items.map((it) => (it.id === id ? Object.assign({}, it, { [field]: value }) : it)));
			const remove = (id) => setItems(items.filter((it) => it.id !== id));
			const add = () => setItems(items.concat([newKv()]));
			const rows = items.map((it) => react.createElement("div", { key: it.id, className: "dshmcp-kvrow" },
				react.createElement("input", { className: "dshmcp-input", placeholder: props.keyPlaceholder || "名称", value: it.k, onChange: (e) => setOne(it.id, "k", e.target.value) }),
				react.createElement("input", { className: "dshmcp-input", placeholder: props.valuePlaceholder || "值", value: it.v, onChange: (e) => setOne(it.id, "v", e.target.value) }),
				react.createElement("button", { className: "dshmcp-btn dshmcp-btn-danger", title: "删除", onClick: () => remove(it.id) }, "✕"),
			));
			return react.createElement("div", { className: "dshmcp-kv" },
				rows,
				react.createElement("button", { className: "dshmcp-btn", onClick: add }, "+ 添加" + (props.addLabel || "")),
			);
		}

		function AddServerForm(props) {
			const [name, setName] = react.useState("");
			const [notes, setNotes] = react.useState("");
			const [transport, setTransport] = react.useState("stdio");
			const [command, setCommand] = react.useState("");
			const [argsText, setArgsText] = react.useState("");
			const [url, setUrl] = react.useState("");
			const [specMode, setSpecMode] = react.useState("url");
			const [specUrl, setSpecUrl] = react.useState("");
			const [specJson, setSpecJson] = react.useState("");
			const [securityType, setSecurityType] = react.useState("none");
			const [securityToken, setSecurityToken] = react.useState("");
			const [basicUser, setBasicUser] = react.useState("");
			const [basicPass, setBasicPass] = react.useState("");
			const [apiKeyName, setApiKeyName] = react.useState("");
			const [apiKeyValue, setApiKeyValue] = react.useState("");
			const [cookieSession, setCookieSession] = react.useState(false);
			const [headers, setHeaders] = react.useState([]);
			const [envs, setEnvs] = react.useState([]);
			const [error, setError] = react.useState(null);
			const [saving, setSaving] = react.useState(false);
			const validate = () => {
				if (!name.trim()) return "请填写服务器名称";
				if (transport === "stdio") {
					if (!command.trim()) return "STDIO 类型需要填写启动命令";
				} else if (transport === "sse" || transport === "http") {
					if (!url.trim() || !/^https?:\/\//i.test(url.trim())) return (TRANSPORT_TEXT[transport] || transport) + " 类型需要填写有效的服务器 URL（http(s)://...）";
				} else {
					if (specMode === "url") {
						if (!specUrl.trim()) return "OpenAPI 类型需要填写规范 URL";
					} else if (!specJson.trim()) {
						return "OpenAPI 类型需要粘贴 JSON 模式文本";
					}
				}
				return null;
			};
			const submit = () => {
				const err = validate();
				if (err) { setError(err); return; }
				setSaving(true);
				const payload = {
					name: name.trim(),
					notes: notes.trim(),
					transport,
					command: command.trim(),
					args: argsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
					url: url.trim(),
					specMode,
					specUrl: specMode === "url" ? specUrl.trim() : undefined,
					specText: specMode === "json" ? specJson : undefined,
					securityType,
					securityToken: securityType === "bearer" ? securityToken : undefined,
					basicUser: securityType === "basic" ? basicUser : undefined,
					basicPass: securityType === "basic" ? basicPass : undefined,
					apiKeyName: securityType === "apiKey" ? apiKeyName : undefined,
					apiKeyValue: securityType === "apiKey" ? apiKeyValue : undefined,
					cookieSession,
					headers: kvToObj(headers),
					env: kvToObj(envs),
				};
				props.api.save(payload).then((r) => {
					if (r && r.ok) { props.onSaved(); return; }
					setError((r && r.message) || "保存失败");
				}).catch((e) => { setError(String((e && e.message) || e)); }).then(() => setSaving(false));
			};
			const kv = (items, setItems, ph) => react.createElement(KeyValueList, { items: items, setItems: setItems, keyPlaceholder: ph || "名称", valuePlaceholder: "值" });
			const field = (label, required, children) => react.createElement("div", { className: "dshmcp-field" },
				react.createElement("span", { className: required ? "dshmcp-label dshmcp-label-req" : "dshmcp-label" }, label),
				children,
			);
			const typeTabs = ["stdio", "sse", "http", "openapi"].map((t) => react.createElement("button", {
				key: t, className: "dshmcp-type-tab" + (transport === t ? " dshmcp-type-tab-active" : ""),
				onClick: () => { setTransport(t); setError(null); },
			}, TRANSPORT_TEXT[t]));
			let dynamic = null;
			if (transport === "stdio") {
				dynamic = react.createElement(react.Fragment, null,
					field("启动命令", true, react.createElement("input", { className: "dshmcp-input", placeholder: "如 npx、node、python、uvx", value: command, onChange: (e) => setCommand(e.target.value) })),
					field("命令参数", false, react.createElement("textarea", { className: "dshmcp-textarea", placeholder: "每行一个参数", value: argsText, onChange: (e) => setArgsText(e.target.value) })),
					field("环境变量", false, kv(envs, setEnvs, "变量名")),
				);
			} else if (transport === "sse" || transport === "http") {
				dynamic = react.createElement(react.Fragment, null,
					field("服务器 URL", true, react.createElement("input", { className: "dshmcp-input", placeholder: "https://example.com/mcp", value: url, onChange: (e) => setUrl(e.target.value) })),
					field("HTTP 请求头", false, kv(headers, setHeaders, "请求头名称")),
					field("环境变量", false, kv(envs, setEnvs, "变量名")),
				);
			} else {
				dynamic = react.createElement(react.Fragment, null,
					field("输入方式", false, react.createElement("div", { className: "dshmcp-seg" },
						react.createElement("button", { className: "dshmcp-seg-item" + (specMode === "url" ? " dshmcp-seg-item-active" : ""), onClick: () => setSpecMode("url") }, "规范 URL"),
						react.createElement("button", { className: "dshmcp-seg-item" + (specMode === "json" ? " dshmcp-seg-item-active" : ""), onClick: () => setSpecMode("json") }, "JSON 模式"),
					)),
					specMode === "url"
						? field("OpenAPI 规范地址", true, react.createElement("input", { className: "dshmcp-input", placeholder: "https://example.com/openapi.json", value: specUrl, onChange: (e) => setSpecUrl(e.target.value) }))
						: field("JSON 模式文本", true, react.createElement("textarea", { className: "dshmcp-textarea", placeholder: "粘贴 OpenAPI 规范 JSON 文本", value: specJson, onChange: (e) => setSpecJson(e.target.value) })),
					field("安全类型", false, react.createElement("select", { className: "dshmcp-input", value: securityType, onChange: (e) => setSecurityType(e.target.value) },
						react.createElement("option", { value: "none" }, "无"),
						react.createElement("option", { value: "bearer" }, "Bearer Token"),
						react.createElement("option", { value: "basic" }, "Basic 认证"),
						react.createElement("option", { value: "apiKey" }, "API Key"),
					)),
					securityType === "bearer" ? field("Token", false, react.createElement("input", { className: "dshmcp-input", placeholder: "Bearer 令牌", value: securityToken, onChange: (e) => setSecurityToken(e.target.value) })) : null,
					securityType === "basic" ? react.createElement(react.Fragment, null,
						field("用户名", false, react.createElement("input", { className: "dshmcp-input", value: basicUser, onChange: (e) => setBasicUser(e.target.value) })),
						field("密码", false, react.createElement("input", { className: "dshmcp-input", type: "password", value: basicPass, onChange: (e) => setBasicPass(e.target.value) })),
					) : null,
					securityType === "apiKey" ? react.createElement(react.Fragment, null,
						field("请求头名称", false, react.createElement("input", { className: "dshmcp-input", placeholder: "如 X-API-Key", value: apiKeyName, onChange: (e) => setApiKeyName(e.target.value) })),
						field("请求头值", false, react.createElement("input", { className: "dshmcp-input", value: apiKeyValue, onChange: (e) => setApiKeyValue(e.target.value) })),
					) : null,
					field("Cookie 会话处理", false, react.createElement("label", { className: "dshmcp-sec" },
						react.createElement("input", { type: "checkbox", checked: cookieSession, onChange: (e) => setCookieSession(e.target.checked) }),
						"保存上游响应中的 Set-Cookie，并在后续请求中自动携带",
					)),
					field("HTTP 请求头", false, kv(headers, setHeaders, "请求头名称")),
				);
			}
			return react.createElement("div", { className: "dshmcp-form" },
				react.createElement("div", { className: "dshmcp-head" },
					react.createElement("span", null, "添加服务器"),
					react.createElement("button", { className: "dshmcp-btn", onClick: props.onCancel }, "返回"),
				),
				field("服务器名称", true, react.createElement("input", { className: "dshmcp-input", placeholder: "用于标识服务器", value: name, onChange: (e) => setName(e.target.value) })),
				field("服务器注释", false, react.createElement("input", { className: "dshmcp-input", placeholder: "选填，说明服务器用途", value: notes, onChange: (e) => setNotes(e.target.value) })),
				field("连接类型", false, react.createElement("div", { className: "dshmcp-type-tabs" }, typeTabs)),
				dynamic,
				error ? react.createElement("div", { className: "dshmcp-error" }, error) : null,
				react.createElement("div", { className: "dshmcp-form-foot" },
					react.createElement("button", { className: "dshmcp-btn", onClick: props.onCancel, disabled: saving }, "取消"),
					react.createElement("button", { className: "dshmcp-btn dshmcp-btn-primary", onClick: submit, disabled: saving }, saving ? "保存中…" : "保存"),
				),
			);
		}

		function McpPanel(props) {
			const api = props.api;
			const [servers, setServers] = react.useState([]);
			const [loading, setLoading] = react.useState(true);
			const [error, setError] = react.useState(null);
			const [busy, setBusy] = react.useState("");
			const [adding, setAdding] = react.useState(false);
			const refresh = react.useCallback(() => {
				api.status().then((r) => {
					setServers((r && Array.isArray(r.servers)) ? r.servers : []);
					setError(null);
				}).catch((e) => { setError(String((e && e.message) || e)); }).then(() => setLoading(false));
			}, [api]);
			react.useEffect(() => {
				refresh();
				const t = window.setInterval(refresh, 5000);
				return () => window.clearInterval(t);
			}, [refresh]);
			const act = function (method, name) {
				setBusy(name + ":" + method);
				api[method](name).then(refresh).catch(function (e) {
					setError(String((e && e.message) || e));
					setLoading(false);
				}).then(function () { setBusy(""); });
			};
			if (adding) {
				return react.createElement(AddServerForm, {
					api: api,
					onCancel: () => setAdding(false),
					onSaved: () => { setAdding(false); refresh(); },
				});
			}
			const rows = servers.map(function (s) {
				const buttons = [];
				if (s.status === "connected") {
					buttons.push(react.createElement("button", { key: "d", className: "dshmcp-btn", disabled: busy !== "", onClick: function () { act("disconnect", s.name); } }, "断开"));
				} else {
					buttons.push(react.createElement("button", { key: "c", className: "dshmcp-btn dshmcp-btn-primary", disabled: busy !== "", onClick: function () { act("connect", s.name); } }, "连接"));
				}
				buttons.push(react.createElement("button", { key: "r", className: "dshmcp-btn dshmcp-btn-danger", disabled: busy !== "", onClick: function () { act("remove", s.name); } }, "移除"));
				let status = STATUS_TEXT[s.status] || s.status;
				if (s.status === "connected") status += " · " + (s.toolCount || 0) + " 工具";
				if (s.stale) status += "（失联）";
				return react.createElement("div", { key: s.name, className: "dshmcp-row", title: s.lastError || "" },
					react.createElement("span", { className: "dshmcp-dot dshmcp-dot-" + s.status }),
					react.createElement("div", { className: "dshmcp-row-main" },
						react.createElement("div", { className: "dshmcp-name" }, s.name),
						s.notes ? react.createElement("div", { className: "dshmcp-notes" }, s.notes) : null,
					),
					react.createElement("span", { className: "dshmcp-transport" }, TRANSPORT_TEXT[s.transport] || s.transport),
					react.createElement("span", { className: "dshmcp-status" }, status),
					react.createElement("span", { className: "dshmcp-actions" }, buttons),
				);
			});
			const body = loading
				? react.createElement("div", { className: "dshmcp-hint" }, "加载中…")
				: (rows.length
					? react.createElement("div", { className: "dshmcp-list" }, rows)
					: react.createElement("div", { className: "dshmcp-hint" }, "尚未添加 MCP 服务器，点击下方「添加服务器」开始配置。"));
			return react.createElement("div", { className: "dshmcp-panel" },
				react.createElement("div", { className: "dshmcp-head" },
					react.createElement("span", null, "MCP 服务器管理"),
					react.createElement("div", { className: "dshmcp-actions" },
						react.createElement("button", { className: "dshmcp-btn", onClick: function () { setLoading(true); refresh(); } }, "刷新"),
						react.createElement("button", { className: "dshmcp-btn dshmcp-btn-primary", onClick: function () { setAdding(true); setError(null); } }, "添加服务器"),
					),
				),
				error ? react.createElement("div", { className: "dshmcp-error" }, String(error)) : null,
				body,
			);
		}

		/** 浏览器半边插件：注册设置页入口。 */
		function apply(ctx) {
			const api = makeApi(ctx);
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "mcp-servers",
				order: 30,
				label: "MCP 服务器",
			}, (props) => react.createElement(McpPanel, { api: api }))), "dsh-mcp-manager: settings section");
		}

		const inject = ["slots", "connection"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
