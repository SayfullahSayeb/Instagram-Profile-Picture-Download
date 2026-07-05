# Visit Instagram, open Following, paste this code in the console, and enter. 


 ```
 // === Instagram Unsender – skip non‑your messages, auto‑scroll, no skipping ===
(async function() {
    const MAX = 50;                 // max messages to unsend
    const DELAY = 2000;             // wait between unsends
    const SCROLL_DELAY = 2500;      // wait after scrolling for new messages
    const SCROLL_AMOUNT = 800;      // pixels to scroll up each time
    const MENU_WAIT = 2000;
    const CONFIRM_WAIT = 800;
    const HOVER_WAIT = 800;

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const processedSet = new Set(); // store unique IDs of messages we've already checked

    // ----- Helper: get a unique ID for a message -----
    function getMessageId(msg) {
        // Combine the text content and the timestamp (if present) to make a semi‑unique ID
        const text = msg.textContent.trim().slice(0, 50); // first 50 chars
        // Find timestamp near the message
        const timeEl = msg.querySelector('time, span[class*="time"], span[aria-label*="time"]');
        const time = timeEl ? timeEl.textContent.trim() : '';
        return text + '|' + time;
    }

    // ----- Helper: reliable click -----
    function clickElement(el) {
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.focus();
        el.click();
        ['mousedown', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
        });
        return true;
    }

    // ----- Find "Unsend" button anywhere -----
    function findUnsendButton() {
        const byText = Array.from(document.querySelectorAll('button, div[role="button"]'))
            .find(el => el.textContent.trim().toLowerCase() === 'unsend');
        if (byText) return byText;
        const svg = document.querySelector('svg[aria-label="Unsend"]');
        if (svg) return svg.closest('div[role="button"]') || svg.closest('button');
        return null;
    }

    // ----- Find confirmation button -----
    function findConfirmButton() {
        for (const d of document.querySelectorAll('div[role="dialog"]')) {
            const btn = Array.from(d.querySelectorAll('button, div[role="button"]'))
                .find(el => el.textContent.trim().toLowerCase() === 'unsend');
            if (btn) return btn;
        }
        return null;
    }

    // ----- Get all message containers -----
    function getMessages() {
        return document.querySelectorAll('div[role="group"]');
    }

    // ----- Scroll up to load older messages -----
    async function scrollUp() {
        // Find the scrollable container
        const container = document.querySelector('div[role="list"]')?.closest?.('div[style*="overflow"]') ||
                          document.querySelector('main')?.querySelector?.('div[style*="overflow"]') ||
                          document.querySelector('[role="list"]')?.parentElement ||
                          document.documentElement;
        if (!container) return false;
        const oldScroll = container.scrollTop;
        container.scrollTop = Math.max(0, oldScroll - SCROLL_AMOUNT);
        await wait(SCROLL_DELAY);
        return container.scrollTop < oldScroll; // true if we scrolled
    }

    // ----- Main loop -----
    console.log(`🔄 Starting (max ${MAX})...`);
    let unsent = 0;
    let noNewMessagesCount = 0;

    while (unsent < MAX) {
        const messages = getMessages();
        if (messages.length === 0) {
            // No messages at all – try scrolling up
            const scrolled = await scrollUp();
            if (!scrolled) break;
            continue;
        }

        // Find the first message that hasn't been processed
        let targetMsg = null;
        for (const msg of messages) {
            const id = getMessageId(msg);
            if (!processedSet.has(id)) {
                targetMsg = msg;
                break;
            }
        }

        if (!targetMsg) {
            // All visible messages are processed – scroll up to load more
            const scrolled = await scrollUp();
            if (!scrolled) {
                console.log('🏁 No more new messages – stopping.');
                break;
            }
            continue;
        }

        // Mark as processed immediately (even before we check if it's ours)
        const msgId = getMessageId(targetMsg);
        processedSet.add(msgId);

        // ---- Hover ----
        targetMsg.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        targetMsg.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await wait(HOVER_WAIT);

        const dotSvg = targetMsg.querySelector('svg[aria-label*="See more options for message"]');
        if (!dotSvg) {
            // No dot button – skip (mark as processed already)
            continue;
        }
        const dotBtn = dotSvg.closest('div[role="button"]');
        if (!dotBtn) continue;

        dotBtn.click();
        await wait(MENU_WAIT);

        const unsendBtn = findUnsendButton();
        if (!unsendBtn) {
            // Not your message – close menu and skip
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            await wait(300);
            continue;
        }

        // ---- Click "Unsend" ----
        clickElement(unsendBtn);
        await wait(CONFIRM_WAIT);

        const confirmBtn = findConfirmButton();
        if (!confirmBtn) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            continue;
        }

        clickElement(confirmBtn);
        unsent++;
        console.log(`✅ Unsend #${unsent} successful`);

        await wait(DELAY);
    }

    console.log(`🎉 Done! Unsent ${unsent} messages.`);
})();
