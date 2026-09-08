#!/usr/bin/env node
/**
 * scripts/secrets-auto.mjs -- Tự động hóa quản lý Secrets cho lens-backend
 *
 * Chiến lược lưu trữ:
 *   - File bí mật đã mã hóa: lưu trong `.stacks/dev/runtime/env/app.env.enc`
 *   - File plaintext khi dev: lưu tại `.env` ở thư mục root (được .gitignore bảo vệ)
 *
 * Tự động chạy trong vòng đời dự án:
 *   1. `sync`        - Tự động giải mã app.env.enc -> .env tại root trước khi app chạy (`pnpm start:dev`, `pnpm build`)
 *   2. `pre-commit`  - Tự động mã hoá .env -> .stacks/dev/runtime/env/app.env.enc và git add khi commit
 *   3. `post-merge`  - Tự động cập nhật .env khi git pull có app.env.enc mới từ đồng đội
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MASTER_KEY =
  process.env.SOPS_AGE_KEY_FILE ||
  process.env.LENS_AGE_KEY_FILE ||
  join(homedir(), '.lens-be', 'key.txt');

// Đường dẫn file
const ROOT_ENV = join(REPO_ROOT, '.env');
const ROOT_ENV_ENC = join(REPO_ROOT, '.env.enc');
const STACK_ENV_TARGET = 'dev/runtime/env/app.env';
const STACK_ENV_ENC = join(REPO_ROOT, '.stacks', 'dev', 'runtime', 'env', 'app.env.enc');

// Màu sắc terminal
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function checkSopsInstalled() {
  try {
    execFileSync('sops', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkMasterKeyExists() {
  return existsSync(MASTER_KEY);
}

/**
 * Đọc nội dung đã giải mã của một file .enc ra chuỗi UTF-8 (không ghi ra đĩa)
 */
function decryptToString(encPath, inputType = 'dotenv') {
  if (!existsSync(encPath)) return null;
  const result = spawnSync(
    'sops',
    ['--decrypt', '--input-type', inputType, '--output-type', inputType, encPath],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, SOPS_AGE_KEY_FILE: MASTER_KEY },
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
  if (result.status === 0 && result.stdout) {
    return result.stdout;
  }
  return null;
}

/**
 * Giải mã file bí mật từ .stacks/.../app.env.enc trực tiếp ra file .env ở thư mục root
 */
