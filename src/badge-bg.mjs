import * as Store from "./stash-db.mjs";

export async function update() {
  let result = await browser.storage.sync.get(["hide_badge"]);

  if (result.hide_badge) {
    // hide badge
    browser.browserAction.setBadgeText({ text: "" });
  } else {
    // set number of stashed items in the badge
    const count = await Store.count();
    browser.browserAction.setBadgeBackgroundColor({ color: "#444" });
    browser.browserAction.setBadgeText({ text: `${count || ""}` });
  }
}
