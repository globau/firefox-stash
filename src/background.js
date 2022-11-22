// sadly in manifest v2 this file can't be a module, making importing awkward

browser.runtime.onMessage.addListener(async (arg) => {
  try {
    const stash = await import("./stash-bg.mjs");
    switch (arg.event) {
      case "update-badge": {
        // no-op
        break;
      }
      case "store": {
        await stash.store(arg.title, arg.windows);
        break;
      }
      case "restore": {
        await stash.restore(arg.id);
        break;
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.exception(error);
  }

  // always update the badge
  const badge = await import("./badge-bg.mjs");
  await badge.update();
});

(async () => {
  const stash = await import("./stash-bg.mjs");
  const badge = await import("./badge-bg.mjs");

  await stash.deleteStale();
  await badge.update();
})();
