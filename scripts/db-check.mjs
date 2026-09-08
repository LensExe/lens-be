#!/usr/bin/env node
/**
 * scripts/db-check.mjs -- Kiểm tra kết nối nhanh tới các dịch vụ trong lens-backend
 *
 * Kiểm tra:
 *   - PostgreSQL (5433)
 *   - Redis (6380)
 *   - MinIO API (9000) & Console (9001)
 *   - Keycloak (8089)
 *   - Kong Gateway (8000) & Kong Manager (8002)
 */

import net from 'node:net';

const SERVICES = [
  { name: 'PostgreSQL', host: 'localhost', port: 5433 },
  { name: 'Redis', host: 'localhost', port: 6380 },
  { name: 'MinIO S3 API', host: 'localhost', port: 9000 },
  { name: 'MinIO Console UI', host: 'localhost', port: 9001 },
  { name: 'Keycloak Auth Server', host: 'localhost', port: 8089 },
  { name: 'Kong Gateway Proxy', host: 'localhost', port: 8000 },
  { name: 'Kong Manager Dashboard', host: 'localhost', port: 8002 },
];

const checkPort = (host, port, timeoutMs = 2000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
};

async function main() {
  console.log('\n🔍 [lens-backend] Đang kiểm tra trạng thái các dịch vụ...\n');
  let hasFailure = false;

  for (const svc of SERVICES) {
    const ok = await checkPort(svc.host, svc.port);
    if (ok) {
      console.log(`  ✅  ${svc.name.padEnd(25)} [${svc.host}:${svc.port}] - ONLINE`);
    } else {
      console.log(`  ❌  ${svc.name.padEnd(25)} [${svc.host}:${svc.port}] - OFFLINE`);
      hasFailure = true;
    }
  }

  console.log('');
  if (hasFailure) {
    console.log('💡 Gợi ý: Nếu có dịch vụ OFFLINE, bạn có thể khởi động bằng lệnh:');
    console.log('   pnpm run docker:up\n');
  } else {
    console.log('🎉 Toàn bộ dịch vụ hạ tầng đã sẵn sàng!\n');
  }
}

main().catch(console.error);
