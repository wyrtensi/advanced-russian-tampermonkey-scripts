// ==UserScript==
// @name         Google -> Yandex Search Button
// @namespace    https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @version      1.1.1
// @description  Кнопка поиска текущего запроса на Яндексе.
// @author       Wyrtensi
// @homepageURL  https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @supportURL   https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts/issues
// @downloadURL  https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/google-to-yandex/google-to-yandex.user.js
// @updateURL    https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/google-to-yandex/google-to-yandex.user.js
// @match        *://www.google.com/*
// @match        *://www.google.ru/*
// @match        *://google.com/*
// @match        *://google.ru/*
// @match        *://www.google.co.uk/*
// @match        *://www.google.de/*
// @match        *://www.google.fr/*
// @match        *://www.google.es/*
// @match        *://www.google.it/*
// @match        *://www.google.ca/*
// @match        *://www.google.com.au/*
// @match        *://www.google.com.tw/*
// @match        *://www.google.co.jp/*
// @match        *://www.google.com.br/*
// @match        *://www.google.com.mx/*
// @match        *://www.google.com.ar/*
// @match        *://www.google.co.in/*
// @match        *://www.google.com.pk/*
// @match        *://www.google.com.sa/*
// @match        *://www.google.ae/*
// @match        *://www.google.co.za/*
// @match        *://www.google.com.ng/*
// @match        *://www.google.com.eg/*
// @match        *://www.google.com.tr/*
// @match        *://www.google.pl/*
// @match        *://www.google.nl/*
// @match        *://www.google.be/*
// @match        *://www.google.ch/*
// @match        *://www.google.at/*
// @match        *://www.google.se/*
// @match        *://www.google.no/*
// @match        *://www.google.dk/*
// @match        *://www.google.fi/*
// @match        *://www.google.pt/*
// @match        *://www.google.gr/*
// @match        *://www.google.cz/*
// @match        *://www.google.sk/*
// @match        *://www.google.hu/*
// @match        *://www.google.ro/*
// @match        *://www.google.bg/*
// @match        *://www.google.si/*
// @match        *://www.google.hr/*
// @match        *://www.google.rs/*
// @match        *://www.google.ba/*
// @match        *://www.google.me/*
// @match        *://www.google.mk/*
// @match        *://www.google.lv/*
// @match        *://www.google.lt/*
// @match        *://www.google.ee/*
// @match        *://www.google.by/*
// @match        *://www.google.ua/*
// @match        *://www.google.kz/*
// @match        *://www.google.uz/*
// @match        *://www.google.kg/*
// @match        *://www.google.tj/*
// @match        *://www.google.tm/*
// @match        *://www.google.az/*
// @match        *://www.google.ge/*
// @match        *://www.google.am/*
// @match        *://www.google.md/*
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const YANDEX_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.8086 24C6.2625 24 0.955078 18.6274 0.955078 12C0.955078 5.37258 6.2625 0 12.8086 0C19.3547 0 24.6621 5.37258 24.6621 12C24.6621 18.6274 19.3547 24 12.8086 24ZM10.9336 10.4289L13.7221 5.29492H16.2086L12.3086 11.9289V18.7051H10.0586V12.8289L6.93359 5.29492H9.40859L10.9336 10.4289Z" fill="#FC3F1D"/>
</svg>`;
    const MARKET_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;

    // Inject styles for dark mode and button
    const style = document.createElement('style');
    style.textContent = `
        .google-to-yandex-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none !important;
            margin-left: 10px;
            height: 40px;
            padding: 0 16px;
            border-radius: 20px;
            background-color: #fff;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            transition: all 0.2s;
            cursor: pointer;
            vertical-align: middle;
            z-index: 10001;
            box-sizing: border-box;
            font-family: 'YS Text', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #000 !important;
            white-space: nowrap;
        }
        .google-to-yandex-btn:hover {
            background-color: #f1f3f4;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            color: #000 !important;
            text-decoration: none !important;
        }
        .google-to-yandex-btn svg {
            width: 20px;
            height: 20px;
            margin-right: 8px;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .google-to-yandex-btn {
                background-color: #222426;
                border-color: #333;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                color: #fff !important;
            }
            .google-to-yandex-btn:hover {
                background-color: #2a2c2e;
                color: #fff !important;
            }
        }
    `;
    document.head.appendChild(style);

    function getQuery() {
        const input = document.querySelector('input[name="q"], textarea[name="q"]');
        if (input && input.value) return input.value;
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q');
    }

    function createButton() {
        if (document.getElementById('google-to-yandex-btn')) return;

        const query = getQuery();
        if (!query) return;

        const link = document.createElement('a');
        link.id = 'google-to-yandex-btn';
        link.className = 'google-to-yandex-btn';
        link.href = `https://yandex.ru/search/?text=${encodeURIComponent(query)}`;
        link.target = '_blank';
        link.title = 'Search on Yandex (Alt+Y)';
        link.innerHTML = YANDEX_ICON + 'Yandex';

        const link2 = document.createElement('a');
        link2.className = 'google-to-yandex-btn';
        link2.href = '#';
        link2.title = 'Search on Marketplaces';
        link2.innerHTML = MARKET_ICON + 'Markets';
        link2.addEventListener('click', (e) => {
            e.preventDefault();
            const q = encodeURIComponent(query);
            GM_openInTab(`https://www.ozon.ru/search/?text=${q}&from_global=true`, { active: true });
            GM_openInTab(`https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`, { active: true });
            GM_openInTab(`https://market.yandex.ru/search?text=${q}`, { active: true });
        });

        // 1. Target the search form container directly
        const searchForm = document.querySelector('form[role="search"]');
        
        if (searchForm) {
            const input = searchForm.querySelector('input[name="q"]');
            const searchBox = searchForm.querySelector('.RNNXgb') || (input ? input.closest('div[jscontroller]') : null) || searchForm.firstElementChild;
            
            if (searchBox) {
                // Use absolute positioning relative to the search box
                // This ensures the button is always to the right of the visual search bar
                
                // Ensure searchBox allows displaying content outside its bounds
                searchBox.style.overflow = 'visible';
                // Ensure positioning context
                if (window.getComputedStyle(searchBox).position === 'static') {
                    searchBox.style.position = 'relative';
                }

                const wrapper = document.createElement('div');
                wrapper.style.position = 'absolute';
                wrapper.style.left = '100%'; // Start at the right edge
                wrapper.style.top = '0';
                wrapper.style.height = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.whiteSpace = 'nowrap';
                
                wrapper.appendChild(link);
                wrapper.appendChild(link2);
                searchBox.appendChild(wrapper);
                return;
            }
            
            // Fallback: Append to form
            searchForm.appendChild(link);
            searchForm.appendChild(link2);
            return;
        }

        // 2. Fallback: Fixed position
        link.style.position = 'fixed';
        link.style.bottom = '30px';
        link.style.right = '30px';
        link.style.zIndex = '10000';
        
        link2.style.position = 'fixed';
        link2.style.bottom = '80px';
        link2.style.right = '30px';
        link2.style.zIndex = '10000';

        document.body.appendChild(link);
        document.body.appendChild(link2);
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'y' || e.key === 'Y')) {
            const query = getQuery();
            if (query) {
                window.open(`https://yandex.ru/search/?text=${encodeURIComponent(query)}`, '_blank');
            }
        }
    });

    const observer = new MutationObserver((mutations) => {
        if (!document.getElementById('google-to-yandex-btn')) {
            createButton();
        } else {
            const btn = document.getElementById('google-to-yandex-btn');
            const query = getQuery();
            if (query && btn.href !== `https://yandex.ru/search/?text=${encodeURIComponent(query)}`) {
                btn.href = `https://yandex.ru/search/?text=${encodeURIComponent(query)}`;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(createButton, 1000);
    window.addEventListener('load', createButton);

})();