function decryptToRootEnv() {
  if (!existsSync(STACK_ENV_ENC)) return false;
  const result = spawnSync(
    'sops',
    [
      '--decrypt',
      '--input-type',
      'dotenv',
      '--output-type',
      'dotenv',
      '--output',
      ROOT_ENV,
      STACK_ENV_ENC,
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, SOPS_AGE_KEY_FILE: MASTER_KEY },
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  return result.status === 0;
}

/**
 * Mã hoá file root .env vào .stacks/dev/runtime/env/app.env.enc
 */
function encryptRootEnvToStack() {
  const stackSecretScript = join(__dirname, 'stack-secret.mjs');
  try {
    execFileSync('node', [stackSecretScript, 'set', STACK_ENV_TARGET, '--from-file', ROOT_ENV], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, SOPS_AGE_KEY_FILE: MASTER_KEY },
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeContent(str) {
  return (str || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 1. Lệnh SYNC (chạy trước khi khởi động dev/build: prestart:dev, prebuild)
// ---------------------------------------------------------------------------
function handleSync(force = false) {
  // Nếu .env đã tồn tại và không ép buộc (--force) -> bỏ qua ngay để start server siêu nhanh (< 2ms)
  if (existsSync(ROOT_ENV) && !force) {
    return;
  }

  if (!existsSync(STACK_ENV_ENC)) {
    return;
  }

  if (!checkSopsInstalled()) {
    console.warn(
      yellow('⚠️  [SECRETS] Không tìm thấy lệnh `sops`. Vui lòng cài đặt SOPS để tự động giải mã secrets.'),
    );
    return;
  }

  if (!checkMasterKeyExists()) {
    if (!existsSync(ROOT_ENV)) {
      console.warn(
        yellow(`⚠️  [SECRETS] Thiếu file .env và không tìm thấy master key tại ${MASTER_KEY}`),
      );
      console.warn(dim('    👉 Hãy lấy file key từ trưởng nhóm hoặc chạy `pnpm secret:gen`'));
    }
    return;
  }

  if (force) {
    console.log(cyan('🔄 [SECRETS] Đồng bộ lại file .env từ .stacks/dev/runtime/env/app.env.enc...'));
    if (decryptToRootEnv()) {
      console.log(green('ok') + '  decrypted to .env\n');
    }
    return;
  }

  if (!existsSync(ROOT_ENV)) {
    console.log(
      cyan('🔓 [SECRETS] Chưa có .env, đang tự động giải mã từ .stacks/dev/runtime/env/app.env.enc...'),
    );
    if (decryptToRootEnv()) {
      console.log(green('ok') + '  decrypted to .env\n');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Lệnh PRE-COMMIT (chạy tự động khi dev gõ `git commit`)
// ---------------------------------------------------------------------------
function handlePreCommit() {
  // Dọn dẹp nếu có file .env.enc nằm nhầm ở root
  if (existsSync(ROOT_ENV_ENC)) {
    try {
      rmSync(ROOT_ENV_ENC, { force: true });
      execFileSync('git', ['rm', '-f', '.env.enc'], { cwd: REPO_ROOT, stdio: 'ignore' });
    } catch {}
  }

  if (!existsSync(ROOT_ENV)) {
    return;
  }

  if (!checkSopsInstalled() || !checkMasterKeyExists()) {
    return;
  }

  let needsEncrypt = false;
  if (!existsSync(STACK_ENV_ENC)) {
    needsEncrypt = true;
  } else {
    const currentPlain = normalizeContent(readFileSync(ROOT_ENV, 'utf8'));
    const decryptedEnc = normalizeContent(decryptToString(STACK_ENV_ENC, 'dotenv'));
    if (currentPlain !== decryptedEnc) {
      needsEncrypt = true;
    }
  }

  if (needsEncrypt) {
    console.log(
      cyan('\n🔐 [SECRETS AUTO] Phát hiện thay đổi trong .env -> Tự động mã hoá vào .stacks/dev/runtime/env/app.env.enc...'),
    );
    const ok = encryptRootEnvToStack();
    if (ok) {
      try {
        execFileSync('git', ['add', '.stacks/dev/runtime/env/app.env.enc'], {
          cwd: REPO_ROOT,
          stdio: 'ignore',
        });
        console.log(
          green('✅ [SECRETS AUTO] Đã tự động `git add .stacks/dev/runtime/env/app.env.enc` vào commit hiện tại.\n'),
        );
      } catch (e) {
        console.warn(yellow('⚠️  Không thể tự động git add: ' + e.message));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Lệnh POST-MERGE (chạy tự động sau khi `git pull`)
// ---------------------------------------------------------------------------
function handlePostMerge() {
  if (!existsSync(STACK_ENV_ENC) || !checkSopsInstalled() || !checkMasterKeyExists()) {
    return;
  }

  try {
    const diff = execFileSync(
      'git',
      ['diff-tree', '-r', '--name-only', '--no-commit-id', 'ORIG_HEAD', 'HEAD'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    if (diff.includes('app.env.enc')) {
      console.log(
        cyan('\n🔓 [SECRETS AUTO] Phát hiện app.env.enc mới từ Git pull! Đang cập nhật .env...'),
      );
      if (decryptToRootEnv()) {
        console.log(green('✅ [SECRETS AUTO] Đã đồng bộ file .env thành công.\n'));
      }
    }
  } catch {
    handleSync(false);
  }
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------
const action = process.argv[2] || 'sync';
const force = process.argv.includes('--force');

switch (action) {
  case 'sync':
    handleSync(force);
    break;
  case 'pre-commit':
    handlePreCommit();
    break;
  case 'post-merge':
    handlePostMerge();
    break;
  default:
    console.log(`Usage: node scripts/secrets-auto.mjs [sync|pre-commit|post-merge] [--force]`);
    process.exit(1);
}
