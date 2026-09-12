import { Module, Global } from '@nestjs/common';
import { KeycloakModule } from '@shared/integrations/keycloak/keycloak.module';
import { RealtimePublisher } from './realtime-publisher.port';
import { SocketioGateway } from './socketio.gateway';

@Global()
@Module({
  imports: [KeycloakModule],
  providers: [
    SocketioGateway,
    {
      provide: RealtimePublisher,
      useExisting: SocketioGateway,
    },
  ],
  exports: [RealtimePublisher, SocketioGateway],
})
export class SocketioModule {}
