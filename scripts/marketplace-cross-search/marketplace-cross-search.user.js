// ==UserScript==
// @name         Marketplace Cross Search
// @namespace    https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @version      1.0.5
// @description  Поиск запроса сразу по нескольким маркетплейсам.
// @author       Wyrtensi
// @homepageURL  https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @supportURL   https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts/issues
// @downloadURL  https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/marketplace-cross-search/marketplace-cross-search.user.js
// @updateURL    https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/marketplace-cross-search/marketplace-cross-search.user.js
// @match        https://www.ozon.ru/*
// @match        https://www.wildberries.ru/*
// @match        https://market.yandex.ru/*
// @match        https://www.avito.ru/*
// @match        https://aliexpress.ru/*
// @match        https://www.aliexpress.ru/*
// @grant        GM_openInTab
// @grant        GM_getResourceURL
// @resource     mps-ozon https://trace-logos.ru/assets/logos/svgs/ozon.svg
// @resource     mps-wildberries https://trace-logos.ru/assets/logos/svgs/wildberries.svg
// @resource     mps-yandex-market https://trace-logos.ru/assets/logos/svgs/yandex-market.svg
// @resource     mps-avito https://trace-logos.ru/assets/logos/svgs/avito.svg
// @resource     mps-aliexpress https://trace-logos.ru/assets/logos/pngs/apple/26/color/aliexpress.png
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const MARKETPLACES = {
        ozon: {
            name: 'Ozon',
            icon: 'mps-ozon',
            accent: '#005bff',
            soft: '#e8f0ff',
            searchUrl: (query) => `https://www.ozon.ru/search/?text=${encodeURIComponent(query)}&from_global=true`,
            inputs: ['input[name="text"][placeholder*="Ozon"]', 'input[name="text"]'],
            searchButtons: ['form[action="/search"] button[type="submit"]'],
            suggestions: ['a[data-search-keyboard-item]', '[role="option"]', '[class*="suggest"] a', '[class*="suggest"] button']
        },
        wildberries: {
            name: 'Wildberries',
            icon: 'mps-wildberries',
            accent: '#cb11ab',
            soft: '#fbe8f8',
            searchUrl: (query) => `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`,
            inputs: ['input[name="search"]', 'input[type="search"]', 'input[placeholder*="искать" i]'],
            searchButtons: ['button[data-testid="searchButton"]', '.search-catalog__btn'],
            suggestions: ['[data-suggestions-item]', '[role="option"]', '[class*="suggest"] a', '[class*="suggest"] button']
        },
        yandex: {
            name: 'Маркет',
            icon: 'mps-yandex-market',
            accent: '#f0b800',
            soft: '#fff6c9',
            searchUrl: (query) => `https://market.yandex.ru/search?text=${encodeURIComponent(query)}`,
            inputs: ['input[name="text"]', 'input[placeholder*="Найти"]', 'input[type="search"]'],
            searchButtons: ['form button[type="submit"]'],
            suggestions: ['[role="option"]', '[class*="suggest"] a', '[class*="suggest"] button']
        },
        avito: {
            name: 'Авито',
            icon: 'mps-avito',
            accent: '#00a34a',
            soft: '#e7f7ec',
            searchUrl: (query) => `https://www.avito.ru/rossiya?q=${encodeURIComponent(query)}`,
            inputs: ['input[name="q"]', 'input[data-marker*="search-form"]', 'input[placeholder*="Поиск"]'],
            searchButtons: ['[data-marker="search-form/submit-button"]', 'button[data-marker*="search-form/submit"]'],
            suggestions: ['[role="option"]', '[data-marker*="suggest"]', '[class*="suggest"] a', '[class*="suggest"] button']
        },
        aliexpress: {
            name: 'AliExpress',
            icon: 'mps-aliexpress',
            accent: '#ff4747',
            soft: '#ffeded',
            searchUrl: (query) => `https://aliexpress.ru/wholesale?SearchText=${encodeURIComponent(query)}`,
            inputs: ['input[name="SearchText"]', 'input[placeholder*="Поиск"]', 'input[type="search"]'],
            searchButtons: ['[class*="RedSearchBar"] button', 'button[type="submit"]'],
            suggestions: ['[role="option"]', '[class*="RedSearchBar_Item__container"]', '[class*="suggest"] a', '[class*="suggest"] button']
        }
    };

    const currentKey = location.hostname.includes('ozon.') ? 'ozon'
        : location.hostname.includes('wildberries.') ? 'wildberries'
            : location.hostname.includes('market.yandex.') ? 'yandex'
                : location.hostname.includes('avito.') ? 'avito' : 'aliexpress';
    const current = MARKETPLACES[currentKey];
    let selected = new Set([currentKey]);
    let mountedInput;
    let mountedForm;
    let allowNativeSubmit = false;
    let repositionWidget = () => {};

    function getVisibleInput() {
        for (const selector of current.inputs) {
            const candidate = [...document.querySelectorAll(selector)]
                .find((item) => item.offsetParent !== null && !item.disabled);
            if (candidate) return candidate;
        }
        return null;
    }

    function getQuery() {
        return (mountedInput && mountedInput.value || '').trim();
    }

    function iconUrl(resource) {
        return typeof GM_getResourceURL === 'function' ? GM_getResourceURL(resource) : '';
    }

    function bindSuggestions() {
        if (document.documentElement.dataset.mpsSuggestionsBound) return;
        document.documentElement.dataset.mpsSuggestionsBound = 'true';

        const handledSuggestions = new WeakSet();
        const searchSuggestion = (query) => {
            if (!query || !mountedInput) return;
            mountedInput.value = query;
            mountedInput.dispatchEvent(new Event('input', { bubbles: true }));
            runSearch();
        };
        const handleSuggestion = (event) => {
            if (currentKey === 'aliexpress') return;
            if (selected.size === 1 && selected.has(currentKey)) return;
            const target = event.target instanceof Element ? event.target : event.target.parentElement;
            const suggestion = target?.closest(current.suggestions.join(','));
            if (!suggestion || !mountedInput) return;
            if (handledSuggestions.has(suggestion)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            const query = (suggestion.dataset.query || suggestion.dataset.value || suggestion.getAttribute('data-text') || suggestion.textContent || '').trim();
            if (!query) return;
            handledSuggestions.add(suggestion);
            event.preventDefault();
            event.stopImmediatePropagation();
            searchSuggestion(query);
        };

        document.addEventListener('click', handleSuggestion, true);
        if (currentKey === 'aliexpress') {
            window.addEventListener('mps-aliexpress-suggestion', (event) => {
                if (selected.size === 1 && selected.has(currentKey)) return;
                searchSuggestion(typeof event.detail === 'string' ? event.detail.trim() : '');
            });

            const bridge = document.createElement('script');
            bridge.textContent = `(() => {
                const selector = '[class*="RedSearchBar_Item__container"]';
                const eventName = 'mps-aliexpress-suggestion';
                let lastItem;
                let lastTime = 0;
                const intercept = (event) => {
                    if (document.documentElement.dataset.mpsAliSuggestionsActive !== 'true') return;
                    const target = event.target instanceof Element ? event.target : event.target.parentElement;
                    const item = target?.closest(selector);
                    if (!item) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    const now = Date.now();
                    if (item === lastItem && now - lastTime < 700) return;
                    lastItem = item;
                    lastTime = now;
                    window.dispatchEvent(new CustomEvent(eventName, { detail: item.textContent.trim() }));
                };
                ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach((type) => {
                    window.addEventListener(type, intercept, true);
                });
            })();`;
            document.documentElement.append(bridge);
            bridge.remove();
        }
    }

    function openMarketplace(key, query, active = true) {
        const url = MARKETPLACES[key].searchUrl(query);
        if (typeof GM_openInTab === 'function') {
            GM_openInTab(url, { active, insert: true, setParent: true });
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }

    function resetSelection() {
        selected = new Set([currentKey]);
        render();
    }

    function runSearch(destinations = [...selected]) {
        const query = getQuery();
        if (!query || destinations.length === 0) return;

        const searchCurrent = destinations.includes(currentKey);
        destinations.filter((key) => key !== currentKey).forEach((key) => openMarketplace(key, query, !searchCurrent));
        resetSelection();

        if (searchCurrent && mountedForm) {
            allowNativeSubmit = true;
            if (typeof mountedForm.requestSubmit === 'function') mountedForm.requestSubmit();
            else mountedForm.submit();
        } else if (searchCurrent) {
            location.assign(current.searchUrl(query));
        }
    }

    function render() {
        const root = document.getElementById('mps-root')?.shadowRoot;
        if (!root) return;
        const count = selected.size;
        if (currentKey === 'aliexpress') {
            document.documentElement.dataset.mpsAliSuggestionsActive = String(!(count === 1 && selected.has(currentKey)));
        }
        const triggerContent = root.querySelector('[data-count]');
        const triggerMarkets = count === 1 && selected.has(currentKey) ? [currentKey] : [...selected];
        triggerContent.innerHTML = triggerMarkets.length
            ? triggerMarkets.map((key) => `<img class="mps-trigger-logo" src="${iconUrl(MARKETPLACES[key].icon)}" alt="${MARKETPLACES[key].name}" title="${MARKETPLACES[key].name}">`).join('')
            : '<span>Площадки</span>';
        root.querySelectorAll('[data-market]').forEach((row) => {
            const active = selected.has(row.dataset.market);
            row.classList.toggle('selected', active);
            row.setAttribute('aria-pressed', String(active));
            row.querySelector('.mps-dot').textContent = active ? '✓' : '';
        });
        root.querySelector('[data-selected]').disabled = !getQuery() || count === 0;
        root.querySelector('[data-all]').disabled = !getQuery();
        requestAnimationFrame(() => {
            repositionWidget();
            requestAnimationFrame(repositionWidget);
        });
    }

    function buildWidget() {
        const host = document.createElement('span');
        host.id = 'mps-root';
        host.setAttribute('aria-label', 'Поиск по маркетплейсам');
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = `
            <style>
                :host { display:block; position:fixed; z-index:2147483647; }
                *, *::before, *::after { box-sizing:border-box; font-family:Arial, sans-serif; }
                .mps-wrap { position:relative; }
                .mps-trigger { height:36px; border:0; border-radius:10px; padding:0 12px; display:flex; align-items:center; gap:8px; cursor:pointer; color:#7b8594; background:#f1f3f5; font-size:13px; font-weight:600; white-space:nowrap; box-shadow:none; }
                .mps-trigger:hover { background:#e9edf1; }
                .mps-trigger-content { display:flex; align-items:center; gap:4px; }
                .mps-trigger-logo { width:22px; height:22px; display:block; border-radius:6px; object-fit:contain; }
                .mps-chevron { width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-top:5px solid currentColor; opacity:.75; }
                .mps-menu { display:none; position:absolute; top:44px; left:0; width:198px; overflow:hidden; border:1px solid rgba(0,0,0,.11); border-radius:13px; background:#fff; color:#161616; box-shadow:0 14px 36px rgba(0,0,0,.22); }
                .mps-menu.open { display:block; }
                .mps-title { padding:12px 12px 7px; color:#777; font-size:12px; font-weight:600; }
                .mps-row { width:100%; height:38px; display:flex; align-items:center; gap:8px; padding:0 7px 0 11px; border:0; background:#fff; color:#222; text-align:left; cursor:pointer; font-size:13px; }
                .mps-row:hover { background:#f6f6f6; }
                .mps-dot { width:18px; height:18px; flex:0 0 18px; border:2px solid #b8b8b8; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; line-height:1; }
                .mps-row.selected .mps-dot { background:${current.accent}; border-color:${current.accent}; }
                .mps-icon { width:18px; height:18px; flex:0 0 18px; display:flex; align-items:center; justify-content:center; }
                .mps-icon img, .mps-icon svg { display:block; width:18px; height:18px; border-radius:5px; object-fit:contain; }
                .mps-row-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .mps-go { width:50px; height:25px; padding:0; border:0; border-radius:7px; display:flex; align-items:center; justify-content:center; background:${current.soft}; color:${current.accent}; cursor:pointer; font-size:19px; line-height:1; }
                .mps-go:hover { filter:brightness(.95); }
                .mps-footer { display:flex; gap:7px; padding:8px; border-top:1px solid #eee; }
                .mps-search { flex:1; height:34px; border:0; border-radius:8px; background:${current.accent}; color:#fff; cursor:pointer; font-size:11px; font-weight:700; white-space:nowrap; }
                .mps-search.secondary { background:${current.soft}; color:${current.accent}; }
                .mps-search:disabled { background:#d0d0d0; color:#fff; cursor:not-allowed; }
            </style>
            <div class="mps-wrap">
                <button class="mps-trigger" type="button" aria-expanded="false"><span class="mps-trigger-content" data-count></span><i class="mps-chevron"></i></button>
                <section class="mps-menu" aria-label="Выбор маркетплейсов">
                    <div class="mps-title">Где искать?</div>
                    ${Object.entries(MARKETPLACES).map(([key, market]) => `
                        <button class="mps-row" type="button" data-market="${key}" aria-pressed="false">
                            <span class="mps-dot"></span><span class="mps-icon"><img src="${iconUrl(market.icon)}" alt=""></span><span class="mps-row-name">${market.name}</span>
                            <span class="mps-go" role="button" data-go="${key}" title="Открыть поиск в новой вкладке">›</span>
                        </button>`).join('')}
                    <div class="mps-footer"><button class="mps-search secondary" type="button" data-selected>Выбранные</button><button class="mps-search" type="button" data-all>Везде</button></div>
                </section>
            </div>`;

        const menu = root.querySelector('.mps-menu');
        const trigger = root.querySelector('.mps-trigger');
        trigger.addEventListener('click', () => {
            const open = menu.classList.toggle('open');
            trigger.setAttribute('aria-expanded', String(open));
            render();
        });
        root.querySelectorAll('[data-market]').forEach((row) => row.addEventListener('click', (event) => {
            if (event.target.closest('[data-go]')) return;
            const key = row.dataset.market;
            selected.has(key) ? selected.delete(key) : selected.add(key);
            render();
        }));
        root.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const query = getQuery();
            if (query) {
                openMarketplace(button.dataset.go, query);
                menu.classList.remove('open');
                resetSelection();
            }
        }));
        root.querySelector('[data-selected]').addEventListener('click', () => runSearch());
        root.querySelector('[data-all]').addEventListener('click', () => runSearch(Object.keys(MARKETPLACES)));
        document.addEventListener('pointerdown', (event) => {
            if (!host.contains(event.target)) {
                menu.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        }, true);
        return host;
    }

    function bindSearchInput(input, form) {
        const side = 'Left';
        const dataKey = `mpsBase${side}`;
        if (!input.dataset[dataKey]) {
            input.dataset[dataKey] = String(parseFloat(getComputedStyle(input)[`padding${side}`]) || 0);
        }
        const trigger = document.getElementById('mps-root')?.shadowRoot?.querySelector('.mps-trigger');
        const triggerWidth = Math.ceil(trigger?.getBoundingClientRect().width || 96);
        const clearance = currentKey === 'wildberries' ? -4 : currentKey === 'aliexpress' ? 0 : currentKey === 'avito' ? 11 : currentKey === 'yandex' ? 10 : 8;
        input.style.setProperty(`padding-${side.toLowerCase()}`, `${Number(input.dataset[dataKey]) + triggerWidth + clearance}px`, 'important');

        if (!input.dataset.mpsBound) {
            input.dataset.mpsBound = 'true';
            input.addEventListener('input', render);
            input.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' || event.isComposing) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                runSearch();
            }, true);
        }
        if (form && !form.dataset.mpsBound) {
            form.dataset.mpsBound = 'true';
            form.addEventListener('submit', (event) => {
                if (allowNativeSubmit) {
                    allowNativeSubmit = false;
                    return;
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                runSearch();
            }, true);
        }
        const buttonScope = currentKey === 'aliexpress' && form ? form : document;
        current.searchButtons.forEach((selector) => {
            buttonScope.querySelectorAll(selector).forEach((button) => {
                if (button.offsetParent === null || button.dataset.mpsBound) return;
                button.dataset.mpsBound = 'true';
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    runSearch();
                }, true);
            });
        });
    }

    function mount() {
        const input = getVisibleInput();
        if (!input) return;
        const form = input.closest('form');
        mountedInput = input;
        mountedForm = form;

        if (currentKey === 'ozon' && form) {
            const nativeScope = form.querySelector('[title="Везде"]');
            if (nativeScope) nativeScope.style.setProperty('display', 'none', 'important');
        }
        bindSearchInput(input, form);
        bindSuggestions();

        let widget = document.getElementById('mps-root');
        if (!widget) {
            widget = buildWidget();
            document.body.append(widget);
        }
        repositionWidget = () => {
            const liveInput = getVisibleInput();
            if (!liveInput || !liveInput.isConnected) {
                widget.style.display = 'none';
                return;
            }
            const liveForm = liveInput.closest('form');
            mountedInput = liveInput;
            mountedForm = liveForm;
            bindSearchInput(liveInput, liveForm);
            const box = liveInput.getBoundingClientRect();
            if (box.width < 1 || box.height < 1) {
                widget.style.display = 'none';
                return;
            }
            widget.style.display = 'block';
            widget.style.left = `${Math.max(4, box.left + 7)}px`;
            const verticalOffset = currentKey === 'avito' ? -9 : 0;
            widget.style.top = `${box.top + Math.max(2, (box.height - 36) / 2) + verticalOffset}px`;
        };
        if (!widget.dataset.mpsPositionBound) {
            widget.dataset.mpsPositionBound = 'true';
            addEventListener('resize', () => repositionWidget(), { passive: true });
            addEventListener('scroll', () => repositionWidget(), { passive: true, capture: true });
        }
        repositionWidget();
        render();
    }

    bindSuggestions();

    const startWidget = () => {
        const observer = new MutationObserver(mount);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        mount();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startWidget, { once: true });
    } else {
        startWidget();
    }
})();
