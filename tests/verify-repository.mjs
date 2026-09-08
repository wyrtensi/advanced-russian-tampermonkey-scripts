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

const readme = (await readFile(new URL('../README.md', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const scriptsSectionStart = readme.indexOf('## Скрипты\n');
const beginnerSectionStart = readme.indexOf('## Установка для новичка\n');
assert.notEqual(scriptsSectionStart, -1, 'Missing scripts section');
assert.notEqual(beginnerSectionStart, -1, 'Missing beginner installation section');
assert.ok(scriptsSectionStart < beginnerSectionStart, 'Scripts section must precede beginner installation section');
const scriptsSection = readme.slice(scriptsSectionStart, beginnerSectionStart);
const expectedHeadings = [
  '### 1. Marketplace Cross Search',
  '### 2. Google → Yandex Search Button',
  '### 3. Yandex → Google Search Button',
];
const images = [
  'docs/images/marketplace-cross-search.png',
  'docs/images/google-to-yandex.png',
  'docs/images/yandex-to-google.png',
];
let previousHeadingIndex = -1;
const headingIndices = [];
for (const heading of expectedHeadings) {
  const headingIndex = scriptsSection.indexOf(`${heading}\n`);
  assert.ok(headingIndex > previousHeadingIndex, `Missing or out-of-order heading: ${heading}`);
  assert.equal((scriptsSection.match(new RegExp(`^${escapeRegExp(heading)}$`, 'gm')) ?? []).length, 1);
  headingIndices.push(headingIndex);
  previousHeadingIndex = headingIndex;
}
const labels = ['**Что делает:**', '**Где работает:**', '**Как пользоваться:**'];
for (const [index, headingIndex] of headingIndices.entries()) {
  const separatorIndex = scriptsSection.indexOf('\n---\n', headingIndex);
  const cardEnd = separatorIndex === -1 ? scriptsSection.length : separatorIndex;
  const card = scriptsSection.slice(headingIndex, cardEnd);
  const summaryMatches = card.match(/^> [^\n]+$/gm) ?? [];
  assert.equal(summaryMatches.length, 1, `Expected one-line summary in ${expectedHeadings[index]}`);
  const summaryIndex = card.indexOf(summaryMatches[0]);

  const rawUrl = `${rawRoot}/${scripts[index]}`;
  const badgeAlt = `Установить ${badgeNames[index]} через Tampermonkey`;
  const matchingBadgePattern = new RegExp(
    `\\[!\\[${escapeRegExp(badgeAlt)}\\]\\([^\\n)]+\\)\\]\\(${escapeRegExp(rawUrl)}\\)`,
  );
  assert.equal((card.match(matchingBadgePattern) ?? []).length, 1, `Missing matching badge in ${expectedHeadings[index]}`);
  const badgeIndex = card.search(matchingBadgePattern);

  assert.equal((card.match(new RegExp(escapeRegExp(images[index]), 'g')) ?? []).length, 1, `Missing matching image in ${expectedHeadings[index]}`);
  const imageIndex = card.indexOf(images[index]);

  const labelIndices = labels.map((label) => {
    assert.equal((card.match(new RegExp(escapeRegExp(label), 'g')) ?? []).length, 1, `Missing label ${label} in ${expectedHeadings[index]}`);
    return card.indexOf(label);
  });
  assert.ok(
    summaryIndex < badgeIndex &&
      badgeIndex < imageIndex &&
      imageIndex < labelIndices[0] &&
      labelIndices[0] < labelIndices[1] &&
      labelIndices[1] < labelIndices[2],
    `Incorrect card order in ${expectedHeadings[index]}`,
  );
}
for (const label of labels) {
  assert.equal((scriptsSection.match(new RegExp(escapeRegExp(label), 'g')) ?? []).length, scripts.length);
}
assert.equal((scriptsSection.match(/\n---\n/g) ?? []).length, 2);
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

for (const path of images) {
  await access(new URL(`../${path}`, import.meta.url));
  assert.ok(readme.includes(path), `Missing README image reference for ${path}`);
}

console.log(`Verified ${scripts.length} userscripts.`);

await import('./marketplace-input-selection.mjs');
