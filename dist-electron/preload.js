/**
 * @file electron/preload.ts
 * @description Electron 预加载脚本。
 *              在渲染进程中暴露安全的 IPC 接口，使前端能够调用主进程的文件对话框与文件读写能力。
 *              通过 contextBridge 暴露，避免直接注入 node 能力。
 */
import { contextBridge, ipcRenderer } from 'electron';
const electronAPI = {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
