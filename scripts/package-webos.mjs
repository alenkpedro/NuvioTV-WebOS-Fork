import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const stage = path.join(dist, 'webos-app');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

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

const cli = process.platform === 'win32'
  ? path.join(root, 'node_modules', '.bin', 'ares-package.cmd')
  : path.join(root, 'node_modules', '.bin', 'ares-package');

const result = spawnSync(cli, [stage, '-o', dist], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

const ipks = fs.readdirSync(dist).filter(name => name.endsWith('.ipk'));
if (ipks.length !== 1) {
  throw new Error(`Expected exactly one IPK in dist, found ${ipks.length}`);
}

const appinfo = JSON.parse(fs.readFileSync(path.join(root, 'appinfo.json'), 'utf8'));
const target = `Nuvio-Enhanced-webOS-${appinfo.version}.ipk`;
fs.renameSync(path.join(dist, ipks[0]), path.join(dist, target));
console.log(path.join('dist', target));
