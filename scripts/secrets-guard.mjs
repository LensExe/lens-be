#!/usr/bin/env node
/**
 * scripts/secrets-guard.mjs -- Kiểm tra an toàn bảo mật trước khi commit
 *
 * Chạy tự động từ .husky/pre-commit:
 *   1. Chặn việc commit nhầm file plaintext `.env` (chỉ cho phép `.env.enc`, `.env.example`).
 *   2. Quét các file đang staged để tránh commit nhầm private key hoặc secret nhạy cảm.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

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

function main() {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  let hasError = false;

  for (const file of stagedFiles) {
    // 1. Chặn commit file .env chứa plaintext
    if (file === '.env' || file.endsWith('/.env') || file.endsWith('.env.local')) {
      console.error(`\n🚨 [SECRETS GUARD] BỊ CHẶN:`);
      console.error(`   Bạn đang cố commit file plaintext: "${file}"!`);
      console.error(`   👉 Chỉ được commit file đã mã hóa SOPS (.env.enc) hoặc file mẫu (.env.example).`);
      console.error(`   👉 Hãy bỏ stage file này: git reset HEAD ${file}\n`);
      hasError = true;
    }

    // Bỏ qua chính file guard này và các file docs
    if (file === 'scripts/secrets-guard.mjs' || file.startsWith('docs/')) {
      continue;
    }

    // 2. Quét nội dung staged để phát hiện Private Key thô
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
        // bỏ qua các file binary
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }

  process.exit(0);
}

main();
