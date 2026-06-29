import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { VehiculosModule } from 'src/vehiculos/vehiculos.module';
import { ClientesModule } from 'src/clientes/clientes.module';

@Module({
  imports: [VehiculosModule, ClientesModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
