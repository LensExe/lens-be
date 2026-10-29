#!/usr/bin/env node
/**
 * `scripts/secrets-auto.mjs` — automate secrets management for lens-backend.
 *
 * Storage strategy:
 * - Encrypted secrets file: `.stacks/dev/runtime/env/app.env.enc`.
 * - Plaintext file for development: root `.env` (protected by `.gitignore`).
 *
 * Automatically runs during the project lifecycle:
 * 1. `sync` — decrypt `app.env.enc` to the root `.env` before the app starts (`pnpm start:dev`, `pnpm build`).
 * 2. `pre-commit` — encrypt `.env` to `.stacks/dev/runtime/env/app.env.enc` and stage it when committing.
 * 3. `post-merge` — update `.env` after pulling a new `app.env.enc` from a teammate.
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

// File path.
const ROOT_ENV = join(REPO_ROOT, '.env');
const ROOT_ENV_ENC = join(REPO_ROOT, '.env.enc');
const STACK_ENV_TARGET = 'dev/runtime/env/app.env';
const STACK_ENV_ENC = join(REPO_ROOT, '.stacks', 'dev', 'runtime', 'env', 'app.env.enc');

// Terminal colors.

/**
 * Color a string cyan in the terminal.
 *
 * @param s EntityManager for the current transaction.
 * @returns Result of the operation described above.
 */
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

/**
 * Color a string green in the terminal.
 *
 * @param s EntityManager for the current transaction.
 * @returns Result of the operation described above.
 */
const green = (s) => `\x1b[32m${s}\x1b[0m`;

/**
 * Color a string yellow in the terminal.
 *
 * @param s EntityManager for the current transaction.
 * @returns Result of the operation described above.
 */
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

/**
 * Print a string with reduced brightness.
 *
 * @param s EntityManager for the current transaction.
 * @returns Result of the operation described above.
 */
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/**
 * Check whether SOPS is installed and available in the current environment.
 *
 * @returns Boolean indicating the result of the check or operation.
 */
function checkSopsInstalled() {
  try {
    execFileSync('sops', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether the master encryption key is configured.
 *
 * @returns Result returned by `existsSync`.
 */
function checkMasterKeyExists() {
  return existsSync(MASTER_KEY);
}

/**
 * Read a secrets `.enc` file as a decrypted UTF-8 string without writing it to disk.
 *
 * @param encPath Value used by the operation: enc path.
 * @param inputType Input type.
 * @returns Result of the operation described above.
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
 * Decrypt `.stacks/.../app.env.enc` directly to the root `.env` file.
 *
 * @returns Boolean indicating the result of the check or operation.
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
 * Encrypt the root `.env` file to `.stacks/dev/runtime/env/app.env.enc`.
 *
 * @returns Boolean indicating the result of the check or operation.
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

/**
 * Normalize content before comparing it or writing it to a file.
 *
 * @param str Value used by the operation: str.
 * @returns Result returned by `join`.
 */
function normalizeContent(str) {
  return (str || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 1. SYNC command (runs before dev/build startup: prestart:dev, prebuild).
// ---------------------------------------------------------------------------

/**
 * Synchronize secrets using the selected run mode and handle overwrites when requested.
 *
 * @param force Value used by the operation: force.
 * @returns No value is returned.
 */
function handleSync(force = false) {
  // If `.env` already exists and `--force` was not provided, skip immediately so the server starts quickly (< 2 ms).
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
// 2. PRE-COMMIT command (runs automatically when the developer runs `git commit`).
// ---------------------------------------------------------------------------

/**
 * Validate secrets before allowing a commit to be created.
 *
 * @returns No value is returned.
 */
function handlePreCommit() {
  // Remove a misplaced `.env.enc` file from the root, if present.
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
// 3. POST-MERGE command (runs automatically after `git pull`).
// ---------------------------------------------------------------------------

/**
 * Synchronize secrets again after the branch is merged.
 *
 * @returns No value is returned.
 */
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
