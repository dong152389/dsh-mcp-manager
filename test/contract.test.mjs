import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
const formalHost = await readFile(join(root, 'lib', 'index.js'), 'utf8');

test('manifest declares canonical identity, license, and compatibility', () => {
  assert.equal(manifest.version, '0.1.2');
  assert.equal(manifest.repository.url, 'git+https://github.com/dong152389/dsh-mcp-manager.git');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.engines.node, '>=18.0.0');
  assert.equal(manifest.dsh.compatibility.dsh, '>=0.1.1-rc.2 <0.2.0');
  assert.equal(manifest.dsh.compatibility.dshReleases['0.1.1-rc.2'], 'compatible');
  assert.ok(manifest.files.includes('LICENSE'));
  assert.ok(manifest.files.includes('SECURITY.md'));
  assert.ok(manifest.files.includes('docs'));
});

test('Bundle Patch contains the unique additive entry', () => {
  const ids = [...patch.matchAll(/^\s*- id:\s*([^\s#]+)\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(ids, ['mcp-manager']);
  assert.equal(new Set(ids).size, ids.length);
});

test('formal Host artifact is portable and exposes the plugin contract', () => {
  assert.match(formalHost, /export function apply\(ctx\)/);
  assert.match(formalHost, /export const name = 'dsh-mcp-manager'/);
  assert.doesNotMatch(formalHost, /C:\\\\Users\\\\dong5\\\\dsh-mcp-manager/);
});
