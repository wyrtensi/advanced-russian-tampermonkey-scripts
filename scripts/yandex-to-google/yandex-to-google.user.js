// ==UserScript==
// @name         Yandex -> Google Search Button
// @namespace    https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @version      1.1.1
// @description  Кнопка поиска текущего запроса в Google.
// @author       Wyrtensi
// @homepageURL  https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts
// @supportURL   https://github.com/wyrtensi/advanced-russian-tampermonkey-scripts/issues
// @downloadURL  https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/yandex-to-google/yandex-to-google.user.js
// @updateURL    https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/yandex-to-google/yandex-to-google.user.js
// @match        *://yandex.ru/*
// @match        *://yandex.com/*
// @match        *://yandex.by/*
// @match        *://yandex.kz/*
// @match        *://yandex.uz/*
// @match        *://yandex.tm/*
// @match        *://yandex.tj/*
// @match        *://yandex.az/*
// @match        *://yandex.fr/*
// @match        *://yandex.ee/*
// @match        *://yandex.lt/*
// @match        *://yandex.lv/*
// @match        *://yandex.md/*
// @match        *://dzen.ru/*
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const GOOGLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;
    const MARKET_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        .yandex-to-google-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            margin-left: 0;
            height: 40px;
            padding: 0 16px;
            border-radius: 20px;
            background-color: #fff;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            transition: all 0.2s;
            cursor: pointer;
            vertical-align: middle;
            z-index: 999;
            box-sizing: border-box;
            font-family: 'YS Text', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #000;
        }
        .yandex-to-google-btn:hover {
            background-color: #f1f3f4;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .yandex-to-google-btn svg {
            width: 20px;
            height: 20px;
            margin-right: 8px;
        }
        .yandex-to-google-btn + .yandex-to-google-btn {
            margin-left: 8px;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .yandex-to-google-btn {
                background-color: #222426;
                border-color: #333;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                color: #fff;
            }
            .yandex-to-google-btn:hover {
                background-color: #2a2c2e;
            }
        }
    `;
    document.head.appendChild(style);

    function getQuery() {
        const input = document.querySelector('input[name="text"], textarea[name="text"]');
        if (input && input.value) return input.value;
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('text');
    }

    function createButton() {
        if (document.getElementById('yandex-to-google-btn')) return;

        const query = getQuery();
        if (!query) return;

        const link = document.createElement('a');
        link.id = 'yandex-to-google-btn';
        link.className = 'yandex-to-google-btn';
        link.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        link.target = '_blank';
        link.title = 'Search on Google (Alt+G)';
        link.innerHTML = GOOGLE_ICON + 'Google';

        const link2 = document.createElement('a');
        link2.className = 'yandex-to-google-btn';
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

        // Insertion logic
        const searchForm = document.querySelector('form[role="search"]');
        const searchButton = document.querySelector('button[type="submit"]');
        
        if (searchButton && searchButton.parentNode) {
            const formParent = searchForm ? searchForm.parentNode : null;
            if (formParent) {
                 const wrapper = document.createElement('div');
                 wrapper.style.display = 'flex';
                 wrapper.style.alignItems = 'center';
                 wrapper.style.marginLeft = '-16px';
                 wrapper.appendChild(link);
                 wrapper.appendChild(link2);
                 
                 if (searchForm.nextSibling) {
                     formParent.insertBefore(wrapper, searchForm.nextSibling);
                 } else {
                     formParent.appendChild(wrapper);
                 }
                 return;
            }
        }
        
        // Fallback: Fixed position
        link.style.position = 'fixed';
        link.style.bottom = '20px';
        link.style.right = '20px';
        link.style.borderRadius = '20px';
        
        link2.style.position = 'fixed';
        link2.style.bottom = '70px';
        link2.style.right = '20px';
        link2.style.borderRadius = '20px';

        document.body.appendChild(link);
        document.body.appendChild(link2);
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'g' || e.key === 'G')) {
            const query = getQuery();
            if (query) {
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            }
        }
    });

    const observer = new MutationObserver((mutations) => {
        if (!document.getElementById('yandex-to-google-btn')) {
            createButton();
        } else {
            const btn = document.getElementById('yandex-to-google-btn');
            const query = getQuery();
            if (query && btn.href !== `https://www.google.com/search?q=${encodeURIComponent(query)}`) {
                btn.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(createButton, 1000);
    window.addEventListener('load', createButton);

})();
