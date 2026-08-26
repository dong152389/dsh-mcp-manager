# Security and permission boundary

`dsh-mcp-manager` runs inside the DSH Web Host process and inherits that process's operating-system permissions. It is intentionally a high-privilege, user-reviewed integration: it manages user-selected MCP services, local child processes, remote HTTP/SSE services, and credentials supplied by the user.

## Permission matrix

| Surface | Scope | Boundary and failure behavior |
| --- | --- | --- |
| Filesystem read | A user-selected local OpenAPI specification through DSH `fs` | The path is resolved relative to the selected workspace when applicable. Invalid or unavailable files fail the operation. |
| Persistent state | MCP server configuration through DSH `storageDomain` | The plugin owns the `dsh_mcp_manager` storage domain. Profile configuration and DSH core files are not modified by runtime code. |
| Commands | User-selected STDIO MCP executable plus the plugin's Node HTTP Bridge | Executables are resolved and started with argument arrays, not shell command strings. A user-provided command can still have the operating-system permissions of the DSH process. |
| Network | User-selected HTTP, SSE, and OpenAPI URLs | There is no fixed service allowlist. Request and stream failures are bounded by timeouts and reconnect handling; the plugin does not expose a public listener. |
| Credentials | User-supplied headers, Bearer token, Basic credentials, API key, and Cookie session | Credentials are used for the configured upstream and may be persisted with that server configuration. The plugin does not collect unrelated credentials or send data to a project-owned service. |
| DSH lifecycle | None at runtime | The Bundle Patch only inserts the plugin's own `mcp-manager` entry. Installation, restart, removal, and rollback are separate DSH CLI operations. |

## Non-goals

- Do not modify DSH core packages, official inventory, or other plugin definitions.
- Do not execute arbitrary shell strings, installers, package lifecycle scripts, or remote downloads.
- Do not accept an MCP connection without an explicit user or agent configuration.
- Do not claim that static source checks or a disposable Profile run are an independent security audit.

Because this plugin can start local processes, reach arbitrary user-selected network services, and handle credentials, the appropriate marketplace posture is `user-reviewed` or `blocked`, not automatic low-risk approval.
