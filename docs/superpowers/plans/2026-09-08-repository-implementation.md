# Advanced Russian Tampermonkey Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a public, extensible repository containing three independently installable Tampermonkey scripts, live screenshots, and a beginner-friendly Russian installation guide.

**Architecture:** Keep every userscript in its own directory and make its raw GitHub URL both the installation and automatic-update endpoint. A dependency-free Node verification script checks userscript metadata, repository paths, README links, and image references before publication.

**Tech Stack:** JavaScript userscripts, Node.js built-ins, Markdown, Git, GitHub CLI, Tampermonkey, Chrome or Edge

**Spec:** `docs/superpowers/specs/2026-09-08-repository-design.md`

## Global Constraints

- Publish from GitHub account `wyrtensi` as public repository `advanced-russian-tampermonkey-scripts`.
- Preserve the existing runtime logic; only distribution metadata may change.
- Use three independent `.user.js` files; do not create a combined bundle.
- Write repository-facing documentation in Russian.
- Capture screenshots from live sites with the real userscripts active; do not substitute generated mockups.
- Stop and report the problem if a site blocks capture instead of introducing a workaround without approval.
- Use MIT licensing.
- Keep code comments in English.

---

### Task 1: Package and verify the userscripts

**Files:**
- Create: `scripts/marketplace-cross-search/marketplace-cross-search.user.js`
- Create: `scripts/google-to-yandex/google-to-yandex.user.js`
- Create: `scripts/yandex-to-google/yandex-to-google.user.js`
- Create: `tests/verify-repository.mjs`
- Create: `LICENSE`

**Interfaces:**
- Consumes: the original scripts under `D:/modifications/tampermonkey_wyrtensi/marketplace_cross_search/scripts/` and `D:/modifications/tampermonkey_wyrtensi/search_button/scripts/`
- Produces: three installable raw endpoints and a `node tests/verify-repository.mjs` verification command used by later tasks

- [ ] **Step 1: Write the failing repository verifier**

Create `tests/verify-repository.mjs` with Node built-ins. Define the exact expected files and required metadata:

```js
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
```

- [ ] **Step 2: Run the verifier and confirm the expected failure**

Run: `node tests/verify-repository.mjs`

Expected: FAIL with `ENOENT` for the first missing userscript.

- [ ] **Step 3: Copy the original scripts into their final directories**

Copy the three source files without changing their executable bodies:

```text
marketplace_cross_search/scripts/marketplace-cross-search.user.js
  -> scripts/marketplace-cross-search/marketplace-cross-search.user.js
search_button/scripts/google_to_yandex.user.js
  -> scripts/google-to-yandex/google-to-yandex.user.js
search_button/scripts/yandex_to_google.user.js
  -> scripts/yandex-to-google/yandex-to-google.user.js
```

Normalize the new files to LF line endings.

- [ ] **Step 4: Add distribution metadata**

Set the common namespace to:

```text
https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
```

Add `@homepageURL`, `@supportURL`, `@downloadURL`, and `@updateURL` using the exact repository and raw paths asserted by the verifier. Change descriptions to concise Russian text. Bump versions as follows:

```text
Marketplace Cross Search: 1.0.4 -> 1.0.5
Google -> Yandex Search Button: 1.1 -> 1.1.1
Yandex -> Google Search Button: 1.1 -> 1.1.1
```

Do not edit code below each userscript metadata block.

- [ ] **Step 5: Add the MIT license**

Create `LICENSE` with the standard MIT license text, copyright year `2026`, and copyright holder `wyrtensi`.

- [ ] **Step 6: Run syntax and repository checks**

Run:

```powershell
node --check scripts/marketplace-cross-search/marketplace-cross-search.user.js
node --check scripts/google-to-yandex/google-to-yandex.user.js
node --check scripts/yandex-to-google/yandex-to-google.user.js
node tests/verify-repository.mjs
git diff --check
```

Expected: all commands exit with code 0 and the verifier prints `Verified 3 userscripts.`

- [ ] **Step 7: Commit the packaged scripts**

```powershell
git add LICENSE scripts tests/verify-repository.mjs
git commit -m "feat: package installable userscripts"
```

Expected author: `wyrtensi <wyrtensi@gmail.com>`.

### Task 2: Capture live screenshots and write the Russian guide

**Files:**
- Create: `docs/images/marketplace-cross-search.png`
- Create: `docs/images/google-to-yandex.png`
- Create: `docs/images/yandex-to-google.png`
- Create: `README.md`
- Modify: `tests/verify-repository.mjs`

**Interfaces:**
- Consumes: the three userscripts and raw endpoint paths from Task 1
- Produces: repository landing page, direct install links, three privacy-reviewed screenshots, and README integrity checks

- [ ] **Step 1: Extend the verifier with failing README checks**

Append checks that read `README.md`, assert all three raw install URLs appear, and verify every expected image path exists and is referenced:

```js
import { access } from 'node:fs/promises';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
for (const path of scripts) {
  assert.ok(readme.includes(`${rawRoot}/${path}`), `Missing install link for ${path}`);
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
```

