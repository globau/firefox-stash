function save_options() {
  let hide_badge = !document.querySelector("#show-badge").checked;
  browser.storage.sync.set({ hide_badge: hide_badge });
  browser.runtime.sendMessage(true);
}

function restore_options() {
  browser.storage.sync.get("hide_badge").then(
    (result) => {
      document.querySelector("#show-badge").checked = !result.hide_badge;
      browser.runtime.sendMessage(true);
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("stash:", error);
    }
  );
}

document.addEventListener("DOMContentLoaded", restore_options);
document.querySelector("#show-badge").addEventListener("click", save_options);
