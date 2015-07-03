// This Source Code Form is subject to the terms of the Mozilla Public License,
// v. 2.0. If a copy of the MPL was not distributed with this file, You can
// obtain one at http://mozilla.org/MPL/2.0/.

// firefox-stash
// byron@glob.com.au

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let bs = Cc['@mozilla.org/browser/nav-bookmarks-service;1'].getService(Ci.nsINavBookmarksService);
let hs = Cc['@mozilla.org/browser/nav-history-service;1'].getService(Ci.nsINavHistoryService);
let io = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
let wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

//
// stash and restore
//

function stash() {
    let window = activeWindow();
    let tabs = activeTabs();
    if (tabs.length === 0) {
        return;
    }

    // get name
    let value = { value: tabs[0].title };
    if (!Services.prompt.prompt(window, 'Stash', 'Stash this window as:', value, null, {})) {
        return;
    }
    let name = value.value;

    ignoreBookmarkChanges();

    // delete if existing
    for (let node of stashedNodes()) {
        if (node.title === name) {
            bs.removeItem(node.id);
        }
    }

    // add bookmark group to 'stashed' group
    let folderID = bs.createFolder(stashedFolderID(), name, bs.DEFAULT_INDEX);
    for (let tab of tabs) {
        bs.insertBookmark(folderID, io.newURI(tab.url, null, null), bs.DEFAULT_INDEX, tab.title);
    }

    // close window
    window.close();

    watchBookmarkChanges();

    updateStashed();
}

function restore() {
    let nodes = findBookmarks(this.folderID);
    let window = activeWindow();

    // open new window with the first tab
    window.open(nodes[0].uri);

    // add remaining tabs
    if (nodes.length > 1) {
        window = activeWindow();
        for (let i = 1, il = nodes.length; i < il; i++) {
            window.gBrowser.addTab(nodes[i].uri);
        }
    }

    // delete stash
    ignoreBookmarkChanges();
    bs.removeItem(this.folderID);
    watchBookmarkChanges();

    updateStashed();
}

//
// stash
//

let _stashedFolderID = 0;

function stashedFolderID() {
    if (_stashedFolderID === 0) {
        // look for 'stashed' bookmark folder
        let existing = findBookmarks(bs.bookmarksMenuFolder, function(node) {
            return node.title === 'Stashed';
        });
        if (existing.length) {
            _stashedFolderID = existing[0].itemId;
        }

        if (_stashedFolderID === 0) {
            // doesn't exist - create it
            _stashedFolderID = bs.createFolder(bs.bookmarksMenuFolder, 'Stashed', bs.DEFAULT_INDEX);
        }
    }
    return _stashedFolderID;
}

let _stashedNodes = null;
let _stashedItemIDs = null;

function rebuildStashed() {
    _stashedNodes = [];
    _stashedItemIDs = [ stashedFolderID() ];

    // load from bookmark group
    for (let node of findBookmarks(stashedFolderID())) {
        let tabs = findBookmarks(node.itemId);
        _stashedNodes.push({ title: node.title, id: node.itemId, tabs: tabs.length });

        _stashedItemIDs.push(node.itemId);
        for (let tab of tabs) {
            _stashedItemIDs.push(tab.itemId);
        }
    }
}

function updateStashed() {
    rebuildStashed();
    updateRestoreMenu();
}

function stashedNodes() {
    if (_stashedNodes === null) {
        rebuildStashed();
    }
    return _stashedNodes;
}

function isStashedItem(itemID) {
    if (_stashedItemIDs === null) {
        rebuildStashed();
    }
    return _stashedItemIDs.indexOf(itemID) !== -1;
}

//
// bookmarks
//

function findBookmarks(rootID, filter) {
    let options = hs.getNewQueryOptions();
    let query = hs.getNewQuery();
    query.setFolders([rootID], 1);
    let rootNode = hs.executeQuery(query, options).root;
    let nodes = [];
    rootNode.containerOpen = true;
    for (let i = 0, il = rootNode.childCount; i < il; i ++) {
        let node = rootNode.getChild(i);
        if (!filter || filter(node)) {
            nodes.push(node);
        }
    }
    rootNode.containerOpen = false;
    return nodes;
}

let _ignoreBookmarkChanges = false;

function ignoreBookmarkChanges() {
    _ignoreBookmarkChanges = true;
}

function watchBookmarkChanges() {
    _ignoreBookmarkChanges = false;
}

let bookmarkListener = {
    onItemAdded: function(itemID, folderID, index) {
        if (_ignoreBookmarkChanges) {
            return;
        }
        if (isStashedItem(itemID) || isStashedItem(folderID)) {
            updateStashed();
        }
    },
    onItemRemoved: function(itemID, folderID, index) {
        if (_ignoreBookmarkChanges) {
            return;
        }
        if (isStashedItem(itemID) || isStashedItem(folderID)) {
            updateStashed();
        }
    },
    onItemChanged: function(itemID, property, isAnnotationProperty, value) {
        if (_ignoreBookmarkChanges) {
            return;
        }
        if (isStashedItem(itemID)) {
            updateStashed();
        }
    },
    onItemMoved: function(itemID, oldParent, oldIndex, newParent, newIndex) {
        if (_ignoreBookmarkChanges) {
            return;
        }
        if (isStashedItem(itemID) || isStashedItem(oldParent) || isStashedItem(oldIndex) || isStashedItem(newParent)) {
            updateStashed();
        }
    },
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function() {},
    onItemVisited: function(bookmarkID, visitID, time) {},
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsINavBookmarkObserver])
};

