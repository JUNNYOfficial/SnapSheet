/**
 * @file main.tsx
 * @description 应用入口文件。
 *              创建 React 根节点并渲染 App 组件，启用 StrictMode 以检测潜在问题。
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
