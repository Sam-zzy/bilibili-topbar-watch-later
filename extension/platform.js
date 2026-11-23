// Adapter for the userscript core in the extension's isolated content-script world.
const toolbarMenuCommands = new Map();
let toolbarMenuId = 0;

function GM_registerMenuCommand(_title, openSettings) {
    const id = ++toolbarMenuId;
    toolbarMenuCommands.set(id, openSettings);
    return id;
}

function GM_unregisterMenuCommand(id) {
    toolbarMenuCommands.delete(id);
}

async function GM_getValue(key) {
    const values = await chrome.storage.local.get(key);
    return values[key];
}

function GM_setValue(key, value) {
    return chrome.storage.local.set({ [key]: value });
}

function GM_addValueChangeListener(key, listener) {
    chrome.storage.local.onChanged.addListener((changes) => {
        if (Object.hasOwn(changes, key)) {
            const { oldValue, newValue } = changes[key];
            listener(key, oldValue, newValue, true);
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'open-topbar-settings') return;
    const openSettings = toolbarMenuCommands.values().next().value;
    if (openSettings) openSettings();
    respond({ opened: Boolean(openSettings) });
});
