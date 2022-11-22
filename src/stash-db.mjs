async function load() {
  try {
    let result = await browser.storage.sync.get(["index", "hide_badge"]);
    if (result.index) {
      return result.index.filter(Boolean);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.exception(error);
  }
  return [];
}

export async function exists(name) {
  let stashed = await load();
  name = name.trim().toLowerCase();
  return stashed.some((s) => s.name === name);
}

export async function count() {
  let stashed = await load();
  return stashed.length;
}

export async function items() {
  let stashed = await load();
  let result = [];
  for (let s of stashed) {
    result.push({ id: s.id, title: s.title, summary: s.summary });
  }
  return result;
}

export async function remove(stashID) {
  let stashed = await load();
  stashed = stashed.filter((stash) => stash.id !== stashID);
  await browser.storage.sync.set({ index: stashed });
  await browser.storage.sync.remove(stashID);
}

export async function put(name, title, summary, windows) {
  let stashed = await load();
  const stashID = "i" + Date.now();
  stashed.push({
    id: stashID,
    name: name,
    title: title,
    summary: summary,
  });
  await browser.storage.sync.set({ index: stashed });
  await browser.storage.sync.set({ [stashID]: windows });
}

export async function get(stashID) {
  let result = await browser.storage.sync.get(stashID);
  if (!result[stashID]) {
    // eslint-disable-next-line no-console
    console.error("stash: deleting bad stashID: " + stashID);
    await remove(stashID);
    return [];
  }
  return result[stashID];
}
