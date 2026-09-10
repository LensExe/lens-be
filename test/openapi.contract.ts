import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { ApiModule } from '../src/features/api/api.module';
import { ApiRuntimeModule } from '../src/features/api/api-runtime.module';
import { selectApiFeatureModules } from '../src/features/api/feature-modules';
import { setupApi } from '../src/features/api/setup';
import {
  ObjectStorage,
  PaymentGateway,
  UnitOfWork,
} from '../src/shared/database/unit-of-work/unit-of-work.port';
import { KeycloakService } from '../src/shared/integrations/keycloak/keycloak.service';

function compileApi(
  imports: Parameters<typeof Test.createTestingModule>[0]['imports'],
) {
  return Test.createTestingModule({ imports })
    .overrideProvider(UnitOfWork)
    .useValue({
      read: (work: (session: object) => unknown) => Promise.resolve(work({})),
      write: (work: (session: object) => unknown) => Promise.resolve(work({})),
    })
    .overrideProvider(ObjectStorage)
    .useValue({})
    .overrideProvider(PaymentGateway)
    .useValue({})
    .overrideProvider(KeycloakService)
    .useValue({
      verifyToken: () => Promise.resolve({ sub: 'swagger-test', roles: [] }),
    })
    .compile();
}

void test('every registered HTTP endpoint has a complete Swagger contract', async () => {
  const moduleRef = await compileApi([ApiModule]);
  const app = moduleRef.createNestApplication({ logger: false });

  try {
    const document = setupApi(app);
    const contract = JSON.parse(
      readFileSync('docs/api-tracker.json', 'utf8'),
    ).filter((row: { method: string }) =>
      ['GET', 'POST', 'PATCH', 'DELETE'].includes(row.method),
    ) as {
      id: string;
      method: string;
      path: string;
      role: string;
    }[];
    const documentedOperations = Object.values(document.paths).flatMap((path) =>
      Object.entries(path ?? {}).filter(([method]) =>
        ['get', 'post', 'patch', 'delete'].includes(method),
      ),
    );

    assert.equal(documentedOperations.length, contract.length);
    for (const row of contract) {
      const swaggerPath = row.path.replace(/:(\w+)/g, '{$1}');
      const operation =
        document.paths[swaggerPath]?.[row.method.toLowerCase() as 'get'];
      assert.equal(operation?.operationId, row.id, `${row.id} is missing`);
      assert.ok(operation.summary, `${row.id} needs a summary`);
      assert.ok(operation.description, `${row.id} needs a description`);
      const successResponse = operation.responses?.['200'];
      assert.ok(
        successResponse &&
          'content' in successResponse &&
          successResponse.content?.['application/json']?.schema,
        `${row.id} needs a 200 response schema`,
      );
      if (!['Public', 'Payment Provider'].includes(row.role))
        assert.ok(operation.security?.length, `${row.id} needs bearer auth`);
      for (const match of row.path.matchAll(/:(\w+)/g))
        assert.ok(
          operation.parameters?.some(
            (parameter) =>
              'name' in parameter &&
              parameter.name === match[1] &&
              parameter.in === 'path',
          ),
          `${row.id} needs Swagger metadata for :${match[1]}`,
        );
    }
  } finally {
    await app.close();
  }
});

void test('disabled feature modules are absent from Swagger', async () => {
  const modules = selectApiFeatureModules({
    ...process.env,
    FEATURE_CHAT_ENABLED: 'false',
    FEATURE_NOTIFICATION_ENABLED: 'false',
  });
  const moduleRef = await compileApi([ApiRuntimeModule, ...modules]);
  const app = moduleRef.createNestApplication({ logger: false });

  try {
    const document = setupApi(app);
    const operationIds = Object.values(document.paths).flatMap((path) =>
      Object.values(path ?? {}).flatMap((operation) =>
        operation && typeof operation === 'object' && 'operationId' in operation
          ? [operation.operationId]
          : [],
      ),
    );

    assert.ok(!operationIds.some((id) => id.startsWith('CHAT-')));
    assert.ok(!operationIds.some((id) => id.startsWith('NOTI-')));
    assert.equal(operationIds.length, 88);
  } finally {
    await app.close();
  }
});
