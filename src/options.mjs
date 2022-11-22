import * as Badge from "./badge-fg.mjs";
import { _ } from "./util.mjs";

async function saveOptions() {
  let hideBadge = !_("#show-badge").checked;
  browser.storage.sync.set({ hide_badge: hideBadge });
  await Badge.notify();
}

function loadOptions() {
  browser.storage.sync.get("hide_badge").then(
    async (result) => {
      _("#show-badge").checked = !result.hide_badge;
      await Badge.notify();
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("stash:", error);
    }
  );
}

document.addEventListener("DOMContentLoaded", loadOptions);
_("#show-badge").addEventListener("click", saveOptions);
