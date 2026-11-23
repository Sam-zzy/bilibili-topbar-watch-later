# B站顶部状态栏：稍后再看入口

自定义哔哩哔哩网页右侧顶栏，保留大会员等原生入口，并可一键从最近添加的视频开始播放「稍后再看」播单。支持拖拽或用方向键排序、隐藏和重新添加图标、恢复默认布局。保存后，同一浏览器的支持页面共用设置，刷新后也会保留。

## 功能

- 点击「稍后播放」，在新标签页打开 B 站原生播单，从最近添加的视频开始播放。
- 按住图标或文字上下拖拽，也可以用 ↑ 和 ↓ 排序。
- 可以隐藏任意图标、逐个添加回来，或恢复九个图标的默认布局。
- 设置保存在当前浏览器的扩展或用户脚本存储中，同一版本的各标签页共用设置。

支持 B 站首页、视频页、搜索结果页、动态页和个人空间的桌面通用顶栏。适用域名为 `www.bilibili.com`、`search.bilibili.com`、`t.bilibili.com` 和 `space.bilibili.com`。页面出现通用顶栏的大会员入口后即可启用。

## 用户脚本

用 Tampermonkey 安装 [用户脚本](https://raw.githubusercontent.com/Sam-zzy/bilibili-topbar-watch-later/main/bilibili-dynamic-watch-later.user.js)，在支持的 B 站页面点击「篡改猴 → 调整顶栏顺序」。同时使用独立扩展和用户脚本时，请只启用其中一个，以免两者同时调整顶栏。

## Chrome 和 Edge 独立扩展

点击浏览器工具栏的扩展图标即可打开设置。以下命令使用 Python 标准库构建 Manifest V3 商店包和本地测试目录。

```powershell
python scripts/build.py
```

构建产物位于 `dist/`。商店上传 `bilibili-topbar-watch-later-<版本>.zip`。本地测试时，在 Chrome 或 Edge 的扩展管理页加载已解压的 `dist/extension`，再刷新支持的 B 站页面。

[隐私政策](./PRIVACY.md) · [MIT 许可证](./LICENSE)

独立社区项目。哔哩哔哩及相关商标归各自权利人所有。
