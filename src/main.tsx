/**
 * @file main.tsx
 * @description 应用入口文件。
 *              创建 React 根节点并渲染 App 组件，启用 StrictMode 以检测潜在问题。
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// #region debug-point C:renderer-init
function debugLog(hypothesisId: string, msg: string, data?: unknown) {
  try {
    fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'electron-white-screen', runId: 'pre', hypothesisId, location: 'src/main.tsx', msg: `[DEBUG] ${msg}`, data, ts: Date.now() }),
    }).catch(() => {});
  } catch {}
}
debugLog('C', 'main.tsx executed', { electronAPI: typeof window !== 'undefined' && !!(window as any).electronAPI });

window.onerror = (msg, url, line, col, err) => {
  debugLog('C', 'window.onerror', { msg, url, line, col, stack: err?.stack });
};
window.onunhandledrejection = (event) => {
  debugLog('C', 'unhandledrejection', { reason: String(event.reason), stack: event.reason?.stack });
};
// #endregion

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
