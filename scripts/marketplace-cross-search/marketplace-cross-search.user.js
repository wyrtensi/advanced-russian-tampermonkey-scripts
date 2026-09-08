// ==UserScript==
// @name         Marketplace Cross Search
// @namespace    https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @version      1.0.6
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
    const MIN_FALLBACK_INPUT_WIDTH = 240;
    const INPUT_SETTLE_DELAY = 250;
    const SECONDARY_INPUT_HINT = /(?:по номеру|по заказ|по артикул|по продавц|в фильтр|в раздел|\bsku\b|\bfilter\b|\border\b)/i;
    let selected = new Set([currentKey]);
    let mountedInput;
    let mountedForm;
    let activeBinding;
    let allowNativeSubmit = false;
    let repositionWidget = () => {};
    let observedInput;
    let pendingInput;
    let pendingForm;
    let pendingInputTimer;
    let mountTimer;
    const inputResizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => repositionWidget())
        : null;

    function isInputOccluded(input, box) {
        if (box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) return true;
        if (typeof document.elementsFromPoint !== 'function') return false;

        const sampleX = Math.min(box.right - 2, box.left + box.width * 0.75);
        const sampleY = Math.min(box.bottom - 2, box.top + box.height / 2);
        const widget = document.getElementById('mps-root');
        const topElement = document.elementsFromPoint(sampleX, sampleY)
            .find((element) => element !== widget && !widget?.contains(element));
        if (!topElement) return false;

        const form = input.closest('form');
        return topElement !== input
            && !input.contains(topElement)
            && !topElement.contains(input)
            && !form?.contains(topElement);
    }

    function getVisibleInput() {
        const candidates = new Map();
        current.inputs.forEach((selector, selectorIndex) => {
            document.querySelectorAll(selector).forEach((input) => {
                if (!candidates.has(input)) candidates.set(input, selectorIndex);
            });
        });

        const ranked = [...candidates.entries()].flatMap(([input, selectorIndex]) => {
            if (input.offsetParent === null || input.disabled || input.readOnly || input.getAttribute('aria-hidden') === 'true') return [];
            const box = input.getBoundingClientRect();
            if (box.width < 1 || box.height < 1 || isInputOccluded(input, box)) return [];

            const form = input.closest('form');
            const hasSearchButton = Boolean(form && current.searchButtons.some((selector) =>
                [...form.querySelectorAll(selector)].some((button) => button.offsetParent !== null && !button.disabled)
            ));
            const inputHint = [input.name, input.placeholder, input.getAttribute('aria-label'), input.dataset.marker]
                .filter(Boolean)
                .join(' ');
            const confidence = Number(selectorIndex === 0)
                + Number(hasSearchButton)
                + Number(box.width >= MIN_FALLBACK_INPUT_WIDTH);
            // Require multiple main-search signals and reject common filter/search-within-page wording.
            const isStrongCandidate = confidence >= 2 && !SECONDARY_INPUT_HINT.test(inputHint);
            if (!isStrongCandidate) return [];

            const selectorScore = (current.inputs.length - selectorIndex) * 10000;
            const buttonScore = hasSearchButton ? 1000000 : 0;
            return [{ input, score: buttonScore + selectorScore + Math.min(box.width, 2000) }];
        });

        ranked.sort((left, right) => right.score - left.score);
        return ranked[0]?.input || null;
    }

    function clearPendingInput() {
        if (pendingInputTimer) clearTimeout(pendingInputTimer);
        pendingInput = undefined;
        pendingForm = undefined;
        pendingInputTimer = undefined;
    }

    function isInputSettled(input, form) {
        if (activeBinding?.input === input && activeBinding.form === form) return true;
        if (pendingInput === input && pendingForm === form) return pendingInputTimer === undefined;

        clearPendingInput();
        pendingInput = input;
        pendingForm = form;
        pendingInputTimer = setTimeout(() => {
            pendingInputTimer = undefined;
            mount();
        }, INPUT_SETTLE_DELAY);
        return false;
    }

    function scheduleMount() {
        if (mountTimer) return;
        mountTimer = setTimeout(() => {
            mountTimer = undefined;
            mount();
        }, 0);
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

    function unbindSearchInput() {
        if (!activeBinding) {
            mountedInput = undefined;
            mountedForm = undefined;
            return;
        }

        const { input, form, buttons, controller, paddingProperty, originalPaddingValue, originalPaddingPriority, nativeScope } = activeBinding;
        controller.abort();
        if (originalPaddingValue) input.style.setProperty(paddingProperty, originalPaddingValue, originalPaddingPriority);
        else input.style.removeProperty(paddingProperty);
        delete input.dataset.mpsBaseLeft;
        delete input.dataset.mpsBound;
        if (form) delete form.dataset.mpsBound;
        buttons.forEach((button) => delete button.dataset.mpsBound);
        if (nativeScope) {
            if (nativeScope.displayValue) nativeScope.element.style.setProperty('display', nativeScope.displayValue, nativeScope.displayPriority);
            else nativeScope.element.style.removeProperty('display');
        }

        inputResizeObserver?.disconnect();
        observedInput = undefined;
        activeBinding = undefined;
        mountedInput = undefined;
        mountedForm = undefined;
    }

    function bindNativeScope(binding) {
        if (currentKey !== 'ozon' || !binding.form) return;
        const element = binding.form.querySelector('[title="Везде"]');
        if (!element) return;

        if (!binding.nativeScope || binding.nativeScope.element !== element) {
            binding.nativeScope = {
                element,
                displayValue: element.style.getPropertyValue('display'),
                displayPriority: element.style.getPropertyPriority('display')
            };
        }
        if (element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== 'important') {
            element.style.setProperty('display', 'none', 'important');
        }
    }

    function bindSearchButtons(binding) {
        const { form, buttons, controller } = binding;
        const hasButtonInForm = Boolean(form && current.searchButtons.some((selector) => form.querySelector(selector)));
        const buttonScope = hasButtonInForm ? form : document;
        current.searchButtons.forEach((selector) => {
            buttonScope.querySelectorAll(selector).forEach((button) => {
                if (button.offsetParent === null || buttons.has(button)) return;
                buttons.add(button);
                button.dataset.mpsBound = 'true';
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    runSearch();
                }, { capture: true, signal: controller.signal });
            });
        });
    }

    function bindSearchInput(input, form) {
        const side = 'Left';
        const paddingProperty = `padding-${side.toLowerCase()}`;
        if (activeBinding && (activeBinding.input !== input || activeBinding.form !== form)) {
            unbindSearchInput();
        }

        if (!activeBinding) {
            const controller = new AbortController();
            activeBinding = {
                input,
                form,
                controller,
                buttons: new Set(),
                paddingProperty,
                basePadding: parseFloat(getComputedStyle(input)[`padding${side}`]) || 0,
                originalPaddingValue: input.style.getPropertyValue(paddingProperty),
                originalPaddingPriority: input.style.getPropertyPriority(paddingProperty)
            };
            input.dataset.mpsBaseLeft = String(activeBinding.basePadding);
            input.dataset.mpsBound = 'true';
            input.addEventListener('input', render, { signal: controller.signal });
            input.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' || event.isComposing) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                runSearch();
            }, { capture: true, signal: controller.signal });

            if (form) {
                form.dataset.mpsBound = 'true';
                form.addEventListener('submit', (event) => {
                    if (allowNativeSubmit) {
                        allowNativeSubmit = false;
                        return;
                    }
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    runSearch();
                }, { capture: true, signal: controller.signal });
            }
        }

        mountedInput = input;
        mountedForm = form;
        if (inputResizeObserver && observedInput !== input) {
            inputResizeObserver.disconnect();
            inputResizeObserver.observe(input);
            observedInput = input;
        }

        const trigger = document.getElementById('mps-root')?.shadowRoot?.querySelector('.mps-trigger');
        const triggerWidth = Math.ceil(trigger?.getBoundingClientRect().width || 96);
        const clearance = currentKey === 'wildberries' ? -4 : currentKey === 'aliexpress' ? 0 : currentKey === 'avito' ? 11 : currentKey === 'yandex' ? 10 : 8;
        const paddingValue = `${activeBinding.basePadding + triggerWidth + clearance}px`;
        if (input.style.getPropertyValue(paddingProperty) !== paddingValue || input.style.getPropertyPriority(paddingProperty) !== 'important') {
            input.style.setProperty(paddingProperty, paddingValue, 'important');
        }
        bindNativeScope(activeBinding);
        bindSearchButtons(activeBinding);
    }

    function mount() {
        const input = getVisibleInput();
        if (!input) {
            clearPendingInput();
            unbindSearchInput();
            repositionWidget();
            return;
        }
        const form = input.closest('form');
        if (!isInputSettled(input, form)) {
            if (activeBinding) unbindSearchInput();
            const widget = document.getElementById('mps-root');
            if (widget) widget.style.display = 'none';
            return;
        }
        clearPendingInput();

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
                unbindSearchInput();
                widget.style.display = 'none';
                return;
            }
            const liveForm = liveInput.closest('form');
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
        const observer = new MutationObserver((mutations) => {
            const widget = document.getElementById('mps-root');
            if (widget && mutations.every((mutation) => mutation.target === widget || widget.contains(mutation.target))) return;
            scheduleMount();
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'disabled', 'readonly', 'aria-hidden']
        });
        mount();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startWidget, { once: true });
    } else {
        startWidget();
    }
})();
