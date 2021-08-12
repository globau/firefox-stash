async function init_storage() {
    // clean up stale entries
    try {
        // build list of valid ids
        let valid_ids = [];
        let res = await browser.storage.sync.get();
        for (let s of res.index) {
            valid_ids.push(s.id);
        }

        // build list of keys with tab data
        let stash_ids = [];
        for (let k of Object.keys(res)) {
            if (k.search(/^i\d+$/) === 0) {
                stash_ids.push(k);
            }
        }

        // delete stale entries
        for (let id of stash_ids) {
            if (valid_ids.indexOf(id) === -1) {
                await browser.storage.sync.remove(id);
            }
        }
    } catch (e) {
        console.error("stash:", e);
    }
}

async function init_badge() {
    try {
        // fetch index and hide_badge setting
        let res = await browser.storage.sync.get(["index", "hide_badge"]);

        // hide badge if required
        if (res.hide_badge) {
            browser.browserAction.setBadgeText({ text: "" });
            return;
        }

        // otherwise set number of stashed items in the badge
        let count = res.index ? res.index.filter((s) => s).length : 0;
        browser.browserAction.setBadgeBackgroundColor({ color: "#444" });
        browser.browserAction.setBadgeText({ text: `${count || ""}` });
    } catch (e) {
        console.error("stash:", e);
    }
}

init_storage();
init_badge();
browser.runtime.onMessage.addListener(init_badge);
