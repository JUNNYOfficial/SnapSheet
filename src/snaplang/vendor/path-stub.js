/** path 模块的浏览器/Electron 渲染进程存根 */
export function join(...segments) {
  return segments.join('/');
}
export function resolve(...segments) {
  return segments.join('/');
}
export function dirname(p) {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(0, idx) : '.';
}
export function extname(p) {
  const idx = p.lastIndexOf('.');
  return idx >= 0 ? p.slice(idx) : '';
}
export function basename(p, ext) {
  let name = p.replace(/\\/g, '/').split('/').pop() || '';
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}
export default {
  join,
  resolve,
  dirname,
  extname,
  basename,
};
