export interface AppConfig {
  nodeEnv: string;
  port: number;
  isProduction: boolean;
  isDevelopment: boolean;
}

export interface CorsConfig {
  origins: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export interface MongoConfig {
  uri: string;
  database: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  keycloakAuthServerUrl?: string;
  keycloakRealm?: string;
  keycloakClientId?: string;
  keycloakSecret?: string;
}

export interface CookieConfig {
  domain?: string;
}

export interface PayOSConfig {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
}

export interface EnvConfig {
  app: AppConfig;
  cors: CorsConfig;
  database: DatabaseConfig;
  mongodb: MongoConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  cookie: CookieConfig;
  payos: PayOSConfig;
}
