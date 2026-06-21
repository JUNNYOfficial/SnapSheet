/**
 * @file electron/preload.ts
 * @description Electron 预加载脚本。
 *              在渲染进程中暴露安全的 IPC 接口，使前端能够调用主进程的文件对话框与文件读写能力。
 *              通过 contextBridge 暴露，避免直接注入 node 能力。
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFile: (options: Electron.OpenDialogOptions) => Promise<string[] | undefined>;
  saveFile: (options: Electron.SaveDialogOptions) => Promise<string | undefined>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
}

const electronAPI: ElectronAPI = {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
