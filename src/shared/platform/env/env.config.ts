import type { EnvConfig } from './types';

export const envConfig = (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  const corsOriginsRaw = process.env.CORS_ORIGINS ?? '*';
  const origins =
    corsOriginsRaw === '*'
      ? ['*']
      : corsOriginsRaw.split(',').map((origin) => origin.trim());

  return {
    app: {
      nodeEnv,
      port: Number.parseInt(process.env.PORT ?? '3000', 10),
      isProduction,
      isDevelopment,
    },
    cors: {
      origins,
    },
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number.parseInt(process.env.DB_PORT ?? '5433', 10),
      username: process.env.DB_USERNAME ?? 'lens-postgres',
      password: process.env.DB_PASSWORD ?? 'Postgres@#_Lens_EXE202_FPT_FA26',
      database: process.env.DB_NAME ?? 'lens',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    },
    mongodb: {
      uri:
        process.env.MONGODB_URI ??
        'mongodb://lens-mongo:Mongo@#_Lens_EXE202_FPT_FA26@localhost:27018/lens_read?authSource=admin',
      database: process.env.MONGODB_DATABASE ?? 'lens_read',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ?? 'super_secret_jwt_key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
      keycloakAuthServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
      keycloakRealm: process.env.KEYCLOAK_REALM,
      keycloakClientId: process.env.KEYCLOAK_CLIENT_ID,
      keycloakSecret: process.env.KEYCLOAK_SECRET,
    },
    cookie: {
      domain: process.env.COOKIE_DOMAIN,
    },
    payos: {
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    },
  };
};
