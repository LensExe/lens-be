import axios from 'axios';

const required = (value, name) => {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value.trim();
};

const baseUrl = required(
  process.env.KEYCLOAK_AUTH_SERVER_URL ?? process.env.KEYCLOAK_URL,
  'KEYCLOAK_AUTH_SERVER_URL',
).replace(/\/$/, '');

const realmName = required(process.env.KEYCLOAK_REALM, 'KEYCLOAK_REALM');
const realm = encodeURIComponent(realmName);
const clientId = required(process.env.KEYCLOAK_CLIENT_ID, 'KEYCLOAK_CLIENT_ID');
const clientSecret = required(process.env.KEYCLOAK_SECRET, 'KEYCLOAK_SECRET');
const googleClientId = required(
  process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_ID',
);
const googleClientSecret = required(
  process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_CLIENT_SECRET',
);
const redirectUri = required(
  process.env.KEYCLOAK_GOOGLE_REDIRECT_URI,
  'KEYCLOAK_GOOGLE_REDIRECT_URI',
);

const tokenResponse = await axios.post(
  `${baseUrl}/realms/master/protocol/openid-connect/token`,
  new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: required(
      process.env.KEYCLOAK_ADMIN_USERNAME,
      'KEYCLOAK_ADMIN_USERNAME',
    ),
    password: required(
      process.env.KEYCLOAK_ADMIN_PASSWORD,
      'KEYCLOAK_ADMIN_PASSWORD',
    ),
  }),
  { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
);

const rootAdmin = axios.create({
  baseURL: `${baseUrl}/admin`,
  headers: { authorization: `Bearer ${tokenResponse.data.access_token}` },
});

try {
  await rootAdmin.get(`/realms/${realm}`);
} catch (error) {
  if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
  await rootAdmin.post('/realms', {
    realm: realmName,
    enabled: true,
    registrationAllowed: false,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
  });
}

const admin = axios.create({
  baseURL: `${baseUrl}/admin/realms/${realm}`,
  headers: { authorization: `Bearer ${tokenResponse.data.access_token}` },
});

let clients = await admin.get('/clients', { params: { clientId } });
if (!clients.data[0]?.id) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value && value !== '*');
  await admin.post('/clients', {
    clientId,
    secret: clientSecret,
    protocol: 'openid-connect',
    enabled: true,
    publicClient: false,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    redirectUris: [redirectUri],
    webOrigins: corsOrigins,
  });
  clients = await admin.get('/clients', { params: { clientId } });
}

const client = clients.data[0];
if (!client?.id) throw new Error(`Unable to configure client "${clientId}"`);
const redirectUris = new Set(client.redirectUris ?? []);
redirectUris.add(redirectUri);
await admin.put(`/clients/${encodeURIComponent(client.id)}`, {
  ...client,
  secret: clientSecret,
  standardFlowEnabled: true,
  redirectUris: [...redirectUris],
});

const mappers = await admin.get(
  `/clients/${encodeURIComponent(client.id)}/protocol-mappers/models`,
);
if (!mappers.data.some((mapper) => mapper.name === 'lens-api-audience')) {
  await admin.post(
    `/clients/${encodeURIComponent(client.id)}/protocol-mappers/models`,
    {
      name: 'lens-api-audience',
      protocol: 'openid-connect',
      protocolMapper: 'oidc-audience-mapper',
      config: {
        'included.client.audience': clientId,
        'access.token.claim': 'true',
        'id.token.claim': 'false',
      },
    },
  );
}

const provider = {
  alias: 'google',
  providerId: 'google',
  enabled: true,
  trustEmail: true,
  storeToken: false,
  addReadTokenRoleOnCreate: false,
  authenticateByDefault: false,
  linkOnly: false,
  firstBrokerLoginFlowAlias: 'first broker login',
  config: {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    defaultScope: 'openid profile email',
    syncMode: 'IMPORT',
  },
};

try {
  await admin.get('/identity-provider/instances/google');
  await admin.put('/identity-provider/instances/google', provider);
} catch (error) {
  if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
  await admin.post('/identity-provider/instances', provider);
}

const brokerCallback = `${baseUrl}/realms/${realm}/broker/google/endpoint`;
console.log('Google Identity Provider configured in Keycloak.');
console.log(
  `Add this Authorized redirect URI in Google Cloud: ${brokerCallback}`,
);
