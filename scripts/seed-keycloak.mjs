#!/usr/bin/env node
/**
 * Provision the local Lens demo users and realm roles in Keycloak.
 * Run after `pnpm db:seed`; only the fixed demo user IDs below are changed.
 */

import axios from 'axios';
import pg from 'pg';

const { Client } = pg;

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const demoUserIds = [
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003',
  'c0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000005',
  'c0000000-0000-4000-8000-000000000006',
  'c0000000-0000-4000-8000-000000000007',
  'c0000000-0000-4000-8000-000000000008',
  'c0000000-0000-4000-8000-000000000009',
  'c0000000-0000-4000-8000-000000000010',
];

const required = (value, name) => {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value.trim();
};

const baseUrl = required(
  process.env.KEYCLOAK_AUTH_SERVER_URL ?? process.env.KEYCLOAK_URL,
  'KEYCLOAK_AUTH_SERVER_URL',
).replace(/\/$/, '');
const realmName = required(process.env.KEYCLOAK_REALM, 'KEYCLOAK_REALM');
const clientId = required(process.env.KEYCLOAK_CLIENT_ID, 'KEYCLOAK_CLIENT_ID');
const clientSecret = required(
  process.env.KEYCLOAK_CLIENT_SECRET,
  'KEYCLOAK_CLIENT_SECRET',
);
const adminUsername = required(
  process.env.KEYCLOAK_ADMIN_USERNAME,
  'KEYCLOAK_ADMIN_USERNAME',
);
const adminPassword = required(
  process.env.KEYCLOAK_ADMIN_PASSWORD,
  'KEYCLOAK_ADMIN_PASSWORD',
);
const demoPassword = process.env.MOCK_USER_PASSWORD?.trim() || 'LensDemo@2026!';

const keycloakHost = new URL(baseUrl).hostname.replace(/^\[|\]$/g, '');
if (
  !['localhost', '127.0.0.1', '::1'].includes(keycloakHost) &&
  process.env.ALLOW_NONLOCAL_KEYCLOAK_SEED !== 'true'
) {
  throw new Error(
    'Refusing to seed demo accounts into a non-local Keycloak. Set ALLOW_NONLOCAL_KEYCLOAK_SEED=true only when that is intentional.',
  );
}

const database = new Client({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  user: process.env.DB_USERNAME || 'lens-postgres',
  password: process.env.DB_PASSWORD || 'Postgres@#_Lens_EXE202_FPT_FA26',
  database: process.env.DB_NAME || 'lens',
});

const realmPath = encodeURIComponent(realmName);
// The admin client already has `${baseUrl}/admin` as its base URL.
const adminPath = `/realms/${realmPath}`;
const http = axios.create({ timeout: 15000 });

