#!/usr/bin/env node
/**
 * 生成 B站小游戏工程目录：npm run build:bilibili
 * 产物：dist/bilibili/（用哔哩哔哩开发者工具直接导入该目录）
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'dist', 'bilibili');

const FILES = [
  ['src/core/game.js', 'src/core/game.js'],
  ['src/core/storage.js', 'src/core/storage.js'],
  ['src/render/renderer.js', 'src/render/renderer.js'],
  ['src/app.js', 'src/app.js'],
  ['platform/bilibili/bootstrap.js', 'platform/bootstrap.js'],
  ['platform/bilibili/game.json', 'game.json']
];

const ENTRY = `// 自动生成：B站小游戏入口（npm run build:bilibili）
require('./src/core/game.js');
require('./src/core/storage.js');
require('./src/render/renderer.js');
require('./src/app.js');
require('./platform/bootstrap.js');
`;

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : statSync(full).size;
  }
  return total;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const [from, to] of FILES) {
  const target = join(OUT, to);
  mkdirSync(join(target, '..'), { recursive: true });
  cpSync(join(ROOT, from), target);
}

writeFileSync(join(OUT, 'game.js'), ENTRY, 'utf8');

const bytes = dirSize(OUT);
console.log('已生成 ' + OUT);
console.log('包体大小：' + (bytes / 1024).toFixed(1) + ' KB（B站主包上限 4 MB）');
console.log('下一步：用哔哩哔哩开发者工具导入 dist/bilibili 目录，填写 AppID 后本地调试。');
