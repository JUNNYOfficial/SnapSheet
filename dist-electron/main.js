/**
 * @file electron/main.ts
 * @description Electron 主进程入口。
 *              负责创建应用窗口、加载渲染进程、处理本地文件对话框与系统级快捷键。
 *              构建后由 electron-builder 打包为桌面应用，安装时自动生成桌面快捷方式。
 */
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT ?? __dirname, 'public')
    : RENDERER_DIST;
let win = null;
// #region debug-point A:main-init
function debugLog(hypothesisId, msg, data) {
    try {
        const envPath = path.join(process.env.APP_ROOT ?? __dirname, '.dbg', 'electron-white-screen.env');
        let url = 'http://127.0.0.1:7777/event';
        let sessionId = 'electron-white-screen';
        if (fs.existsSync(envPath)) {
            const env = fs.readFileSync(envPath, 'utf-8');
            const u = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1];
            const s = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1];
            if (u)
                url = u.trim();
            if (s)
                sessionId = s.trim();
        }
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, runId: 'pre', hypothesisId, location: 'electron/main.ts', msg: `[DEBUG] ${msg}`, data, ts: Date.now() }),
        }).catch(() => { });
    }
    catch { }
}
debugLog('A', 'main process started', { VITE_DEV_SERVER_URL, APP_ROOT: process.env.APP_ROOT, RENDERER_DIST });
// #endregion
/**
 * 创建主窗口。
 * 开发环境加载 Vite 开发服务器，生产环境加载构建后的 index.html。
 */
function createWindow() {
    // #region debug-point A:create-window
    debugLog('A', 'createWindow called');
    // #endregion
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'SnapSheet',
        icon: path.join(process.env.VITE_PUBLIC ?? __dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // #region debug-point A:load-target
    const loadTarget = VITE_DEV_SERVER_URL || path.join(RENDERER_DIST, 'index.html');
    debugLog('A', 'loading renderer', { loadTarget, preload: path.join(__dirname, 'preload.js') });
    // #endregion
    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    }
    else {
        win.loadFile(path.join(RENDERER_DIST, 'index.html'));
    }
    // #region debug-point A:load-events
    win.webContents.on('did-finish-load', () => {
        debugLog('A', 'renderer did-finish-load');
    });
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        debugLog('A', 'renderer did-fail-load', { errorCode, errorDescription });
    });
    win.webContents.on('render-process-gone', (_event, details) => {
        debugLog('A', 'render-process-gone', details);
    });
    win.webContents.on('console-message', (_event, level, message) => {
        debugLog('C', `console-${level}`, { message });
    });
    // #endregion
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}
/** 应用准备就绪后创建窗口 */
// #region debug-point A:app-ready
app.on('ready', () => {
    debugLog('A', 'app ready');
    createWindow();
});
// #endregion
/** 所有窗口关闭后退出应用（Windows/Linux） */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        win = null;
    }
});
/** macOS 点击 Dock 图标时重新创建窗口 */
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
/**
 * 渲染进程调用：显示“打开文件”对话框。
 * @returns 用户选择的文件路径数组，取消时返回 undefined
 */
ipcMain.handle('dialog:openFile', async (_event, options) => {
    if (!win)
        return undefined;
    const { canceled, filePaths } = await dialog.showOpenDialog(win, options);
    if (canceled)
        return undefined;
    return filePaths;
});
/**
 * 渲染进程调用：显示“保存文件”对话框。
 * @returns 用户选择的保存路径，取消时返回 undefined
 */
ipcMain.handle('dialog:saveFile', async (_event, options) => {
    if (!win)
        return undefined;
    const { canceled, filePath } = await dialog.showSaveDialog(win, options);
    if (canceled || !filePath)
        return undefined;
    return filePath;
});
/**
 * 渲染进程调用：读取本地文件内容。
 * @param filePath 文件路径
 * @returns 文件内容字符串
 */
ipcMain.handle('fs:readFile', async (_event, filePath) => {
    return fs.readFileSync(filePath, 'utf-8');
});
/**
 * 渲染进程调用：写入本地文件。
 * @param filePath 文件路径
 * @param data 文件内容
 */
ipcMain.handle('fs:writeFile', async (_event, filePath, data) => {
    fs.writeFileSync(filePath, data, 'utf-8');
});