async function getOptional(admin, url) {
  try {
    return (await admin.get(url)).data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

async function getAdminClient() {
  const response = await http.post(
    `${baseUrl}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUsername,
      password: adminPassword,
    }),
    { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  );

  return axios.create({
    baseURL: `${baseUrl}/admin`,
    timeout: 15000,
    headers: { authorization: `Bearer ${response.data.access_token}` },
  });
}

async function ensureRealm(admin) {
  let realm = await getOptional(admin, `/realms/${realmPath}`);

  if (!realm) {
    await admin.post('/realms', {
      realm: realmName,
      enabled: true,
      registrationAllowed: false,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false,
    });
    realm = await admin
      .get(`/realms/${realmPath}`)
      .then((result) => result.data);
  }

  await admin.put(`/realms/${realmPath}`, {
    ...realm,
    enabled: true,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
  });
}

async function ensureClient(admin) {
  let clients = await admin.get(`${adminPath}/clients`, {
    params: { clientId },
  });
  let client = clients.data[0];

  if (!client?.id) {
    await admin.post(`${adminPath}/clients`, {
      clientId,
      secret: clientSecret,
      protocol: 'openid-connect',
      enabled: true,
      publicClient: false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      redirectUris: ['http://localhost:3000/*'],
      webOrigins: ['http://localhost:3000'],
    });
    clients = await admin.get(`${adminPath}/clients`, {
      params: { clientId },
    });
    client = clients.data[0];
  }

  if (!client?.id) throw new Error(`Unable to configure client "${clientId}"`);

  const redirectUris = new Set(client.redirectUris ?? []);
  redirectUris.add('http://localhost:3000/*');
  await admin.put(`${adminPath}/clients/${encodeURIComponent(client.id)}`, {
    ...client,
    secret: clientSecret,
    enabled: true,
    publicClient: false,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    redirectUris: [...redirectUris],
  });

  return client;
}

async function ensureRealmRole(admin, roleName) {
  const roleUrl = `/realms/${realmPath}/roles/${encodeURIComponent(roleName)}`;
  if (await getOptional(admin, roleUrl)) {
    return;
  }
  await admin.post(`${adminPath}/roles`, { name: roleName });
}

async function ensureServiceAccountPermissions(admin) {
  const clients = await admin.get(`${adminPath}/clients`, {
    params: { clientId: 'realm-management' },
  });
  const realmManagement = clients.data[0];
  if (!realmManagement?.id) {
    throw new Error('Keycloak realm-management client was not found');
  }

  const users = await admin.get(`${adminPath}/users`, {
    params: { username: `service-account-${clientId}`, exact: 'true' },
  });
  const serviceAccount = users.data[0];
  if (!serviceAccount?.id) {
    throw new Error(`Service account for "${clientId}" was not created`);
  }

  const currentRoles = await admin.get(
    `${adminPath}/users/${encodeURIComponent(serviceAccount.id)}/role-mappings/clients/${encodeURIComponent(realmManagement.id)}`,
  );
  const currentRoleNames = new Set(currentRoles.data.map((role) => role.name));
  const requiredRoles = ['manage-users', 'query-users', 'view-users'];
  const missingRoles = await Promise.all(
    requiredRoles
      .filter((roleName) => !currentRoleNames.has(roleName))
      .map(async (roleName) => {
        const result = await admin.get(
          `${adminPath}/clients/${encodeURIComponent(realmManagement.id)}/roles/${encodeURIComponent(roleName)}`,
        );
        return result.data;
      }),
  );

  if (missingRoles.length) {
    await admin.post(
      `${adminPath}/users/${encodeURIComponent(serviceAccount.id)}/role-mappings/clients/${encodeURIComponent(realmManagement.id)}`,
      missingRoles,
    );
  }
}

function splitName(fullname) {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1),
  };
}

async function findExistingUser(admin, user) {
  const expectedEmail = user.email.trim().toLowerCase();
  const byId = await getOptional(
    admin,
    `${adminPath}/users/${encodeURIComponent(user.keycloak_id)}`,
  );
  if (byId) {
    if (byId.email?.trim().toLowerCase() !== expectedEmail) {
      throw new Error(
        `Keycloak ID "${user.keycloak_id}" does not belong to ${user.email}`,
      );
    }
    return byId;
  }

  const byUsername = await admin.get(`${adminPath}/users`, {
    params: { username: user.username, exact: 'true' },
  });
  if (byUsername.data[0]) {
    const existingEmail = byUsername.data[0].email?.trim().toLowerCase();
    if (existingEmail !== expectedEmail) {
      throw new Error(
        `Demo username "${user.username}" already belongs to another email in Keycloak`,
      );
    }
    return byUsername.data[0];
  }

  const byEmail = await admin.get(`${adminPath}/users`, {
    params: { email: user.email, exact: 'true' },
  });
  return byEmail.data[0] ?? null;
}

async function provisionUser(admin, user) {
  const existing = await findExistingUser(admin, user);
  let actualId = existing?.id ?? user.keycloak_id;
  let userUrl = `${adminPath}/users/${encodeURIComponent(actualId)}`;
  const profile = {
    ...(existing ?? {}),
    id: actualId,
    username: user.username,
    email: user.email,
    ...splitName(user.fullname),
    enabled: user.status === 'active',
    ...(!existing
      ? { emailVerified: user.email.endsWith('.test'), requiredActions: [] }
      : {}),
  };

  if (existing) {
    await admin.put(userUrl, profile);
  } else {
    const created = await admin.post(`${adminPath}/users`, {
      ...profile,
      credentials: [
        { type: 'password', value: demoPassword, temporary: false },
      ],
    });
    actualId = created.headers.location?.split('/').at(-1) ?? actualId;
    if (actualId === user.keycloak_id && !created.headers.location) {
      const byUsername = await admin.get(`${adminPath}/users`, {
        params: { username: user.username, exact: 'true' },
      });
      actualId = byUsername.data[0]?.id ?? actualId;
    }
    userUrl = `${adminPath}/users/${encodeURIComponent(actualId)}`;
  }

  const currentRoles = await admin.get(`${userUrl}/role-mappings/realm`);
  const managedRoles = new Set(['admin', 'customer', 'photographer']);
  const rolesToRemove = currentRoles.data.filter(
    (role) => managedRoles.has(role.name) && role.name !== user.role,
  );
  if (rolesToRemove.length) {
    await admin.delete(`${userUrl}/role-mappings/realm`, {
      data: rolesToRemove,
    });
  }

  const role = await admin.get(
    `${adminPath}/roles/${encodeURIComponent(user.role)}`,
  );
  const currentRoleNames = new Set(
    currentRoles.data.map((entry) => entry.name),
  );
  if (!currentRoleNames.has(user.role)) {
    await admin.post(`${userUrl}/role-mappings/realm`, [role.data]);
  }

  await database.query(
    'UPDATE users SET keycloak_id = $2, updated_at = now() WHERE id = $1::uuid AND keycloak_id <> $2',
    [user.id, actualId],
  );
}

async function seed() {
  await database.connect();
  const usersResult = await database.query(
    `SELECT u.id::text AS id, u.keycloak_id, u.fullname, u.email, u.status,
       CASE
         WHEN a.user_id IS NOT NULL THEN 'admin'
         WHEN p.user_id IS NOT NULL THEN 'photographer'
         WHEN c.user_id IS NOT NULL THEN 'customer'
       END AS role
     FROM users u
     LEFT JOIN admins a ON a.user_id = u.id
     LEFT JOIN photographers p ON p.user_id = u.id
     LEFT JOIN customers c ON c.user_id = u.id
     WHERE u.id = ANY($1::uuid[])
       AND (a.user_id IS NOT NULL OR p.user_id IS NOT NULL OR c.user_id IS NOT NULL)
     ORDER BY u.id`,
    [demoUserIds],
  );

  const users = usersResult.rows.map((user) => ({
    ...user,
    username: user.email.split('@')[0],
  }));
  if (!users.length) {
    throw new Error('No demo users found. Run `pnpm db:seed` first.');
  }

  const roleCounts = users.reduce(
    (counts, user) => ({ ...counts, [user.role]: counts[user.role] + 1 }),
    { admin: 0, customer: 0, photographer: 0 },
  );
  if (
    roleCounts.admin !== 1 ||
    roleCounts.customer !== 5 ||
    roleCounts.photographer !== 10 ||
    users.length !== 16
  ) {
    throw new Error(
      `Expected 1 admin, 5 customers, and 10 photographers; found ${roleCounts.admin} admin, ${roleCounts.customer} customers, and ${roleCounts.photographer} photographers. Run \`pnpm db:seed\` first.`,
    );
  }

  const admin = await getAdminClient();
  await ensureRealm(admin);
  await ensureClient(admin);
  for (const role of ['admin', 'customer', 'photographer']) {
    await ensureRealmRole(admin, role);
  }
  await ensureServiceAccountPermissions(admin);

  for (const user of users) {
    await provisionUser(admin, user);
    console.log(`✓ ${user.role.padEnd(12)} ${user.email}`);
  }

  console.log(
    `\nProvisioned ${users.length} demo accounts in Keycloak realm "${realmName}".`,
  );
  console.log(
    'New local .test accounts use MOCK_USER_PASSWORD (default: LensDemo@2026!); existing Keycloak passwords are unchanged.',
  );
}

seed()
  .catch((error) => {
    const detail = error.response?.data?.errorMessage ?? error.message;
    const request = error.config;
    const requestTarget = request
      ? `${request.baseURL ?? ''}${request.url ?? ''}`
      : null;
    const requestInfo = requestTarget
      ? ` (${request.method?.toUpperCase() ?? 'REQUEST'} ${requestTarget}${error.response?.status ? `; HTTP ${error.response.status}` : ''})`
      : '';
    console.error(`Keycloak demo seed failed${requestInfo}: ${detail}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.end().catch(() => {});
  });
