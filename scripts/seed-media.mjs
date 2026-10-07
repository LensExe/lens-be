#!/usr/bin/env node
/**
 * Attach a small, local stock-photo pack to demo portfolios and MinIO.
 * The assets are bundled with the repository so seeding does not depend on
 * Unsplash being reachable at runtime.
 */

import {
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import pg from 'pg';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = resolve(__dirname, 'assets/demo-stock');
const GENERATED_PREFIX = 'public/demo-stock/scale/';
const CURATED_PREFIX = 'public/demo-stock/curated/';
const DEMO_NOTE =
  'Ảnh stock minh họa cho dữ liệu demo, không phải tác phẩm thật của nhiếp ảnh gia.';
const mediaVariantSpecs = [
  { variant: 'thumbnail', width: 400, quality: 75 },
  { variant: 'preview', width: 1600, quality: 82 },
];

const stockPhotos = {
  'portrait-woman': 'portrait-woman.jpg',
  'portrait-man': 'portrait-man.jpg',
  'family-portrait': 'family-portrait.jpg',
  'family-outdoor': 'family-outdoor.jpg',
  'beach-family': 'beach-family.jpg',
  'wedding-hands': 'wedding-hands.jpg',
  'wedding-couple': 'wedding-couple.jpg',
  'wedding-ceremony': 'wedding-ceremony.jpg',
  'fashion-editorial': 'fashion-editorial.jpg',
  'fashion-street': 'fashion-street.jpg',
  'fashion-shopping': 'fashion-shopping.jpg',
  'product-skincare': 'product-skincare.jpg',
  'product-watch': 'product-watch.jpg',
  'food-commercial': 'food-commercial.jpg',
  'event-concert': 'event-concert.jpg',
  'corporate-event': 'corporate-event.jpg',
  'corporate-office': 'corporate-office.jpg',
  landscape: 'landscape.jpg',
  forest: 'forest.jpg',
};

const categoryPhotos = {
  portrait: ['portrait-woman', 'portrait-man', 'forest'],
  family: ['family-portrait', 'family-outdoor', 'beach-family'],
  wedding: ['wedding-hands', 'wedding-couple', 'wedding-ceremony'],
  fashion: ['fashion-editorial', 'fashion-street', 'fashion-shopping'],
  event: ['event-concert', 'corporate-event', 'corporate-office'],
  product: ['product-skincare', 'food-commercial', 'product-watch'],
};

const curatedPhotos = [
  ['e0000000-0000-4000-8000-000000000001', 'portrait-woman'],
  ['e0000000-0000-4000-8000-000000000002', 'landscape'],
  ['e0000000-0000-4000-8000-000000000003', 'wedding-couple'],
  ['e0000000-0000-4000-8000-000000000004', 'fashion-editorial'],
  ['e0000000-0000-4000-8000-000000000005', 'fashion-street'],
  ['e0000000-0000-4000-8000-000000000011', 'wedding-hands'],
  ['e0000000-0000-4000-8000-000000000012', 'fashion-shopping'],
  ['e0000000-0000-4000-8000-000000000031', 'family-portrait'],
  ['e0000000-0000-4000-8000-000000000032', 'family-outdoor'],
  ['e0000000-0000-4000-8000-000000000033', 'beach-family'],
  ['e0000000-0000-4000-8000-000000000034', 'portrait-man'],
  ['e0000000-0000-4000-8000-000000000035', 'fashion-street'],
  ['e0000000-0000-4000-8000-000000000036', 'landscape'],
  ['e0000000-0000-4000-8000-000000000037', 'portrait-man'],
  ['e0000000-0000-4000-8000-000000000038', 'portrait-woman'],
  ['e0000000-0000-4000-8000-000000000039', 'forest'],
  ['e0000000-0000-4000-8000-000000000040', 'wedding-hands'],
  ['e0000000-0000-4000-8000-000000000041', 'wedding-couple'],
  ['e0000000-0000-4000-8000-000000000042', 'wedding-ceremony'],
  ['e0000000-0000-4000-8000-000000000043', 'fashion-editorial'],
  ['e0000000-0000-4000-8000-000000000044', 'fashion-street'],
  ['e0000000-0000-4000-8000-000000000045', 'fashion-shopping'],
  ['e0000000-0000-4000-8000-000000000046', 'event-concert'],
  ['e0000000-0000-4000-8000-000000000047', 'corporate-event'],
  ['e0000000-0000-4000-8000-000000000048', 'corporate-office'],
  ['e0000000-0000-4000-8000-000000000049', 'product-skincare'],
  ['e0000000-0000-4000-8000-000000000050', 'food-commercial'],
  ['e0000000-0000-4000-8000-000000000051', 'product-watch'],
  ['e0000000-0000-4000-8000-000000000052', 'family-portrait'],
  ['e0000000-0000-4000-8000-000000000053', 'landscape'],
  ['e0000000-0000-4000-8000-000000000054', 'forest'],
];

const curatedPortfolios = [
  {
    id: 'f0000000-0000-4000-8000-000000000001',
    mediaIds: [
      'e0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000002',
      'e0000000-0000-4000-8000-000000000003',
    ],
  },
  {
    id: 'f0000000-0000-4000-8000-000000000002',
    mediaIds: [
      'e0000000-0000-4000-8000-000000000004',
      'e0000000-0000-4000-8000-000000000005',
    ],
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `f0000000-0000-4000-8000-${String(index + 3).padStart(12, '0')}`,
    mediaIds: Array.from(
      { length: 3 },
      (_, slot) =>
        `e0000000-0000-4000-8000-${String(31 + index * 3 + slot).padStart(12, '0')}`,
    ),
  })),
];

