// DSH MCP Manager - Client bundle (lazy-CJS factory format).
window.__ModuleLoader__.load({
  id: "dsh-mcp-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");
    const h = (type, props, ...children) => react.createElement(type, props, ...children);

    const css = String.raw`
/* === Root Container === */
.dshmcp-panel {
  box-sizing: border-box;
  width: min(100%, 820px);
  color: var(--dsw-alias-label-primary, #1f2328);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  padding: 4px 2px 24px;
}
.dshmcp-panel * { box-sizing: border-box; }

/* === Header === */
.dshmcp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 6px 0 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}
.dshmcp-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.dshmcp-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  color: var(--dsw-alias-brand-primary, #2563eb);
  flex-shrink: 0;
  margin-top: 2px;
}
.dshmcp-title-wrap { display: flex; flex-direction: column; }
.dshmcp-title {
  font-size: 18px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--dsw-alias-label-primary, #111827);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dshmcp-tag-version {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-secondary, #6b7280);
}
.dshmcp-subtitle {
  max-width: 520px;
  margin-top: 4px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.5;
}
.dshmcp-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

/* === Buttons === */
.dshmcp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.14));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.dshmcp-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  color: var(--dsw-alias-brand-primary, #2563eb);
}
.dshmcp-btn:active:not(:disabled) {
  transform: translateY(1px);
}
.dshmcp-btn:focus-visible, .dshmcp-input:focus-visible, .dshmcp-textarea:focus-visible, .dshmcp-select:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #2563eb);
  outline-offset: 2px;
}
.dshmcp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.dshmcp-btn-primary {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  background: var(--dsw-alias-brand-primary, #2563eb);
  color: var(--dsw-alias-label-on-brand, #ffffff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.dshmcp-btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
  background: var(--dsw-alias-brand-primary, #2563eb);
  color: var(--dsw-alias-label-on-brand, #ffffff);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
}
.dshmcp-btn-danger {
  color: var(--dsw-alias-state-error-primary, #ef4444);
  border-color: transparent;
  background: transparent;
}
.dshmcp-btn-danger:hover:not(:disabled) {
  border-color: var(--dsw-alias-state-error-primary, #ef4444);
  background: rgba(239, 68, 68, 0.08);
  color: var(--dsw-alias-state-error-primary, #ef4444);
}
.dshmcp-btn-sm {
  min-height: 28px;
  padding: 4px 9px;
  font-size: 11.5px;
}

/* === Metrics Summary Bar === */
.dshmcp-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 0 16px;
}
.dshmcp-metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
}
.dshmcp-metric-val {
  color: var(--dsw-alias-label-primary, #111827);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.dshmcp-metric-active {
  color: var(--dsw-alias-state-success-primary, #10b981);
}
.dshmcp-summary-sync {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* === Server Cards List === */
.dshmcp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dshmcp-card {
  padding: 16px 18px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.09));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}
.dshmcp-card:hover {
  border-color: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.18));
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
}
.dshmcp-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.dshmcp-identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

/* Status Pill with Dot */
.dshmcp-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}
.dshmcp-status-pill-connected {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.dshmcp-status-pill-connecting {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.dshmcp-status-pill-error {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.dshmcp-status-pill-configured {
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  color: var(--dsw-alias-label-secondary, #6b7280);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}

.dshmcp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.dshmcp-dot-pulse {
  animation: dshmcp-pulse 2s infinite;
}
@keyframes dshmcp-pulse {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.dshmcp-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.dshmcp-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dshmcp-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #111827);
  letter-spacing: -0.01em;
}
.dshmcp-prefix-badge {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  color: var(--dsw-alias-label-secondary, #6b7280);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));
}
.dshmcp-notes {
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}

/* Transport Badge */
.dshmcp-transport-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  color: var(--dsw-alias-label-primary, #374151);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.2;
  flex-shrink: 0;
}
.dshmcp-transport-badge-http {
  color: var(--dsw-alias-brand-primary, #2563eb);
  border-color: rgba(37, 99, 235, 0.2);
  background: rgba(37, 99, 235, 0.05);
}
.dshmcp-transport-badge-openapi {
  color: #0891b2;
  border-color: rgba(8, 145, 178, 0.2);
  background: rgba(8, 145, 178, 0.05);
}

/* Card Body & Snippet */
.dshmcp-card-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshmcp-snippet {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #4b5563);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshmcp-snippet-icon { opacity: 0.6; flex-shrink: 0; }
.dshmcp-snippet-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dshmcp-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 12px;
  margin-top: 6px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));
}
.dshmcp-card-meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dshmcp-tools-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #059669;
  font-size: 11.5px;
  font-weight: 600;
}
.dshmcp-warn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11px;
}
.dshmcp-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Card Error */
.dshmcp-card-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--dsw-alias-state-error-primary, #dc2626);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}
.dshmcp-card-error-icon { flex-shrink: 0; margin-top: 1px; }

/* === Empty State / Hint === */
.dshmcp-empty {
  padding: 36px 20px;
  border: 1.5px dashed var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.15));
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dshmcp-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-brand-primary, #2563eb);
  margin-bottom: 14px;
}
.dshmcp-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #111827);
  margin-bottom: 6px;
}
.dshmcp-empty-copy {
  max-width: 440px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12.5px;
  line-height: 1.5;
  margin-bottom: 20px;
}
.dshmcp-quickstart {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 620px;
  margin-top: 20px;
  text-align: left;
}
.dshmcp-quick-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));
}
.dshmcp-quick-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #111827);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dshmcp-quick-desc {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  line-height: 1.3;
}

/* === Global Alert / Error === */
.dshmcp-alert-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: var(--dsw-alias-state-error-primary, #dc2626);
  font-size: 12.5px;
  word-break: break-word;
}

/* === Form Section & Inputs === */
.dshmcp-form {
  padding: 20px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.1));
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}
.dshmcp-form-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}
.dshmcp-form-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #111827);
}
.dshmcp-form-copy {
  margin-top: 4px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
}
.dshmcp-form-section {
  margin-bottom: 22px;
}
.dshmcp-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: var(--dsw-alias-label-primary, #111827);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.dshmcp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.dshmcp-label {
  color: var(--dsw-alias-label-secondary, #374151);
  font-size: 12px;
  font-weight: 600;
}
.dshmcp-label-req::after {
  content: ' *';
  color: var(--dsw-alias-state-error-primary, #ef4444);
}
.dshmcp-field-hint {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  line-height: 1.3;
}

.dshmcp-input, .dshmcp-select, .dshmcp-textarea {
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #111827);
  font: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.dshmcp-input:focus, .dshmcp-select:focus, .dshmcp-textarea:focus {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  outline: none;
}
.dshmcp-input, .dshmcp-select {
  min-height: 36px;
  padding: 7px 11px;
}
.dshmcp-textarea {
  min-height: 80px;
  padding: 8px 11px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.4;
}
.dshmcp-input::placeholder, .dshmcp-textarea::placeholder {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}

/* 3-Card Transport Selector */
.dshmcp-type-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.dshmcp-type-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.14));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-secondary, #6b7280);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dshmcp-type-card:hover {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  background: var(--dsw-alias-bg-layer-2, #f8fafc);
}
.dshmcp-type-card-active {
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  background: rgba(37, 99, 235, 0.04);
  color: var(--dsw-alias-brand-primary, #2563eb);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, #2563eb);
}
.dshmcp-type-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #111827);
}
.dshmcp-type-card-active .dshmcp-type-card-title {
  color: var(--dsw-alias-brand-primary, #2563eb);
}
.dshmcp-type-card-desc {
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--dsw-alias-label-secondary, #6b7280);
}

/* Callout Info Tip */
.dshmcp-callout-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 7px;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.18);
  color: var(--dsw-alias-brand-primary, #1d4ed8);
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 12px;
}

/* Key-Value Editor */
.dshmcp-kv {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshmcp-kvrow {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.dshmcp-kvrow .dshmcp-input {
  min-width: 0;
}
.dshmcp-kvrow .dshmcp-input:nth-child(1) {
  flex: 1 1 0;
}
.dshmcp-kvrow .dshmcp-input:nth-child(2) {
  flex: 1.4 1 0;
}
.dshmcp-kv-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.14));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-state-error-primary, #ef4444);
  cursor: pointer;
  transition: all 0.15s ease;
}
.dshmcp-kv-del:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--dsw-alias-state-error-primary, #ef4444);
  color: var(--dsw-alias-state-error-primary, #ef4444);
  transform: translateY(-1px);
}
.dshmcp-kv-del:active:not(:disabled) {
  transform: translateY(1px);
}
.dshmcp-add-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px dashed var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.2));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  color: var(--dsw-alias-brand-primary, #2563eb);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 2px;
}
.dshmcp-add-row:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.06);
  border-color: var(--dsw-alias-brand-primary, #2563eb);
  color: var(--dsw-alias-brand-primary, #2563eb);
}

/* Checkbox & Segmented */
.dshmcp-check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: var(--dsw-alias-label-primary, #374151);
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
}
.dshmcp-check input {
  margin-top: 2px;
  width: 15px;
  height: 15px;
  accent-color: var(--dsw-alias-brand-primary, #2563eb);
}
.dshmcp-seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #f4f5f8);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
  gap: 4px;
}
.dshmcp-seg-item {
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dshmcp-seg-item-active {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-brand-primary, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.dshmcp-form-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}

/* Animations */
.dshmcp-spin {
  animation: dshmcp-rotate 1s linear infinite;
}
@keyframes dshmcp-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 680px) {
  .dshmcp-header, .dshmcp-form-header { flex-direction: column; }
  .dshmcp-header > .dshmcp-actions { width: 100%; justify-content: flex-start; }
  .dshmcp-type-cards { grid-template-columns: 1fr; }
  .dshmcp-quickstart { grid-template-columns: 1fr; }
}
`;

    const tagId = "dsh-mcp-manager/panel.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-mcp-manager";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    const Icons = {
      Server: () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("rect", { x: 2, y: 2, width: 20, height: 8, rx: 2, ry: 2 }),
        h("rect", { x: 2, y: 14, width: 20, height: 8, rx: 2, ry: 2 }),
        h("line", { x1: 6, y1: 6, x2: 6.01, y2: 6 }),
        h("line", { x1: 6, y1: 18, x2: 6.01, y2: 18 })
      ),
      Terminal: () => h("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("polyline", { points: "4 17 10 11 4 5" }),
        h("line", { x1: 12, y1: 19, x2: 20, y2: 19 })
      ),
      Globe: () => h("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("circle", { cx: 12, cy: 12, r: 10 }),
        h("line", { x1: 2, y1: 12, x2: 22, y2: 12 }),
        h("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })
      ),
      FileCode: () => h("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
        h("polyline", { points: "14 2 14 8 20 8" }),
        h("polyline", { points: "10 13 8 15 10 17" }),
        h("polyline", { points: "14 13 16 15 14 17" })
      ),
      Plus: () => h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" },
        h("line", { x1: 12, y1: 5, x2: 12, y2: 19 }),
        h("line", { x1: 5, y1: 12, x2: 19, y2: 12 })
      ),
      Refresh: (props) => h("svg", { className: (props && props.spin) ? "dshmcp-spin" : "", width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("polyline", { points: "23 4 23 10 17 10" }),
        h("polyline", { points: "1 20 1 14 7 14" }),
        h("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
      ),
      Trash: () => h("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("polyline", { points: "3 6 5 6 21 6" }),
        h("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
      ),
      Edit: () => h("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
        h("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
      ),
      Zap: () => h("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
      ),
      ArrowLeft: () => h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("line", { x1: 19, y1: 12, x2: 5, y2: 12 }),
        h("polyline", { points: "12 19 5 12 12 5" })
      ),
      Info: () => h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("circle", { cx: 12, cy: 12, r: 10 }),
        h("line", { x1: 12, y1: 16, x2: 12, y2: 12 }),
        h("line", { x1: 12, y1: 8, x2: 12.01, y2: 8 })
      ),
      AlertTriangle: () => h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
        h("line", { x1: 12, y1: 9, x2: 12, y2: 13 }),
        h("line", { x1: 12, y1: 17, x2: 12.01, y2: 17 })
      )
    };

    const STATUS_TEXT = {
      configured: "未连接",
      connecting: "连接中",
      connected: "已连接",
      error: "连接错误"
    };

    const TRANSPORT_TEXT = {
      stdio: "STDIO",
      http: "HTTP / SSE",
      sse: "HTTP / SSE",
      openapi: "OpenAPI"
    };

    function makeApi(ctx) {
      const call = (method, args) => {
        const connection = ctx.get("connection");
        if (connection === undefined) return Promise.reject(new Error("连接服务不可用"));
        return connection.rpc.call("/api", "mcpManager/" + method, { args: args || {} }, undefined).then((res) => {
          if (res && res.ok) return res.value;
          throw new Error((res && res.error && res.error.message) || "调用失败");
        });
      };
      return {
        status: () => call("list"),
        save: (payload) => call("save", { payload }),
        update: (name, payload) => call("update", { serverName: name, payload }),
        connect: (name) => call("connect", { serverName: name }),
        disconnect: (name) => call("disconnect", { serverName: name }),
        remove: (name) => call("remove", { serverName: name }),
      };
    }

    let kvSeq = 1;
    const newKv = (k, v) => ({ id: "kv" + (kvSeq++), k: k || "", v: v === undefined || v === null ? "" : String(v) });
    const objToKv = (obj) => Object.keys(obj || {}).map((key) => newKv(key, obj[key]));
    const kvToObj = (list) => {
      const out = {};
      for (const it of list || []) if (it.k.trim()) out[it.k.trim()] = it.v;
      return out;
    };

    function KeyValueList(props) {
      const items = props.items || [], setItems = props.setItems;
      const setOne = (id, field, value) => setItems(items.map((it) => it.id === id ? Object.assign({}, it, { [field]: value }) : it));
      return h("div", { className: "dshmcp-kv" },
        items.map((it) => h("div", { key: it.id, className: "dshmcp-kvrow" },
          h("input", {
            className: "dshmcp-input",
            placeholder: props.keyPlaceholder || "名称",
            value: it.k,
            onChange: (e) => setOne(it.id, "k", e.target.value),
            "aria-label": props.keyPlaceholder || "名称"
          }),
          h("input", {
            className: "dshmcp-input",
            placeholder: props.valuePlaceholder || "值",
            value: it.v,
            onChange: (e) => setOne(it.id, "v", e.target.value),
            "aria-label": props.valuePlaceholder || "值"
          }),
          h("button", {
            type: "button",
            className: "dshmcp-kv-del",
            title: "移除该项",
            "aria-label": "移除该项",
            onClick: () => setItems(items.filter((x) => x.id !== it.id))
          }, h(Icons.Trash))
        )),
        h("button", {
          type: "button",
          className: "dshmcp-add-row",
          onClick: () => setItems(items.concat([newKv()]))
        }, h(Icons.Plus), "添加" + (props.addLabel || "项"))
      );
    }

    function AddServerForm(props) {
      const initial = props.initial || {}, editing = !!props.editingName;
      const initTransport = initial.transport === "sse" ? "http" : (initial.transport || "stdio");
      const [name, setName] = react.useState(props.editingName || "");
      const [notes, setNotes] = react.useState(initial.notes || "");
      const [transport, setTransport] = react.useState(initTransport);
      const [command, setCommand] = react.useState(initial.command || "");
      const [argsText, setArgsText] = react.useState((initial.args || []).join("\n"));
      const [cwd, setCwd] = react.useState(initial.cwd || "");
      const [url, setUrl] = react.useState(initial.url || "");
      const [specMode, setSpecMode] = react.useState(initial.specText ? "json" : "url");
      const [specUrl, setSpecUrl] = react.useState(initial.specUrl || "");
      const [specJson, setSpecJson] = react.useState(initial.specText || "");
      const [baseUrl, setBaseUrl] = react.useState(initial.baseUrl || "");
      const [cookieSession, setCookieSession] = react.useState(initial.cookieSession === true);
      const [headers, setHeaders] = react.useState(objToKv(initial.headers));
      const [envs, setEnvs] = react.useState(objToKv(initial.env));
      const [prefix, setPrefix] = react.useState(initial.prefix || "");
      const [error, setError] = react.useState(null);
      const [saving, setSaving] = react.useState(false);

      const validate = () => {
        if (!name.trim()) return "请填写服务器名称";
        if (transport === "stdio" && !command.trim()) return "STDIO 类型需要填写启动命令（如 npx、python、node）";
        if (transport === "http" && (!url.trim() || !/^https?:\/\//i.test(url.trim()))) {
          return "HTTP / SSE 类型需要填写有效的服务器 URL（以 http:// 或 https:// 开头）";
        }
        if (transport === "openapi" && ((specMode === "url" && !specUrl.trim()) || (specMode === "json" && !specJson.trim()))) {
          return specMode === "url" ? "OpenAPI 类型需要填写规范 URL" : "OpenAPI 类型需要粘贴规范 JSON/YAML 文本";
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
          cwd: cwd.trim(),
          url: url.trim(),
          specUrl: specMode === "url" ? specUrl.trim() : undefined,
          specText: specMode === "json" ? specJson : undefined,
          baseUrl: baseUrl.trim(),
          cookieSession,
          headers: kvToObj(headers),
          env: kvToObj(envs),
          prefix: prefix.trim()
        };
        const req = editing ? props.api.update(props.editingName, payload) : props.api.save(payload);
        req.then((r) => {
          if (r && r.ok) props.onSaved();
          else setError((r && r.message) || "保存失败");
        }).catch((e) => {
          setError(String((e && e.message) || e));
        }).then(() => setSaving(false));
      };

      const field = (label, required, child, hint) => h("div", { className: "dshmcp-field" },
        h("label", { className: required ? "dshmcp-label dshmcp-label-req" : "dshmcp-label" }, label),
        child,
        hint ? h("span", { className: "dshmcp-field-hint" }, hint) : null
      );

      const typeOptions = [
        { id: "stdio", name: "STDIO", desc: "本地进程 / CLI 命令行", icon: Icons.Terminal },
        { id: "http", name: "HTTP / SSE", desc: "远程流式 HTTP 与 SSE 服务", icon: Icons.Globe },
        { id: "openapi", name: "OpenAPI", desc: "OpenAPI / Swagger 规范转工具", icon: Icons.FileCode }
      ];

      const typeCards = h("div", { className: "dshmcp-type-cards" },
        typeOptions.map((opt) => h("button", {
          type: "button",
          key: opt.id,
          className: "dshmcp-type-card" + (transport === opt.id ? " dshmcp-type-card-active" : ""),
          onClick: () => { setTransport(opt.id); setError(null); }
        },
          h("div", { className: "dshmcp-type-card-title" }, h(opt.icon), opt.name),
          h("div", { className: "dshmcp-type-card-desc" }, opt.desc)
        ))
      );

      let dynamic;
      if (transport === "stdio") {
        dynamic = h(react.Fragment, null,
          field("启动命令", true,
            h("input", { className: "dshmcp-input", placeholder: "例如 npx、node、python、uvx", value: command, onChange: (e) => setCommand(e.target.value) }),
            "可执行程序名称或绝对路径"
          ),
          field("命令参数", false,
            h("textarea", { className: "dshmcp-textarea", placeholder: "每行一个参数，例如：\n-y\n@modelcontextprotocol/server-filesystem\nC:\\workspace", value: argsText, onChange: (e) => setArgsText(e.target.value) }),
            "每行输入一个命令行参数"
          ),
          field("工作目录", false,
            h("input", { className: "dshmcp-input", placeholder: "默认使用 DSH 当前工作区", value: cwd, onChange: (e) => setCwd(e.target.value) }),
            "子进程的工作目录路径"
          ),
          field("环境变量", false,
            h(KeyValueList, { items: envs, setItems: setEnvs, keyPlaceholder: "变量名 (如 GITHUB_TOKEN)", valuePlaceholder: "变量值", addLabel: "环境变量" })
          )
        );
      } else if (transport === "http") {
        dynamic = h(react.Fragment, null,
          h("div", { className: "dshmcp-callout-info" },
            h(Icons.Info),
            h("div", null, "统一支持标准 Streamable HTTP 与经典 SSE 传输协议。后端自动协商会话并管理长连接流。")
          ),
          field("服务器 URL", true,
            h("input", { className: "dshmcp-input", placeholder: "https://example.com/mcp 或 https://example.com/sse", value: url, onChange: (e) => setUrl(e.target.value) }),
            "支持直接填写 Streamable HTTP 端点或 SSE 地址"
          ),
          field("HTTP 请求头", false,
            h(KeyValueList, { items: headers, setItems: setHeaders, keyPlaceholder: "请求头名称 (如 Authorization)", valuePlaceholder: "值 (如 Bearer sk-...)", addLabel: "请求头" })
          ),
          field("环境变量", false,
            h(KeyValueList, { items: envs, setItems: setEnvs, keyPlaceholder: "变量名 (如 API_KEY)", valuePlaceholder: "变量值", addLabel: "环境变量" })
          )
        );
      } else {
        dynamic = h(react.Fragment, null,
          field("输入方式", false,
            h("div", { className: "dshmcp-seg" },
              h("button", { type: "button", className: "dshmcp-seg-item" + (specMode === "url" ? " dshmcp-seg-item-active" : ""), onClick: () => setSpecMode("url") }, "规范 URL"),
              h("button", { type: "button", className: "dshmcp-seg-item" + (specMode === "json" ? " dshmcp-seg-item-active" : ""), onClick: () => setSpecMode("json") }, "JSON / YAML 文本")
            )
          ),
          specMode === "url"
            ? field("OpenAPI 规范地址", true, h("input", { className: "dshmcp-input", placeholder: "https://petstore.swagger.io/v2/swagger.json", value: specUrl, onChange: (e) => setSpecUrl(e.target.value) }))
            : field("规范文本", true, h("textarea", { className: "dshmcp-textarea", placeholder: "粘贴 OpenAPI 规范 JSON 或 YAML 文本内容", value: specJson, onChange: (e) => setSpecJson(e.target.value) })),
          field("API 基础 URL", false,
            h("input", { className: "dshmcp-input", placeholder: "选填，默认读取规范中的 servers[0].url", value: baseUrl, onChange: (e) => setBaseUrl(e.target.value) })
          ),
          field("HTTP 请求头", false,
            h(KeyValueList, { items: headers, setItems: setHeaders, keyPlaceholder: "请求头名称 (如 Authorization)", valuePlaceholder: "值 (如 Bearer sk-...)", addLabel: "请求头" })
          ),
          field("会话处理", false,
            h("label", { className: "dshmcp-check" },
              h("input", { type: "checkbox", checked: cookieSession, onChange: (e) => setCookieSession(e.target.checked) }),
              h("span", null, "启用 Cookie 会话：保存上游 Set-Cookie 并在后续请求中自动携带")
            )
          )
        );
      }

      return h("div", { className: "dshmcp-form" },
        h("div", { className: "dshmcp-form-header" },
          h("div", null,
            h("div", { className: "dshmcp-form-title" }, editing ? ("编辑 MCP 服务器 · " + props.editingName) : "添加 MCP 服务器"),
            h("div", { className: "dshmcp-form-copy" }, editing ? "保存后保留服务器标识；已连接服务器将自动重新同步。" : "配置 MCP 服务连接参数，保存后可直接点击连接启用。")
          ),
          h("button", { type: "button", className: "dshmcp-btn", onClick: props.onCancel }, h(Icons.ArrowLeft), "返回列表")
        ),
        h("div", { className: "dshmcp-form-section" },
          h("div", { className: "dshmcp-section-title" }, "连接类型"),
          typeCards
        ),
        h("div", { className: "dshmcp-form-section" },
          h("div", { className: "dshmcp-section-title" }, "基本信息"),
          field("服务器名称", true,
            h("input", {
              className: "dshmcp-input",
              placeholder: "唯一标识名称，如 my-filesystem",
              value: name,
              disabled: editing,
              onChange: (e) => setName(e.target.value)
            }),
            "用于标识与管理该服务器"
          ),
          field("服务器注释", false,
            h("input", {
              className: "dshmcp-input",
              placeholder: "选填，说明该服务的功能用途",
              value: notes,
              onChange: (e) => setNotes(e.target.value)
            })
          ),
          field("工具名前缀", false,
            h("input", {
              className: "dshmcp-input",
              placeholder: "默认使用服务器名称",
              value: prefix,
              onChange: (e) => setPrefix(e.target.value)
            }),
            "注册到模型的工具名称前缀，例如：<前缀>_<工具名>"
          )
        ),
        h("div", { className: "dshmcp-form-section" },
          h("div", { className: "dshmcp-section-title" }, "传输参数配置"),
          dynamic
        ),
        error ? h("div", { className: "dshmcp-alert-error", role: "alert" }, h(Icons.AlertTriangle), h("span", null, error)) : null,
        h("div", { className: "dshmcp-form-foot" },
          h("button", { type: "button", className: "dshmcp-btn", onClick: props.onCancel, disabled: saving }, "取消"),
          h("button", { type: "button", className: "dshmcp-btn dshmcp-btn-primary", onClick: submit, disabled: saving },
            saving ? h(Icons.Refresh, { spin: true }) : null,
            saving ? "保存中…" : (editing ? "保存修改" : "保存服务器")
          )
        )
      );
    }

    function McpPanel(props) {
      const api = props.api;
      const [servers, setServers] = react.useState([]);
      const [loading, setLoading] = react.useState(true);
      const [error, setError] = react.useState(null);
      const [busy, setBusy] = react.useState("");
      const [editing, setEditing] = react.useState(null);
      const [adding, setAdding] = react.useState(false);

      const refresh = react.useCallback(() => {
        return api.status().then((r) => {
          setServers((r && Array.isArray(r.servers)) ? r.servers : []);
          setError(null);
        }).catch((e) => {
          setError(String((e && e.message) || e));
        }).then(() => setLoading(false));
      }, [api]);

      react.useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 5000);
        return () => window.clearInterval(timer);
      }, [refresh]);

      const act = (method, name) => {
        setBusy(name + ":" + method);
        setError(null);
        api[method](name).then(refresh).catch((e) => {
          setError(String((e && e.message) || e));
        }).then(() => setBusy(""));
      };

      if (adding) {
        return h(AddServerForm, {
          key: editing ? ("edit:" + editing.name) : "add",
          api,
          initial: editing ? editing.editable : null,
          editingName: editing ? editing.name : "",
          onCancel: () => { setAdding(false); setEditing(null); },
          onSaved: () => { setAdding(false); setEditing(null); refresh(); }
        });
      }

      const connectedCount = servers.filter((s) => s.status === "connected").length;
      const totalTools = servers.reduce((acc, s) => acc + (s.toolCount || 0), 0);

      const rows = servers.map((s) => {
        const isBusy = busy.startsWith(s.name + ":");
        const statusKey = s.status || "configured";
        const statusText = STATUS_TEXT[statusKey] || statusKey;
        const transportKey = s.transport === "sse" ? "http" : (s.transport || "stdio");
        const transportText = TRANSPORT_TEXT[transportKey] || transportKey.toUpperCase();

        const ed = s.editable || {};
        let snippet = "";
        let SnippetIcon = Icons.Terminal;
        if (transportKey === "stdio") {
          snippet = (ed.command || "") + " " + (Array.isArray(ed.args) ? ed.args.join(" ") : "");
          SnippetIcon = Icons.Terminal;
        } else if (transportKey === "http") {
          snippet = ed.url || "";
          SnippetIcon = Icons.Globe;
        } else {
          snippet = ed.specUrl || ed.baseUrl || (ed.specText ? "JSON 模式" : "OpenAPI 规范");
          SnippetIcon = Icons.FileCode;
        }

        const isConnected = s.status === "connected";
        const primaryBtn = isConnected
          ? h("button", {
              type: "button",
              className: "dshmcp-btn dshmcp-btn-sm",
              disabled: !!busy,
              onClick: () => act("disconnect", s.name)
            }, isBusy ? h(Icons.Refresh, { spin: true }) : null, isBusy ? "断开中…" : "断开")
          : h("button", {
              type: "button",
              className: "dshmcp-btn dshmcp-btn-primary dshmcp-btn-sm",
              disabled: !!busy,
              onClick: () => act("connect", s.name)
            }, isBusy ? h(Icons.Refresh, { spin: true }) : null, isBusy ? "连接中…" : "连接");

        return h("div", { key: s.name, className: "dshmcp-card" },
          h("div", { className: "dshmcp-card-top" },
            h("div", { className: "dshmcp-identity" },
              h("span", { className: "dshmcp-status-pill dshmcp-status-pill-" + statusKey },
                h("span", { className: "dshmcp-dot" + (statusKey === "connected" || statusKey === "connecting" ? " dshmcp-dot-pulse" : "") }),
                statusText
              ),
              h("div", { className: "dshmcp-info" },
                h("div", { className: "dshmcp-title-row" },
                  h("span", { className: "dshmcp-name" }, s.name),
                  s.editable && s.editable.prefix && s.editable.prefix !== s.name
                    ? h("span", { className: "dshmcp-prefix-badge", title: "工具名前缀" }, "前缀: " + s.editable.prefix)
                    : null
                ),
                s.notes ? h("div", { className: "dshmcp-notes" }, s.notes) : null
              )
            ),
            h("span", { className: "dshmcp-transport-badge dshmcp-transport-badge-" + transportKey },
              h(SnippetIcon),
              transportText
            )
          ),
          snippet ? h("div", { className: "dshmcp-card-body" },
            h("div", { className: "dshmcp-snippet", title: snippet },
              h("span", { className: "dshmcp-snippet-icon" }, h(SnippetIcon)),
              h("span", { className: "dshmcp-snippet-text" }, snippet)
            )
          ) : null,
          s.lastError ? h("div", { className: "dshmcp-card-error", role: "alert" },
            h("span", { className: "dshmcp-card-error-icon" }, h(Icons.AlertTriangle)),
            h("span", null, s.lastError)
          ) : null,
          h("div", { className: "dshmcp-card-meta" },
            h("div", { className: "dshmcp-card-meta-left" },
              isConnected ? h("span", { className: "dshmcp-tools-badge" }, h(Icons.Zap), (s.toolCount || 0) + " 个工具已注册") : null,
              s.stale ? h("span", { className: "dshmcp-warn-badge" }, h(Icons.AlertTriangle), "连接不稳定") : null
            ),
            h("div", { className: "dshmcp-card-actions" },
              h("button", {
                type: "button",
                className: "dshmcp-btn dshmcp-btn-sm",
                disabled: !!busy,
                onClick: () => { setEditing(s); setAdding(true); setError(null); }
              }, h(Icons.Edit), "编辑"),
              primaryBtn,
              h("button", {
                type: "button",
                className: "dshmcp-btn dshmcp-btn-danger dshmcp-btn-sm",
                disabled: !!busy,
                onClick: () => act("remove", s.name)
              }, h(Icons.Trash), "移除")
            )
          )
        );
      });

      const body = loading
        ? h("div", { className: "dshmcp-empty" },
            h("div", { className: "dshmcp-empty-icon" }, h(Icons.Refresh, { spin: true })),
            h("div", { className: "dshmcp-empty-title" }, "正在加载 MCP 服务器…")
          )
        : rows.length
          ? h("div", { className: "dshmcp-list" }, rows)
          : h("div", { className: "dshmcp-empty" },
              h("div", { className: "dshmcp-empty-icon" }, h(Icons.Server)),
              h("div", { className: "dshmcp-empty-title" }, "还没有配置 MCP 服务器"),
              h("div", { className: "dshmcp-empty-copy" }, "添加一个服务器后，它的工具会自动注册到当前 DeepSeek Harness 环境中供模型调用。"),
              h("button", {
                type: "button",
                className: "dshmcp-btn dshmcp-btn-primary",
                onClick: () => { setEditing(null); setAdding(true); setError(null); }
              }, h(Icons.Plus), "添加首个服务器"),
              h("div", { className: "dshmcp-quickstart" },
                h("div", { className: "dshmcp-quick-item" },
                  h("div", { className: "dshmcp-quick-title" }, h(Icons.Terminal), "STDIO 命令行"),
                  h("div", { className: "dshmcp-quick-desc" }, "通过 npx、python 或本地进程运行 MCP 服务")
                ),
                h("div", { className: "dshmcp-quick-item" },
                  h("div", { className: "dshmcp-quick-title" }, h(Icons.Globe), "HTTP / SSE"),
                  h("div", { className: "dshmcp-quick-desc" }, "连接远程流式 HTTP 或经典 SSE 端点")
                ),
                h("div", { className: "dshmcp-quick-item" },
                  h("div", { className: "dshmcp-quick-title" }, h(Icons.FileCode), "OpenAPI 规范"),
                  h("div", { className: "dshmcp-quick-desc" }, "从 Swagger/OpenAPI 规范自动转换工具")
                )
              )
            );

      return h("div", { className: "dshmcp-panel" },
        h("div", { className: "dshmcp-header" },
          h("div", { className: "dshmcp-header-left" },
            h("div", { className: "dshmcp-icon-badge" }, h(Icons.Server)),
            h("div", { className: "dshmcp-title-wrap" },
              h("div", { className: "dshmcp-title" },
                "MCP 服务器",
                h("span", { className: "dshmcp-tag-version" }, "v0.1.1")
              ),
              h("div", { className: "dshmcp-subtitle" }, "集中管理 STDIO 本地命令、HTTP / SSE 远程流式端点与 OpenAPI 规范服务。")
            )
          ),
          h("div", { className: "dshmcp-actions" },
            h("button", {
              type: "button",
              className: "dshmcp-btn",
              disabled: !!busy,
              onClick: () => { setLoading(true); refresh(); }
            }, h(Icons.Refresh, { spin: loading }), "刷新"),
            h("button", {
              type: "button",
              className: "dshmcp-btn dshmcp-btn-primary",
              disabled: !!busy,
              onClick: () => { setEditing(null); setAdding(true); setError(null); }
            }, h(Icons.Plus), "添加服务器")
          )
        ),
        error ? h("div", { className: "dshmcp-alert-error", role: "alert" }, h(Icons.AlertTriangle), h("span", null, error)) : null,
        h("div", { className: "dshmcp-summary" },
          h("span", { className: "dshmcp-metric-pill" }, "服务器配置", h("strong", { className: "dshmcp-metric-val" }, String(servers.length))),
          h("span", { className: "dshmcp-metric-pill" }, "已连接", h("strong", { className: "dshmcp-metric-val dshmcp-metric-active" }, String(connectedCount))),
          h("span", { className: "dshmcp-metric-pill" }, "可用工具", h("strong", { className: "dshmcp-metric-val" }, String(totalTools))),
          h("span", { className: "dshmcp-summary-sync" }, h(Icons.Refresh), "每 5 秒自动同步")
        ),
        body
      );
    }

    function apply(ctx) {
      const api = makeApi(ctx);
      ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "mcp-servers", order: 30, label: "MCP 服务器" }, () => h(McpPanel, { api }))), "dsh-mcp-manager: settings section");
    }
    exports.apply = apply;
    exports.inject = ["slots", "connection"];
    return module.exports;
  }
});
