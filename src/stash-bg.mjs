import * as Store from "./stash-db.mjs";
import { plural } from "./util.mjs";

export async function deleteStale() {
  // clean up stale entries
  try {
    // build list of valid ids
    let validIDs = [];
    let result = await browser.storage.sync.get();
    if (!result.index) return;
    for (let s of result.index) {
      validIDs.push(s.id);
    }

    // build list of keys with tab data
    let stashIDs = [];
    for (let k of Object.keys(result)) {
      if (k.search(/^i\d+$/) === 0) {
        stashIDs.push(k);
      }
    }

    // delete stale entries
    for (let id of stashIDs) {
      if (validIDs.includes(id)) {
        await browser.storage.sync.remove(id);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.exception(error);
  }
}

export async function store(title, windows) {
  let name = title.toLowerCase();
  if (await Store.exists(name)) {
    // eslint-disable-next-line no-console
    console.error("stash: '" + name + "' already exists");
    return;
  }

  let tabCount = 0;
  for (let w of windows) {
    tabCount += w.tabs.length;
  }
  await Store.put(
    name,
    title,
    plural(windows.length, "window") + ", " + plural(tabCount, "tab"),
    windows
  );
}

export async function restore(stashID) {
  // grab stashed tabs
  let stashedWindows = await Store.get(stashID);
  if (stashedWindows.length === 0) {
    return;
  }

  // replace current window if it has a single empty(ish) tab
  let currentWin = await browser.windows.getCurrent({ populate: true });
  if (
    currentWin.tabs.length > 1 ||
    (currentWin.tabs[0].url !== "about:blank" &&
      currentWin.tabs[0].url !== "about:newtab" &&
      currentWin.tabs[0].url !== "about:home")
  ) {
    currentWin = undefined;
  }

  let first = true;
  for (let stashed of stashedWindows) {
    // prepare window metadata
    let tabs = stashed.tabs;
    let firstTab = tabs.shift();
    delete stashed.tabs;
    stashed.focused = first;
    first = false;

    // create new window, or update current
    let win;
    if (currentWin !== undefined) {
      win = currentWin;
      currentWin = undefined;
    }
    if (win === undefined) {
      stashed.url = [firstTab.url];
      win = await browser.windows.create(stashed);
    } else {
      await browser.windows.update(win.id, stashed);
      await browser.tabs.update(win.tabs[0].id, {
        url: firstTab.url,
        loadReplace: true,
      });
    }

    // create other tabs
    for (let tab of tabs) {
      await browser.tabs.create({
        windowId: win.id,
        url: tab.url,
        active: tab.active,
        discarded: !tab.active,
        title: tab.active ? undefined : tab.title,
      });
    }

    await Store.remove(stashID);
  }
}