//
// menus
//

let menuItems = [
    {
        id:     'stash_mi-separator',
        type:   'separator',
        parent: 'menu_ToolsPopup',
        before: 'devToolsSeparator'
    },
    {
        id:     'stash_mi-stash',
        type:   'item',
        parent: 'menu_ToolsPopup',
        before: 'devToolsSeparator',
        label:  'Stash...',
        onShow: function(menuItem) {
            let wintype = activeWindow().document.documentElement.getAttribute('windowtype');
            menuItem.setAttribute('disabled', wintype === 'navigator:browser' && activeTabs().length === 0);
        },
        onCommand: stash
    },
    {
        id:     'stash_mi-restore',
        type:   'menu',
        parent: 'menu_ToolsPopup',
        before: 'devToolsSeparator',
        label:  'Restore',
        onShow: function(menuItem) {
            menuItem.setAttribute('disabled', stashedNodes().length === 0);
        }
    }
];

function addMenuItem(window, item) {
    let menu = window.document.getElementById(item.parent);
    if (menu === null) {
        return;
    }
    let before = 'before' in item ? window.document.getElementById(item.before) : null;
    let element;

    if (item.type === 'separator') {
        element = window.document.createElement('menuseparator');
        element.setAttribute('id', item.id);
        menu.insertBefore(element, before);
    }
    else if (item.type === 'menu') {
        element = window.document.createElement('menu');
        element.setAttribute('id', item.extra);
        element.setAttribute('label', item.label);
        menu.insertBefore(element, before);
        let popup = window.document.createElement('menupopup');
        popup.setAttribute('id', item.id + '-popup');
        element.appendChild(popup);
    }
    else {
        element = window.document.createElement('menuitem');
        element.setAttribute('label', item.label);
        element.addEventListener('command', function() {
            item.onCommand.call(item, element);
        });
        menu.insertBefore(element, before);
    }

    if ('onShow' in item) {
        menu.addEventListener('popupshowing', function() {
            item.onShow.call(item, element);
        });
    }
}

function addStashedToWindow(window) {
    let nodes = stashedNodes();
    for (let node of nodes) {
        addMenuItem(window, {
            label:     node.title + ' (' + node.tabs + ' tab' + (node.tabs === 1 ? '' : 's') + ')',
            parent:    'stash_mi-restore-popup',
            id:        'stash_mi-' + node.id,
            folderID:  node.id,
            onCommand: restore
        });
    }
}

function updateRestoreMenu() {
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let window = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

        // remove submenu items
        let popup = window.document.getElementById('stash_mi-restore-popup');
        while (popup.firstChild) {
            popup.removeChild(popup.firstChild);
        }

        // add
        addStashedToWindow(window);
    }
}

function loadIntoWindow(window) {
    if (!window) {
        return;
    }

    // add base menu items
    for (let item of menuItems) {
        item.element = addMenuItem(window, item);
    }

    // add stashed items
    addStashedToWindow(window);
}

function unloadFromWindow(window) {
    if (!window) {
        return;
    }
    for (let item of menuItems) {
        if (item.type === 'menu') {
            window.document.getElementById(item.id + '-popup').remove();
        }
        window.document.getElementById(item.id).remove();
    }
}

let windowListener = {
    onOpenWindow: function(window) {
        let domWindow = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        domWindow.addEventListener('load', function onLoad() {
            domWindow.removeEventListener('load', onLoad, false);
            loadIntoWindow(domWindow);
        }, false);
    },
    onCloseWindow: function(window) {},
    onWindowTitleChange: function(window, title) {}
};

//
// addon
//

function startup(data, reason) {
    // add to existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        loadIntoWindow(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
    }

    // add listeners
    Services.wm.addListener(windowListener);
    bs.addObserver(bookmarkListener, false);
}

function shutdown(data, reason) {
    if (reason === APP_SHUTDOWN) {
        return;
    }

    wm.removeListener(windowListener);
    bs.removeObserver(bookmarkListener);

    let windows = wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        try {
            unloadFromWindow(domWindow);
        } catch (ex) {
            // ignore
        }
    }
}

function install(data, reason) {}
function uninstall(data, reason) {}

//
// helpers
//

function activeWindow() {
    return Services.wm.getMostRecentWindow('navigator:browser');
}

function activeTabs() {
    let tabs = [];
    let tabBrowser = activeWindow().gBrowser;
    for (let i = 0, il = tabBrowser.browsers.length; i < il; i++) {
        let tab = tabBrowser.getBrowserAtIndex(i);
        // ignore about: pages
        if (!tab.currentURI.spec.startsWith('about:')) {
            tabs.push({ title: tab.contentTitle, url: tab.currentURI.spec });
        }
    }
    return tabs;
}
