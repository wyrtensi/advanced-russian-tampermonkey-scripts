import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = 'https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts';
const rawRoot = 'https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main';
const scripts = [
  'scripts/marketplace-cross-search/marketplace-cross-search.user.js',
  'scripts/google-to-yandex/google-to-yandex.user.js',
  'scripts/yandex-to-google/yandex-to-google.user.js',
];

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

console.log(`Verified ${scripts.length} userscripts.`);