const demoScreenshot = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
    <rect width="1200" height="760" fill="#edf1f5"/>
    <rect x="140" y="52" width="920" height="656" rx="24" fill="#fff"/>
    <path d="M164 76h872a20 20 0 0 1 20 20v72H144V96a20 20 0 0 1 20-20" fill="#28364a"/>
    <circle cx="180" cy="116" r="7" fill="#f17b75"/><circle cx="204" cy="116" r="7" fill="#f2c45f"/><circle cx="228" cy="116" r="7" fill="#64bf85"/>
    <text x="600" y="124" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#fff">Lens · Trung tâm hỗ trợ</text>
    <text x="190" y="207" font-family="Arial,sans-serif" font-size="21" fill="#526173">Đoạn chat mẫu · 12 tháng 9, 2026</text>
    <rect x="190" y="242" width="590" height="100" rx="20" fill="#eef1f6"/>
    <text x="220" y="282" font-family="Arial,sans-serif" font-size="22" fill="#273445">Mai Anh: Anh Huy ơi, em chưa nhận được bộ ảnh</text>
    <text x="220" y="316" font-family="Arial,sans-serif" font-size="22" fill="#273445">đã chỉnh sửa như lịch mình trao đổi.</text>
    <rect x="446" y="376" width="550" height="100" rx="20" fill="#dcecff"/>
    <text x="476" y="416" font-family="Arial,sans-serif" font-size="22" fill="#273445">Huy: Anh xin lỗi vì phản hồi chậm. Anh sẽ</text>
    <text x="476" y="450" font-family="Arial,sans-serif" font-size="22" fill="#273445">gửi bản hoàn thiện trong hôm nay nhé.</text>
    <rect x="190" y="510" width="590" height="92" rx="20" fill="#eef1f6"/>
    <text x="220" y="550" font-family="Arial,sans-serif" font-size="22" fill="#273445">Mai Anh: Cảm ơn anh, em xác nhận đã nhận ảnh.</text>
    <text x="220" y="580" font-family="Arial,sans-serif" font-size="18" fill="#788596">Dữ liệu minh họa cho luồng xử lý báo cáo</text>
  </svg>
