# 商店发布资料

## 名称

B站顶部状态栏：稍后再看入口

## 简短说明

通过浏览器工具栏自定义 B 站顶部状态栏，拖拽排序、隐藏图标，一键播放稍后再看播单。

## 商店详细说明

在哔哩哔哩桌面网页的右侧顶栏添加「稍后播放」入口，并按自己的习惯排列常用图标。点击入口即可在新标签页打开哔哩哔哩官方「稍后再看」播单，从最近加入的视频开始播放。原生大会员、头像、消息、动态、收藏、历史、创作中心和投稿仍可一同调整。

在支持的页面点击浏览器工具栏中的扩展图标，打开顶栏设置。按住图标或文字上下拖动即可修改顺序，也可以用键盘方向键调整。你可以单独隐藏图标，再从已隐藏列表逐个添加回来，或使用恢复原始设置还原默认布局。保存后的设置在同一浏览器的支持页面之间共用，刷新后仍会保留。

可在首页、视频页、搜索结果页、动态页和个人空间等使用通用桌面顶栏的页面使用。自动播放取决于哔哩哔哩的登录和播放设置。布局偏好保存在浏览器本机。独立社区项目，哔哩哔哩及相关商标归各自权利人所有。

## 审核说明

- 单一用途是自定义哔哩哔哩桌面网页通用顶栏及提供该顶栏的一键稍后播放入口。
- `storage` 保存本地排序和隐藏设置，并同步到同一浏览器的已打开页面。
- 内容脚本只在 `www.bilibili.com`、`search.bilibili.com`、`t.bilibili.com` 和 `space.bilibili.com` 的 HTTPS 页面启用，用于定位和修改顶栏 DOM。
- 测试可在已登录的 B 站首页进行。刷新页面后打开扩展图标，拖动一项并保存。再隐藏一项并保存，随后添加回来。验证「稍后播放」时，测试账号的稍后再看列表需有视频。请使用审核方自己的测试账户。
- 隐私政策 [查看](https://github.com/Sam-zzy/bilibili-topbar-watch-later/blob/main/PRIVACY.md)
- 支持页面 [GitHub Issues](https://github.com/Sam-zzy/bilibili-topbar-watch-later/issues)

## 提交文件

- Chrome Web Store 和 Edge Add-ons 共用 `dist/bilibili-topbar-watch-later-1.5.0.zip`。Edge 的商店标识使用 `dist/store-logo-300.png`。
- Chrome 和 Edge 可使用 `dist/store-screenshot-1280x800.png`。它展示独立扩展在示例页面打开的实际设置面板。
- Greasy Fork 使用根目录的 `bilibili-dynamic-watch-later.user.js`，语言设为简体中文，类别设为用户脚本。

[Chrome Web Store 发布](https://developer.chrome.com/docs/webstore/publish/) · [Edge Add-ons 发布](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) · [Greasy Fork 代码规则](https://greasyfork.org/zh-CN/help/code-rules)
