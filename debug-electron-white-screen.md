# Debug Session: electron-white-screen

**Status:** `[OPEN]`

## Symptom

Electron 打包后的 SnapSheet 应用打开后显示白屏，没有渲染工具栏、表格等 UI 内容。窗口标题显示正常（"SnapSheet - 高性能电子表格"）。

## Environment

- OS: macOS
- Electron: 42.4.1
- Build output: `release/mac/SnapSheet.app`
- Packager: electron-builder 24.13.3

## Hypotheses

1. **H1 - 资源路径错误**：生产构建使用 `base: './'`，但 Electron 加载 `file://` 协议下的 `index.html` 时，CSS/JS 资源路径解析失败，导致页面空白。
2. **H2 - 主进程加载了错误的入口文件**：Electron 主进程在生产环境下加载的 `index.html` 路径不正确或文件不存在。
3. **H3 - 渲染进程 JavaScript 崩溃**：React 应用在初始化时抛出未捕获异常，导致根组件未挂载。可能与 `import.meta.env`、`window.electronAPI` 或 SnapLang 加载有关。
4. **H4 - Preload 脚本加载失败**：`preload.js` 路径或内容错误，导致渲染进程无法与主进程通信，进而阻塞初始化。
5. **H5 - CSP / 安全策略阻止**：Electron 的 webSecurity 或内容安全策略阻止了本地资源加载。

## Evidence Plan

1. 在 `electron/main.ts` 主进程中插入日志，确认加载的 URL/文件路径、窗口创建状态。
2. 在 `electron/preload.ts` 中插入日志，确认预加载脚本执行。
3. 在 `src/main.tsx` 和 `src/App.tsx` 顶部插入日志，确认渲染进程启动及 React 初始化状态。
4. 捕获 `window.onerror` / `unhandledrejection` 事件，上报渲染进程异常。
5. 重新构建并运行 Electron 应用，查看日志输出。