`);
const evidenceMediaId = 'e0000000-0000-4000-8000-000000000021';

async function prepareVariants(buffer) {
  return Promise.all(
    mediaVariantSpecs.map(async (spec) => {
      const { data, info } = await sharp(buffer)
        .rotate()
        .resize({
          width: spec.width,
          height: spec.width,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: spec.quality })
        .toBuffer({ resolveWithObject: true });
      return {
        variant: spec.variant,
        buffer: data,
        contentType: 'image/webp',
        width: info.width,
        height: info.height,
      };
    }),
  );
}

function mediaLimitFromEnvironment() {
  const raw = process.env.SEED_MEDIA_PHOTOGRAPHERS;
  if (raw === undefined) return 250;
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    throw new Error('SEED_MEDIA_PHOTOGRAPHERS must be a non-negative integer');
  }
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit > 1_000) {
    throw new Error('SEED_MEDIA_PHOTOGRAPHERS must be between 0 and 1000');
  }
  return limit;
}

function minioConfig() {
  const provider = process.env.S3_PROVIDER ?? 'minio';
  if (provider !== 'minio') {
    throw new Error(
      'Demo stock seeding only writes to the local MinIO provider. Set S3_PROVIDER=minio.',
    );
  }
  const endpoint = process.env.S3_MINIO_ENDPOINT;
  const bucket = process.env.S3_MINIO_BUCKET;
  const accessKeyId = process.env.S3_MINIO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_MINIO_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3_MINIO_ENDPOINT, S3_MINIO_BUCKET, and MinIO credentials are required for demo stock seeding.',
    );
  }
  const endpointUrl = new URL(endpoint);
  if (!['localhost', '127.0.0.1', '::1'].includes(endpointUrl.hostname)) {
    throw new Error(
      'Demo stock seeding is restricted to a local MinIO endpoint.',
    );
  }
  return {
    endpoint,
    bucket,
    region: process.env.S3_MINIO_REGION || 'us-east-1',
    accessKeyId,
    secretAccessKey,
  };
}

/** Load local assets and confirm the local object-storage target before DB changes. */
export async function prepareStockMedia() {
  const config = minioConfig();
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    const assets = new Map();
    for (const [name, filename] of Object.entries(stockPhotos)) {
      const input = readFileSync(resolve(ASSET_DIR, filename));
      const buffer = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({
          width: 1280,
          height: 1280,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true, progressive: true })
        .toBuffer();
      assets.set(name, {
        buffer,
        contentType: 'image/jpeg',
        variants: await prepareVariants(buffer),
      });
    }
    const evidenceBuffer = await sharp(demoScreenshot).png().toBuffer();
    assets.set('chat-evidence', {
      buffer: evidenceBuffer,
      contentType: 'image/png',
      variants: await prepareVariants(evidenceBuffer),
    });
    return {
      client,
      bucket: config.bucket,
      assets,
      mediaLimit: mediaLimitFromEnvironment(),
    };
  } catch (error) {
    client.destroy();
    throw error;
  }
}

function deterministicUuid(namespace, key) {
  const hash = createHash('md5').update(`${namespace}:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function withConcurrency(items, concurrency, task) {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        await task(items[index]);
      }
    },
  );
  await Promise.all(workers);
}

