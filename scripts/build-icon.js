
/**
 * @file scripts/build-icon.js
 * @description 将 public/icon.svg 渲染为 macOS / Windows / Linux 所需的图标资源。
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { Icns, IcnsImage } from '@fiahfy/icns';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');
const pngPath = path.join(publicDir, 'icon.png');
const icnsPath = path.join(publicDir, 'icon.icns');
const icoPath = path.join(publicDir, 'icon.ico');

function renderSvg(size) {
  return sharp(Buffer.from(fs.readFileSync(svgPath, 'utf8')), { density: 288 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png();
}

const icnsTypes = [
  { size: 16, type: 'icp4' },
  { size: 32, type: 'icp5' },
  { size: 64, type: 'icp6' },
  { size: 128, type: 'ic07' },
  { size: 256, type: 'ic08' },
  { size: 512, type: 'ic09' },
  { size: 1024, type: 'ic10' },
];

async function main() {
  // 1. 生成 1024x1024 的主 PNG（Linux / 通用窗口图标）
  await renderSvg(1024).toFile(pngPath);
  console.log('generated ' + path.relative(process.cwd(), pngPath));

  // 2. 生成 Windows ICO（多尺寸）
  const icoPngBuffers = await Promise.all(
    [16, 32, 48, 64, 128, 256].map((size) => renderSvg(size).toBuffer())
  );
  const icoBuffer = await pngToIco(icoPngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('generated ' + path.relative(process.cwd(), icoPath));

  // 3. 生成 macOS ICNS（纯 JS，跨平台）
  const icns = new Icns();
  for (const { size, type } of icnsTypes) {
    const buf = await renderSvg(size).toBuffer();
    icns.append(IcnsImage.fromPNG(buf, type));
  }
  fs.writeFileSync(icnsPath, icns.data);
  console.log('generated ' + path.relative(process.cwd(), icnsPath));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
