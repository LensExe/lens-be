import { Module } from '@nestjs/common';
import { WsResponseService } from './response.service';

@Module({
  providers: [WsResponseService],
  exports: [WsResponseService],
})
export class SocketIoModule {}
