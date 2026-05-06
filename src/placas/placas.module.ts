/**
 * Expone en ShiftControl (`/api/plate/read`, `/api/placas`) el proxy hacia BehaviorIQ
 * para OCR y afiliación de placas.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehiculos } from 'src/entities/Vehiculos';
import { EndpointProxyModule } from 'src/integration/endpoint-proxy.module';
import {
  PlacasBehaviorIqController,
  PlateProxyBehaviorIqController,
} from './placas.controllers';
import { BehaviorIqPlateService } from 'src/integration/behavioriq/behavioriq-plate.service';

@Module({
  imports: [EndpointProxyModule, TypeOrmModule.forFeature([Vehiculos])],
  controllers: [PlateProxyBehaviorIqController, PlacasBehaviorIqController],
  providers: [BehaviorIqPlateService],
})
export class PlacasModule {}
