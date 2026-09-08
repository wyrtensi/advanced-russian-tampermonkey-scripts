import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const scriptPath = new URL('../scripts/marketplace-cross-search/marketplace-cross-search.user.js', import.meta.url);
const userscript = await readFile(scriptPath, 'utf8');

const chromeCandidates = process.platform === 'win32'
  ? [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ]
  : ['google-chrome', 'chromium', 'chromium-browser'];

function canRun(executable) {
  return new Promise((resolve) => {
    const child = spawn(executable, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function findBrowser() {
  if (process.env.MPS_BROWSER_BIN) {
    if (await canRun(process.env.MPS_BROWSER_BIN)) return process.env.MPS_BROWSER_BIN;
    throw new Error(`MPS_BROWSER_BIN is not executable: ${process.env.MPS_BROWSER_BIN}`);
  }
  for (const candidate of chromeCandidates) {
    if (process.platform === 'win32') {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Try the next known browser location.
      }
    } else if (await canRun(candidate)) return candidate;
  }
  throw new Error('Chrome or Edge is required for the marketplace DOM test.');
}

function runBrowser(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Browser exited with code ${code}: ${stderr}`));
    });
  });
}

const fixtures = {
  avito: {
    host: 'www.avito.localhost',
    expected: 'main',
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/number" placeholder="Поиск по номеру" style="width:180px;height:40px">
      </form>
      <form id="main-form">
        <input id="main" data-marker="search-form/suggest" placeholder="Поиск по объявлениям" style="width:650px;height:50px">
        <button data-marker="search-form/submit-button" type="submit">Найти</button>
      </form>`,
  },
  wildberries: {
    host: 'www.wildberries.localhost',
    expected: 'main',
    html: `
      <form id="secondary-form"><input id="secondary" type="search" style="width:180px;height:40px"></form>
      <form id="main-form">
        <input id="main" type="search" style="width:650px;height:50px">
        <button data-testid="searchButton" type="submit">Найти</button>
      </form>`,
  },
  ozon: {
    host: 'www.ozon.localhost',
    expected: 'main',
    html: `
      <form id="secondary-form"><input id="secondary" name="text" style="width:180px;height:40px"></form>
      <form id="main-form" action="/search">
        <span title="Везде">Везде</span>
        <input id="main" name="text" placeholder="Искать на Ozon" style="width:650px;height:50px">
        <button type="submit">Найти</button>
      </form>`,
  },
  yandex: {
    host: 'market.yandex.localhost',
    expected: 'main',
    html: `
      <form id="secondary-form"><input id="secondary" name="text" style="width:180px;height:40px"></form>
      <form id="main-form">
        <input id="main" name="text" placeholder="Найти товары" style="width:650px;height:50px">
        <button type="submit">Найти</button>
      </form>`,
  },
  aliexpress: {
    host: 'aliexpress.localhost',
    expected: 'main',
    html: `
      <form id="secondary-form"><input id="secondary" placeholder="Поиск по заказам" style="width:180px;height:40px"></form>
      <form id="main-form" class="RedSearchBar_root">
        <input id="main" placeholder="Поиск товаров" style="width:650px;height:50px">
        <button type="submit">Найти</button>
      </form>`,
  },
  'ozon-search-occluded': {
    host: 'www.ozon.localhost',
    expected: 'hidden',
    setup: `setTimeout(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="image-viewer" style="position:fixed;inset:0;z-index:1000000;background:white"></div>');
    }, 200);`,
    html: `
      <form id="secondary-form"><input id="secondary" name="text" style="width:180px;height:40px"></form>
      <form id="main-form" action="/search">
        <span id="native-scope" title="Везде">Везде</span>
        <input id="main" name="text" placeholder="Искать на Ozon" style="width:650px;height:50px">
        <button type="submit">Найти</button>
      </form>`,
  },
  'ozon-viewer-closed': {
    host: 'www.ozon.localhost',
    expected: 'main',
    setup: `setTimeout(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="image-viewer" style="position:fixed;inset:0;z-index:1000000;background:white"></div>');
    }, 200);
    setTimeout(() => document.getElementById('image-viewer').remove(), 400);`,
    html: `
      <form id="secondary-form"><input id="secondary" name="text" style="width:180px;height:40px"></form>
      <form id="main-form" action="/search">
        <input id="main" name="text" placeholder="Искать на Ozon" style="width:650px;height:50px">
        <button type="submit">Найти</button>
      </form>`,
  },
  'avito-main-removed': {
    host: 'www.avito.localhost',
    expected: 'hidden',
    setup: "setTimeout(() => document.getElementById('main-form').remove(), 200);",
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/number" placeholder="Поиск по номеру" style="width:180px;height:40px">
      </form>
      <form id="main-form">
        <input id="main" data-marker="search-form/suggest" placeholder="Поиск по объявлениям" style="width:650px;height:50px">
        <button data-marker="search-form/submit-button" type="submit">Найти</button>
      </form>`,
  },
  'avito-main-hidden': {
    host: 'www.avito.localhost',
    expected: 'hidden',
    setup: "setTimeout(() => { document.getElementById('main-form').style.display = 'none'; }, 200);",
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/number" placeholder="Поиск по номеру" style="width:180px;height:40px">
      </form>
      <form id="main-form">
        <input id="main" data-marker="search-form/suggest" placeholder="Поиск по объявлениям" style="width:650px;height:50px">
        <button data-marker="search-form/submit-button" type="submit">Найти</button>
      </form>`,
  },
  'avito-main-inserted': {
    host: 'www.avito.localhost',
    expected: 'rebound',
    setup: `setTimeout(() => {
      document.documentElement.dataset.secondaryWasBound = String(document.getElementById('secondary').dataset.mpsBound === 'true');
    }, 100);
    setTimeout(() => {
      document.body.insertAdjacentHTML('afterbegin', \
        '<form id="main-form"><input id="main" data-marker="search-form/suggest" placeholder="Поиск по объявлениям" style="width:650px;height:50px"><button data-marker="search-form/submit-button" type="submit">Найти</button></form>');
    }, 200);`,
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/legacy" placeholder="Поиск в разделе" style="width:300px;height:40px">
        <button id="secondary-button" data-marker="search-form/submit-button" type="button">Искать в разделе</button>
      </form>`,
  },
  'avito-neutral-secondary-first': {
    host: 'www.avito.localhost',
    expected: 'rebound',
    setup: `setTimeout(() => {
      document.documentElement.dataset.secondaryWasBound = String(document.getElementById('secondary').dataset.mpsBound === 'true');
    }, 100);
    setTimeout(() => {
      document.body.insertAdjacentHTML('afterbegin', \
        '<form id="main-form"><input id="main" data-marker="search-form/suggest" placeholder="Поиск по объявлениям" style="width:650px;height:50px"><button data-marker="search-form/submit-button" type="submit">Найти</button></form>');
    }, 200);`,
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/legacy" placeholder="Введите запрос" style="width:300px;height:40px">
        <button id="secondary-button" data-marker="search-form/submit-button" type="button">Искать</button>
      </form>`,
  },
  'avito-secondary-only': {
    host: 'www.avito.localhost',
    expected: 'hidden',
    html: `
      <form id="secondary-form">
        <input id="secondary" data-marker="search-form/number" placeholder="Поиск по номеру" style="width:300px;height:40px">
        <button data-marker="search-form/submit-button" type="button">Искать номер</button>
      </form>`,
  },
  'yandex-secondary-only': {
    host: 'market.yandex.localhost',
    expected: 'hidden',
    html: `
      <form id="secondary-form">
        <input id="secondary" name="text" placeholder="Поиск в фильтрах" style="width:180px;height:40px">
      </form>`,
  },
};

const server = createServer((request, response) => {
  if (request.url === '/marketplace-cross-search.user.js') {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    response.end(userscript);
    return;
  }

  const fixture = fixtures[new URL(request.url, 'http://localhost').searchParams.get('fixture')];
  if (!fixture) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html>
    <html><head><meta charset="utf-8"><style>body{margin:0}form{margin:20px}</style></head>
    <body>
      ${fixture.html}
      <script src="/marketplace-cross-search.user.js"></script>
      <script>
        ${fixture.setup ?? ''}
        setTimeout(() => {
          const main = document.getElementById('main');
          const secondary = document.getElementById('secondary');
          const widget = document.getElementById('mps-root');
          const nativeScope = document.getElementById('native-scope');
          const keydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
          const submit = new Event('submit', { bubbles: true, cancelable: true });
          const click = new MouseEvent('click', { bubbles: true, cancelable: true });
          secondary.dispatchEvent(keydown);
          document.getElementById('secondary-form').dispatchEvent(submit);
          document.getElementById('secondary-button')?.dispatchEvent(click);
          const mainSelected = main?.dataset.mpsBound === 'true' && secondary.dataset.mpsBound !== 'true';
          const hidden = (!widget || widget.style.display === 'none') && main?.dataset.mpsBound !== 'true'
            && secondary.dataset.mpsBound !== 'true' && (!nativeScope || nativeScope.style.display !== 'none');
          const rebound = ${fixture.expected === 'rebound'} && mainSelected && secondary.style.paddingLeft === ''
            && document.documentElement.dataset.secondaryWasBound === 'false'
            && !keydown.defaultPrevented && !submit.defaultPrevented && !click.defaultPrevented;
          document.documentElement.dataset.testResult = rebound ? 'rebound' : hidden ? 'hidden' : mainSelected ? 'main' : 'secondary';
        }, 1000);
      </script>
    </body></html>`);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await findBrowser();
const profile = await mkdtemp(path.join(tmpdir(), 'mps-input-test-'));

try {
  for (const [name, fixture] of Object.entries(fixtures)) {
    const url = `http://${fixture.host}:${address.port}/?fixture=${name}`;
    const dom = await runBrowser(browser, [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=1500',
      '--dump-dom',
      url,
    ]);
    assert.match(
      dom,
      new RegExp(`data-test-result="${fixture.expected}"`),
      `${name} must produce the ${fixture.expected} state`,
    );
  }
} finally {
  server.close();
  await rm(profile, { recursive: true, force: true });
}

console.log(`Verified ${Object.keys(fixtures).length} marketplace input-selection scenarios.`);
