/**
 * @file scripts/build-icon.js
 * @description 将 public/icon.svg 渲染为 macOS / Electron 所需的 PNG 与 ICNS 图标。
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');
const pngPath = path.join(publicDir, 'icon.png');
const icnsPath = path.join(publicDir, 'icon.icns');

const sizes = [16, 32, 64, 128, 256, 512, 1024];

async function main() {
  const svg = fs.readFileSync(svgPath, 'utf8');

  // 1. 生成 1024x1024 的主 PNG（Electron 窗口图标）
  await sharp(Buffer.from(svg), { density: 288 })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(pngPath);
  console.log(`generated ${path.relative(process.cwd(), pngPath)}`);

  // 2. 生成 iconset 并打包为 icns（Dock / 应用图标）
  const iconsetDir = path.join(publicDir, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  for (const size of sizes) {
    const fileName = size === 1024 ? 'icon_512x512@2x.png' : `icon_${size}x${size}.png`;
    const out = path.join(iconsetDir, fileName);
    await sharp(Buffer.from(svg), { density: 288 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
  }

  // macOS 还需要 16@2x、32@2x、128@2x、256@2x、512@2x
  const retinaSizes = [
    { base: 16, name: 'icon_16x16@2x.png' },
    { base: 32, name: 'icon_32x32@2x.png' },
    { base: 128, name: 'icon_128x128@2x.png' },
    { base: 256, name: 'icon_256x256@2x.png' },
    { base: 512, name: 'icon_512x512@2x.png' },
  ];
  for (const { base, name } of retinaSizes) {
    const out = path.join(iconsetDir, name);
    await sharp(Buffer.from(svg), { density: 288 })
      .resize(base * 2, base * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
  }

  if (process.platform === 'darwin') {
    if (fs.existsSync(icnsPath)) fs.unlinkSync(icnsPath);
    const tmpDir = path.resolve(__dirname, '..', '.tmp-iconutil');
    fs.mkdirSync(tmpDir, { recursive: true });
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { env: { ...process.env, TMPDIR: tmpDir } });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`generated ${path.relative(process.cwd(), icnsPath)}`);
  } else {
    console.warn('iconutil is only available on macOS; skipping .icns generation');
  }

  // 清理临时 iconset 目录
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
