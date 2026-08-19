import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const stage = path.join(dist, 'webos-app');
const brandDir = path.join(stage, 'assets', 'brand');
const upstreamBrand = 'https://raw.githubusercontent.com/ysosrs123/NuvioTV-Fork/nuvio-test/assets/brand';
const upstreamLauncher = 'https://raw.githubusercontent.com/ysosrs123/NuvioTV-Fork/nuvio-test/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.mkdirSync(brandDir, { recursive: true });

const files = ['appinfo.json', 'index.html', 'icon.png', 'largeIcon.png'];
const dirs = ['css', 'js'];
for (const file of files) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) throw new Error(`Missing required file: ${file}`);
  fs.copyFileSync(src, path.join(stage, file));
}
for (const dir of dirs) {
  const src = path.join(root, dir);
  if (!fs.existsSync(src)) throw new Error(`Missing required directory: ${dir}`);
  fs.cpSync(src, path.join(stage, dir), { recursive: true });
}

async function downloadAsset(url, destination, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${label}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`${label} looks invalid (${buffer.length} bytes)`);
  fs.writeFileSync(destination, buffer);
  console.log(`${label}: ${buffer.length} bytes`);
}

await downloadAsset(`${upstreamBrand}/app_logo_wordmark.png`, path.join(brandDir, 'app_logo_wordmark.png'), 'Nuvio wordmark');
await downloadAsset(upstreamLauncher, path.join(brandDir, 'ysosrs123_launcher.png'), 'ysosrs123 launcher icon');

// Inside the UI, ysosrs123 itself uses app_logo_wordmark.png.
// For the installed app icon, use its real Android launcher artwork instead of the official Nuvio mark.
fs.copyFileSync(path.join(brandDir, 'ysosrs123_launcher.png'), path.join(stage, 'icon.png'));
fs.copyFileSync(path.join(brandDir, 'ysosrs123_launcher.png'), path.join(stage, 'largeIcon.png'));

const cli = process.platform === 'win32'
  ? path.join(root, 'node_modules', '.bin', 'ares-package.cmd')
  : path.join(root, 'node_modules', '.bin', 'ares-package');
const result = spawnSync(cli, [stage, '-o', dist], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
const ipks = fs.readdirSync(dist).filter(name => name.endsWith('.ipk'));
if (ipks.length !== 1) throw new Error(`Expected exactly one IPK in dist, found ${ipks.length}`);
const appinfo = JSON.parse(fs.readFileSync(path.join(root, 'appinfo.json'), 'utf8'));
const target = `Nuvio-Enhanced-webOS-${appinfo.version}.ipk`;
fs.renameSync(path.join(dist, ipks[0]), path.join(dist, target));
console.log(path.join('dist', target));
