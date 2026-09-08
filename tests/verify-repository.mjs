import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const repository = 'https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts';
const rawRoot = 'https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main';
const scripts = [
  'scripts/marketplace-cross-search/marketplace-cross-search.user.js',
  'scripts/google-to-yandex/google-to-yandex.user.js',
  'scripts/yandex-to-google/yandex-to-google.user.js',
];
const badgeNames = [
  'Marketplace Cross Search',
  'Google → Yandex',
  'Yandex → Google',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const path of scripts) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.match(source, /^\/\/ ==UserScript==/);
  assert.match(source, /\/\/ @author\s+Wyrtensi/);
  assert.match(source, /\/\/ @namespace\s+https:\/\/github\.com\/wyrtensi\/advanced-russian-tampermonkey-scripts/);
  assert.match(source, new RegExp(`// @homepageURL\\s+${repository.replaceAll('/', '\\/')}`));
  assert.match(source, new RegExp(`// @supportURL\\s+${repository.replaceAll('/', '\\/')}\\/issues`));
  const escapedRawUrl = `${rawRoot}/${path}`.replaceAll('/', '\\/').replaceAll('.', '\\.');
  assert.match(source, new RegExp(`// @downloadURL\\s+${escapedRawUrl}`));
  assert.match(source, new RegExp(`// @updateURL\\s+${escapedRawUrl}`));
  assert.doesNotMatch(source, /\r/);
}

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
assert.equal((readme.match(/logo=tampermonkey/g) ?? []).length, scripts.length);
assert.equal((readme.match(/style=for-the-badge/g) ?? []).length, scripts.length);
for (const path of scripts) {
  assert.ok(readme.includes(`${rawRoot}/${path}`), `Missing install link for ${path}`);
}

for (const [index, path] of scripts.entries()) {
  const rawUrl = `${rawRoot}/${path}`;
  const badgeAlt = `Установить ${badgeNames[index]} через Tampermonkey`;
  const badgeButtonPattern = new RegExp(
    `\\[!\\[${escapeRegExp(badgeAlt)}\\]\\([^\\n)]+\\)\\]\\(${escapeRegExp(rawUrl)}\\)`,
  );
  assert.match(readme, badgeButtonPattern, `Missing badge button for ${badgeNames[index]}`);
}

const images = [
  'docs/images/marketplace-cross-search.png',
  'docs/images/google-to-yandex.png',
  'docs/images/yandex-to-google.png',
];
for (const path of images) {
  await access(new URL(`../${path}`, import.meta.url));
  assert.ok(readme.includes(path), `Missing README image reference for ${path}`);
}

console.log(`Verified ${scripts.length} userscripts.`);
