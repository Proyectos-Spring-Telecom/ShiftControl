import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehiculos } from 'src/entities/Vehiculos';
import { EndpointProxyService } from './endpoint-proxy.service';
import { VehiculoShadowService } from './vehiculo-shadow.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehiculos])],
  providers: [EndpointProxyService, VehiculoShadowService],
  exports: [EndpointProxyService, VehiculoShadowService],
})
export class EndpointProxyModule {}
