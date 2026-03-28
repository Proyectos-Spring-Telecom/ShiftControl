import { Module } from '@nestjs/common';
import { EndpointProxyService } from './endpoint-proxy.service';

@Module({
  providers: [EndpointProxyService],
  exports: [EndpointProxyService],
})
export class EndpointProxyModule {}
