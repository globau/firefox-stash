import * as Stash from "./stash-fg.mjs";
import { _, plural } from "./util.mjs";

let gWindows; // current windows and tabs
let gFocused; // current window with tabs

function showCreateForm() {
  const nameElement = _("#name");
  const createElement = _("#create-preview");

  // switch popup from list to create form
  const isAll = document.body.dataset.action === "all";

  // show title and preview
  let windows;
  if (isAll) {
    _("#create-title-all").classList.remove("hidden");
    windows = gWindows;
  } else {
    _("#create-title-current").classList.remove("hidden");
    windows = [gFocused];
  }

  // name field value setter needs to trigger keyup
  function setName(value) {
    nameElement.value = value;
    nameElement.select();
    nameElement.focus();

    let event = new Event("keyup", { bubbles: false, cancelable: true });
    nameElement.dispatchEvent(event);
  }

  // clicking on a tab sets the stash name to the tab's title
  function setNameFromTab(event) {
    setName(event.target.textContent);
  }

  // add a title or tab to the create menu
  function addCreateListItem(text, isTitle = false) {
    let itemDiv = document.createElement("div");
    itemDiv.classList.add("panel-list-item");
    if (isTitle) {
      itemDiv.classList.add("title", "disabled");
    } else {
      itemDiv.addEventListener("click", setNameFromTab);
    }
    let textDiv = document.createElement("div");
    textDiv.classList.add("text");
    textDiv.append(document.createTextNode(text));
    itemDiv.append(textDiv);
    createElement.append(itemDiv);
  }

  // add windows to create menu, for preview and as a quick way to set the name
  for (let w of windows) {
    addCreateListItem("Window (" + plural(w.tabs.length, "tab") + ")", true);
    for (let t of w.tabs) {
      addCreateListItem(t.title);
    }
  }

  // show form and focus name
  _("#popup").classList.add("hidden");
  _("#create").classList.remove("hidden");

  // and set the default name
  let name = "Untitled";
  if (gFocused) {
    for (let t of gFocused.tabs) {
      if (t.active) {
        name = t.title;
        break;
      }
    }
  }
  setName(name);
}

// popup click events
async function handleClick(event) {
  // find containing panel-list-item
  let target = event.target.closest(".panel-list-item:not(.disabled)");
  if (target === null) return;

  // handle click
  try {
    if (target.id === "stash-current") {
      document.body.dataset.action = "current";
      showCreateForm();
    } else if (target.id === "stash-all") {
      document.body.dataset.action = "all";
      showCreateForm();
    } else if (target.classList.contains("stashed")) {
      await Stash.restore(target.dataset.id);
      window.close();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.exception(error);
    window.close();
  }
}
document.addEventListener("click", handleClick);

function initForm() {
  // enter --> save
  _("#name").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      _("#save-btn").click();
    }
  });

  // check for name conflicts as input updates
  _("#name").addEventListener("keyup", async () => {
    let name = _("#name").value.trim();

    if (name === "") {
      _("#save-btn").classList.add("disabled");
      _("#save-btn").disabled = true;
      return;
    }

    if (await Stash.exists(name)) {
      _("#create-exists").classList.remove("hidden");
      _("#save-btn").classList.add("disabled");
      _("#save-btn").disabled = true;
      return;
    }
    _("#create-exists").classList.add("hidden");

    _("#save-btn").classList.remove("disabled");
    _("#save-btn").disabled = false;
  });

  // save
  _("#save-btn").addEventListener("click", async () => {
    if (_("#save-btn").disabled) {
      return;
    }
    _("#save-btn").classList.add("disabled");
    _("#save-btn").disabled = true;

    let title = _("#name").value.trim();
    let windows =
      document.body.dataset.action === "current" ? [gFocused] : gWindows;
    let windowIDs = [];
    for (let w of windows) {
      windowIDs.push(w.id);
      delete w.id;
    }
    await Stash.store(title, windows);
    for (let id of windowIDs) {
      browser.windows.remove(id);
    }
  });
}

async function initgWindows() {
  // capture list of current windows
  let windows = await browser.windows.getAll({ populate: true });

  // load all windows into gWindows, point gFocused at focused window
  gWindows = [];
  gFocused = undefined;
  for (let w of windows) {
    let currentWindow = {
      id: w.id,
      state: w.state,
      tabs: [],
    };

    // some states cannot be combined with dimensions
    if (
      w.state !== "minimized" &&
      w.state !== "maximized" &&
      w.state !== "fullscreen"
    ) {
      currentWindow.top = w.top;
      currentWindow.left = w.left;
      currentWindow.width = w.width;
      currentWindow.height = w.height;
    }

    for (let t of w.tabs) {
      // always skip about: pages
      if (t.url.startsWith("about:")) {
        continue;
      }
      currentWindow.tabs.push({
        url: t.url,
        title: t.title,
        active: t.active,
        pinned: t.pinned,
      });
      if (w.focused) {
        gFocused = currentWindow;
      }
    }
    // ignore windows that just contain about: tabs
    if (currentWindow.tabs.length > 0) {
      gWindows.push(currentWindow);
    }
  }

  // enable stash menu items
  if (gFocused) {
    _("#stash-current").classList.remove("disabled");
  } else {
    _("#stash-current").title = "No stashable tabs";
  }
  if (gWindows.length > 1) {
    _("#stash-all").classList.remove("disabled");
  } else if (gWindows.length === 1) {
    _("#stash-all").title = "Only one window";
  } else {
    _("#stash-all").title = "No stashable tabs";
  }
}

async function initStashed() {
  const popupElement = _("#popup");

  function addRestoreListItem(id, text, title) {
    let itemDiv = document.createElement("div");
    itemDiv.classList.add("panel-list-item", "stashed");
    itemDiv.dataset.id = id;
    let textDiv = document.createElement("div");
    textDiv.classList.add("text");
    textDiv.title = title;
    textDiv.append(document.createTextNode(text));
    itemDiv.append(textDiv);
    popupElement.append(itemDiv);
  }

  let stashedItem = _("#popup .stashed");
  while (stashedItem) {
    stashedItem.remove();
    stashedItem = _("#popup .stashed");
  }

  const stashedItems = await Stash.items();
  if (stashedItems.length > 0) {
    _("#stash-empty").classList.add("hidden");
    for (let s of stashedItems) {
      addRestoreListItem(s.id, s.title, s.summary);
    }
  }
}

(async () => {
  try {
    initForm();
    await initgWindows();
    await initStashed();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.exception(error);
  }
})();
