// ==UserScript==
// @name         B站顶部状态栏：稍后再看入口
// @namespace    local.bilibili.dynamic
// @version      1.5.0
// @description  一键播放稍后再看播单，并从篡改猴菜单拖拽排列或隐藏 B 站顶栏图标。
// @author       Sam-zzy
// @license      MIT
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @noframes
// ==/UserScript==

(async () => {
    'use strict';

    const navSelector = '.right-entry__main, .right-entry';
    const slotSelector = '.right-entry__item, .right-entry-item';
    const vipSelector = 'a:is(.right-entry__item-trigger, .right-entry__outside)[href*="account.bilibili.com/big"]';
    const labelText = '稍后播放';
    const playAllTitle = '稍后再看 · 播放全部';
    const playAllUrl = new URL('https://www.bilibili.com/list/watchlater');
    // B 站按添加时间倒序加载播单，并从第一条开始播放。
    playAllUrl.searchParams.set('watchlater_cfg', JSON.stringify({ viewed: 0, key: '', asc: false }));
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const playbackSlots = new Map();
    const hiddenAttribute = 'data-bili-header-hidden';
    const hidingStyle = document.createElement('style');
    hidingStyle.textContent = `[${hiddenAttribute}] { display: none !important; }`;
    const entryLabels = {
        avatar: '头像',
        vip: '大会员',
        watchLater: labelText,
        message: '消息',
        dynamic: '动态',
        favorite: '收藏',
        history: '历史',
        creator: '创作中心',
        upload: '投稿',
    };
    const defaultOrder = Object.keys(entryLabels);
    const iconPaths = {
        avatar: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
        vip: 'M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0Z M7.5 10.5h9M12 7.5v3c0 3-2 5-4 6m4.5-3.5 3.5 3.5',
        watchLater: 'M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0ZM10 8.5l5.5 3.5-5.5 3.5Z',
        message: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 4 6 5 6-5',
        dynamic: 'M12 12c-5 0-8-2-8-5a3 3 0 0 1 3-3c3 0 5 3 5 8Zm0 0c0-5 2-8 5-8a3 3 0 0 1 3 3c0 3-3 5-8 5Zm0 0c5 0 8 2 8 5a3 3 0 0 1-3 3c-3 0-5-3-5-8Zm0 0c0 5-2 8-5 8a3 3 0 0 1-3-3c0-3 3-5 8-5Z',
        favorite: 'm12 2.5 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9Z',
        history: 'M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0ZM12 7v5h4',
        creator: 'M9 19h6m-5 3h4m1-5c0-2 3-3 3-7a6 6 0 0 0-12 0c0 4 3 5 3 7m3-10-2 4h4l-2 3',
        upload: 'M12 15V3m-4 4 4-4 4 4M4 13v7h16v-7',
    };
    const orderKey = 'headerOrder';
    const entryClasses = {
        avatar: '.header-avatar-wrap, .right-entry-item--avatar',
        message: '.message-entry',
        dynamic: '.dynamic-entry',
        favorite: '.favorite-entry',
        history: '.history-entry',
        upload: '.upload-entry, .right-upload-entry, .right-entry-item--upload',
    };
    let layout = normalizeLayout();
    let hiddenSlots = new Set();
    let menuCommand;
    let settingsDialog;

    function normalizeLayout(saved) {
        const storedOrder = Array.isArray(saved) ? saved : saved?.order;
        const validKeys = (keys) => Array.isArray(keys) ? keys.filter((key) => defaultOrder.includes(key)) : [];
        const keys = validKeys(storedOrder);
        // Older versions stored only an array and used the VIP slot for playback.
        if (!keys.includes('vip') && keys.includes('watchLater')) keys.splice(keys.indexOf('watchLater'), 0, 'vip');
        return {
            order: Array.from(new Set([...keys, ...defaultOrder])),
            hidden: Array.from(new Set(validKeys(saved?.hidden))),
        };
    }

    function identifySlot(slot) {
        if (slot.hasAttribute('data-watch-later-entry')) return 'watchLater';
        if (playbackSlots.has(slot)) return 'vip';
        if (!slot.matches(slotSelector)) return;

        const knownClass = Object.keys(entryClasses).find((key) => slot.matches(entryClasses[key]));
        if (knownClass) return knownClass;

        const link = slot.querySelector('a:is(.right-entry__item-trigger, .right-entry__outside)') ?? slot.querySelector('a[href]');
        if (!link) return;
        const pathname = link.pathname.replace(/\/$/, '');
        switch (link.hostname) {
            case 'space.bilibili.com':
                if (/^\/\d+$/.test(pathname)) return 'avatar';
                if (/^\/\d+\/favlist$/.test(pathname)) return 'favorite';
                break;
            case 'message.bilibili.com': return 'message';
            case 't.bilibili.com': return 'dynamic';
            case 'www.bilibili.com':
                if (pathname === '/history') return 'history';
                break;
            case 'member.bilibili.com':
                if (pathname === '/platform/home') return 'creator';
                if (pathname.startsWith('/platform/upload')) return 'upload';
                break;
        }
    }

    function arrangeHeader(nav, nextHiddenSlots) {
        const children = Array.from(nav.children);
        const ranks = new Map();
        for (const slot of children) {
            const key = identifySlot(slot);
            const rank = layout.order.indexOf(key);
            if (rank !== -1) ranks.set(slot, rank);
            if (layout.hidden.includes(key)) nextHiddenSlots.add(slot);
        }
        const slots = Array.from(ranks.keys());
        const sorted = slots.slice().sort((left, right) => ranks.get(left) - ranks.get(right));
        if (sorted.every((slot, index) => slot === slots[index])) return;

        // Fill the sortable positions while leaving the site's other children in place.
        let index = 0;
        const arranged = children.map((slot) => ranks.has(slot) ? sorted[index++] : slot);
        for (let i = arranged.length - 1; i >= 0; i--) {
            const slot = arranged[i];
            const next = arranged[i + 1] ?? null;
            if (ranks.has(slot) && slot.nextElementSibling !== next) nav.insertBefore(slot, next);
        }
    }

    function arrangeHeaders() {
        const nextHiddenSlots = new Set();
        const headers = new Set(Array.from(playbackSlots.keys(), (slot) => slot.parentElement));
        for (const header of headers) {
            if (header?.isConnected) arrangeHeader(header, nextHiddenSlots);
        }
        for (const slot of hiddenSlots) {
            if (!nextHiddenSlots.has(slot)) slot.removeAttribute(hiddenAttribute);
        }
        for (const slot of nextHiddenSlots) slot.setAttribute(hiddenAttribute, '');
        hiddenSlots = nextHiddenSlots;
    }

    function copyLayout(source) {
        const element = document.createElementNS(source.namespaceURI, source.localName);
        // Vue's data-v-* attributes keep the header's scoped styles in effect.
        for (const { name, value } of source.attributes) {
            if (name === 'class' || name.startsWith('data-v-')) element.setAttribute(name, value);
        }
        return element;
    }

    function wrapInLayout(element, source, boundary) {
        for (let parent = source.parentElement; parent !== boundary; parent = parent.parentElement) {
            const wrapper = copyLayout(parent);
            wrapper.append(element);
            element = wrapper;
        }
        return element;
    }

    function createEntry(slot, vipLink) {
        const sourceIcon = vipLink.querySelector('svg');
        const sourceLabel = vipLink.querySelector('.trigger-text, .right-entry-text');
        if (!sourceIcon || !sourceLabel) return;

        const link = copyLayout(vipLink);
        link.href = playAllUrl.href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = playAllTitle;
        link.setAttribute('aria-label', playAllTitle);

        const icon = copyLayout(sourceIcon);
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('width', sourceIcon.getAttribute('width') ?? '20');
        icon.setAttribute('height', sourceIcon.getAttribute('height') ?? '20');
        icon.setAttribute('aria-hidden', 'true');
        appendIconPath(icon, 'watchLater');
        const label = copyLayout(sourceLabel);
        label.textContent = labelText;
        link.append(wrapInLayout(icon, sourceIcon, vipLink), wrapInLayout(label, sourceLabel, vipLink));
        const replacement = wrapInLayout(link, vipLink, slot.parentElement);
        replacement.setAttribute('data-watch-later-entry', '');
        return replacement;
    }

    function updatePlaybackEntries() {
        const staleSlots = new Set(playbackSlots.keys());
        for (const vipLink of document.querySelectorAll(vipSelector)) {
            if (vipLink.hostname !== 'account.bilibili.com' || !/^\/big\/?$/.test(vipLink.pathname)) continue;

            const nav = vipLink.closest(navSelector);
            const slot = nav && Array.from(nav.children).find((child) => child.contains(vipLink));
            if (!slot?.matches(slotSelector)) continue;

            const playbackSlot = playbackSlots.get(slot) ?? createEntry(slot, vipLink);
            if (!playbackSlot) continue;
            playbackSlots.set(slot, playbackSlot);
            staleSlots.delete(slot);

            if (playbackSlot.parentElement !== nav) slot.after(playbackSlot);
        }
        for (const slot of staleSlots) {
            playbackSlots.get(slot).remove();
            playbackSlots.delete(slot);
        }
        arrangeHeaders();

        if (playbackSlots.size && menuCommand === undefined) {
            document.head.append(hidingStyle);
            menuCommand = GM_registerMenuCommand('调整顶栏顺序', openOrderSettings);
        } else if (!playbackSlots.size && menuCommand !== undefined) {
            hidingStyle.remove();
            GM_unregisterMenuCommand(menuCommand);
            menuCommand = undefined;
        }
    }

    function containsHeader(node) {
        return node instanceof Element && (node.matches(navSelector) || node.querySelector(navSelector));
    }

    function appendIconPath(icon, key) {
        const path = document.createElementNS(svgNamespace, 'path');
        path.setAttribute('d', iconPaths[key]);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.8');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        icon.append(path);
    }

    function openOrderSettings() {
        if (settingsDialog?.open) return;

        const host = document.createElement('div');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                dialog {
                    color-scheme: light dark;
                    box-sizing: border-box;
                    width: min(450px, calc(100vw - 32px));
                    max-height: calc(100dvh - 32px);
                    padding: 22px;
                    border: 1px solid light-dark(#e3e5e7, #44484c);
                    border-radius: 14px;
                    background: light-dark(#fff, #202327);
                    color: light-dark(#18191c, #f1f2f3);
                    font: 14px/1.5 system-ui, sans-serif;
                }
                dialog::backdrop { background: #0006; }
                h2 { margin: 0 0 4px; font-size: 19px; }
                h3 { margin: 12px 0 5px; font-size: 13px; }
                p { margin: 0 0 12px; color: light-dark(#61666d, #b8bdc3); }
                ol, ul { margin: 0; padding: 0; list-style: none; }
                ol { position: relative; }
                li {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin: 4px 0;
                    padding: 2px 6px 2px 2px;
                    border: 1px solid light-dark(#ecedf0, #3b4044);
                    border-radius: 8px;
                    background: light-dark(#fafbfc, #292d30);
                }
                footer { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
                #reset-order { margin-inline-end: auto; }
                button {
                    padding: 4px 11px;
                    border: 1px solid light-dark(#d9dce0, #51565b);
                    border-radius: 6px;
                    background: light-dark(#fff, #2b2e32);
                    color: inherit;
                    font: inherit;
                    cursor: pointer;
                }
                button:focus-visible { outline: 2px solid #00aeec; outline-offset: 2px; }
                .entry-preview {
                    display: flex;
                    flex: 1;
                    min-width: 0;
                    align-items: center;
                    gap: 10px;
                    padding: 5px 9px;
                    border: 0;
                    background: transparent;
                    text-align: start;
                }
                .entry-preview svg { flex: none; width: 20px; height: 20px; }
                .drag-handle { cursor: grab; touch-action: none; user-select: none; }
                .drag-handle::after { content: '⠿'; margin-inline-start: auto; opacity: .48; }
                li.drag-placeholder {
                    border-style: dashed;
                    border-color: #00aeec;
                    background: light-dark(#ebf8ff, #183943);
                }
                li.drag-placeholder > * { visibility: hidden; }
                li.drag-preview {
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 2;
                    box-sizing: border-box;
                    margin: 0;
                    border-color: #00aeec;
                    box-shadow: 0 6px 20px #0003;
                    background: light-dark(#fff, #30363c);
                    pointer-events: none;
                    will-change: transform;
                }
                ol:has(.drag-placeholder) { cursor: grabbing; }
                .remove-entry { color: light-dark(#a53b47, #ff9dab); }
                [hidden] { display: none; }
                #save-order { border-color: transparent; background: #007fae; color: #fff; }
            </style>
            <dialog aria-labelledby="order-title">
                <h2 id="order-title">调整顶栏顺序</h2>
                <p>按住图标或文字上下拖动，也可聚焦后按 ↑ / ↓。</p>
                <p id="empty-order" hidden>顶栏图标均已隐藏。</p>
                <ol aria-label="顶栏图标顺序"></ol>
                <section id="hidden-entries" hidden>
                    <h3>已隐藏</h3>
                    <ul aria-label="已隐藏的图标"></ul>
                </section>
                <footer>
                    <button type="button" id="reset-order">恢复原始设置</button>
                    <button type="button" id="cancel-order">取消</button>
                    <button type="button" id="save-order">保存</button>
                </footer>
                <p id="save-error" role="alert" hidden>保存失败，请重试。</p>
            </dialog>`;

        const dialog = shadow.querySelector('dialog');
        const list = dialog.querySelector('ol');
        const hiddenSection = dialog.querySelector('#hidden-entries');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const rowAnimations = new WeakMap();
        let draft = normalizeLayout(layout);
        let drag;

        function slideRow(row, x, y, duration, zIndex = 'auto') {
            if (reducedMotion.matches || (!x && !y)) return;
            const animation = row.animate([
                { transform: `translate3d(${x}px, ${y}px, 0)`, zIndex },
                { transform: 'translate3d(0, 0, 0)', zIndex },
            ], { duration, easing: 'cubic-bezier(.2, .8, .2, 1)' });
            rowAnimations.set(row, animation);
        }

        function moveRow(row, before) {
            if (row === before || row.nextElementSibling === before) return;

            // Read the visible positions before cancelling a previous animation during a rapid drag.
            const positions = reducedMotion.matches ? [] : Array.from(list.children)
                .filter((item) => item !== drag?.row)
                .map((item) => [item, item.getBoundingClientRect().top]);
            for (const [item] of positions) rowAnimations.get(item)?.cancel();
            list.insertBefore(row, before);
            for (const [item, top] of positions) {
                slideRow(item, 0, top - item.getBoundingClientRect().top, 180);
            }

            const visible = Array.from(list.children, (item) => item.dataset.key);
            let index = 0;
            draft.order = draft.order.map((key) => draft.hidden.includes(key) ? key : visible[index++]);
        }

        function createRow(key, hidden) {
            const row = document.createElement('li');
            row.dataset.key = key;
            const preview = document.createElement(hidden ? 'span' : 'button');
            preview.className = 'entry-preview';
            const icon = document.createElementNS(svgNamespace, 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('aria-hidden', 'true');
            appendIconPath(icon, key);
            preview.append(icon, entryLabels[key]);
            if (!hidden) {
                preview.type = 'button';
                preview.classList.add('drag-handle');
                preview.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
                preview.addEventListener('keydown', (event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    event.stopPropagation();
                    const adjacent = event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
                    if (!adjacent) return;
                    moveRow(row, event.key === 'ArrowUp' ? adjacent : adjacent.nextElementSibling);
                    preview.focus();
                });
            }

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.textContent = hidden ? '添加' : '删除';
            toggle.classList.toggle('remove-entry', !hidden);
            toggle.setAttribute('aria-label', `${toggle.textContent}${entryLabels[key]}`);
            toggle.addEventListener('click', () => {
                draft.hidden = hidden ? draft.hidden.filter((item) => item !== key) : [...draft.hidden, key];
                drawOrder();
                dialog.querySelector(`li[data-key="${key}"] > button:last-child`)?.focus();
            });
            row.append(preview, toggle);
            return row;
        }

        function drawOrder() {
            const visible = draft.order.filter((key) => !draft.hidden.includes(key));
            list.replaceChildren(...visible.map((key) => createRow(key, false)));
            dialog.querySelector('#empty-order').hidden = visible.length > 0;
            hiddenSection.hidden = draft.hidden.length === 0;
            hiddenSection.querySelector('ul').replaceChildren(...draft.order
                .filter((key) => draft.hidden.includes(key))
                .map((key) => createRow(key, true)));
        }

        function positionDrag(event) {
            const x = event.clientX - drag.offsetX;
            const y = event.clientY - drag.offsetY;
            drag.preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }

        function moveDrag(event) {
            if (drag?.pointerId !== event.pointerId) return;
            positionDrag(event);

            // Use layout positions so a row sliding into place cannot reverse the sort.
            const listTop = list.getBoundingClientRect().top;
            const before = Array.from(list.children).find((row) => row !== drag.row &&
                event.clientY < listTop + row.offsetTop + row.offsetHeight / 2);
            moveRow(drag.row, before ?? null);
        }

        list.addEventListener('pointerdown', (event) => {
            const handle = event.target.closest('.drag-handle');
            if (drag || !handle || !event.isPrimary || event.button !== 0) return;

            const row = handle.closest('li');
            const bounds = row.getBoundingClientRect();
            rowAnimations.get(row)?.cancel();
            const preview = row.cloneNode(true);
            preview.classList.add('drag-preview');
            preview.inert = true;
            preview.style.width = `${bounds.width}px`;
            drag = {
                row,
                preview,
                pointerId: event.pointerId,
                offsetX: event.clientX - bounds.left,
                offsetY: event.clientY - bounds.top,
            };
            positionDrag(event);
            dialog.append(preview);
            row.classList.add('drag-placeholder');
            list.setPointerCapture(event.pointerId);
        });
        list.addEventListener('pointermove', moveDrag);
        for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            list.addEventListener(eventName, (event) => {
                if (drag?.pointerId !== event.pointerId) return;
                if (event.type === 'pointerup') moveDrag(event);

                const { row, preview } = drag;
                const previewBounds = preview.getBoundingClientRect();
                preview.remove();
                row.classList.remove('drag-placeholder');
                drag = undefined;
                const bounds = row.getBoundingClientRect();
                slideRow(row, previewBounds.left - bounds.left, previewBounds.top - bounds.top, 160, '1');
            });
        }
        shadow.querySelector('#reset-order').addEventListener('click', () => {
            draft = normalizeLayout();
            drawOrder();
        });
        shadow.querySelector('#cancel-order').addEventListener('click', () => dialog.close());
        const saveButton = shadow.querySelector('#save-order');
        saveButton.addEventListener('click', async () => {
            const pending = draft;
            saveButton.disabled = true;
            try {
                await GM_setValue(orderKey, pending);
                layout = pending;
                arrangeHeaders();
                dialog.close();
            } catch {
                shadow.querySelector('#save-error').hidden = false;
            } finally {
                saveButton.disabled = false;
            }
        });
        dialog.addEventListener('close', () => {
            host.remove();
            settingsDialog = undefined;
        }, { once: true });

        drawOrder();
        document.body.append(host);
        settingsDialog = dialog;
        dialog.showModal();
    }

    let receivedLayoutChange = false;
    GM_addValueChangeListener(orderKey, (_key, _previous, value, remote) => {
        if (!remote) return;
        receivedLayoutChange = true;
        layout = normalizeLayout(value);
        arrangeHeaders();
    });

    const savedLayout = await GM_getValue(orderKey);
    if (!receivedLayoutChange) layout = normalizeLayout(savedLayout);
    updatePlaybackEntries();
    new MutationObserver((records) => {
        const headerChanged = records.some(({ target, addedNodes, removedNodes }) =>
            (target instanceof Element && target.closest(navSelector)) ||
            Array.from(addedNodes).some(containsHeader) ||
            Array.from(removedNodes).some(containsHeader));
        if (headerChanged) updatePlaybackEntries();
    }).observe(document.documentElement, { childList: true, subtree: true, attributeFilter: ['href'] });
})();
