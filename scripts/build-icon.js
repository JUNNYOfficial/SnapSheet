
/**
 * @file scripts/build-icon.js
 * @description 将 public/icon.svg 渲染为 macOS / Windows / Linux 所需的图标资源。
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');
const pngPath = path.join(publicDir, 'icon.png');
const icnsPath = path.join(publicDir, 'icon.icns');
const icoPath = path.join(publicDir, 'icon.ico');

const sizes = [16, 32, 64, 128, 256, 512, 1024];

function renderSvg(size) {
  return sharp(Buffer.from(fs.readFileSync(svgPath, 'utf8')), { density: 288 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png();
}

async function main() {
  await renderSvg(1024).toFile(pngPath);
  console.log('generated ' + path.relative(process.cwd(), pngPath));

  const icoPngBuffers = await Promise.all(
    [16, 32, 48, 64, 128, 256].map((size) => renderSvg(size).toBuffer())
  );
  const icoBuffer = await pngToIco(icoPngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('generated ' + path.relative(process.cwd(), icoPath));

  const iconsetDir = path.join(publicDir, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  for (const size of sizes) {
    const fileName = size === 1024 ? 'icon_512x512@2x.png' : 'icon_' + size + 'x' + size + '.png';
    const out = path.join(iconsetDir, fileName);
    await renderSvg(size).toFile(out);
  }

  const retinaSizes = [
    { base: 16, name: 'icon_16x16@2x.png' },
    { base: 32, name: 'icon_32x32@2x.png' },
    { base: 128, name: 'icon_128x128@2x.png' },
    { base: 256, name: 'icon_256x256@2x.png' },
    { base: 512, name: 'icon_512x512@2x.png' },
  ];
  for (const { base, name } of retinaSizes) {
    const out = path.join(iconsetDir, name);
    await renderSvg(base * 2).toFile(out);
  }

  if (process.platform === 'darwin') {
    if (fs.existsSync(icnsPath)) fs.unlinkSync(icnsPath);
    const tmpDir = path.resolve(__dirname, '..', '.tmp-iconutil');
    fs.mkdirSync(tmpDir, { recursive: true });
    execSync('iconutil -c icns "' + iconsetDir + '" -o "' + icnsPath + '"', { env: { ...process.env, TMPDIR: tmpDir } });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('generated ' + path.relative(process.cwd(), icnsPath));
  } else {
    console.warn('iconutil is only available on macOS; skipping .icns generation');
  }

  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
