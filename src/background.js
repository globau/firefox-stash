// init badge
function init_badge() {
    browser.storage.sync.get(['index', 'hide_badge'])
        .then((result) => {
            if (result.hide_badge) {
                browser.browserAction.setBadgeText({
                    text: '',
                });
            } else {
                let count = result.index ? result.index.filter(s => s).length : 0;
                browser.browserAction.setBadgeBackgroundColor({
                    color: '#444'
                });
                browser.browserAction.setBadgeText({
                    text: `${count || ''}`
                });
            }
        })
        .catch((e) => {
            console.error(e);
        });
}

init_badge();
browser.runtime.onMessage.addListener(init_badge);