/**
 * @file electron/main.ts
 * @description Electron 主进程入口。
 *              负责创建应用窗口、加载渲染进程、处理本地文件对话框与系统级快捷键。
 *              构建后由 electron-builder 打包为桌面应用，安装时自动生成桌面快捷方式。
 */
import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT ?? __dirname, 'public')
    : RENDERER_DIST;
let win = null;
/**
 * 创建主窗口。
 * 开发环境加载 Vite 开发服务器，生产环境加载构建后的 index.html。
 */
function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'SnapSheet',
        icon: path.join(process.env.VITE_PUBLIC ?? __dirname, 'icon.png'),
        titleBarStyle: 'hiddenInset',
        transparent: true,
        vibrancy: 'under-window',
        backgroundMaterial: 'acrylic',
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    }
    else {
        win.loadFile(path.join(RENDERER_DIST, 'index.html'));
    }
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}
/** 设置 macOS 原生应用菜单为中文 */
function setAppMenu() {
    if (process.platform !== 'darwin')
        return;
    const template = [
        {
            label: 'SnapSheet',
            submenu: [
                { label: '关于 SnapSheet', role: 'about' },
                { type: 'separator' },
                { label: '偏好设置…', accelerator: 'CmdOrCtrl+,', click: () => win?.webContents.send('menu:preferences') },
                { type: 'separator' },
                { label: '隐藏 SnapSheet', role: 'hide' },
                { label: '隐藏其他', role: 'hideOthers' },
                { label: '显示全部', role: 'unhide' },
                { type: 'separator' },
                { label: '退出 SnapSheet', role: 'quit' },
            ],
        },
        {
            label: '文件',
            submenu: [
                { label: '新建工作簿', accelerator: 'CmdOrCtrl+N', click: () => win?.webContents.send('menu:new-workbook') },
                { label: '打开…', accelerator: 'CmdOrCtrl+O', click: () => win?.webContents.send('menu:open-workbook') },
                { type: 'separator' },
                { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => win?.webContents.send('menu:save-workbook') },
                { type: 'separator' },
                { label: '关闭窗口', role: 'close' },
            ],
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
                { label: '重做', role: 'redo', accelerator: 'CmdOrCtrl+Shift+Z' },
                { type: 'separator' },
                { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
                { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
                { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
                { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
            ],
        },
        {
            label: '视图',
            submenu: [
                { label: '重新加载', role: 'reload' },
                { label: '切换开发者工具', role: 'toggleDevTools', accelerator: 'Alt+CmdOrCtrl+I' },
                { type: 'separator' },
                { label: '实际大小', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
                { label: '放大', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
                { label: '缩小', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
                { type: 'separator' },
                { label: '切换全屏', role: 'togglefullscreen' },
            ],
        },
        {
            label: '窗口',
            submenu: [
                { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
                { label: '缩放', role: 'zoom' },
                { type: 'separator' },
                { label: '前置全部窗口', role: 'front' },
            ],
        },
        {
            label: '帮助',
            submenu: [
                { label: 'SnapSheet 帮助', click: () => shell.openExternal('https://github.com/snapsheet/snapsheet') },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
/** 配置“关于”面板信息 */
function setAboutPanel() {
    app.setAboutPanelOptions({
        applicationName: 'SnapSheet',
        applicationVersion: '0.0.0',
        version: '0.0.0',
        copyright: '版权所有 © 2026 SnapSheet',
        credits: 'SnapSheet 团队',
    });
}
/** 应用准备就绪后创建窗口 */
app.on('ready', () => {
    app.setName('SnapSheet');
    setAppMenu();
    setAboutPanel();
    createWindow();
});
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
