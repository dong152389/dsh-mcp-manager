# Disposable DSH Profile evidence

This record describes the isolated acceptance target for `dsh-mcp-manager` `0.1.2`.

- Checked: 2026-08-26 (Asia/Shanghai)
- DSH: `0.1.1-rc.2`
- Node.js: `v24.16.0`
- Host: Windows
- Profile: temporary `web` Profile under a temporary `DSH_HOME`; the real user Profile was not used

## Results

| Operation | Result | Observable evidence |
| --- | --- | --- |
| Install | PASS | After `npm install --ignore-scripts`, `dsh plugin --profile web add link:.` completed; `dsh web --dump-config` contained the unique `mcp-manager` entry. |
| Start | PASS | The final `0.1.2` working-tree bundle booted `dsh web`, reported `http://127.0.0.1:3080`, logged strict `mcpManager` registration, restored zero configured servers, and returned HTTP `200` from the local Web endpoint. |
| Uninstall | PASS | `dsh plugin --profile web remove dsh-mcp-manager` completed; a subsequent config dump contained no `mcp-manager` entry. |

This is disposable-Profile evidence only. It does not claim a real user Profile installation, a third-party security audit, or compatibility with DSH releases other than `0.1.1-rc.2`.
