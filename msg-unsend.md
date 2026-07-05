# Visit Instagram, open Following, paste this code in the console, and enter. 


 ```
// === Instagram Unsender – skip others without opening menu ===
(async function() {
    const MAX = 50;
    const DELAY = 2000;
    const SCROLL_DELAY = 3000;
    const SCROLL_AMOUNT = 900;
    const MENU_WAIT = 2000;
    const CONFIRM_WAIT = 800;
    const HOVER_WAIT = 800;

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const processed = new Set();

    const myUsername = prompt("Enter your Instagram username (e.g., saylane7):");
    if (!myUsername) {
        console.log('❌ Cancelled.');
        return;
    }
    console.log(`🔍 Targeting only @${myUsername} – processing from bottom up.`);

    // ---- Scroll container ----
    function getScrollContainer() {
        const candidates = document.querySelectorAll('div.html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu');
        for (const el of candidates) {
            const style = getComputedStyle(el);
            if ((style.overflowY === 'scroll' || style.overflowY === 'auto') &&
                el.scrollHeight > el.clientHeight) return el;
        }
        for (const el of document.querySelectorAll('*')) {
            const style = getComputedStyle(el);
            if ((style.overflowY === 'scroll' || style.overflowY === 'auto') &&
                el.scrollHeight > el.clientHeight) return el;
        }
        return document.documentElement;
    }

    async function scrollUp() {
        const container = getScrollContainer();
        if (!container) return false;
        const before = container.scrollTop;
        container.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        await wait(SCROLL_DELAY);
        const after = container.scrollTop;
        if (before !== after) console.log(`📜 Scrolled up: ${before - after}px`);
        return after < before;
    }

    // ---- Unique ID: text + timestamp (no aria-label dependency) ----
    function getMessageId(msg) {
        const text = msg.textContent.trim().slice(0, 80);
        const timeEl = msg.querySelector('time, span[class*="time"], span[aria-label*="time"]');
        const time = timeEl ? timeEl.textContent.trim() : '';
        return `${text}|${time}`;
    }

    function clickElement(el) {
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.focus();
        el.click();
        ['mousedown', 'mouseup', 'click'].forEach(type =>
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
        );
        return true;
    }

    function findUnsendButton() {
        const byText = Array.from(document.querySelectorAll('button, div[role="button"]'))
            .find(el => el.textContent.trim().toLowerCase() === 'unsend');
        if (byText) return byText;
        const svg = document.querySelector('svg[aria-label="Unsend"]');
        return svg ? svg.closest('div[role="button"]') || svg.closest('button') : null;
    }

    function findConfirmButton() {
        for (const d of document.querySelectorAll('div[role="dialog"]')) {
            const btn = Array.from(d.querySelectorAll('button, div[role="button"]'))
                .find(el => el.textContent.trim().toLowerCase() === 'unsend');
            if (btn) return btn;
        }
        return null;
    }

    function getMessages() {
        return Array.from(document.querySelectorAll('div[role="group"]'));
    }

    // ---- Main loop ----
    let unsent = 0;

    while (unsent < MAX) {
        const messages = getMessages();
        if (messages.length === 0) {
            const moved = await scrollUp();
            if (!moved) break;
            continue;
        }

        // Find bottommost unprocessed message
        let targetMsg = null;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const id = getMessageId(msg);
            if (!processed.has(id)) {
                targetMsg = msg;
                break;
            }
        }

        if (!targetMsg) {
            console.log('📜 All visible messages checked – loading older...');
            const moved = await scrollUp();
            if (!moved) {
                console.log('🏁 No more messages.');
                break;
            }
            continue;
        }

        // Mark as processed
        const msgId = getMessageId(targetMsg);
        processed.add(msgId);

        // ---- Hover to reveal the three-dot button ----
        targetMsg.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        targetMsg.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await wait(HOVER_WAIT);

        // ---- Find the dot SVG and check if it's your message ----
        const dotSvg = targetMsg.querySelector('svg[aria-label*="See more options for message"]');
        if (!dotSvg) continue; // no dot – skip

        const label = dotSvg.getAttribute('aria-label') || '';
        // Check if this message is from you (case‑insensitive)
        if (!label.toLowerCase().includes('from ' + myUsername.toLowerCase())) {
            // Not your message – skip (no menu opened)
            continue;
        }

        // ---- Your message: click the dot button ----
        const dotBtn = dotSvg.closest('div[role="button"]');
        if (!dotBtn) continue;

        dotBtn.click();
        await wait(MENU_WAIT);

        // ---- Find and click "Unsend" ----
        const unsendBtn = findUnsendButton();
        if (!unsendBtn) {
            // Should not happen, but just in case
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
            await wait(300);
            continue;
        }

        clickElement(unsendBtn);
        await wait(CONFIRM_WAIT);

        const confirmBtn = findConfirmButton();
        if (!confirmBtn) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
            continue;
        }

        clickElement(confirmBtn);
        unsent++;
        console.log(`✅ Unsend #${unsent} successful`);

        await wait(DELAY);
    }

    console.log(`🎉 Done! Unsent ${unsent} messages.`);
})();
