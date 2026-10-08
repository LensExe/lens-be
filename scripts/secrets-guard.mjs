#!/usr/bin/env node
/**
 * `scripts/secrets-guard.mjs` — run security checks before committing.
 *
 * Runs automatically from `.husky/pre-commit`:
 * 1. Block accidental commits of plaintext `.env`; only `.env.enc` and `.env.example` are allowed.
 * 2. Scan staged files for private keys or sensitive secrets that should not be committed.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Get the list of files staged in Git.
 *
 * @returns List of results from the operation.
 */
function getStagedFiles() {
  try {
    const stdout = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf8',
    });
    return stdout
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Run the main flow of the secrets-guard script.
 *
 * @returns No value is returned.
 */
function main() {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  let hasError = false;

  for (const file of stagedFiles) {
    // 1. Block commits containing a plaintext `.env` file.
    if (file === '.env' || file.endsWith('/.env') || file.endsWith('.env.local')) {
      console.error(`\n🚨 [SECRETS GUARD] BỊ CHẶN:`);
      console.error(`   Bạn đang cố commit file plaintext: "${file}"!`);
      console.error(`   👉 Chỉ được commit file đã mã hóa SOPS (.env.enc) hoặc file mẫu (.env.example).`);
      console.error(`   👉 Hãy bỏ stage file này: git reset HEAD ${file}\n`);
      hasError = true;
    }

    // Skip this guard file itself and documentation files.
    if (file === 'scripts/secrets-guard.mjs' || file.startsWith('docs/')) {
      continue;
    }

    // 2. Scan staged content for raw private keys.
    if (existsSync(file) && !file.endsWith('.enc') && !file.endsWith('.enc.yaml')) {
      try {
        const content = readFileSync(file, 'utf8');
        const marker = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');
        const rsaMarker = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
        if (content.includes(marker) || content.includes(rsaMarker)) {
          console.error(`\n🚨 [SECRETS GUARD] BỊ CHẶN:`);
          console.error(`   Phát hiện Private Key nhạy cảm bên trong file: "${file}"!`);
          console.error(`   👉 Tuyệt đối không commit Private Key lên Git repository.\n`);
          hasError = true;
        }
      } catch {
        // Skip binary files.
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }

  process.exit(0);
}

main();
