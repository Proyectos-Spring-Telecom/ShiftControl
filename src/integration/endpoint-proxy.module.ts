import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehiculos } from 'src/entities/Vehiculos';
import { BehaviorIqAuthService } from './behavioriq/behavioriq-auth.service';
import { BehaviorIqPlateService } from './behavioriq/behavioriq-plate.service';
import { EndpointProxyService } from './endpoint-proxy.service';
import { VehiculoShadowService } from './vehiculo-shadow.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehiculos])],
  providers: [
    EndpointProxyService,
    VehiculoShadowService,
    BehaviorIqAuthService,
    BehaviorIqPlateService,
  ],
  exports: [
    EndpointProxyService,
    VehiculoShadowService,
    BehaviorIqAuthService,
    BehaviorIqPlateService,
  ],
})
export class EndpointProxyModule {}