Keep all imports together at the beginning of the module.

- [ ] **Step 2: Run the verifier and confirm the expected failure**

Run: `node tests/verify-repository.mjs`

Expected: FAIL with `ENOENT` for `README.md`.

- [ ] **Step 3: Prepare the browser for real capture**

Read the Computer Use confirmation and UI-control guidance before operating the browser. In Chrome or Edge, ensure Tampermonkey is installed, enable developer mode and the browser's user-script permission when present, then install the three local userscripts for the capture session. Do not expose account details, browsing history, bookmarks, or profile UI.

- [ ] **Step 4: Capture Marketplace Cross Search**

Open a supported marketplace home or search page, confirm the injected selector is present, enter a generic query such as `наушники`, expand the marketplace menu, and capture the page with the complete menu visible. Crop only empty browser chrome if needed; do not alter the page content. Save as `docs/images/marketplace-cross-search.png`.

- [ ] **Step 5: Capture Google → Yandex**

Open a Google search for the generic query `погода`, confirm the `Yandex` and `Markets` buttons are visible next to the search field, and capture the page. Save as `docs/images/google-to-yandex.png`.

- [ ] **Step 6: Capture Yandex → Google**

Open a Yandex search for the generic query `погода`, confirm the `Google` and `Markets` buttons are visible next to the search field, and capture the page. Save as `docs/images/yandex-to-google.png`.

- [ ] **Step 7: Perform a privacy and visual review**

Inspect all three PNG files at original resolution. Confirm that the injected UI is legible and that no account name, avatar, email address, personalized suggestion, browsing history, or unrelated tab is visible. If any site blocks loading or script injection, stop and report the exact blocker instead of substituting a mockup.

- [ ] **Step 8: Write the root README**

Create `README.md` in Russian with this order:

```text
# Advanced Russian Tampermonkey Scripts
short collection description
## Скрипты
### Marketplace Cross Search
screenshot, supported sites, behavior, raw Install link, usage
### Google → Yandex Search Button
screenshot, supported sites, behavior, raw Install link, usage and Alt+Y
### Yandex → Google Search Button
screenshot, supported sites, behavior, raw Install link, usage and Alt+G
## Установка для новичка
Chrome steps
Edge steps
Tampermonkey confirmation steps
permission and developer-mode steps
verification steps
## Обновление и удаление
## Если скрипт не работает
## Добавление новых скриптов
## Безопасность
## Лицензия
```

Link only to official Tampermonkey pages or official Chrome/Edge extension stores for installation. Explain that users should inspect requested site access before confirming. State that GitHub raw links trigger Tampermonkey and that automatic update checks use the same URLs.

- [ ] **Step 9: Run documentation integrity checks**

Run:

```powershell
node tests/verify-repository.mjs
git diff --check
```

Expected: both commands exit with code 0, with all install links and local images present.

- [ ] **Step 10: Commit screenshots and documentation**

```powershell
git add README.md docs/images tests/verify-repository.mjs
git commit -m "docs: add installation guide and screenshots"
```

Expected author: `wyrtensi <wyrtensi@gmail.com>`.

### Task 3: Publish and verify the GitHub repository

**Files:**
- Verify only: all tracked repository files

**Interfaces:**
- Consumes: clean local `main` branch from Tasks 1 and 2
- Produces: public GitHub repository and confirmed live installation endpoints

- [ ] **Step 1: Run the complete pre-publication check**

Run:

```powershell
node --check scripts/marketplace-cross-search/marketplace-cross-search.user.js
node --check scripts/google-to-yandex/google-to-yandex.user.js
node --check scripts/yandex-to-google/yandex-to-google.user.js
node tests/verify-repository.mjs
git diff --check
git status --short --branch
git log --format="%h %an <%ae> %s"
```

Expected: checks pass, status shows a clean `main` branch, and every commit author is `wyrtensi <wyrtensi@gmail.com>`.

- [ ] **Step 2: Create and push the public repository**

Run from the repository root:

```powershell
gh repo create wyrtensi/advanced-russian-tampermonkey-scripts --public --source . --remote origin --push --description "Полезные userscript-скрипты для поиска в русскоязычном интернете"
```

Expected: GitHub creates the repository, adds `origin`, and pushes `main`.

- [ ] **Step 3: Verify the published repository and raw endpoints**

Run:

```powershell
gh repo view wyrtensi/advanced-russian-tampermonkey-scripts --json url,visibility,defaultBranchRef
git ls-remote --heads origin main
```

Open each raw install URL in a browser. Expected: Tampermonkey recognizes all three as installable userscripts, displays the correct name and version, and offers Install or Reinstall.

- [ ] **Step 4: Verify README rendering**

Open the repository home page and confirm the three screenshots load, each `Установить` link points to the matching raw `.user.js`, and all beginner instructions render without broken formatting.

- [ ] **Step 5: Report the published result**

Provide the repository URL and the three direct installation URLs. Mention that the repository is public, automatic updates are configured, screenshots were privacy-reviewed, and all verification commands passed.
