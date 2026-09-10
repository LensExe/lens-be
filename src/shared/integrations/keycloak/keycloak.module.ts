import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../database/redis/redis.module';
import { KeycloakJwksService } from './jwks.service';
import { KeycloakOidcRedirectService } from './keycloak-oidc-redirect.service';
import { KeycloakService } from './keycloak.service';
import { KeycloakTokenService } from './token.service';
import { KeycloakUserService } from './user.service';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    KeycloakService,
    KeycloakJwksService,
    KeycloakTokenService,
    KeycloakUserService,
    KeycloakOidcRedirectService,
  ],
  exports: [
    KeycloakService,
    KeycloakJwksService,
    KeycloakTokenService,
    KeycloakUserService,
    KeycloakOidcRedirectService,
  ],
})
export class KeycloakModule {}
