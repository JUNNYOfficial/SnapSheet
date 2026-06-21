/**
 * @file electron/preload.ts
 * @description Electron 预加载脚本。
 *              在渲染进程中暴露安全的 IPC 接口，使前端能够调用主进程的文件对话框与文件读写能力。
 *              通过 contextBridge 暴露，避免直接注入 node 能力。
 */
import { contextBridge, ipcRenderer } from 'electron';
// #region debug-point B:preload-start
function debugLog(hypothesisId, msg, data) {
    try {
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: 'electron-white-screen', runId: 'pre', hypothesisId, location: 'electron/preload.ts', msg: `[DEBUG] ${msg}`, data, ts: Date.now() }),
        }).catch(() => { });
    }
    catch { }
}
debugLog('B', 'preload script executed');
const electronAPI = {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
