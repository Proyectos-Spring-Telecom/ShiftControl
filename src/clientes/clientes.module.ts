import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clientes } from 'src/entities/Clientes';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { EndpointProxyModule } from 'src/integration/endpoint-proxy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Clientes]), EndpointProxyModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