async function uploadObjects(prepared, rows) {
  await withConcurrency(rows, 6, async (row) => {
    const asset = prepared.assets.get(row.assetName);
    if (!asset) throw new Error(`Unknown stock image: ${row.assetName}`);
    await prepared.client.send(
      new PutObjectCommand({
        Bucket: prepared.bucket,
        Key: row.fileKey,
        Body: asset.buffer,
        ContentType: asset.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    row.fileSize = asset.buffer.length;
    row.contentType = asset.contentType;
  });
}

async function uploadVariantObjects(prepared, rows) {
  const variants = rows.flatMap((media) =>
    prepared.assets.get(media.assetName).variants.map((variant) => ({
      id: deterministicUuid(
        'seed-stock-media-variant',
        `${media.id}:${variant.variant}`,
      ),
      mediaId: media.id,
      variant: variant.variant,
      fileKey: `${media.fileKey}/${variant.variant}.webp`,
      fileSize: variant.buffer.length,
      contentType: variant.contentType,
      width: variant.width,
      height: variant.height,
      buffer: variant.buffer,
    })),
  );

  await withConcurrency(variants, 6, async (row) => {
    await prepared.client.send(
      new PutObjectCommand({
        Bucket: prepared.bucket,
        Key: row.fileKey,
        Body: row.buffer,
        ContentType: row.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  });
  return variants;
}

async function deleteStaleObjects(prepared, keepKeys) {
  let token;
  const stale = [];
  do {
    const page = await prepared.client.send(
      new ListObjectsV2Command({
        Bucket: prepared.bucket,
        Prefix: 'public/demo-stock/',
        ContinuationToken: token,
      }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key && !keepKeys.has(object.Key))
        stale.push({ Key: object.Key });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  for (let start = 0; start < stale.length; start += 1000) {
    await prepared.client.send(
      new DeleteObjectsCommand({
        Bucket: prepared.bucket,
        Delete: { Objects: stale.slice(start, start + 1000), Quiet: true },
      }),
    );
  }
  return stale.length;
}

/** Upload images and update each demo media row/portfolio after SQL fixtures exist. */
export async function seedStockMedia(database, prepared) {
  const curatedMediaResult = await database.query(
    `SELECT id::text, user_id::text FROM media WHERE id = ANY($1::uuid[])`,
    [[...curatedPhotos.map(([id]) => id), evidenceMediaId]],
  );
  const curatedRows = new Map(
    curatedMediaResult.rows.map((row) => [row.id, row]),
  );
  for (const [id] of [...curatedPhotos, [evidenceMediaId, 'chat-evidence']]) {
    if (!curatedRows.has(id))
      throw new Error(`Curated media row ${id} is missing; run db:seed first.`);
  }

  const scaleResult = await database.query(
    `SELECT portfolio.id::text AS portfolio_id, photographer.id::text AS photographer_id,
       account.id::text AS user_id, account.email, portfolio.category
     FROM portfolios AS portfolio
     JOIN photographers AS photographer ON photographer.id = portfolio.photographer_id
     JOIN users AS account ON account.id = photographer.user_id
     WHERE account.email LIKE 'photographer.%@seed.invalid'
     ORDER BY account.email, portfolio.id`,
  );
  const scalePortfolios = scaleResult.rows
    .filter((row) => categoryPhotos[row.category])
    .filter(
      (row) =>
        Number(row.email.match(/photographer\.(\d+)@/)?.[1]) <=
        prepared.mediaLimit,
    );

  const uploads = [];
  const curatedAssignments = new Map(curatedPhotos);
  curatedAssignments.set(evidenceMediaId, 'chat-evidence');
  for (const [id, assetName] of curatedAssignments) {
    const owner = curatedRows.get(id);
    uploads.push({
      id,
      userId: owner.user_id,
      fileKey: `${CURATED_PREFIX}${id}.${assetName === 'chat-evidence' ? 'png' : 'jpg'}`,
      assetName,
    });
  }

  const generatedAssignments = [];
  for (const row of scalePortfolios) {
    const mediaIds = categoryPhotos[row.category].map((_, slot) =>
      deterministicUuid(
        'seed-stock-media',
        `${row.photographer_id}:${slot + 1}`,
      ),
    );
    const assetNames = categoryPhotos[row.category];
    mediaIds.forEach((id, slot) => {
      const assetName = assetNames[slot];
      const fileKey = `${GENERATED_PREFIX}${id}.jpg`;
      uploads.push({ id, userId: row.user_id, fileKey, assetName });
    });
    generatedAssignments.push({ portfolioId: row.portfolio_id, mediaIds });
  }

  await uploadObjects(prepared, uploads);
  const variantUploads = await uploadVariantObjects(prepared, uploads);
  const keepKeys = new Set([
    ...uploads.map((row) => row.fileKey),
    ...variantUploads.map((row) => row.fileKey),
  ]);

  await database.query('BEGIN');
  try {
    for (let start = 0; start < uploads.length; start += 500) {
      const batch = uploads.slice(start, start + 500);
      const values = [];
      const placeholders = batch.map((row, index) => {
        const parameter = index * 5;
        values.push(
          row.id,
          row.userId,
          row.fileKey,
          row.fileSize,
          row.contentType,
        );
        return `($${parameter + 1}::uuid, $${parameter + 2}::uuid, $${parameter + 3}, $${parameter + 4}, $${parameter + 5}, 'public', 'ready', now(), now())`;
      });
      await database.query(
        `INSERT INTO media (id, user_id, file_key, file_size, content_type, visibility, status, created_at, updated_at)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           file_key = EXCLUDED.file_key,
           file_size = EXCLUDED.file_size,
           content_type = EXCLUDED.content_type,
           visibility = EXCLUDED.visibility,
           status = EXCLUDED.status,
           updated_at = now()`,
        values,
      );
    }

    for (let start = 0; start < variantUploads.length; start += 500) {
      const batch = variantUploads.slice(start, start + 500);
      const values = [];
      const placeholders = batch.map((row, index) => {
        const parameter = index * 8;
        values.push(
          row.id,
          row.mediaId,
          row.variant,
          row.fileKey,
          row.fileSize,
          row.contentType,
          row.width,
          row.height,
        );
        return `($${parameter + 1}::uuid, $${parameter + 2}::uuid, $${parameter + 3}, $${parameter + 4}, $${parameter + 5}, $${parameter + 6}, $${parameter + 7}, $${parameter + 8}, now(), now())`;
      });
      await database.query(
        `INSERT INTO media_variants (
           id, media_id, variant, file_key, file_size, content_type,
           width, height, created_at, updated_at
         ) VALUES ${placeholders.join(',')}
         ON CONFLICT (media_id, variant) DO UPDATE SET
           file_key = EXCLUDED.file_key,
           file_size = EXCLUDED.file_size,
           content_type = EXCLUDED.content_type,
           width = EXCLUDED.width,
           height = EXCLUDED.height,
           updated_at = now()`,
        values,
      );
    }

    for (const portfolio of curatedPortfolios) {
      await updatePortfolio(database, portfolio.id, portfolio.mediaIds);
    }
    for (const portfolio of generatedAssignments) {
      await updatePortfolio(
        database,
        portfolio.portfolioId,
        portfolio.mediaIds,
      );
    }
    await database.query('COMMIT');
  } catch (error) {
    await database.query('ROLLBACK').catch(() => {});
    throw error;
  }

  let removedObjects = 0;
  try {
    removedObjects = await deleteStaleObjects(prepared, keepKeys);
  } catch (error) {
    console.warn(
      `⚠️ Không dọn được object stock cũ trong MinIO: ${error.message}`,
    );
  }
  console.log(
    `🖼️ Đã nạp ${uploads.length} ảnh portfolio/evidence và ${variantUploads.length} biến thể thumbnail/preview vào MinIO; ${scalePortfolios.length} photographer tổng hợp có gallery.`,
  );
  if (removedObjects)
    console.log(`🧹 Đã dọn ${removedObjects} object stock cũ không còn dùng.`);
}

async function updatePortfolio(database, id, mediaIds) {
  await database.query(
    `UPDATE portfolios SET cover_media_id = $2::uuid, items = $3::jsonb,
       description = CASE
         WHEN position($4 in description) > 0 THEN description
         ELSE rtrim(description) || E'\\n\\n' || $4
       END,
       updated_at = now()
     WHERE id = $1::uuid`,
    [id, mediaIds[0], JSON.stringify(mediaIds), DEMO_NOTE],
  );
}

async function runStandalone() {
  try {
    process.loadEnvFile?.();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const prepared = await prepareStockMedia();
  const database = new Client({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5433),
    user: process.env.DB_USERNAME || 'lens-postgres',
    password: process.env.DB_PASSWORD || 'Postgres@#_Lens_EXE202_FPT_FA26',
    database: process.env.DB_NAME || 'lens',
  });
  try {
    await database.connect();
    await seedStockMedia(database, prepared);
  } finally {
    prepared.client.destroy();
    await database.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runStandalone().catch((error) => {
    console.error(`Demo stock media seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}
