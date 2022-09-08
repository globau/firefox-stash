async function init_storage() {
  // clean up stale entries
  try {
    // build list of valid ids
    let valid_ids = [];
    let result = await browser.storage.sync.get();
    for (let s of result.index) {
      valid_ids.push(s.id);
    }

    // build list of keys with tab data
    let stash_ids = [];
    for (let k of Object.keys(result)) {
      if (k.search(/^i\d+$/) === 0) {
        stash_ids.push(k);
      }
    }

    // delete stale entries
    for (let id of stash_ids) {
      if (valid_ids.includes(id)) {
        await browser.storage.sync.remove(id);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("stash:", error);
  }
}

async function init_badge() {
  try {
    // fetch index and hide_badge setting
    let result = await browser.storage.sync.get(["index", "hide_badge"]);

    // hide badge if required
    if (result.hide_badge) {
      browser.browserAction.setBadgeText({ text: "" });
      return;
    }

    // otherwise set number of stashed items in the badge
    let count = result.index ? result.index.filter(Boolean).length : 0;
    browser.browserAction.setBadgeBackgroundColor({ color: "#444" });
    browser.browserAction.setBadgeText({ text: `${count || ""}` });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("stash:", error);
  }
}

init_storage();
init_badge();
browser.runtime.onMessage.addListener(init_badge);
