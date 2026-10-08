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
  keycloakClientSecret?: string;
  keycloakAdminClientId?: string;
  keycloakAdminClientSecret?: string;
  keycloakAdminUsername?: string;
  keycloakAdminPassword?: string;
  keycloakGoogleRedirectUri?: string;
  keycloakGoogleFrontendRedirectUri?: string;
}

export interface CookieConfig {
  domain?: string;
}

export interface PayOSConfig {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
  returnUrl?: string;
  cancelUrl?: string;
  standaloneTestEnabled: boolean;
}

export interface SePayConfig {
  accountNumber?: string;
  accountName?: string;
  bankCode?: string;
  webhookApiKey?: string;
}

export interface PaymentConfig {
  provider: string;
}

export interface NotificationConfig {
  /** Base URL of the notification service for email and other notifications (for example, `http://localhost:3001`). */
  serviceUrl?: string;
}

export interface KafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  notificationEventsTopic: string;
  username?: string;
  password?: string;
  ssl: boolean;
}

export interface AxiosConfig {
  timeoutMs: number;
  retry: {
    retries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export interface EnvConfig {
  app: AppConfig;
  cors: CorsConfig;
  database: DatabaseConfig;
  mongodb: MongoConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  cookie: CookieConfig;
  payment: PaymentConfig;
  payos: PayOSConfig;
  sepay: SePayConfig;
  notification: NotificationConfig;
  kafka: KafkaConfig;
  axios: AxiosConfig;
}
