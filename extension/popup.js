const status = document.querySelector('#status');
const retry = document.querySelector('#retry');

async function openSettings() {
    retry.hidden = true;
    status.textContent = '正在打开顶栏设置…';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = tab?.id && await chrome.tabs.sendMessage(tab.id, { type: 'open-topbar-settings' });
        if (result?.opened) {
            window.close();
            return;
        }
        status.textContent = '当前页面没有检测到 B 站通用顶栏。';
    } catch {
        status.textContent = '请在 B 站首页、搜索页、动态页或个人空间打开。刚安装时请先刷新页面。';
    }
    retry.hidden = false;
}

retry.addEventListener('click', openSettings);
openSettings();
