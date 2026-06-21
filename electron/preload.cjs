/**
 * @file electron/preload.cjs
 * @description Electron 预加载脚本（CommonJS 版本）。
 *              在渲染进程中暴露安全的 IPC 接口，使前端能够调用主进程的文件对话框与文件读写能力。
 *              必须使用 CommonJS，因为 Electron 在 asar 包内加载 preload 时按 CommonJS 解析。
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
