#!/usr/bin/env node
/**
 * scripts/docker.mjs -- Quản lý Docker Compose cho lens-backend
 *
 * Cách dùng:
 *   node scripts/docker.mjs up          Khởi động toàn bộ stack ngầm (-d)
 *   node scripts/docker.mjs down        Dừng toàn bộ stack (giữ lại volume)
 *   node scripts/docker.mjs restart     Khởi động lại stack
 *   node scripts/docker.mjs logs [svc]  Xem logs (vd: node scripts/docker.mjs logs postgres)
 *   node scripts/docker.mjs ps          Xem trạng thái các container
 *   node scripts/docker.mjs clean       Dừng và xóa toàn bộ dữ liệu volumes
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = join(root, '.docker', 'compose.yaml');

if (!existsSync(composeFile)) {
  console.error(`❌ Không tìm thấy file compose: ${composeFile}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0] || 'up';
const extraArgs = args.slice(1);

const runCompose = (composeArgs) => {
  const fullArgs = ['compose', '-f', composeFile, ...composeArgs];
  console.log(`🚀 [Docker] docker ${fullArgs.join(' ')}\n`);
  const result = spawnSync('docker', fullArgs, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });

  if (result.error) {
    console.error(`❌ Lỗi khi thực thi docker:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

switch (command) {
  case 'up':
    runCompose(['up', '-d', ...extraArgs]);
    break;

  case 'down':
    runCompose(['down', ...extraArgs]);
    break;

  case 'restart':
    runCompose(['restart', ...extraArgs]);
    break;

  case 'logs':
    runCompose(['logs', '-f', ...extraArgs]);
    break;

  case 'ps':
    runCompose(['ps', ...extraArgs]);
    break;

  case 'clean':
    console.log('⚠️  Cảnh báo: Thao tác này sẽ xóa toàn bộ volume dữ liệu!');
    runCompose(['down', '-v', ...extraArgs]);
    break;

  default:
    runCompose([command, ...extraArgs]);
    break;
}
