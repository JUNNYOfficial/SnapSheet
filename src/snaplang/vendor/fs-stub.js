/** fs 模块的浏览器/Electron 渲染进程存根，防止 Node API 调用报错 */
export function readFileSync() {
  throw new Error('fs is not available in the renderer process');
}
export function writeFileSync() {
  throw new Error('fs is not available in the renderer process');
}
export function existsSync() {
  return false;
}
export function mkdirSync() {}
export function rmSync() {}
export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
};
