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

async function findBrowser() {
  if (process.platform !== 'win32') return chromeCandidates[0];
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known browser location.
    }
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
          const mainSelected = main?.dataset.mpsBound === 'true' && secondary.dataset.mpsBound !== 'true';
          const hidden = widget?.style.display === 'none' && secondary.dataset.mpsBound !== 'true';
          document.documentElement.dataset.testResult = hidden ? 'hidden' : mainSelected ? 'main' : 'secondary';
        }, 700);
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
