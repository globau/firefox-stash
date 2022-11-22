import * as Store from "./stash-db.mjs";

export async function store(title, windows) {
  browser.runtime.sendMessage({
    event: "store",
    title: title,
    windows: windows,
  });
}

export function restore(stashID) {
  browser.runtime.sendMessage({ event: "restore", id: stashID });
}

export function exists(name) {
  return Store.exists(name);
}

export function items() {
  return Store.items();
}
