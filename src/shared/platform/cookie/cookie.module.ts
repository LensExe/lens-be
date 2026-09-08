import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './cookie.module-definition';
import { CookieService } from './cookie.service';

@Module({
  providers: [CookieService],
  exports: [CookieService],
})
/**
 * Wires CookieService so HTTP handlers can set/clear auth and CSRF cookies without each
 * feature owning cookie options.
 */
export class CookieModule extends ConfigurableModuleClass {}
