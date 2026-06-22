import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { spawn } from 'node:child_process'
import path from 'node:path'

let electronProcess: ReturnType<typeof spawn> | null = null

/**
 * 开发模式下自动启动 Electron 的 Vite 插件。
 * 在 Vite 开发服务器准备就绪后调用 electron . 启动桌面窗口。
 */
function electronDevPlugin() {
  return {
    name: 'electron-dev',
    configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer.address()
        const port = typeof address === 'object' && address ? address.port : 5173
        process.env.VITE_DEV_SERVER_URL = `http://localhost:${port}`

        if (electronProcess) {
          electronProcess.kill()
          electronProcess = null
        }

        electronProcess = spawn('electron', [path.resolve(__dirname, 'dist-electron/main.js')], {
          stdio: 'inherit',
          env: { ...process.env, VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL },
        })
      })
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tsconfigPaths(),
    electronDevPlugin(),
  ],
})
